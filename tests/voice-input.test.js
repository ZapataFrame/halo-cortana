import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceInput, voiceCaptureSupport } from '../src/voice-input.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(t, extra = {}) {
  const states = [], transcripts = [], actions = [], track = { stopped: 0, stop() { this.stopped++; } };
  const stream = { getTracks: () => [track] };
  let recorder, clock = 0;
  const input = createVoiceInput({
    support: () => ({ ready: true, mime: 'audio/webm;codecs=opus' }), getMedia: async () => stream,
    createRecorder() { recorder = { state: 'inactive', start() { this.state = 'recording'; this.onstart(); },
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['audio fixture']) }); this.onstop?.(); } }; return recorder; },
    request: async (path, options) => {
      if (path === '/api/stt/session') { const body = JSON.parse(options.body); actions.push(body.action); return { ok: true, json: async () => ({ revision: 2 }) }; }
      return { ok: true, json: async () => ({ text: 'Hola Cortana.', elapsedMs: 25 }) };
    },
    stopSpeech: async () => { actions.push('stop-tts'); },
    now: () => clock, uuid: () => 'capture-test', onState: state => states.push(state), onTranscript: text => transcripts.push(text),
    ...extra,
  });
  t.after(() => input.cancel(false));
  return { input, states, transcripts, actions, track, stream, recorder: () => recorder, advance: () => { clock = 1000; } };
}

test('captura detiene TTS, apaga pistas antes de transcribir y solo entrega texto para revisión', async t => {
  const f = fixture(t); await f.input.start(); await flush();
  assert.equal(f.states.at(-1).phase, 'recording'); assert.deepEqual(f.actions, ['stop-tts', 'reserve', 'start']);
  f.advance(); f.input.finish(); assert.ok(f.track.stopped > 0); assert.equal(f.states.at(-1).phase, 'transcribing');
  await flush(); assert.deepEqual(f.transcripts, ['Hola Cortana.']); assert.equal(f.states.at(-1).phase, 'ready');
  assert.deepEqual(f.actions, ['stop-tts', 'reserve', 'start', 'stop']);
});

test('soltar mientras se pide permiso descarta pistas que llegan tarde; denegación permite recuperación', async t => {
  let grant;
  const f = fixture(t, { getMedia: () => new Promise(resolve => { grant = resolve; }) });
  const pending = f.input.start(); await flush(); f.input.finish(); grant(f.stream); await pending; await flush();
  assert.equal(f.track.stopped, 1); assert.deepEqual(f.transcripts, []); assert.equal(f.recorder(), undefined);
  const denied = fixture(t, { getMedia: async () => { throw new DOMException('denied', 'NotAllowedError'); } });
  await denied.input.start(); assert.match(denied.states.at(-1).detail, /Permiso.*denegado/); assert.deepEqual(denied.transcripts, []);
});

test('cancelación durante reserva evita reserva huérfana; durante STT descarta texto tardío', async t => {
  let releaseReserve;
  const f = fixture(t, { request: async (_path, options) => {
    const { action } = JSON.parse(options.body); f.actions.push(action);
    if (action === 'reserve') await new Promise(resolve => { releaseReserve = resolve; });
    return { ok: true, json: async () => ({ revision: 2 }) };
  } });
  const pending = f.input.start(); await flush(); const cancelled = f.input.cancel();
  releaseReserve(); await pending; await cancelled;
  assert.deepEqual(f.actions, ['stop-tts', 'reserve', 'cancel']); assert.equal(f.recorder(), undefined);
  let deliver;
  const late = fixture(t, { request: async (path, options) => path.endsWith('session')
    ? { ok: true, json: async () => ({ revision: 2 }) }
    : new Promise(resolve => { deliver = resolve; }) });
  await late.input.start(); await flush(); late.advance(); late.input.finish(); await flush();
  await late.input.cancel(); deliver({ ok: true, json: async () => ({ text: 'no aplicar' }) }); await flush();
  assert.deepEqual(late.transcripts, []);
});

test('pulsación corta, silencio del servidor, desconexión y reinicio conservan el borrador', async t => {
  const short = fixture(t); await short.input.start(); await flush(); short.input.finish();
  assert.deepEqual(short.transcripts, []); assert.match(short.states.at(-1).detail, /Mantén pulsado/);
  const f = fixture(t, { request: async path => ({ ok: path !== '/api/stt', json: async () => path === '/api/stt'
    ? { error: 'No se detectó voz.' } : { revision: 2 } }) });
  await f.input.start(); await flush(); f.advance(); f.input.finish(); await flush();
  assert.deepEqual(f.transcripts, []); assert.match(f.states.at(-1).detail, /No se detectó voz/);
  const restarted = fixture(t); await restarted.input.start(); await flush();
  restarted.input.onPresentation({ revision: 0, phase: 'idle' }, true); assert.ok(restarted.track.stopped > 0);
  const disconnected = fixture(t); await disconnected.input.start(); await flush(); disconnected.track.onended();
  assert.match(disconnected.states.at(-1).detail, /desconectó/); assert.deepEqual(disconnected.transcripts, []);
});

test('límite de tiempo apaga micrófono y permisos tardíos no reinician captura', async t => {
  const f = fixture(t, { maxMs: 25 }); await f.input.start(); await flush(); f.advance();
  await new Promise(resolve => setTimeout(resolve, 40)); await flush();
  assert.ok(f.track.stopped > 0); assert.equal(f.states.at(-1).phase, 'ready');
  let grant;
  const late = fixture(t, { permissionMs: 20, getMedia: () => new Promise(resolve => { grant = resolve; }) });
  const pending = late.input.start(); await new Promise(resolve => setTimeout(resolve, 35));
  grant(late.stream); await pending; assert.equal(late.track.stopped, 1); assert.deepEqual(late.transcripts, []);
});

test('contexto inseguro, navegador sin recorder y límite del borrador ofrecen texto manual', async t => {
  assert.equal(voiceCaptureSupport({ secure: false, media: {}, Recorder: undefined }).ready, false);
  assert.equal(voiceCaptureSupport({ secure: true, media: { getUserMedia() {} }, Recorder: undefined }).ready, false);
  const f = fixture(t, { onTranscript: () => false }); await f.input.start(); await flush(); f.advance(); f.input.finish(); await flush();
  assert.match(f.states.at(-1).detail, /borrador se conservó/);
});

test('fin inesperado del recorder libera pistas y no aplica transcripción', async t => {
  const f = fixture(t); await f.input.start(); await flush();
  f.recorder().state = 'inactive'; f.recorder().onstop();
  assert.ok(f.track.stopped > 0); assert.match(f.states.at(-1).detail, /inesperadamente/);
  assert.deepEqual(f.transcripts, []);
});
