import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

const WAV = Buffer.alloc(44 + 44100); // Contrato sintético: no inferencia real.
async function fixture(t, options = {}) {
  const server = createApp({ config: { provider: 'ollama', model: 'fixture' },
    tts: { synthesize: async () => WAV, close() {} }, relayOptions: { delayMs: 100, readyTimeoutMs: 2000 }, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, extra = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  const token = (await (await fetch(base + '/api/voice/link')).json()).token;
  const headers = { Authorization: `Bearer ${token}`, 'X-Voice-Client': 'viewer-fixture-001' };
  const controller = new AbortController(); t.after(() => controller.abort());
  return { base, post, headers, controller, token };
}
async function stream(f) {
  const response = await fetch(f.base + '/api/voice/events', { headers: f.headers, signal: f.controller.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader(); let text = '';
  return async () => {
    while (!text.includes('\n\n')) { const chunk = await reader.read(); assert.equal(chunk.done, false); text += new TextDecoder().decode(chunk.value); }
    const end = text.indexOf('\n\n'), frame = text.slice(0, end); text = text.slice(end + 2);
    return JSON.parse(frame.slice(6));
  };
}
const speech = { requestId: 'voice-test', speechId: 'speech-relay-001' };

test('voz del visor requiere autorización y origen; presentación pública no divulga audio ni token', async t => {
  const f = await fixture(t);
  for (const path of ['/api/voice/events', '/api/voice/time', `/api/voice/audio/${speech.speechId}`]) {
    assert.equal((await fetch(f.base + path)).status, 403);
    assert.equal((await fetch(f.base + path, { headers: { ...f.headers, Origin: 'https://external.example' } })).status, 403);
  }
  assert.equal((await fetch(f.base + '/api/voice/link', { headers: { Origin: 'https://external.example' } })).status, 403);
  const state = await (await fetch(f.base + '/api/presentation')).json();
  assert.deepEqual(Object.keys(state).sort(), ['animation', 'phase', 'revision', 'sessionId']);
  assert.ok(!JSON.stringify(state).includes(f.token));
  const other = await fixture(t);
  assert.equal((await fetch(other.base + '/api/voice/time', { headers: f.headers })).status, 403, 'Reiniciar invalida el enlace anterior');
});

test('PC espera audio preparado por el visor, comparte bytes y fecha, y cancelar elimina el audio', async t => {
  const f = await fixture(t), next = await stream(f);
  assert.equal((await next()).phase, 'stopped');
  const audio = await f.post('/api/tts', speech); assert.equal(audio.status, 200);
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()), WAV);
  const prepared = await next(); assert.equal(prepared.phase, 'prepared');
  assert.equal((await (await fetch(f.base + '/api/presentation')).json()).phase, 'idle');
  assert.equal((await f.post('/api/tts', { ...speech, speechId: 'other-speech-01' })).status, 409);
  const pending = f.post('/api/tts/schedule', { speechId: speech.speechId });
  assert.equal((await f.post('/api/voice/ready', { clientId: 'viewer-fixture-001', speechId: 'stale-speech-001' }, f.headers)).status, 409);
  assert.equal((await f.post('/api/voice/ready', { clientId: 'viewer-fixture-001', speechId: speech.speechId }, f.headers)).status, 200);
  const scheduled = await (await pending).json();
  assert.ok(scheduled.startAt > scheduled.serverNow);
  assert.equal((await next()).startAt, scheduled.startAt);
  const peerAudio = await fetch(f.base + `/api/voice/audio/${speech.speechId}`, { headers: f.headers });
  assert.deepEqual(Buffer.from(await peerAudio.arrayBuffer()), WAV);
  assert.equal((await (await fetch(f.base + '/api/presentation')).json()).phase, 'idle', 'Programar todavía no confirma reproducción');
  await f.post('/api/tts/playback', { speechId: speech.speechId, playing: true });
  assert.equal((await (await fetch(f.base + '/api/presentation')).json()).phase, 'speaking');
  await f.post('/api/tts/playback', { speechId: speech.speechId, playing: false });
  assert.equal((await next()).phase, 'stopped');
  assert.equal((await fetch(f.base + `/api/voice/audio/${speech.speechId}`, { headers: f.headers })).status, 404);
});

test('visor sin confirmar provoca recuperación sin reproducir a destiempo ni conservar la reserva', async t => {
  const f = await fixture(t, { relayOptions: { readyTimeoutMs: 80 } }), next = await stream(f); await next();
  await f.post('/api/tts', speech); await next();
  assert.equal((await f.post('/api/tts/schedule', { speechId: speech.speechId })).status, 409);
  assert.equal((await next()).phase, 'stopped');
  assert.equal((await fetch(f.base + `/api/voice/audio/${speech.speechId}`, { headers: f.headers })).status, 404);
  assert.equal((await f.post('/api/tts', { ...speech, speechId: 'speech-recovered-001' })).status, 200);
});

test('cancelar mientras el visor prepara descarta el horario antiguo y permite nueva lectura', async t => {
  const f = await fixture(t, { relayOptions: { readyTimeoutMs: 2000 } }), next = await stream(f); await next();
  await f.post('/api/tts', speech); await next();
  const waiting = f.post('/api/tts/schedule', { speechId: speech.speechId });
  await f.post('/api/tts/playback', { speechId: speech.speechId, playing: false });
  assert.equal((await waiting).status, 409);
  assert.equal((await next()).phase, 'stopped');
  assert.equal((await f.post('/api/tts', { ...speech, speechId: 'speech-after-cancel' })).status, 200);
});

test('desconectar el control mientras espera al visor cancela el audio compartido', async t => {
  const f = await fixture(t), next = await stream(f); await next();
  await f.post('/api/tts', speech); await next();
  const controller = new AbortController();
  const waiting = fetch(f.base + '/api/tts/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speechId: speech.speechId }), signal: controller.signal });
  // Dejar que el servidor acepte el POST antes de cerrar el control.
  await fetch(f.base + '/api/presentation');
  controller.abort(); await assert.rejects(waiting, { name: 'AbortError' });
  assert.equal((await next()).phase, 'stopped');
  assert.equal((await fetch(f.base + `/api/voice/audio/${speech.speechId}`, { headers: f.headers })).status, 404);
});

test('preparar motores excluye otra preparación y micrófono, sin anunciar hablando', async t => {
  let finish;
  const f = await fixture(t, {
    stt: { warmup: () => new Promise(resolve => { finish = resolve; }), close() {} },
    tts: { warmup: async () => {}, close() {} },
  });
  const warming = f.post('/api/engines/warmup', {});
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  assert.equal((await f.post('/api/engines/warmup', {})).status, 409);
  assert.equal((await f.post('/api/stt/session', { captureId: 'capture-during-warmup', action: 'reserve' })).status, 409);
  assert.equal((await (await fetch(f.base + '/api/presentation')).json()).phase, 'idle');
  finish(); const result = await (await warming).json(); assert.equal(result.stt.ready, true); assert.equal(result.tts.ready, true);
});

test('un visor sin latido expira y deja de bloquear la fecha de reproducción', async t => {
  let clock = 0;
  const f = await fixture(t, { relayOptions: { now: () => clock, viewerLeaseMs: 40, readyTimeoutMs: 1000 } });
  const next = await stream(f); await next();
  await f.post('/api/tts', speech); await next();
  clock = 50;
  const scheduled = await f.post('/api/tts/schedule', { speechId: speech.speechId });
  assert.equal(scheduled.status, 200);
  assert.equal((await scheduled.json()).phase, 'scheduled');
});
