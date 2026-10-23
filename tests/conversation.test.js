import test from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useConversation } from '../src/composables/useConversation.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(options) {
  const scope = effectScope();
  const chat = scope.run(() => useConversation(options));
  return { chat, close: () => scope.stop() };
}

test('Vue conserva ID de reintento y no duplica mensajes; detiene audio antes del chat', async () => {
  const events = [], ids = []; let calls = 0;
  const f = fixture({ beforeAction: async () => events.push('stop'), request: async (path, options) => {
    events.push('request'); ids.push(options.body.requestId);
    if (++calls === 1) throw new Error('Sin conexión');
    return { reply: 'Respuesta de prueba', model: 'fixture', elapsedMs: 20 };
  } });
  await f.chat.send('Hola'); assert.equal(f.chat.messages.value.length, 1);
  await f.chat.send('Hola'); assert.equal(f.chat.messages.value.length, 2);
  assert.equal(ids[0], ids[1]); assert.deepEqual(events, ['stop', 'request', 'stop', 'request']);
  assert.equal(f.chat.busy.value, false); f.close();
});

test('cancelar y cerrar el ámbito Vue descartan respuestas tardías y permiten recuperar', async () => {
  const pending = [];
  const f = fixture({ request: async (path, options) => {
    if (path === '/api/cancel') return {};
    return new Promise(resolve => pending.push({ resolve, signal: options.signal }));
  } });
  const first = f.chat.send('Primera'); await flush();
  await f.chat.cancel(); assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve({ reply: 'Entrega antigua' }); await first;
  assert.equal(f.chat.messages.value.filter(m => m.role === 'assistant').length, 0);
  const second = f.chat.send('Segunda'); await flush();
  pending[1].resolve({ reply: 'Vigente', model: 'fixture', elapsedMs: 10 }); await second;
  assert.equal(f.chat.messages.value.at(-1).text, 'Vigente');
  const third = f.chat.send('Tercera'); await flush(); f.close();
  assert.equal(pending[2].signal.aborted, true); pending[2].resolve({ reply: 'Fuera de ámbito' }); await third;
  assert.equal(f.chat.messages.value.at(-1).text, 'Tercera');
});

test('el flujo Vue rechaza entradas vacías/excesivas y peticiones simultáneas', async () => {
  let finish, calls = 0;
  const f = fixture({ request: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  await f.chat.send(' '); await f.chat.send('x'.repeat(2001)); assert.equal(calls, 0);
  const job = f.chat.send('Una'); await flush(); await f.chat.send('Otra'); assert.equal(calls, 1);
  finish({ reply: 'Lista' }); await job; f.close();
});

test('reiniciar bloquea envíos concurrentes y salir invalida su resultado', async () => {
  let finish, calls = 0, signal;
  const f = fixture({ request: (_path, options) => { calls++; signal = options.signal; return new Promise(resolve => { finish = resolve; }); } });
  const reset = f.chat.reset(); await flush();
  assert.equal(f.chat.resetting.value, true); await f.chat.send('Concurrente'); assert.equal(calls, 1);
  f.close(); assert.equal(signal.aborted, true); finish({}); await reset;
  assert.equal(f.chat.status.value, ''); assert.equal(f.chat.resetting.value, false);
});
