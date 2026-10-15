import { createVoiceAcceptance, VOICE_TRIAL_PHRASES, VOICE_TRIAL_CHECKS } from './voice-acceptance.js';

export function bindVoiceAcceptancePanel({ root, available, cancelCapture, onChange = () => {} }) {
  const trial = createVoiceAcceptance();
  root.innerHTML = `
    <summary>Ensayo de micrófono · 10 frases</summary>
    <p class="small muted">Elige estas diez frases para medir el reconocimiento. Valora intención y datos antes de corregir. El chat queda pausado durante el ensayo; tu borrador se conserva.</p>
    <form class="voice-trial-environment">
      <label>PC / sistema operativo<input name="pc" required maxlength="160" placeholder="Mi laptop / Linux"></label>
      <label>Navegador del ensayo<input name="browser" required maxlength="160" placeholder="Nombre y versión"></label>
      <label>Micrófono del ensayo<input name="microphone" required maxlength="160" placeholder="Integrado o modelo"></label>
      <label>Ruido ambiental<input name="noise" required maxlength="160" placeholder="Silencio, ventilador, conversación…"></label>
      <p class="small muted">Resultados solo en memoria. Recargar los borra. Exportar descarga texto y valoraciones en este PC; no incluye audio ni se sube al servidor. Evita datos personales.</p>
      <button type="submit" class="button secondary" data-action="start">Comenzar ensayo</button>
    </form>
    <div class="voice-trial-sample" hidden>
      <p class="eyebrow" data-field="progress"></p>
      <blockquote data-field="phrase"></blockquote>
      <p class="small muted">Usa el botón de micrófono de arriba y suelta al terminar.</p>
      <p class="small muted">Transcripción original</p>
      <p class="voice-trial-original" data-field="original"></p>
      <p class="small muted" data-field="timing"></p>
      <div class="button-row"><button type="button" class="button secondary" data-action="yes">Conserva el sentido</button><button type="button" class="button secondary" data-action="no">Pierde datos o intención</button></div>
      <button type="button" class="text-button" data-action="failed">Marcar frase sin resultado</button>
    </div>
    <p class="small muted" role="status" data-field="status">Sin ensayo. Comenzar no activa el micrófono.</p>
    <div class="button-row"><button type="button" class="text-button" data-action="stop" hidden>Terminar ensayo</button><button type="button" class="text-button" data-action="export" disabled>Exportar resultados JSON</button></div>
    <details class="voice-trial-checks" hidden><summary>Otras comprobaciones manuales de H-16</summary><p class="small muted">Haz estas pruebas fuera de las diez frases. Registra únicamente lo observado.</p></details>`;
  const q = selector => root.querySelector(selector);
  const buttons = Object.fromEntries(['start', 'yes', 'no', 'failed', 'stop', 'export'].map(key => [key, q(`[data-action="${key}"]`)]));
  const form = q('form'), checklist = q('.voice-trial-checks');
  for (const [key, text] of VOICE_TRIAL_CHECKS) {
    const label = document.createElement('label'); label.textContent = text;
    const select = document.createElement('select'); select.setAttribute('aria-label', text);
    select.append(new Option('No probado', 'pending'), new Option('Correcto', 'pass'), new Option('Falló', 'fail'));
    select.addEventListener('change', () => { trial.setCheck(key, select.value); render(); });
    label.append(select); checklist.append(label);
  }
  function render() {
    const state = trial.snapshot(), canStart = available();
    buttons.start.disabled = state.active || !canStart;
    buttons.start.textContent = state.run ? 'Nuevo ensayo (borra resultados actuales)' : 'Comenzar ensayo';
    form.querySelectorAll('input').forEach(input => { input.disabled = state.active; });
    q('.voice-trial-sample').hidden = !state.active;
    buttons.stop.hidden = !state.active; buttons.export.disabled = !state.run;
    buttons.yes.disabled = !state.pending?.originalText || Boolean(state.pending?.error);
    buttons.no.disabled = !state.pending;
    buttons.failed.disabled = Boolean(state.pending || state.captureId);
    if (state.active) {
      q('[data-field="progress"]').textContent = `FRASE ${state.index + 1} / ${VOICE_TRIAL_PHRASES.length}`;
      q('[data-field="phrase"]').textContent = VOICE_TRIAL_PHRASES[state.index];
      q('[data-field="original"]').textContent = state.pending?.originalText || state.pending?.error || 'Aún no hay una transcripción.';
      const ms = state.pending?.releaseToTextMs;
      q('[data-field="timing"]').textContent = ms == null ? '' : `Desde soltar hasta recibir texto: ${(ms / 1000).toFixed(1)} s. Motor STT: ${state.pending.sttMs == null ? 'sin medida' : (state.pending.sttMs / 1000).toFixed(1) + ' s'}.`;
    }
    checklist.hidden = !state.run;
    if (state.run) {
      const report = trial.exportReport();
      q('[data-field="status"]').textContent = `${report.summary.useful}/${report.summary.total} útiles · ${report.summary.rated} valoradas.`
        + (state.active ? state.pending ? ' Valora la transcripción original para seguir.' : ' Mantén pulsado el micrófono para la frase indicada.'
          : report.summary.complete ? ' Diez frases terminadas. Revisa las otras comprobaciones y exporta la evidencia.' : ' Ensayo incompleto; puedes exportarlo.')
        + ' La aceptación de H-16 requiere revisar estos resultados.';
    }
  }
  function changed() { render(); onChange(); }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!available() || trial.snapshot().active) return;
    try {
      trial.start(Object.fromEntries([...form.querySelectorAll('input')].map(input => [input.name, input.value])));
      checklist.querySelectorAll('select').forEach(select => { select.value = 'pending'; });
      changed();
    } catch (error) { q('[data-field="status"]').textContent = error.message; }
  });
  for (const [action, useful] of [['yes', true], ['no', false]]) buttons[action].addEventListener('click', () => { if (trial.rate(useful)) changed(); });
  buttons.failed.addEventListener('click', () => { if (trial.snapshot().canCapture && trial.fail()) changed(); });
  buttons.stop.addEventListener('click', () => { trial.stop(); cancelCapture(); changed(); });
  buttons.export.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(trial.exportReport(), null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'H-16-ensayo-microfono.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render();
  return {
    get active() { return trial.snapshot().active; },
    get canCapture() { return !trial.snapshot().active || trial.snapshot().canCapture; },
    refresh: render,
    onState(state) {
      if (!trial.snapshot().active) return;
      if (state.phase === 'preparing') trial.beginCapture(state.captureId);
      else if (state.phase === 'error') trial.fail(state.detail);
      else if (state.phase === 'idle') trial.cancelCapture(state.detail);
      changed();
    },
    onTranscript(text, metadata) {
      if (!trial.snapshot().active) return false;
      // Interceptar también un resultado no coincidente: nunca debe llenar el chat en modo ensayo.
      trial.record(text, metadata); changed();
      return true;
    },
  };
}
