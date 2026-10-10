import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createWhisper, AUDIO_LIMIT } from '../server/stt.js';

const WAV = Buffer.from('RIFF0000WAVE' + '0'.repeat(40)); // Fixture de transporte; no audio humano.
const id = 'capture-owner';
async function fixture(t, extra = {}) {
  let calls = 0, chats = 0;
  const server = createApp({ config: { provider: 'ollama', model: 'test-only' },
    reply: async () => { chats++; return { text: 'respuesta' }; },
    stt: { health: async () => ({ ready: true }), transcribe: async () => { calls++; return { text: 'Hola Cortana.', durationMs: 1000 }; } },
    tts: { health: async () => ({ ready: true }), synthesize: async () => WAV }, ...extra });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const session = (action, captureId = id) => post('/api/stt/session', { action, captureId });
  const audio = (bytes = WAV, headers = {}) => fetch(base + '/api/stt', { method: 'POST', headers: { 'Content-Type': 'audio/wav', 'X-Capture-Id': id, ...headers }, body: bytes });
  const state = async () => (await fetch(base + '/api/presentation')).json();
  const record = async () => { await session('reserve'); await session('start'); await session('stop'); };
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { base, post, session, audio, state, record, counts: () => ({ calls, chats }) };
}

test('STT privado: etapas reales, texto editable sin chat ni datos privados en presentación', async t => {
  const f = await fixture(t);
  assert.equal((await fetch(f.base + '/api/stt', { headers: { Origin: 'https://external.example' } })).status, 403);
  assert.equal((await f.audio(WAV, { Origin: 'https://external.example' })).status, 403);
  assert.equal((await f.audio()).status, 409);
  assert.equal((await f.post('/api/stt/session', { action: 'reserve', captureId: id, model: 'injected' })).status, 400);
  await f.session('reserve'); assert.equal((await f.state()).phase, 'idle');
  assert.equal((await f.session('reserve', 'capture-other')).status, 409);
  assert.equal((await f.session('start', 'capture-other')).status, 409);
  await f.session('cancel', 'capture-other');
  await f.session('start'); assert.equal((await f.state()).phase, 'listening');
  assert.equal((await f.post('/api/tts', { requestId: 'voice-test', speechId: 'speech-owner' })).status, 409);
  await f.session('stop'); assert.equal((await f.state()).phase, 'idle');
  const result = await f.audio(); assert.equal(result.status, 200); assert.equal((await result.json()).text, 'Hola Cortana.');
  assert.deepEqual(f.counts(), { calls: 1, chats: 0 });
  assert.deepEqual(Object.keys(await f.state()).sort(), ['animation', 'phase', 'revision', 'sessionId']);
  assert.equal((await f.audio()).status, 409); // No reenvío de audio antiguo.
});

test('formato, contenido, tamaño, silencio y fallos no incorporan texto ni filtran errores', async t => {
  const f = await fixture(t);
  for (const [bytes, headers, status] of [[WAV, { 'Content-Type': 'text/plain' }, 400],
    [Buffer.from('not audio'), {}, 400], [Buffer.alloc(AUDIO_LIMIT + 1), {}, 413]]) {
    await f.record(); assert.equal((await f.audio(bytes, headers)).status, status);
  }
  assert.deepEqual(f.counts(), { calls: 0, chats: 0 });
  for (const [code, status] of [['STT_NO_SPEECH', 422], ['STT_AUDIO_TOO_LONG', 413], ['STT_NOT_CONFIGURED', 503], ['ruta privada del motor', 502]]) {
    const bad = await fixture(t, { stt: { health: async () => ({ ready: true }), transcribe: async () => { throw new Error(code); } } });
    await bad.record(); const response = await bad.audio(); assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /ruta privada/); assert.equal((await bad.state()).phase, 'idle');
  }
});

test('cancelación, timeout y reset liberan STT, descartan resultados tardíos y permiten regrabar', async t => {
  let began, finish;
  const started = () => new Promise(resolve => { began = resolve; });
  const stt = { health: async () => ({ ready: true }), transcribe: (_bytes, signal) => new Promise((resolve, reject) => {
    finish = resolve; began?.(); signal.addEventListener('abort', () => reject(new Error('STT_CANCELLED')), { once: true });
  }) };
  const f = await fixture(t, { stt, sttTimeoutMs: 200 });
  await f.record(); let wait = started(); const cancelled = f.audio(); await wait;
  assert.equal((await f.state()).phase, 'processing'); await f.session('cancel');
  assert.equal((await cancelled).status, 499); assert.equal((await f.state()).phase, 'idle');
  await f.record(); const timeout = await f.audio(); assert.equal(timeout.status, 504);
  await f.record(); wait = started(); const reset = f.audio(); await wait;
  await f.post('/api/reset', {}); finish({ text: 'tardío', durationMs: 1000 });
  assert.equal((await reset).status, 499); assert.equal((await f.state()).phase, 'idle');
  assert.equal((await f.session('reserve')).status, 200);
});

test('voz activa bloquea micrófono; chat nuevo invalida captura y reserva abandonada expira', async t => {
  const f = await fixture(t, { captureLeaseMs: 35 });
  await f.post('/api/tts', { requestId: 'voice-test', speechId: 'speech-owner' });
  assert.equal((await f.session('reserve')).status, 409);
  await f.post('/api/tts/playback', { speechId: 'speech-owner', playing: false });
  await f.session('reserve'); await f.session('start');
  await f.post('/api/chat', { message: 'otro control', requestId: 'request-other' });
  assert.equal((await f.session('stop')).status, 409); assert.equal((await f.state()).phase, 'responded');
  await f.session('reserve'); await f.session('start');
  await new Promise(resolve => setTimeout(resolve, 55));
  assert.equal((await f.state()).phase, 'responded'); assert.equal((await f.session('stop')).status, 409);
});

test('instalación STT ausente ofrece recuperación sin exponer rutas', async () => {
  const health = await createWhisper({ python: '/tmp/halo-no-stt-python', model: '/tmp/halo-no-stt-model' }).health();
  assert.equal(health.ready, false); assert.doesNotMatch(health.detail, /halo-no/);
});

test('reset y cancel durante diagnóstico de reserva no crean un micrófono huérfano', async t => {
  let release, began;
  const stt = { health: () => new Promise(resolve => { release = resolve; began(); }), transcribe: async () => { throw new Error('no usar'); } };
  const f = await fixture(t, { stt });
  for (const action of ['reset', 'cancel']) {
    const started = new Promise(resolve => { began = resolve; });
    const pending = f.session('reserve'); await started;
    if (action === 'reset') await f.post('/api/reset', {}); else await f.session('cancel');
    release({ ready: true }); assert.equal((await pending).status, 499);
    assert.equal((await f.session('start')).status, 409); assert.equal((await f.state()).phase, 'idle');
  }
});
