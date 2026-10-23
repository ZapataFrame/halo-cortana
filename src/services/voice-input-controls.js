// Conserva el gesto hasta soltarlo: el límite de audio no equivale a soltar una tecla.
export function bindVoiceInputControls({ button, discardButton, input, voiceInput, getPhase, isBusy, windowTarget = window }) {
  let held, focusPending = false;
  const listeners = [];
  const listen = (target, event, handler) => { target.addEventListener(event, handler); listeners.push(() => target.removeEventListener(event, handler)); };
  const reset = () => { held = undefined; focusPending = false; };
  function release() {
    held = undefined;
    if (focusPending) { focusPending = false; input.focus(); }
  }
  const ownsPointer = event => held?.kind === 'pointer' && held.id === event.pointerId;
  const canStart = () => !held && !button.disabled && !isBusy();
  listen(button, 'pointerdown', event => {
    if (event.button !== 0 || !canStart()) return;
    event.preventDefault(); held = { kind: 'pointer', id: event.pointerId };
    button.setPointerCapture(event.pointerId); voiceInput.start();
  });
  listen(button, 'pointerup', event => {
    if (!ownsPointer(event)) return;
    release(); voiceInput.finish();
  });
  listen(button, 'pointercancel', event => {
    if (!ownsPointer(event)) return;
    reset(); voiceInput.cancel();
  });
  listen(button, 'lostpointercapture', event => {
    if (!ownsPointer(event)) return;
    reset();
    if (['preparing', 'recording'].includes(getPhase())) voiceInput.cancel();
  });
  listen(button, 'keydown', event => {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat || !canStart()) return;
    held = { kind: 'key', key: event.key }; voiceInput.start();
  });
  // Al deshabilitar el botón durante STT, keyup puede llegar al documento.
  listen(windowTarget, 'keyup', event => {
    if (held?.kind !== 'key' || held.key !== event.key) return;
    event.preventDefault(); release(); voiceInput.finish();
  });
  listen(discardButton, 'click', () => { reset(); voiceInput.cancel(); });
  listen(windowTarget, 'blur', () => { reset(); if (isBusy()) voiceInput.cancel(); });
  return {
    onState(phase) {
      if (phase === 'ready') {
        if (held) focusPending = true;
        else input.focus();
      } else {
        focusPending = false;
        if (['idle', 'error'].includes(phase)) held = undefined;
      }
    },
    destroy() { reset(); listeners.forEach(remove => remove()); },
  };
}
