import test from 'node:test';
import assert from 'node:assert/strict';
import { createClockedAudio, synchronizeClock } from '../src/services/clocked-audio.js';
import { splitSpeech, joinVoiceWavs } from '../server/tts.js';

function fixture() {
  let decode, started, stopped = 0;
  const context = { state: 'suspended', currentTime: 10, destination: {},
    resume: async () => { context.state = 'running'; }, close: async () => {},
    createGain: () => ({ connect() {}, gain: { value: 1 } }),
    decodeAudioData: () => new Promise(resolve => { decode = resolve; }),
    createBufferSource: () => ({ connect() {}, disconnect() {}, start: time => { started = time; }, stop: () => { stopped++; } }),
  };
  const audio = createClockedAudio({ createContext: () => context, clock: () => 1000 });
  return { audio, decoded: () => decode({ duration: 1 }), time: () => started, stopped: () => stopped, context };
}
test('audio se programa usando desfase del servidor; cancelar invalida decodificación pendiente', async () => {
  const f = fixture(); await f.audio.unlock();
  const preparing = f.audio.prepare(new Blob(['wav'])); await new Promise(resolve => setImmediate(resolve));
  f.decoded(); await preparing;
  await f.audio.playAt(2000, 100); assert.equal(f.time(), 10.9);
  f.audio.pause(); assert.equal(f.stopped(), 1);
  const old = f.audio.prepare(new Blob(['old'])); await new Promise(resolve => setImmediate(resolve)); f.audio.pause(); f.decoded();
  await assert.rejects(old, { name: 'AbortError' });
  await f.audio.close();
});
test('audio retrasado no se reproduce desde el inicio ni anuncia hablando', async () => {
  const f = fixture(); await f.audio.unlock();
  const preparing = f.audio.prepare(new Blob(['wav'])); await new Promise(resolve => setImmediate(resolve)); f.decoded(); await preparing;
  await assert.rejects(f.audio.playAt(700), /tarde/); assert.equal(f.time(), undefined);
  f.context.state = 'suspended'; await assert.rejects(f.audio.playAt(2000), /Activa/); await f.audio.close();
});
test('reloj usa la muestra con menor viaje y rechaza metadatos inválidos', async () => {
  let clock = 0, calls = 0;
  const offset = await synchronizeClock(async () => { calls++; clock += calls === 1 ? 100 : 10; return { ok: true, json: async () => ({ serverNow: clock + 500 }) }; }, {}, () => clock);
  assert.equal(offset, 505);
  await assert.rejects(synchronizeClock(async () => ({ ok: true, json: async () => ({}) })), /reloj/);
});
test('lecturas largas se segmentan sin perder palabras; WAV agregado conserva muestras y límite', () => {
  const text = 'Una respuesta extensa que conserva todas sus palabras. '.repeat(20).trim();
  const chunks = splitSpeech(text); assert.equal(chunks.join(' '), text); assert.ok(chunks.every(s => s.length <= 200));
  const wav = Buffer.alloc(46); wav.write('RIFF'); wav.writeUInt32LE(38, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(22050, 24); wav.writeUInt32LE(44100, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(2, 40);
  const result = joinVoiceWavs([wav, wav]); assert.equal(result.length, 48); assert.equal(result.readUInt32LE(40), 4);
  assert.throws(() => joinVoiceWavs([Buffer.alloc(45)]), /UNAVAILABLE/);
});
