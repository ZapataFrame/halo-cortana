export const VOICE_TRIAL_PHRASES = Object.freeze([
  'Hola Cortana, preséntate en una frase.',
  'Explícame qué es un holograma.',
  '¿Cómo puedo ajustar el brillo de la pantalla?',
  'Quiero conversar sobre este proyecto.',
  'Mi nombre es Ana y estudio ingeniería.',
  '¿Puedes recordar mi nombre?',
  'Necesito un modelo sobre un fondo negro.',
  'Ayúdame a preparar una demostración.',
  'El micrófono está conectado a la computadora.',
  'Gracias Cortana, hasta luego.',
]);

export const VOICE_TRIAL_CHECKS = Object.freeze([
  ['permission', 'Permiso inicial y tardío: solo escucha al comenzar la captura.'],
  ['denied', 'Permiso denegado: conserva el borrador y permite recuperarse.'],
  ['editing', 'Puedo corregir una palabra y enviarla deliberadamente fuera del ensayo.'],
  ['manualSend', 'Grabar y transcribir nunca envían mensajes automáticamente.'],
  ['cancelCapture', 'Descartar durante captura apaga el micrófono y conserva el borrador.'],
  ['cancelStt', 'Descartar durante transcripción impide texto tardío.'],
  ['tts', 'La voz de Cortana se detiene antes de captar el micrófono.'],
  ['recovery', 'Frase corta, silencio y pérdida de foco/conexión permiten recuperarse.'],
  ['keyboard', 'Enter/Espacio hasta 15 s y liberación durante STT no envían mensajes.'],
]);

// Evidencia declarada por una persona. No acepta audio, no llama al LLM y no cierra la roadmap.
export function createVoiceAcceptance({ timestamp = () => new Date().toISOString() } = {}) {
  let run, captureId, pending;
  function snapshot() {
    return structuredClone({ run, captureId, pending, active: Boolean(run?.active),
      canCapture: Boolean(run?.active && !captureId && !pending), index: run?.results.length || 0 });
  }
  function start(environment) {
    if (run?.active) throw new Error('Termina el ensayo actual antes de iniciar otro.');
    const clean = {};
    for (const key of ['pc', 'browser', 'microphone', 'noise']) {
      const value = environment[key];
      if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\u0000-\u001f]/.test(value)) {
        throw new Error('Completa PC/SO, navegador, micrófono y ruido (máximo 160 caracteres por campo).');
      }
      clean[key] = value.trim();
    }
    run = { schemaVersion: 1, task: 'H-16', evidenceKind: 'human-microphone-self-report',
      startedAt: timestamp(), environment: clean, phrases: [...VOICE_TRIAL_PHRASES], active: true,
      results: [], interruptions: [], checks: Object.fromEntries(VOICE_TRIAL_CHECKS.map(([key]) => [key, 'pending'])) };
    captureId = pending = undefined;
    return snapshot();
  }
  function beginCapture(id) {
    if (!run?.active || captureId || pending || typeof id !== 'string' || !id) return false;
    captureId = id;
    return true;
  }
  function record(text, metadata = {}) {
    if (!run?.active || !captureId || metadata.captureId !== captureId || pending
      || typeof text !== 'string' || !text.trim() || text.length > 2000) return false;
    const metric = value => Number.isFinite(value) && value >= 0 ? value : null;
    pending = { captureId, phrase: VOICE_TRIAL_PHRASES[run.results.length], originalText: text.trim(),
      receivedAt: timestamp(), error: null, durationMs: metric(metadata.durationMs),
      sttMs: metric(metadata.elapsedMs), releaseToTextMs: metric(metadata.releaseToTextMs) };
    captureId = undefined;
    return true;
  }
  function fail(detail = 'No hubo transcripción; fallo marcado por la persona.') {
    if (!run?.active || pending) return false;
    pending = { captureId: captureId || null, phrase: VOICE_TRIAL_PHRASES[run.results.length], originalText: '', receivedAt: timestamp(),
      error: String(detail).slice(0, 500), durationMs: null, sttMs: null, releaseToTextMs: null };
    captureId = undefined;
    return true;
  }
  function cancelCapture(detail = 'Captura descartada.') {
    if (!run?.active || !captureId) return;
    run.interruptions.push({ captureId, phraseNumber: run.results.length + 1, at: timestamp(), detail: String(detail).slice(0, 500) });
    captureId = undefined;
  }
  function rate(useful) {
    if (!run?.active || !pending || typeof useful !== 'boolean' || useful && (!pending.originalText || pending.error)) return false;
    run.results.push({ ...pending, phraseNumber: run.results.length + 1, useful, ratedAt: timestamp() });
    pending = undefined;
    if (run.results.length === VOICE_TRIAL_PHRASES.length) { run.active = false; run.finishedAt = timestamp(); }
    return true;
  }
  function stop() {
    if (!run?.active) return;
    cancelCapture('Ensayo terminado durante una captura.');
    run.active = false; run.stoppedAt = timestamp();
    // Conservar también una muestra no valorada, sin contarla como éxito.
    if (pending) run.unratedSample = pending;
    pending = undefined;
  }
  function setCheck(key, value) {
    if (!run || !Object.hasOwn(run.checks, key) || !['pending', 'pass', 'fail'].includes(value)) return false;
    run.checks[key] = value;
    return true;
  }
  function exportReport() {
    if (!run) throw new Error('Comienza un ensayo antes de exportar.');
    const report = structuredClone(run);
    delete report.active;
    if (pending) report.unratedSample = structuredClone(pending);
    const useful = run.results.filter(result => result.useful).length;
    report.summary = { rated: run.results.length, total: VOICE_TRIAL_PHRASES.length, useful,
      complete: run.results.length === VOICE_TRIAL_PHRASES.length,
      semanticThresholdMet: run.results.length === VOICE_TRIAL_PHRASES.length && useful >= 8,
      checksPassed: Object.values(run.checks).filter(value => value === 'pass').length,
      checksTotal: VOICE_TRIAL_CHECKS.length, reviewRequired: true };
    return report;
  }
  return { start, snapshot, beginCapture, record, fail, cancelCapture, rate, stop, setCheck, exportReport };
}
