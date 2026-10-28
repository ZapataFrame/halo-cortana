import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createRvc, createTts, validVoiceWav } from '../server/tts.js';

function wav() {
  const b = Buffer.alloc(244); b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(22050, 24);
  b.writeUInt32LE(44100, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36);
  b.writeUInt32LE(200, 40); return b;
}
const WAV = wav(); // PCM de contrato; no acredita inferencia ni calidad.
async function fixture(t, mode = 'echo', extra = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'cortana-rvc-'));
  const model = join(directory, 'voice.pth'), index = join(directory, 'voice.index');
  await writeFile(model, 'fixture'); await writeFile(index, 'fixture');
  const children = [], calls = [];
  const piper = { health: async () => ({ ready: true }), synthesize: async (text, signal) => {
    calls.push(text); signal.throwIfAborted(); return WAV;
  }, close: () => calls.push('closed') };
  const program = `let b=Buffer.alloc(0);process.stdin.on('data',c=>{b=Buffer.concat([b,c]);
    if(b.length<4||b.length<4+b.readUInt32BE(0))return;
    const n=b.readUInt32BE(0);let out=b.subarray(4,4+n);b=b.subarray(4+n);
    if(${JSON.stringify(mode)}==='hold')return;
    out=Buffer.from(out);if(${JSON.stringify(mode)}==='invalid')out.writeUInt32LE(48000,24);
    const h=Buffer.alloc(5);h.writeUInt32BE(out.length,1);process.stdout.write(Buffer.concat([h,out]));});`;
  const tts = createRvc({ python: process.execPath, model, index, piper,
    spawnProcess(command, args, options) {
      assert.equal(command, process.execPath); assert.equal(args[1], model); assert.equal(args[2], index);
      assert.equal(options.env.OPENAI_API_KEY, undefined); assert.equal(options.env.GEMINI_API_KEY, undefined);
      assert.equal(options.env.PATH, process.env.PATH);
      const child = spawn(process.execPath, ['-e', program], options); children.push(child); return child;
    }, ...extra });
  t.after(async () => { tts.close(); await rm(directory, { recursive: true, force: true }); });
  return { tts, calls, children };
}

test('RVC compone la voz base y el worker por memoria, mantiene proceso y diagnóstico sin rutas', async t => {
  const { tts, children, calls } = await fixture(t);
  assert.equal((await tts.health()).ready, true); assert.equal(tts.timeoutMs, 90000);
  for (const text of ['Hola Cortana', 'Otra respuesta']) {
    assert.deepEqual(await tts.synthesize(text, new AbortController().signal), WAV);
  }
  assert.deepEqual(calls, ['Hola Cortana', 'Otra respuesta']); assert.equal(children.length, 1);
  assert.doesNotMatch(JSON.stringify(await tts.health()), /cortana-rvc-.*voice\.pth/);
});

test('cancelación RVC mata el worker y el siguiente turno crea otro; no inicia si ya está cancelado', async t => {
  const { tts, children } = await fixture(t, 'hold');
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(tts.synthesize('cancelado', aborted.signal)); assert.equal(children.length, 0);
  for (let i = 0; i < 2; i++) {
    const controller = new AbortController(), pending = tts.synthesize('detener', controller.signal);
    while (children.length <= i) await new Promise(resolve => setImmediate(resolve));
    const ended = once(children[i], 'close'); controller.abort();
    await assert.rejects(pending, /TTS_CANCELLED/); await ended;
  }
  assert.equal(children.length, 2);
});

test('WAV inválido de RVC se rechaza y reinicia el proceso; falta de configuración no usa Piper automáticamente', async t => {
  const { tts, children } = await fixture(t, 'invalid');
  for (let i = 0; i < 2; i++) await assert.rejects(tts.synthesize('hola', new AbortController().signal), /TTS_UNAVAILABLE/);
  assert.equal(children.length, 2);
  const absent = createTts({ TTS_PROVIDER: 'rvc' }); t.after(() => absent.close());
  assert.equal((await absent.health()).ready, false);
  await assert.rejects(absent.synthesize('hola', new AbortController().signal), /TTS_NOT_CONFIGURED/);
  assert.throws(() => createTts({ TTS_PROVIDER: 'unknown' }), /TTS_PROVIDER/);
});

test('el contrato de audio rechaza canales/frecuencia/tamaño/duración incompatibles', () => {
  assert.equal(validVoiceWav(WAV), true);
  for (const offset of [4, 16, 20, 22, 24, 28, 32, 34, 40]) {
    const bad = Buffer.from(WAV); bad[offset] ^= 1; assert.equal(validVoiceWav(bad), false);
  }
  assert.equal(validVoiceWav(WAV.subarray(0, 100)), false);
  assert.equal(validVoiceWav(Buffer.alloc(44 + 21 * 22050 * 2)), false);
  assert.equal(validVoiceWav(null), false);
});
