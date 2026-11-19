import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewerAudio } from '../src/services/viewer-audio.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
test('visor HTTP LAN no depende de randomUUID reservado a contextos seguros', t => {
  t.mock.method(crypto, 'randomUUID', () => { throw new Error('No disponible en HTTP LAN'); });
  const viewer = createViewerAudio({ token: 'fixture', output: { pause() {}, close() {} } });
  viewer.close();
});
function fixture(options = {}) {
  let channel, decode, unlock;
  const states = [], played = [], ready = [];
  const output = { unlock: options.deferredUnlock ? () => new Promise(resolve => { unlock = resolve; }) : async () => {},
    prepare: () => new Promise((resolve, reject) => { decode = { resolve, reject }; }),
    pause() {}, close() {}, playAt: async (...args) => played.push(args) };
  const request = async (url, config = {}) => {
    if (url.endsWith('/time')) return { ok: true, json: async () => ({ serverNow: Date.now() }) };
    if (url.endsWith('/events')) return { ok: true, body: new ReadableStream({ start(controller) {
      channel = controller; config.signal.addEventListener('abort', () => controller.close(), { once: true });
    } }) };
    if (url.includes('/audio/')) return { ok: true, blob: async () => new Blob(['fixture']) };
    if (url.endsWith('/ready')) { ready.push(JSON.parse(config.body)); return { ok: true }; }
    throw new Error('Ruta inesperada');
  };
  const viewer = createViewerAudio({ token: 'fixture', request, output, onState: state => states.push(state), uuid: () => 'viewer-fixture' });
  return { viewer, states, played, ready, output, decode: () => decode, unlock: () => unlock(),
    cue: data => channel.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)) };
}
test('visor cancelado durante decodificación no confirma ni reproduce audio antiguo', async () => {
  const f = fixture(), active = f.viewer.enable(); await tick();
  f.cue({ phase: 'prepared', speechId: 'old' }); await tick();
  f.cue({ phase: 'stopped' }); await tick();
  f.decode().reject(new DOMException('Descartado', 'AbortError')); await tick();
  f.cue({ phase: 'scheduled', speechId: 'old', startAt: Date.now() + 800 }); await tick();
  assert.equal(f.ready.length, 0); assert.equal(f.played.length, 0);
  assert.equal(f.states.at(-1).phase, 'ready'); f.viewer.stop(); await active;
});
test('visor confirma solo al decodificar y conserva la fecha común; suspensión informa recuperación', async () => {
  const f = fixture(), active = f.viewer.enable(); await tick();
  f.cue({ phase: 'prepared', speechId: 'current' }); await tick();
  assert.equal(f.ready.length, 0); f.decode().resolve(); await tick();
  assert.equal(f.ready[0].speechId, 'current');
  const startAt = Date.now() + 800; f.cue({ phase: 'scheduled', speechId: 'current', startAt }); await tick();
  assert.equal(f.played[0][0], startAt);
  f.output.onplaying(); assert.equal(f.states.at(-1).phase, 'playing');
  f.output.onerror(); assert.equal(f.states.at(-1).phase, 'error');
  f.viewer.stop(); await active;
});
test('desactivar mientras se desbloquea el audio no crea una conexión tardía', async () => {
  const f = fixture({ deferredUnlock: true }), active = f.viewer.enable();
  f.viewer.stop(); f.unlock(); await active;
  assert.equal(f.states.at(-1).phase, 'off');
});
