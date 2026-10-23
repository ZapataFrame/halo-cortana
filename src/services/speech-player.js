// Una reproducción por control, protegida además por la reserva global del PC.
export function createSpeechPlayer({ request = fetch, createAudio = () => new Audio(),
  createUrl = blob => URL.createObjectURL(blob), revokeUrl = url => URL.revokeObjectURL(url),
  onState = () => {}, now = () => performance.now(), uuid = () => crypto.randomUUID(),
  heartbeatMs = 5000 } = {}) {
  let current, release = Promise.resolve(), volume = 0.8;
  const report = (phase, detail, extra = {}) => onState({ phase, detail, ...extra });
  async function notify(job, playing, keepalive = false) {
    const response = await request('/api/tts/playback', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speechId: job.id, playing }), keepalive, signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('No se pudo sincronizar la voz con el PC.');
    return response.json();
  }
  function stop(show = true) {
    const old = current; current = undefined;
    if (old) {
      old.controller.abort(); clearInterval(old.heartbeat); clearTimeout(old.deadline);
      if (old.audio) {
        old.audio.onplaying = old.audio.onended = old.audio.onerror = null;
        old.audio.pause(); old.audio.removeAttribute('src'); old.audio.load(); old.audio.remove?.();
      }
      if (old.url) revokeUrl(old.url);
      release = notify(old, false, true).catch(() => {});
    }
    if (show || old) report('stopped', show ? 'Voz detenida. El texto sigue disponible.' : 'Voz lista para reproducir.');
    return release;
  }
  async function play(requestId) {
    const pending = stop(false);
    const job = { id: uuid(), requestId, controller: new AbortController(), started: now() };
    current = job; report('preparing', 'Preparando voz en español…');
    await pending;
    if (current !== job) return;
    job.deadline = setTimeout(() => job.controller.abort(), 23000);
    try {
      const response = await request('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, speechId: job.id }), signal: job.controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'La voz no está disponible.'); }
      const blob = await response.blob();
      if (current !== job || job.controller.signal.aborted) return;
      clearTimeout(job.deadline);
      job.synthesisMs = Number(response.headers.get('X-Synthesis-Ms'));
      job.url = createUrl(blob); job.audio = createAudio();
      job.audio.volume = volume; job.audio.src = job.url;
      job.audio.onended = () => { if (current === job) { stop(false); report('stopped', 'Lectura terminada.'); } };
      job.audio.onerror = () => { if (current === job) { stop(false); report('error', 'No se pudo reproducir la voz. El texto sigue disponible.'); } };
      job.audio.onplaying = async () => {
        if (current !== job || job.announced) return;
        job.announced = true;
        try {
          const state = await notify(job, true);
          if (current !== job) return;
          job.playingRevision = state.revision;
          job.playing = true;
          report('playing', 'Cortana está hablando.', { synthesisMs: job.synthesisMs, startMs: Math.round(now() - job.started) });
          job.heartbeat = setInterval(() => notify(job, true).catch(() => {
            if (current === job) { stop(false); report('error', 'Se perdió la conexión de voz. Pulsa Escuchar para reintentar.'); }
          }), heartbeatMs);
        } catch (error) { if (current === job) { stop(false); report('error', error.message); } }
      };
      await job.audio.play();
    } catch (error) {
      if (current !== job) return;
      stop(false);
      report('error', error.name === 'NotAllowedError' ? 'El navegador bloqueó el audio. Pulsa Escuchar para reproducirlo manualmente.'
        : error.name === 'AbortError' ? 'La voz tardó demasiado. El texto sigue disponible.' : error.message || 'La voz no está disponible.');
    }
  }
  return {
    play, stop,
    setVolume(value) { if (Number.isFinite(value) && value >= 0 && value <= 1) { volume = value; if (current?.audio) current.audio.volume = volume; } },
    onPresentation(state, changedSession) {
      if (current && (changedSession || current.playing && state.revision >= current.playingRevision && state.phase !== 'speaking')) stop();
    },
  };
}
