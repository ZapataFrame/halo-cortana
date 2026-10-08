import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createPiper, speechText } from '../server/tts.js';

const WAV = Buffer.from('RIFF0000WAVE' + '0'.repeat(40)); // Fixture de contrato; no cuenta como voz real.
async function fixture(t, extra = {}) {
  const texts = [];
  const server = createApp({ config: { provider: 'ollama', model: 'test-only' },
    reply: async () => ({ text: '**Respuesta real del fixture** para leer.' }),
    tts: { health: async () => ({ ready: true, voice: 'test-only' }), synthesize: async text => { texts.push(text); return WAV; } }, ...extra });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const state = async () => (await fetch(base + '/api/presentation')).json();
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { base, post, state, texts };
}

test('TTS solo lee respuesta guardada o prueba explícita; rechaza campos privados/origen y no muta chat', async t => {
  const { base, post, state, texts } = await fixture(t);
  const body = { requestId: 'request-real', speechId: 'speech-001' };
  assert.equal((await post('/api/tts', body)).status, 404);
  assert.equal((await post('/api/tts', { ...body, text: 'injected' })).status, 400);
  assert.equal((await post('/api/tts', body, { Origin: 'https://external.example' })).status, 403);
  assert.equal((await fetch(base + '/api/tts', { headers: { Origin: 'https://external.example' } })).status, 403);
  await post('/api/chat', { message: 'hola', requestId: body.requestId }); const before = await state();
  const response = await post('/api/tts', body);
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /audio\/wav/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), WAV);
  assert.deepEqual(texts, ['Respuesta real del fixture para leer.']); assert.deepEqual(await state(), before);
  assert.equal((await post('/api/tts/playback', { speechId: body.speechId, playing: true })).status, 200);
  assert.equal((await state()).phase, 'speaking');
  await post('/api/tts/playback', { speechId: body.speechId, playing: false }); assert.equal((await state()).phase, 'responded');
  assert.deepEqual(Object.keys(await state()).sort(), ['animation', 'phase', 'revision', 'sessionId']);
});

test('reserva de voz impide dos salidas y un control no puede detener ni renovar otra', async t => {
  const { post, state } = await fixture(t);
  const body = { requestId: 'voice-test', speechId: 'speech-owner' };
  assert.equal((await post('/api/tts', body)).status, 200);
  assert.equal((await post('/api/tts', { ...body, speechId: 'speech-other' })).status, 409);
  assert.equal((await post('/api/tts/playback', { speechId: 'speech-other', playing: true })).status, 409);
  await post('/api/tts/playback', { speechId: body.speechId, playing: true }); const before = await state();
  await post('/api/tts/playback', { speechId: 'speech-other', playing: false }); assert.deepEqual(await state(), before);
  await post('/api/tts/playback', { speechId: body.speechId, playing: false });
  assert.equal((await post('/api/tts', { ...body, speechId: 'speech-other' })).status, 200);
});

test('reset y mensaje nuevo invalidan audio; respuesta vieja no puede comenzar a hablar', async t => {
  const { post, state } = await fixture(t);
  await post('/api/tts', { requestId: 'voice-test', speechId: 'speech-owner' });
  await post('/api/tts/playback', { speechId: 'speech-owner', playing: true });
  await post('/api/chat', { requestId: 'request-new', message: 'nuevo' });
  assert.equal((await state()).phase, 'responded');
  assert.equal((await post('/api/tts/playback', { speechId: 'speech-owner', playing: true })).status, 409);
  await post('/api/tts', { requestId: 'request-new', speechId: 'speech-new' });
  await post('/api/reset', {});
  assert.equal((await post('/api/tts/playback', { speechId: 'speech-new', playing: true })).status, 409);
  assert.equal((await post('/api/tts', { requestId: 'request-new', speechId: 'speech-other' })).status, 404);
});

test('generación cancelada no entrega WAV; timeout libera reserva y no filtra error del motor', async t => {
  const tts = { health: async () => ({ ready: true }), synthesize: (_text, signal) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('ruta/texto privado')), { once: true })) };
  const { post, state } = await fixture(t, { tts, ttsTimeoutMs: 30 });
  const pending = post('/api/tts', { requestId: 'voice-test', speechId: 'speech-cancel' });
  await new Promise(resolve => setTimeout(resolve, 10));
  await post('/api/tts/playback', { speechId: 'speech-cancel', playing: false });
  assert.equal((await pending).status, 499); assert.equal((await state()).phase, 'idle');
  const timeout = await post('/api/tts', { requestId: 'voice-test', speechId: 'speech-timeout' });
  assert.equal(timeout.status, 504); assert.doesNotMatch(await timeout.text(), /privado/);
});

test('falta de instalación mantiene texto y visor; reserva expira si desaparece el control', async t => {
  const unavailable = { health: async () => ({ ready: false }), synthesize: async () => { throw new Error('TTS_NOT_CONFIGURED'); } };
  const missing = await fixture(t, { tts: unavailable });
  assert.equal((await missing.post('/api/tts', { requestId: 'voice-test', speechId: 'speech-missing' })).status, 503);
  assert.equal((await missing.state()).phase, 'idle');
  const { post, state } = await fixture(t, { speechLeaseMs: 25 });
  await post('/api/tts', { requestId: 'voice-test', speechId: 'speech-expire' });
  await post('/api/tts/playback', { speechId: 'speech-expire', playing: true });
  await new Promise(resolve => setTimeout(resolve, 45)); assert.equal((await state()).phase, 'idle');
  assert.equal((await post('/api/tts/playback', { speechId: 'speech-expire', playing: true })).status, 409);
});

test('preparación de texto no habla código/URLs; motor ausente tiene diagnóstico público seguro', async () => {
  assert.equal(speechText('Hola **equipo**. ```no ejecutar``` [Guía](https://example.test) https://example.test'), 'Hola equipo. Guía enlace');
  const health = await createPiper({ python: '/tmp/halo-no-python', model: '/tmp/halo-no-model' }).health();
  assert.equal(health.ready, false); assert.doesNotMatch(health.detail, /halo-no/);
});
