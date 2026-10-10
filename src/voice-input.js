const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
export function voiceCaptureSupport({ secure = globalThis.isSecureContext, media = globalThis.navigator?.mediaDevices, Recorder = globalThis.MediaRecorder } = {}) {
  if (!secure || !media?.getUserMedia) return { ready: false, detail: 'Abre el control en http://localhost:3000 desde el PC para usar el micrófono.' };
  const mime = MIME_TYPES.find(type => Recorder?.isTypeSupported(type));
  return mime ? { ready: true, mime } : { ready: false, detail: 'Este navegador no permite esta captura. Prueba Chrome o Firefox en el PC; puedes seguir escribiendo.' };
}

// El resultado solo llena el editor. Nunca envía chat ni ejecuta acciones.
export function createVoiceInput({ request = fetch, getMedia = constraints => navigator.mediaDevices.getUserMedia(constraints),
  createRecorder = (stream, options) => new MediaRecorder(stream, options), stopSpeech = () => Promise.resolve(),
  support = voiceCaptureSupport, onState = () => {}, onTranscript = () => {},
  now = () => performance.now(), uuid = () => crypto.randomUUID(), maxMs = 15000, permissionMs = 30000, timeoutMs = 33000 } = {}) {
  let current, release = Promise.resolve();
  const report = (phase, detail, extra = {}) => onState({ phase, detail, ...extra });
  async function notify(job, action, keepalive = false) {
    const response = await request('/api/stt/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captureId: job.id, action }), signal: AbortSignal.timeout(3000), keepalive });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo preparar el micrófono.');
    return data;
  }
  function clear(job) {
    clearTimeout(job.permissionTimer); clearTimeout(job.maxTimer); clearTimeout(job.deadline); clearInterval(job.clock);
    if (job.recorder) {
      job.recorder.ondataavailable = job.recorder.onstop = job.recorder.onerror = job.recorder.onstart = null;
      if (job.recorder.state !== 'inactive') job.recorder.stop();
    }
    job.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
  }
  function cancel(show = true) {
    const old = current; current = undefined;
    if (old) {
      old.controller.abort(); clear(old); old.chunks = [];
      // Esperar reserva en vuelo evita que un reserve tardío sobreviva al cancel.
      release = Promise.resolve(old.reserving).catch(() => {}).then(() => notify(old, 'cancel', true)).catch(() => {});
    }
    if (show || old) report('idle', show ? 'Grabación cancelada. Tu texto sigue disponible.' : 'Micrófono detenido.');
    return release;
  }
  function fail(job, detail) {
    if (current !== job) return;
    cancel(false); report('error', detail);
  }
  async function start() {
    if (current) return;
    const capability = support();
    if (!capability.ready) { report('error', capability.detail); return; }
    const job = { id: uuid(), controller: new AbortController(), chunks: [], bytes: 0, mime: capability.mime };
    current = job; report('preparing', 'Preparando micrófono. Mantén pulsado y permite el acceso si se solicita.');
    job.permissionTimer = setTimeout(() => fail(job, 'No se obtuvo permiso a tiempo. Vuelve a pulsar para grabar.'), permissionMs);
    try {
      await release; await stopSpeech();
      if (current !== job) return;
      job.reserving = notify(job, 'reserve'); await job.reserving;
      if (current !== job) return;
      const stream = await getMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      if (current !== job) { stream.getTracks().forEach(track => track.stop()); return; }
      job.stream = stream;
      stream.getTracks().forEach(track => { track.onended = () => { if (!job.finishing) fail(job, 'El micrófono se desconectó. Puedes seguir escribiendo.'); }; });
      job.recorder = createRecorder(stream, { mimeType: job.mime, audioBitsPerSecond: 64000 });
      job.recorder.ondataavailable = event => {
        if (current !== job || !event.data?.size) return;
        job.bytes += event.data.size;
        if (job.bytes > 2 * 1024 * 1024) { fail(job, 'La grabación es demasiado grande. Graba una frase más corta.'); return; }
        job.chunks.push(event.data);
      };
      job.recorder.onerror = () => fail(job, 'No se pudo grabar audio. Comprueba el micrófono y vuelve a pulsar.');
      job.recorder.onstop = () => {
        if (current !== job) return;
        if (job.finishing) transcribe(job);
        else fail(job, 'La grabación terminó inesperadamente. Puedes escribir o grabar de nuevo.');
      };
      job.recorder.onstart = async () => {
        if (current !== job) return;
        job.started = now(); job.maxTimer = setTimeout(finish, maxMs);
        try {
          const state = await notify(job, 'start');
          if (current !== job) return;
          clearTimeout(job.permissionTimer);
          job.recordingRevision = state.revision;
          report('recording', 'Escuchando… Suelta para transcribir.', { seconds: 0 });
          job.clock = setInterval(() => { if (current === job && !job.finishing) report('recording', 'Escuchando… Suelta para transcribir.', { seconds: Math.floor((now() - job.started) / 1000) }); }, 250);
        } catch (error) { fail(job, error.message); }
      };
      job.recorder.start(250);
    } catch (error) {
      fail(job, error.name === 'NotAllowedError' ? 'Permiso de micrófono denegado. Habilítalo en el navegador o escribe el mensaje.'
        : error.name === 'NotFoundError' ? 'No se encontró un micrófono en el PC. Puedes escribir el mensaje.'
        : error.name === 'NotReadableError' ? 'El micrófono está ocupado o no responde. Cierra la aplicación que lo usa y vuelve a pulsar.'
        : error.message || 'No se pudo iniciar el micrófono.');
    }
  }
  function finish() {
    const job = current;
    if (!job || job.finishing) return;
    if (job.recordingRevision === undefined || now() - job.started < 600) {
      cancel(false); report('idle', 'No se grabó una frase. Mantén pulsado hasta terminar de hablar.'); return;
    }
    job.finishing = true; clearTimeout(job.maxTimer); clearInterval(job.clock);
    report('transcribing', 'Transcribiendo en el PC… El micrófono está apagado.');
    job.recorder.stop(); job.stream.getTracks().forEach(track => { track.onended = null; track.stop(); });
  }
  async function transcribe(job) {
    if (current !== job) return;
    try {
      await notify(job, 'stop');
      if (current !== job) return;
      const blob = new Blob(job.chunks, { type: job.mime }); job.chunks = [];
      if (!blob.size) throw new Error('No se grabó audio. Vuelve a pulsar para hablar.');
      job.deadline = setTimeout(() => job.controller.abort(), timeoutMs);
      const response = await request('/api/stt', { method: 'POST', headers: { 'Content-Type': job.mime, 'X-Capture-Id': job.id },
        body: blob, signal: job.controller.signal });
      const data = await response.json();
      if (current !== job) return;
      if (job.controller.signal.aborted) throw new DOMException('Tiempo agotado', 'AbortError');
      if (!response.ok) throw new Error(data.error || 'No se pudo transcribir. Puedes escribir el mensaje.');
      if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 2000) throw new Error('La transcripción no es válida. Graba de nuevo.');
      const appended = onTranscript(data.text.trim());
      clear(job); current = undefined;
      report('ready', appended === false ? 'El texto supera 2000 caracteres. Tu borrador se conservó; acórtalo y graba de nuevo.'
        : 'Transcripción lista. Revisa el texto y pulsa Enviar cuando quieras.', { elapsedMs: data.elapsedMs });
    } catch (error) {
      fail(job, error.name === 'AbortError' ? 'La transcripción tardó demasiado. Puedes escribir o grabar de nuevo.' : error.message);
    }
  }
  return { start, finish, cancel,
    onPresentation(state, changedSession) {
      if (current && (changedSession || !current.finishing && current.recordingRevision !== undefined
        && state.revision >= current.recordingRevision && state.phase !== 'listening')) cancel();
    },
  };
}
