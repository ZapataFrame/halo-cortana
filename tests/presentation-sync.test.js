import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresentationSync, createPresentationTracker, validatePresentation } from '../src/presentation-sync.js';

const state = (revision = 0, extra = {}) => ({ sessionId: 'session-original', revision, phase: 'idle', animation: 'idle', ...extra });
const flush = () => new Promise(resolve => setImmediate(resolve));

test('contrato de presentación rechaza estados corruptos y campos privados', () => {
  for (const invalid of [null, [], {}, state(-1), state(1.5), state(Number.MAX_SAFE_INTEGER + 1),
    state(0, { sessionId: '' }), state(0, { phase: 'listening' }), state(0, { animation: 'unknown' }),
    { ...state(), message: 'privado' }, { ...state(), key: 'private-test-only' }]) {
    assert.throws(() => validatePresentation(invalid), /INVALID_PRESENTATION/);
  }
  const original = state(), checked = validatePresentation(original);
  original.phase = 'error';
  assert.equal(checked.phase, 'idle'); assert.equal(Object.isFrozen(checked), true);
  assert.equal(validatePresentation(state(1, { phase: 'speaking' })).phase, 'speaking');
});

test('revisiones antiguas y duplicadas no repiten transiciones; nueva sesión acepta revisión cero', () => {
  const tracker = createPresentationTracker();
  assert.equal(tracker.accept(state(5, { phase: 'processing', animation: 'gangnam' })).changed, true);
  const stale = tracker.accept(state(3, { phase: 'responded' }));
  assert.equal(stale.changed, false); assert.equal(stale.state.phase, 'processing');
  assert.equal(tracker.accept(state(5, { phase: 'processing', animation: 'gangnam' })).changed, false);
  assert.throws(() => tracker.accept(state(5, { phase: 'idle' })), /INCONSISTENT_PRESENTATION/);
  assert.equal(tracker.accept(state(6, { phase: 'responded' })).changed, true);
  const restarted = tracker.accept(state(0, { sessionId: 'session-restarted' }));
  assert.equal(restarted.changed, true); assert.equal(restarted.state.revision, 0);
});

function fixture(t, options = {}) {
  const reads = [], timers = [], states = [], connections = [];
  const client = createPresentationSync({
    read: signal => new Promise((resolve, reject) => { reads.push({ signal, resolve, reject }); }),
    onState: value => states.push(value), onConnection: value => connections.push(value),
    schedule: (callback, delay) => { const timer = { callback, delay }; timers.push(timer); return timer; },
    unschedule: timer => { if (timer) timer.cancelled = true; },
    ...options,
  });
  t.after(() => client.stop());
  return { client, reads, timers, states, connections };
}

test('polling mantiene una consulta activa y un temporizador; no reaplica duplicados', async t => {
  const { client, reads, timers, states, connections } = fixture(t);
  client.start(); client.start(); client.start();
  assert.equal(reads.length, 1); assert.equal(timers.length, 0);
  reads[0].resolve(state(1)); await flush();
  assert.equal(timers.length, 1); assert.equal(timers[0].delay, 1000);
  assert.equal(states.length, 1); assert.deepEqual(connections, [true]);
  timers[0].callback(); assert.equal(reads.length, 2); assert.equal(timers.length, 1);
  reads[1].resolve(state(1)); await flush();
  assert.equal(states.length, 1); assert.equal(timers.length, 2);
  client.stop(); assert.equal(timers[1].cancelled, true);
});

test('respuesta tardía tras parar no puede cambiar la sesión ni iniciar otra consulta', async t => {
  const { client, reads, timers, states, connections } = fixture(t);
  client.start(); client.stop();
  assert.equal(reads[0].signal.aborted, true);
  reads[0].resolve(state(10, { phase: 'processing' })); await flush();
  assert.deepEqual(states, []); assert.deepEqual(connections, []); assert.deepEqual(timers, []);
});

test('red fallida conserva el último estado y al reconectar reaplica incluso la misma revisión', async t => {
  const { client, reads, timers, states, connections } = fixture(t);
  client.start(); reads[0].resolve(state(3, { animation: 'gangnam' })); await flush();
  timers[0].callback(); reads[1].reject(new Error('red-interna-privada')); await flush();
  assert.deepEqual(connections, [true, false]); assert.equal(states.length, 1);
  timers[1].callback(); reads[2].resolve(state(3, { animation: 'gangnam' })); await flush();
  assert.deepEqual(connections, [true, false, true]); assert.equal(states.length, 2);
  assert.equal(states[1].animation, 'gangnam');
});

test('suspensión/reanudación descarta una respuesta antigua sin afectar la consulta nueva', async t => {
  let background = true;
  const { client, reads, timers, states } = fixture(t, { interval: () => background ? 3000 : 1000 });
  client.start(); reads[0].resolve(state(8)); await flush();
  assert.equal(timers[0].delay, 3000);
  timers[0].callback(); client.stop(); background = false; client.start();
  assert.equal(reads[1].signal.aborted, true); assert.equal(reads.length, 3);
  reads[1].resolve(state(99, { phase: 'error' })); await flush();
  assert.equal(states.length, 1); assert.equal(timers.length, 1);
  reads[2].resolve(state(0, { sessionId: 'session-restarted' })); await flush();
  assert.equal(states.length, 2); assert.equal(states[1].sessionId, 'session-restarted');
  assert.equal(timers[1].delay, 1000);
});

test('timeout aborta la lectura y permite recuperar sin bloquear el polling', async t => {
  let calls = 0, aborted = false;
  const { client, timers, states, connections } = fixture(t, { timeoutMs: 15,
    read: signal => {
      if (++calls !== 1) return Promise.resolve(state());
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => {
        aborted = true; reject(new Error('detalle-privado'));
      }, { once: true }));
    },
  });
  client.start();
  while (!timers.length) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(aborted, true); assert.deepEqual(connections, [false]);
  timers[0].callback(); await flush();
  assert.deepEqual(connections, [false, true]); assert.equal(states.length, 1);
});
