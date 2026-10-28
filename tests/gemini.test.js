import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { providerConfig, generateReply } from '../server/providers.js';

const gemini = providerConfig({ GEMINI_API_KEY: 'private-gemini-fixture' }, 'gemini');
const openai = providerConfig({ OPENAI_API_KEY: 'private-openai-fixture' }, 'openai');
async function fixture(t, options = {}) {
  const server = createApp({ config: gemini, configs: { gemini, openai }, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => { server.closeAllConnections(); server.close(); });
  const post = (path, body, origin) => fetch(base + path, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  const state = async () => (await fetch(base + '/api/presentation')).json();
  return { base, post, state };
}
const googleText = text => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }) });

test('Gemini privado: catálogo/diagnóstico/selección no divulgan claves ni permiten modelos o destinos arbitrarios', async t => {
  let checks = 0;
  const { base, post, state } = await fixture(t, { check: async selected => {
    checks++; assert.equal(selected.key, gemini.key);
    return { ready: true, verified: true, code: 'MODEL_AVAILABLE', detail: 'Modelo disponible; cuota al enviar.', key: 'private-ignored' };
  } });
  const catalog = await (await fetch(base + '/api/providers')).json();
  assert.equal(catalog.geminiModel, gemini.model); assert.equal(catalog.provider, 'gemini');
  assert.ok(!JSON.stringify(catalog).includes(gemini.key));
  const before = await state();
  for (const body of [
    { provider: 'gemini', model: 'gemini-unknown' }, { provider: 'gemini', model: gemini.model, key: 'another-key' },
    { provider: 'gemini', model: gemini.model, url: 'https://unrelated.example' },
  ]) assert.equal((await post('/api/provider', body)).status, 400);
  assert.equal((await post('/api/provider', { provider: 'gemini', model: gemini.model }, 'https://unrelated.example')).status, 403);
  assert.equal((await post('/api/provider/check', {}, 'https://unrelated.example')).status, 403);
  assert.equal(checks, 0); assert.deepEqual(await state(), before);
  const checked = await (await post('/api/provider/check', {})).json();
  assert.equal(checked.health.code, 'MODEL_AVAILABLE'); assert.equal(checks, 1);
  assert.ok(!JSON.stringify(checked).includes('private-')); assert.deepEqual(await state(), before);
});

test('HTTP + adaptador nativo Gemini conservan contexto/idempotencia; cambiar proveedor limpia historial y conserva avatar', async t => {
  const requests = [];
  const { base, post, state } = await fixture(t, { reply: (config, history, message, signal) => generateReply(config, history, message, signal, async (url, options) => {
    const body = JSON.parse(options.body); requests.push({ url, body });
    if (config.provider === 'gemini') {
      assert.equal(options.headers['x-goog-api-key'], gemini.key);
      return googleText(requests.length === 1 ? 'Hola Ana.' : 'Te llamas Ana.');
    }
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Respuesta de contrato OpenAI.' }] }] }) };
  }) });
  const first = { requestId: 'gemini-context-first', message: 'Me llamo Ana' };
  const reply = await (await post('/api/chat', first)).json();
  assert.equal(reply.reply, 'Hola Ana.'); assert.equal(reply.provider, 'gemini');
  assert.equal((await (await post('/api/chat', first)).json()).cached, true); assert.equal(requests.length, 1);
  await post('/api/chat', { requestId: 'gemini-context-next', message: '¿Cómo me llamo?' });
  assert.deepEqual(requests[1].body.contents.slice(0, 2), [
    { role: 'user', parts: [{ text: 'Me llamo Ana' }] }, { role: 'model', parts: [{ text: 'Hola Ana.' }] },
  ]);
  const presented = await state();
  assert.equal(presented.phase, 'responded'); assert.equal(presented.animation, 'idle');
  assert.deepEqual(Object.keys(presented).sort(), ['animation', 'phase', 'revision', 'sessionId']);
  assert.ok(!JSON.stringify(reply).includes(gemini.key));
  for (const config of [openai, gemini]) {
    assert.equal((await post('/api/provider', { provider: config.provider, model: config.model })).status, 200);
    const switched = await (await post('/api/chat', first)).json();
    assert.equal(switched.provider, config.provider); assert.equal(switched.cached, undefined);
    const body = requests.at(-1).body;
    assert.equal(config.provider === 'gemini' ? body.contents.length : body.input.length, 1);
  }
  assert.ok(!(await (await fetch(base + '/api/info')).text()).includes(gemini.key));
});

test('errores Gemini, clave ausente y bloqueo mantienen visor/contexto sin fallback ni detalles privados', async t => {
  const { post, state } = await fixture(t, { reply: async (_config, history, message) => {
    if (message === 'ok') { assert.deepEqual(history, []); return { text: 'Recuperado.' }; }
    throw new Error(message === 'blocked' ? 'PROVIDER_BLOCKED_RESPONSE' : message === 'empty' ? 'PROVIDER_EMPTY_RESPONSE' : `PROVIDER_HTTP_${message}`);
  } });
  for (const [message, status, code] of [
    ['400', 502, 'INVALID_REQUEST'], ['401', 502, 'AUTH_ERROR'], ['403', 502, 'ACCESS_ERROR'],
    ['404', 502, 'MODEL_UNAVAILABLE'], ['429', 503, 'RATE_LIMIT'], ['500', 502, 'PROVIDER_ERROR'],
    ['blocked', 502, 'BLOCKED_RESPONSE'], ['empty', 502, 'EMPTY_RESPONSE'],
  ]) {
    const response = await post('/api/chat', { requestId: `gemini-error-${message}`, message });
    const data = await response.json(); assert.equal(response.status, status); assert.equal(data.code, code);
    assert.ok(!JSON.stringify(data).includes(gemini.key)); assert.ok(!JSON.stringify(data).includes('GPT'));
    assert.equal((await state()).phase, 'error');
  }
  assert.equal((await post('/api/chat', { requestId: 'gemini-recovered', message: 'ok' })).status, 200);
  const absent = await fixture(t, { config: providerConfig({}, 'gemini') });
  const response = await absent.post('/api/chat', { requestId: 'gemini-no-key', message: 'hola' });
  assert.equal(response.status, 503); assert.match((await response.json()).error, /GEMINI_API_KEY/);
  assert.equal((await absent.state()).animation, 'idle');
});

test('cancelación y timeout Gemini abortan la petición y descartan texto tardío antes de recuperar', async t => {
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  const { post, state } = await fixture(t, { timeoutMs: 40,
    reply: (config, history, message, signal) => generateReply(config, history, message, signal, async (_url, options) => {
      if (message === 'cancelar') return new Promise(resolve => { release = () => resolve(googleText('No entregar.')); started(options.signal); });
      if (message === 'timeout') return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
      assert.deepEqual(history, []); return googleText('Lista.');
    }),
  });
  const pending = post('/api/chat', { requestId: 'gemini-cancelled', message: 'cancelar' });
  const signal = await ready;
  assert.equal((await state()).phase, 'processing');
  assert.equal((await post('/api/provider', { provider: 'openai', model: openai.model })).status, 409);
  await post('/api/cancel', { requestId: 'gemini-cancelled' }); assert.equal(signal.aborted, true);
  release(); assert.equal((await pending).status, 499); assert.equal((await state()).phase, 'idle');
  const timed = await post('/api/chat', { requestId: 'gemini-timeout', message: 'timeout' });
  assert.equal(timed.status, 504); assert.equal((await timed.json()).code, 'TIMEOUT');
  assert.equal((await post('/api/chat', { requestId: 'gemini-after-cancel', message: 'ok' })).status, 200);
});
