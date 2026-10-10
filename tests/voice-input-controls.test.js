import test from 'node:test';
import assert from 'node:assert/strict';
import { bindVoiceInputControls } from '../src/voice-input-controls.js';

function dispatch(target, type, properties = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, properties); target.dispatchEvent(event); return event;
}
function fixture(t) {
  const button = Object.assign(new EventTarget(), { disabled: false, setPointerCapture() {} });
  const discard = new EventTarget(), windowTarget = new EventTarget(), calls = [];
  let phase = 'idle', focusCount = 0;
  const controls = bindVoiceInputControls({ button, discardButton: discard, windowTarget,
    input: { focus() { focusCount++; } }, getPhase: () => phase,
    isBusy: () => ['preparing', 'recording', 'transcribing'].includes(phase),
    voiceInput: { start() { calls.push('start'); state('preparing'); }, finish() { calls.push('finish'); },
      cancel() { calls.push('cancel'); state('idle'); } },
  });
  function state(value) { phase = value; button.disabled = value === 'transcribing'; controls.onState(value); }
  t.after(() => controls.destroy());
  return { button, discard, windowTarget, controls, calls, state, focused: () => focusCount };
}

test('límite de grabación con Enter aún pulsado no enfoca el editor hasta keyup', t => {
  const f = fixture(t);
  assert.equal(dispatch(f.button, 'keydown', { key: 'Enter', repeat: false }).defaultPrevented, true);
  f.state('recording'); f.state('transcribing'); f.state('ready');
  assert.equal(f.focused(), 0);
  dispatch(f.button, 'keydown', { key: 'Enter', repeat: true });
  assert.deepEqual(f.calls, ['start']); assert.equal(f.focused(), 0);
  dispatch(f.windowTarget, 'keyup', { key: 'Enter' });
  assert.equal(f.focused(), 1);
  dispatch(f.windowTarget, 'keyup', { key: 'Enter' });
  assert.equal(f.focused(), 1); assert.deepEqual(f.calls, ['start', 'finish']);
});

test('Espacio liberado mientras STT deshabilita el botón permite enfocar al llegar el texto', t => {
  const f = fixture(t); dispatch(f.button, 'keydown', { key: ' ', repeat: false });
  f.state('recording'); f.state('transcribing'); assert.equal(f.button.disabled, true);
  dispatch(f.windowTarget, 'keyup', { key: 'Enter' }); assert.deepEqual(f.calls, ['start']);
  dispatch(f.windowTarget, 'keyup', { key: ' ' }); f.state('ready');
  assert.equal(f.focused(), 1); assert.deepEqual(f.calls, ['start', 'finish']);
});

test('soltar el pointer solo del dueño termina; pérdida posterior de captura no descarta STT', t => {
  const f = fixture(t);
  dispatch(f.button, 'pointerdown', { button: 0, pointerId: 4 }); f.state('recording');
  dispatch(f.button, 'pointerup', { pointerId: 5 }); assert.deepEqual(f.calls, ['start']);
  dispatch(f.button, 'pointerup', { pointerId: 4 }); f.state('transcribing');
  dispatch(f.button, 'lostpointercapture', { pointerId: 4 }); f.state('ready');
  assert.deepEqual(f.calls, ['start', 'finish']); assert.equal(f.focused(), 1);
});

test('perder pointer durante captura cancela, mientras perderlo por el límite conserva STT', t => {
  const recording = fixture(t); dispatch(recording.button, 'pointerdown', { button: 0, pointerId: 4 }); recording.state('recording');
  dispatch(recording.button, 'lostpointercapture', { pointerId: 4 }); assert.deepEqual(recording.calls, ['start', 'cancel']);
  const transcribing = fixture(t); dispatch(transcribing.button, 'pointerdown', { button: 0, pointerId: 4 }); transcribing.state('transcribing');
  dispatch(transcribing.button, 'lostpointercapture', { pointerId: 4 }); transcribing.state('ready');
  assert.deepEqual(transcribing.calls, ['start']); assert.equal(transcribing.focused(), 1);
});

test('descartar o perder foco libera el gesto; repetición de tecla no abre otra captura', t => {
  const f = fixture(t); dispatch(f.button, 'keydown', { key: 'Enter', repeat: false }); f.state('recording');
  dispatch(f.discard, 'click'); dispatch(f.button, 'keydown', { key: 'Enter', repeat: true });
  dispatch(f.windowTarget, 'keyup', { key: 'Enter' }); assert.deepEqual(f.calls, ['start', 'cancel']);
  dispatch(f.button, 'keydown', { key: ' ', repeat: false }); f.state('recording');
  dispatch(f.windowTarget, 'blur'); dispatch(f.windowTarget, 'keyup', { key: ' ' });
  assert.deepEqual(f.calls, ['start', 'cancel', 'start', 'cancel']); assert.equal(f.focused(), 0);
});

test('botón deshabilitado, click secundario y controles destruidos no abren micrófono', t => {
  const f = fixture(t); f.button.disabled = true;
  dispatch(f.button, 'keydown', { key: 'Enter', repeat: false });
  f.button.disabled = false; dispatch(f.button, 'pointerdown', { button: 2, pointerId: 4 });
  f.controls.destroy(); dispatch(f.button, 'pointerdown', { button: 0, pointerId: 4 });
  dispatch(f.button, 'keydown', { key: ' ', repeat: false }); assert.deepEqual(f.calls, []);
});
