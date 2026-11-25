// Escucha manos libres en el visor («Ey Cortana») mediante VAD local y Whisper del PC.
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];

export function pickAudioMime(Recorder = globalThis.MediaRecorder) {
  if (!Recorder) return '';
  if (typeof Recorder.isTypeSupported !== 'function') return 'audio/webm';
  return MIME_CANDIDATES.find(type => Recorder.isTypeSupported(type)) || '';
}

export function playChime(context, kind = 'wake') {
  if (!context || context.state !== 'running' || typeof context.createOscillator !== 'function') return;
  try {
    const now = context.currentTime;
    const notes = kind === 'cancel' ? [[523.25, 0, .09], [392, .09, .14]] : [[587.33, 0, .09], [880, .08, .15]];
    for (const [freq, start, dur] of notes) {
      const osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.16, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain); gain.connect(context.destination);
      osc.start(now + start); osc.stop(now + start + dur + 0.02);
    }
  } catch { /* El tono de aviso es auxiliar y no debe interrumpir el flujo. */ }
}

export function viewerMicSupport({ secure = globalThis.isSecureContext, mediaDevices = globalThis.navigator?.mediaDevices, Recorder = globalThis.MediaRecorder } = {}) {
  if (secure === false) return { ready: false, detail: 'El micrófono en otra laptop requiere HTTPS. Ejecuta npm run setup:https en el PC y abre el enlace https://.' };
  if (!mediaDevices?.getUserMedia || !Recorder) return { ready: false, detail: 'Este navegador no admite micrófono en el visor.' };
  if (!pickAudioMime(Recorder)) return { ready: false, detail: 'Este navegador no ofrece grabación WebM/Ogg compatible.' };
  return { ready: true, detail: '' };
}

export function createViewerWake({
  token,
  request = fetch,
  getMedia = constraints => navigator.mediaDevices.getUserMedia(constraints),
  createRecorder = (stream, options) => new MediaRecorder(stream, options),
  createContext = () => new AudioContext(),
  chime = playChime,
  isBusy = () => false,
  onState = () => {},
  onPhase = () => {},
  supportCheck = viewerMicSupport,
  pollMs = 50,
  minThreshold = 0.022,
  wakeSilenceMs = 550,
  wakeMaxMs = 3500,
  wakeMinMs = 260,
  questionSilenceMs = 1200,
  questionMaxMs = 12000,
  questionMinMs = 250,
  listenTimeoutMs = 6500,
  chimeGuardMs = 260,
  postSpeechGuardMs = 600,
  now = Date.now,
} = {}) {
  let run = 0, stream, audioCtx, analyser, samples, pollTimer, controller, activeRecorder, stopCurrentCapture;
  let mode = 'off', noiseFloor = 0.008, busyUntil = 0;
  const headers = { Authorization: `Bearer ${token}` };
  const report = (phase, detail) => onState({ phase, detail });

  function rmsLevel() {
    if (!analyser) return 0;
    if (typeof analyser.getFloatTimeDomainData === 'function') {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0; for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      return Math.sqrt(sum / samples.length);
    }
    const bytes = new Uint8Array(analyser.fftSize || 256);
    analyser.getByteTimeDomainData(bytes);
    let sum = 0;
    for (let i = 0; i < bytes.length; i++) { const v = (bytes[i] - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / bytes.length);
  }

  function recordUtterance({ maxMs, silenceMs, waitSpeechMs = 0, minMs = 250, ownRun }) {
    return new Promise((resolve, reject) => {
      if (ownRun !== run || !stream) { resolve(null); return; }
      const mimeType = pickAudioMime();
      const recorder = createRecorder(stream, mimeType ? { mimeType } : undefined);
      activeRecorder = recorder;
      const chunks = [];
      let heardSpeech = waitSpeechMs === 0, startedAt = now(), lastVoiceAt = startedAt, settled = false, checkTimer, maxTimer;
      const finish = (value, err) => {
        if (settled) return; settled = true;
        clearInterval(checkTimer); clearTimeout(maxTimer);
        if (activeRecorder === recorder) activeRecorder = undefined;
        stopCurrentCapture = undefined;
        err ? reject(err) : resolve(value);
      };
      stopCurrentCapture = () => {
        finish(null);
        try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
      };
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      recorder.onerror = () => finish(null, new Error('Error al capturar micrófono.'));
      recorder.onstop = () => {
        if (ownRun !== run) { finish(null); return; }
        const elapsed = now() - startedAt;
        if (!heardSpeech || !chunks.length || elapsed < minMs) { finish(null); return; }
        finish(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }));
      };
      const endRecording = () => { try { if (recorder.state !== 'inactive') recorder.stop(); } catch { finish(null); } };
      recorder.start(150);
      maxTimer = setTimeout(endRecording, maxMs);
      checkTimer = setInterval(() => {
        if (isBusy()) { stopCurrentCapture?.(); return; }
        if (ownRun !== run) { endRecording(); return; }
        const t = now(), level = rmsLevel(), threshold = Math.max(minThreshold, noiseFloor * 2.6);
        if (level >= threshold) {
          if (!heardSpeech) { heardSpeech = true; startedAt = t; }
          lastVoiceAt = t;
        } else if (!heardSpeech && waitSpeechMs > 0 && t - startedAt >= waitSpeechMs) {
          endRecording();
        } else if (heardSpeech && t - lastVoiceAt >= silenceMs && t - startedAt >= minMs) {
          endRecording();
        }
      }, pollMs);
    });
  }

  async function postState(listening, signal) {
    try {
      await request('/api/voice/state', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ listening }),
        signal,
      });
    } catch { /* Mejor esfuerzo; el servidor caduca la reserva solo. */ }
  }

  async function askCortana(payload, ownRun, signal) {
    mode = 'asking'; onPhase('processing');
    report('processing', 'Cortana está pensando…');
    try {
      const init = typeof payload === 'string'
        ? { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: payload }), signal }
        : { method: 'POST', headers: { ...headers, 'Content-Type': payload.type || 'audio/webm' }, body: payload, signal };
      const response = await request('/api/voice/ask', init);
      const data = await response.json().catch(() => ({}));
      if (ownRun !== run) return;
      if (!response.ok) {
        onPhase(null);
        report('standby', data.error || 'No se pudo procesar tu pregunta. Di «Ey Cortana» de nuevo.');
        busyUntil = now() + postSpeechGuardMs;
        return;
      }
      onPhase(null);
      if (data.command) {
        report('standby', `${data.reply} Di «Hey Cortana» para continuar.`);
        busyUntil = now() + postSpeechGuardMs;
      } else if (data.spoken) {
        report('standby', 'Cortana está respondiendo…');
        busyUntil = now() + postSpeechGuardMs;
      } else {
        report('standby', data.voiceError || 'Respuesta lista sin audio. Di «Ey Cortana» para preguntar otra vez.');
      }
    } catch (error) {
      if (ownRun !== run) return;
      onPhase(null);
      report('standby', 'Se interrumpió la consulta. Di «Ey Cortana» de nuevo.');
    } finally {
      if (ownRun === run) mode = 'standby';
    }
  }

  async function handleWake(blob, ownRun, signal) {
    mode = 'checking';
    try {
      const response = await request('/api/voice/wake', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': blob.type || 'audio/webm' },
        body: blob,
        signal,
      });
      if (ownRun !== run) return;
      if (response.status === 409) { mode = 'standby'; return; }
      const data = await response.json().catch(() => ({}));
      if (ownRun !== run) return;
      if (!response.ok) {
        mode = 'standby';
        if (response.status === 403 || response.status === 503) { stop(false); report('error', data.error || 'No se pudo comprobar «Hey Cortana».'); }
        return;
      }
      if (!data.matched) { mode = 'standby'; return; }
      // ¡Palabra de activación detectada!
      chime(audioCtx, 'wake');
      if (data.command) {
        await askCortana(data.command, ownRun, signal);
        return;
      }
      mode = 'listening'; onPhase('listening');
      report('listening', 'Te escucho… haz tu pregunta.');
      await new Promise(r => setTimeout(r, chimeGuardMs));
      if (ownRun !== run) return;
      const questionBlob = await recordUtterance({
        maxMs: questionMaxMs, silenceMs: questionSilenceMs, waitSpeechMs: listenTimeoutMs, minMs: questionMinMs, ownRun,
      });
      if (ownRun !== run) return;
      if (!questionBlob) {
        if (!isBusy()) chime(audioCtx, 'cancel');
        onPhase(null); await postState(false, signal);
        mode = 'standby'; report('standby', 'No escuché pregunta. Di «Ey Cortana» cuando quieras hablar.');
        return;
      }
      await askCortana(questionBlob, ownRun, signal);
    } catch {
      if (ownRun === run) { onPhase(null); mode = 'standby'; }
    }
  }

  function loop(ownRun, signal) {
    pollTimer = setInterval(() => {
      if (ownRun !== run || mode !== 'standby') return;
      if (isBusy()) { busyUntil = now() + postSpeechGuardMs; return; }
      if (now() < busyUntil) return;
      const level = rmsLevel(), threshold = Math.max(minThreshold, noiseFloor * 2.8);
      if (level < threshold) {
        noiseFloor = noiseFloor * 0.96 + level * 0.04;
        return;
      }
      mode = 'capturing';
      recordUtterance({ maxMs: wakeMaxMs, silenceMs: wakeSilenceMs, minMs: wakeMinMs, ownRun })
        .then(blob => {
          if (ownRun !== run) return;
          if (!blob) { mode = 'standby'; return; }
          return handleWake(blob, ownRun, signal);
        })
        .catch(() => { if (ownRun === run) mode = 'standby'; });
    }, pollMs);
  }

  async function enable() {
    stop(false);
    const ownRun = run;
    if (!token) { report('error', 'Abre el enlace de visor con voz desde el control del PC.'); return false; }
    const support = supportCheck();
    if (!support.ready) { report('error', support.detail); return false; }
    controller = new AbortController();
    const signal = controller.signal;
    try {
      audioCtx = createContext();
      if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') await audioCtx.resume();
      const acquired = await getMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (ownRun !== run) { acquired.getTracks().forEach(t => t.stop()); return false; }
      stream = acquired;
      const src = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser(); analyser.fftSize = 1024;
      src.connect(analyser);
      samples = new Float32Array(analyser.fftSize);
      mode = 'standby';
      report('standby', 'Escuchando «Ey Cortana».');
      loop(ownRun, signal);
      return true;
    } catch (error) {
      if (ownRun !== run) return false;
      stop(false);
      const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
      report('error', denied ? 'Permiso de micrófono denegado. Permite el micrófono para usar «Ey Cortana».' : error?.message || 'No se pudo activar el micrófono.');
      return false;
    }
  }

  function stop(notify = true) {
    const wasListening = mode === 'listening';
    run++; mode = 'off';
    clearInterval(pollTimer); pollTimer = undefined;
    stopCurrentCapture?.();
    controller?.abort(); controller = undefined;
    stream?.getTracks().forEach(t => t.stop()); stream = undefined;
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close?.().catch?.(() => {});
    audioCtx = undefined; analyser = undefined;
    onPhase(null);
    if (wasListening && token) postState(false);
    if (notify) report('off', '«Ey Cortana» desactivado.');
  }

  function notifySpeechEnded() { busyUntil = now() + postSpeechGuardMs; }

  return { enable, stop, notifySpeechEnded, get mode() { return mode; } };
}
