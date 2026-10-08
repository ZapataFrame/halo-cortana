import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechPlayer } from '../src/speech-player.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(t, options = {}) {
  const calls = [], states = [], audios = [], revoked = [];
  const player = createSpeechPlayer({
    uuid: () => `speech-${calls.length}-test`, now: () => 100,
    request: async (path, options) => {
      calls.push({ path, ...options, body: JSON.parse(options.body) });
      if (path.endsWith('playback')) return { ok: true, json: async () => ({ revision: 5, phase: 'speaking' }) };
      return { ok: true, blob: async () => new Blob(['wave']), headers: new Headers({ 'X-Synthesis-Ms': '42' }) };
    },
    createAudio: () => {
      const audio = { paused: true, play: async () => { audio.paused = false; await audio.onplaying(); },
        pause: () => { audio.paused = true; }, removeAttribute: () => {}, load: () => {} };
      audios.push(audio); return audio;
    },
    createUrl: () => `blob:${audios.length}`, revokeUrl: value => revoked.push(value), onState: value => states.push(value), ...options,
  });
  t.after(() => player.stop(false));
  return { player, calls, states, audios, revoked };
}

test('voz anuncia hablando solo tras reproducción, mide inicio y libera recurso al terminar', async t => {
  const { player, calls, states, audios, revoked } = fixture(t);
  await player.play('request-real');
  assert.deepEqual(states.map(s => s.phase), ['preparing', 'playing']);
  assert.equal(states[1].synthesisMs, 42); assert.equal(states[1].startMs, 0);
  assert.equal(calls[0].body.requestId, 'request-real');
  const ended = audios[0].onended; ended(); await flush();
  assert.equal(audios[0].paused, true); assert.deepEqual(revoked, ['blob:0']);
  assert.equal(calls.at(-1).body.playing, false); assert.equal(states.at(-1).phase, 'stopped');
});

test('detener durante generación descarta respuesta tardía sin crear audio', async t => {
  let resolveWave;
  const pending = new Promise(resolve => { resolveWave = resolve; });
  const { player, audios, states } = fixture(t, { request: async path => path.endsWith('playback')
    ? { ok: true, json: async () => ({}) } : pending });
  const generation = player.play('request-old'); await flush(); await player.stop();
  resolveWave({ ok: true, blob: async () => new Blob(['wave']), headers: new Headers() }); await generation;
  assert.equal(audios.length, 0); assert.equal(states.at(-1).phase, 'stopped');
});

test('autoplay bloqueado muestra reproducción manual sin anunciar habla ni conservar audio', async t => {
  const { player, states, revoked } = fixture(t, { createAudio: () => ({
    play: async () => { throw Object.assign(new Error('blocked'), { name: 'NotAllowedError' }); },
    pause() {}, removeAttribute() {}, load() {},
  }) });
  await player.play('request-real');
  assert.equal(states.some(s => s.phase === 'playing'), false);
  assert.match(states.at(-1).detail, /manualmente/); assert.equal(revoked.length, 1);
});

test('segunda lectura detiene la primera; fin antiguo y polling anterior no detienen nueva voz', async t => {
  const { player, audios, states, revoked } = fixture(t);
  await player.play('request-one'); const oldEnded = audios[0].onended;
  await player.play('request-two'); oldEnded();
  player.onPresentation({ phase: 'responded', revision: 4 }, false);
  assert.equal(audios[0].paused, true); assert.equal(audios[1].paused, false); assert.equal(revoked.length, 1);
  assert.equal(states.at(-1).phase, 'playing');
  player.onPresentation({ phase: 'processing', revision: 6 }, false);
  assert.equal(audios[1].paused, true);
});

test('volumen inválido no cambia salida; reinicio del PC detiene reproducción', async t => {
  const { player, audios } = fixture(t);
  player.setVolume(0.3); await player.play('request-real');
  assert.equal(audios[0].volume, 0.3);
  for (const value of [NaN, -1, 2]) player.setVolume(value);
  assert.equal(audios[0].volume, 0.3);
  player.setVolume(0.6); assert.equal(audios[0].volume, 0.6);
  player.onPresentation({ phase: 'idle', revision: 0 }, true); assert.equal(audios[0].paused, true);
});
