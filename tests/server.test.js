import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.js';

const config = { provider: 'ollama', model: 'test-only' };
async function fixture(t, options = {}) {
  const server = createApp({ config, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => { server.closeAllConnections(); server.close(); });
  const post = (path, body, extra = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { server, base, post };
}

test('fallo de lectura responde con error completo y permite recuperar el recurso', async t => {
  const root = await mkdtemp(join(tmpdir(), 'hologram-static-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'index.html'), '<html>visor real</html>');
  let fail = true, reads = 0;
  const { base } = await fixture(t, { root, readAsset: async target => {
    reads++;
    if (fail) throw new Error('ruta-interna-privada');
    return readFile(target);
  } });
  const failed = await fetch(base + '/hologram', { signal: AbortSignal.timeout(2000) });
  assert.equal(failed.status, 404);
  assert.deepEqual(await failed.json(), { error: 'Archivo no disponible.' });
  fail = false;
  const recovered = await fetch(base + '/hologram');
  assert.equal(recovered.status, 200);
  assert.equal(await recovered.text(), '<html>visor real</html>');
  const head = await fetch(base + '/hologram', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal(reads, 2);
});

test('entrada inválida, JSON corrupto y solicitud grande no invocan el proveedor', async t => {
  let calls = 0;
  const { post } = await fixture(t, { reply: async () => { calls++; return { text: 'test' }; } });
  for (const body of ['{bad', { message: '', requestId: 'request-01' }, { message: 'x'.repeat(2001), requestId: 'request-01' }, { message: 'hola', requestId: 'bad' }, { message: 'x'.repeat(13000), requestId: 'request-01' }]) {
    assert.equal((await post('/api/chat', body)).status, 400);
  }
  assert.equal(calls, 0);
});

test('chat rechaza origen externo y Host extraño; no sirve secretos ni fuente', async t => {
  const { base, post } = await fixture(t);
  const body = { message: 'hola', requestId: 'request-01' };
  assert.equal((await post('/api/chat', body, { Origin: 'https://unrelated.example' })).status, 403);
  // fetch sustituye Host por el de su URL; usar HTTP directo para este caso.
  const hostStatus = await new Promise((resolve, reject) => {
    const req = request(base + '/api/chat', { method: 'POST', headers: { Host: 'unrelated.example', 'Content-Type': 'application/json' } }, response => { response.resume(); resolve(response.statusCode); });
    req.on('error', reject); req.end(JSON.stringify(body));
  });
  assert.equal(hostStatus, 403);
  for (const path of ['/.env', '/server/providers.js', '/package.json', '/models/../../.env']) assert.equal((await fetch(base + path)).status, 404);
  const state = await (await fetch(base + '/api/presentation')).json();
  assert.deepEqual(Object.keys(state).sort(), ['animation', 'phase', 'revision', 'sessionId']);
});

test('baile es independiente del proveedor, valida catálogo y conserva estado ante entradas inválidas', async t => {
  const { post, base } = await fixture(t, { config: { provider: 'openai', model: 'gpt-4.1-mini', key: '' } });
  assert.equal((await post('/api/chat', { message: 'hola', requestId: 'request-no-key' })).status, 503);
  const initial = await (await fetch(base + '/api/presentation')).json();
  assert.equal(initial.phase, 'error'); assert.equal(initial.animation, 'idle');
  assert.equal((await post('/api/animation', { animation: 'gangnam' })).status, 200);
  const dancing = await (await fetch(base + '/api/presentation')).json();
  assert.equal(dancing.animation, 'gangnam'); assert.equal(dancing.phase, 'error');
  for (const animation of ['unknown', '../private', null, { value: 'gangnam' }]) {
    assert.equal((await post('/api/animation', { animation })).status, 400);
    assert.deepEqual(await (await fetch(base + '/api/presentation')).json(), dancing);
  }
  assert.equal((await post('/api/animation', { animation: 'idle' })).status, 200);
  assert.equal((await fetch(base + '/api/presentation')).status, 200);
});

test('errores de credencial o cuota son accionables y no incorporan historial', async t => {
  let seen;
  const { post } = await fixture(t, { reply: async (_config, history, message) => {
    seen = history;
    if (message === 'ok') return { text: 'ok' };
    throw new Error(`PROVIDER_HTTP_${message}`);
  } });
  for (const [code, status, publicCode] of [['401', 502, 'AUTH_ERROR'], ['403', 502, 'ACCESS_ERROR'], ['429', 503, 'RATE_LIMIT']]) {
    const response = await post('/api/chat', { message: code, requestId: `request-${code}` });
    assert.equal(response.status, status); assert.equal((await response.json()).code, publicCode);
  }
  assert.equal((await post('/api/chat', { message: 'ok', requestId: 'request-ok' })).status, 200);
  assert.deepEqual(seen, []);
});

test('cancelación descarta respuesta tardía y no incorpora historial parcial', async t => {
  let release, seenHistory;
  const { base, post } = await fixture(t, { reply: async (_config, history, message) => {
    if (message === 'demorada') return new Promise(resolve => { release = () => resolve({ text: 'tardía' }); });
    seenHistory = history; return { text: 'nueva' };
  } });
  const pending = post('/api/chat', { message: 'demorada', requestId: 'request-old' });
  while (!release) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal((await post('/api/chat', { message: 'otra', requestId: 'request-busy' })).status, 409);
  await post('/api/cancel', { requestId: 'request-old' });
  release(); assert.equal((await pending).status, 499);
  assert.equal((await post('/api/chat', { message: 'nueva', requestId: 'request-new' })).status, 200);
  assert.deepEqual(seenHistory, []);
  assert.equal((await (await fetch(base + '/api/presentation')).json()).phase, 'responded');
});

test('reintento con mismo ID no duplica generación ni cambia el mensaje', async t => {
  let calls = 0;
  const { post } = await fixture(t, { reply: async () => { calls++; return { text: 'respuesta' }; } });
  const body = { message: 'hola', requestId: 'request-idem' };
  assert.equal((await post('/api/chat', body)).status, 200);
  const retry = await (await post('/api/chat', body)).json();
  assert.equal(retry.cached, true); assert.equal(calls, 1);
  assert.equal((await post('/api/chat', { ...body, message: 'otro' })).status, 409);
});

test('timeout no deja el chat bloqueado y error del proveedor no expone secretos', async t => {
  let calls = 0;
  const { post } = await fixture(t, { timeoutMs: 15, reply: async (_config, _history, _message, signal) => {
    if (++calls === 1) return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('test-abort')), { once: true }));
    throw new Error('super-secret-provider-key');
  } });
  assert.equal((await post('/api/chat', { message: 'larga', requestId: 'request-time' })).status, 504);
  const response = await post('/api/chat', { message: 'otra', requestId: 'request-next' });
  assert.equal(response.status, 502); assert.ok(!(await response.text()).includes('super-secret'));
});

test('conversación conserva seis pares recientes y reiniciar elimina el contexto', async t => {
  let latest;
  const { post } = await fixture(t, { reply: async (_config, history) => { latest = history; return { text: 'ok' }; } });
  for (let i = 0; i < 9; i++) await post('/api/chat', { message: `mensaje${i}`, requestId: `request-${i}` });
  assert.equal(latest.length, 12); assert.equal(latest[0].content, 'mensaje2');
  await post('/api/reset', {});
  await post('/api/chat', { message: 'nuevo', requestId: 'request-reset' });
  assert.deepEqual(latest, []);
});

const selectable = {
  openai: { provider: 'openai', model: 'gpt-4.1-mini', key: 'test-private-key' },
  ollama: { provider: 'ollama', model: 'phi4-mini:latest', url: 'http://127.0.0.1:11434' },
};

test('selector cambia GPT→Qwen→GPT, limpia contexto/cache y conserva baile sin exponer secretos', async t => {
  const seen = [];
  const { post, base } = await fixture(t, { config: selectable.openai, configs: selectable,
    models: async () => ['qwen2.5:32b', 'llama3.1:latest'],
    reply: async (selected, history) => { seen.push({ ...selected, history }); return { text: 'ok' }; },
  });
  const catalog = await (await fetch(base + '/api/providers')).json();
  assert.deepEqual(catalog.localModels, ['qwen2.5:32b', 'llama3.1:latest']);
  assert.ok(!JSON.stringify(catalog).includes('test-private-key'));
  await post('/api/animation', { animation: 'gangnam' });
  const message = { message: 'hola', requestId: 'request-shared' };
  await post('/api/chat', message);
  await post('/api/chat', { message: 'seguimiento', requestId: 'request-followup' });
  assert.equal(seen[1].history.length, 2);
  for (const selection of [{ provider: 'ollama', model: 'qwen2.5:32b' }, { provider: 'openai', model: 'gpt-4.1-mini' }]) {
    assert.equal((await post('/api/provider', selection)).status, 200);
    const response = await (await post('/api/chat', message)).json();
    assert.equal(response.model, selection.model); assert.equal(response.cached, undefined);
    assert.deepEqual(seen.at(-1).history, []);
  }
  assert.equal(seen.at(-1).key, 'test-private-key');
  assert.equal((await (await fetch(base + '/api/presentation')).json()).animation, 'gangnam');
});

test('selector rechaza entradas, origen y Host inválidos; caída local no cambia proveedor ni historial', async t => {
  let unavailable = false, seen;
  const { post, base } = await fixture(t, { config: selectable.openai, configs: selectable,
    models: async () => { if (unavailable) throw new Error('private-detail'); return ['qwen2.5:32b']; },
    reply: async (_config, history) => { seen = history; return { text: 'ok' }; },
  });
  await post('/api/chat', { message: 'primero', requestId: 'request-first' });
  const before = await (await fetch(base + '/api/presentation')).json();
  for (const selection of [null, {}, { provider: 'unknown', model: 'x' }, { provider: 'ollama', model: 'missing' },
    { provider: 'openai', model: 'other' }, { provider: 'ollama', model: 'qwen2.5:32b', url: 'http://example.com' }]) {
    assert.equal((await post('/api/provider', selection)).status, 400);
  }
  const selection = { provider: 'ollama', model: 'qwen2.5:32b' };
  assert.equal((await post('/api/provider', selection, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await fetch(base + '/api/providers', { headers: { Origin: 'https://example.com' } })).status, 403);
  unavailable = true;
  assert.equal((await post('/api/provider', selection)).status, 503);
  const catalog = await (await fetch(base + '/api/providers')).json();
  assert.equal(catalog.provider, 'openai'); assert.deepEqual(catalog.localModels, []);
  assert.ok(!JSON.stringify(catalog).includes('private-detail'));
  assert.deepEqual(await (await fetch(base + '/api/presentation')).json(), before);
  await post('/api/chat', { message: 'segundo', requestId: 'request-second' });
  assert.equal(seen.length, 2);
});

test('cambiar modelo durante generación o consulta concurrente no mezcla respuestas', async t => {
  let releaseReply, releaseModels;
  const { post } = await fixture(t, { config: selectable.openai, configs: selectable,
    models: async () => new Promise(resolve => { releaseModels = () => resolve(['qwen2.5:32b']); }),
    reply: async () => new Promise(resolve => { releaseReply = () => resolve({ text: 'respuesta original' }); }),
  });
  const switching = post('/api/provider', { provider: 'ollama', model: 'qwen2.5:32b' });
  while (!releaseModels) await new Promise(resolve => setTimeout(resolve, 5));
  const pending = post('/api/chat', { message: 'hola', requestId: 'request-active' });
  while (!releaseReply) await new Promise(resolve => setTimeout(resolve, 5));
  releaseModels(); assert.equal((await switching).status, 409);
  assert.equal((await post('/api/provider', { provider: 'openai', model: 'gpt-4.1-mini' })).status, 409);
  releaseReply(); assert.equal((await (await pending).json()).provider, 'openai');
});
