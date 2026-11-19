import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { createVoiceWorker } from './voice-worker.js';

const VOICE = 'es_AR-daniela-high';
const DEFAULT_MODEL = `.voice-models/es/es_AR/daniela/high/${VOICE}.onnx`;
export function createPiper({ python = resolve('.voice-venv/bin/python'), model = resolve(DEFAULT_MODEL),
  worker = resolve('server/piper_worker.py'), spawnProcess, idleMs } = {}) {
  const engine = createVoiceWorker({ command: python, args: [worker, resolve(model)],
    env: { PATH: process.env.PATH, HF_HUB_OFFLINE: '1', PYTHONDONTWRITEBYTECODE: '1', VOICE_CPU_THREADS: process.env.VOICE_CPU_THREADS || '2' }, prefix: 'TTS',
    maxInput: 16000, maxOutput: 12 * 1024 * 1024, spawnProcess, idleMs });
  return {
    timeoutMs: 45000,
    async health() {
      try { await access(python, constants.X_OK); await access(model); await access(model + '.json'); }
      catch { return { ready: false, voice: VOICE, detail: 'Falta instalar la voz local. Ejecuta npm run setup:voice en el PC.' }; }
      return { ready: true, voice: VOICE, detail: 'Daniela · español · voz local en el PC' };
    },
    async synthesize(text, signal) {
      if (!(await this.health()).ready) throw new Error('TTS_NOT_CONFIGURED');
      if (signal.aborted) throw new Error('TTS_CANCELLED');
      if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new Error('TTS_INVALID_INPUT');
      const result = await engine.request(Buffer.from(text, 'utf8'), signal);
      const audio = result.bytes;
      if (!result.ok || audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF'
        || audio.toString('ascii', 8, 12) !== 'WAVE') {
        engine.close(); throw new Error('TTS_UNAVAILABLE');
      }
      return audio;
    },
    close: engine.close,
  };
}

export function speechText(text) {
  return text.replace(/```[\s\S]*?```/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' enlace ').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 4000);
}

// Contrato canónico de los workers: PCM16 mono a 22 050 Hz, hasta 20 segundos.
export function validVoiceWav(audio) {
  return Buffer.isBuffer(audio) && audio.length >= 46 && audio.length <= 44 + 20 * 22050 * 2
    && audio.toString('ascii', 0, 4) === 'RIFF' && audio.readUInt32LE(4) === audio.length - 8
    && audio.toString('ascii', 8, 16) === 'WAVEfmt ' && audio.readUInt32LE(16) === 16
    && audio.readUInt16LE(20) === 1 && audio.readUInt16LE(22) === 1 && audio.readUInt32LE(24) === 22050
    && audio.readUInt32LE(28) === 44100 && audio.readUInt16LE(32) === 2 && audio.readUInt16LE(34) === 16
    && audio.toString('ascii', 36, 40) === 'data' && audio.readUInt32LE(40) === audio.length - 44
    && (audio.length - 44) % 2 === 0;
}

export function createRvc({ python = resolve('.rvc-qa/venv/bin/python'), model = '', index = '',
  piper = createPiper({ python: resolve('.rvc-qa/piper-venv/bin/python'), model: resolve('.rvc-qa/piper-model/es_AR-daniela-high.onnx') }),
  worker = resolve('server/rvc_worker.py'), manifest = resolve('tools/rvc-qa-models.json'),
  cache = resolve('.rvc-qa/cache'), spawnProcess, idleMs, indexRate = .5, device = 'cpu', threads = 2 } = {}) {
  if (!['cpu', 'cuda:0'].includes(device) || !Number.isFinite(indexRate) || indexRate < 0 || indexRate > 1
    || !Number.isInteger(threads) || threads < 1 || threads > 16) throw new Error('Configuración RVC inválida.');
  const engine = createVoiceWorker({ command: python, args: [worker, resolve(model || '.'), index ? resolve(index) : '', manifest],
    env: { PATH: process.env.PATH, HF_HUB_OFFLINE: '1', PYTHONDONTWRITEBYTECODE: '1',
      XDG_CACHE_HOME: cache, NUMBA_CACHE_DIR: resolve(cache, 'numba'), OMP_NUM_THREADS: String(threads), OPENBLAS_NUM_THREADS: String(threads), VOICE_CPU_THREADS: String(threads),
      RVC_DEVICE: device, RVC_INDEX_RATE: String(indexRate), LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || '' },
    prefix: 'TTS', maxInput: 12 * 1024 * 1024, maxOutput: 12 * 1024 * 1024, spawnProcess, idleMs });
  return {
    timeoutMs: 90000,
    async health() {
      let ready = false;
      try {
        if (!model || indexRate > 0 && !index) throw new Error('MISSING_MODEL');
        await access(python, constants.X_OK); await access(model); if (indexRate > 0) await access(index); await access(worker); await access(manifest);
        ready = (await piper.health()).ready;
      } catch { /* Diagnóstico público sin rutas del PC. */ }
      return { ready, voice: 'cortana-rvc-v2', detail: ready
        ? `Cortana · español latino · ${device}${indexRate === 0 ? ' · sin índice (configuración explícita)' : ''}. Prepararla puede tardar varios segundos.`
        : 'Falta preparar la voz Cortana. Revisa la instalación RVC y RVC_MODEL_PATH/RVC_INDEX_PATH en .env del PC.' };
    },
    async synthesize(text, signal) {
      signal.throwIfAborted();
      if (!(await this.health()).ready) throw new Error('TTS_NOT_CONFIGURED');
      const base = await piper.synthesize(text, signal);
      signal.throwIfAborted();
      if (!validVoiceWav(base)) throw new Error('TTS_UNAVAILABLE');
      const result = await engine.request(base, signal);
      if (!result.ok || !validVoiceWav(result.bytes)) {
        engine.close(); throw new Error('TTS_UNAVAILABLE');
      }
      return result.bytes;
    },
    close() { piper.close(); engine.close(); },
  };
}

export function splitSpeech(text, limit = 200) {
  const chunks = []; let chunk = '';
  for (const word of text.split(/\s+/)) {
    if (word.length > limit) throw new Error('TTS_INVALID_INPUT');
    if (chunk && chunk.length + word.length + 1 > limit) { chunks.push(chunk); chunk = ''; }
    chunk += (chunk ? ' ' : '') + word;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export function joinVoiceWavs(parts) {
  if (!parts.length || parts.some(part => !validVoiceWav(part))) throw new Error('TTS_UNAVAILABLE');
  const size = parts.reduce((sum, part) => sum + part.length - 44, 0);
  if (size > 120 * 44100) throw new Error('TTS_TOO_LONG');
  const header = Buffer.from(parts[0].subarray(0, 44)); header.writeUInt32LE(36 + size, 4); header.writeUInt32LE(size, 40);
  return Buffer.concat([header, ...parts.map(part => part.subarray(44))]);
}

export function createTts(env = process.env) {
  const provider = env.TTS_PROVIDER?.trim() || 'piper';
  if (!['piper', 'rvc'].includes(provider)) throw new Error('TTS_PROVIDER debe ser piper o rvc.');
  const indexRate = Number(env.RVC_INDEX_RATE ?? .5);
  const engine = provider === 'piper' ? createPiper() : createRvc({
    model: env.RVC_MODEL_PATH?.trim() || resolve('.rvc-qa/voices/cortana/model.pth'),
    index: indexRate === 0 ? '' : env.RVC_INDEX_PATH?.trim() || resolve('.rvc-qa/voices/cortana/model.index'),
    device: env.RVC_DEVICE || 'cpu', threads: Number(env.VOICE_CPU_THREADS || 2), indexRate });
  return {
    ...engine,
    async synthesize(text, signal) {
      if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new Error('TTS_INVALID_INPUT');
      const parts = [];
      for (const chunk of splitSpeech(text)) { signal.throwIfAborted(); parts.push(await engine.synthesize(chunk, signal)); }
      return joinVoiceWavs(parts);
    },
    async warmup(signal) { await engine.synthesize('Hola.', signal); },
  };
}
