import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { createVoiceWorker } from './voice-worker.js';

export const AUDIO_LIMIT = 2 * 1024 * 1024;
const FORMATS = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']);
export function validateAudioType(type = '') {
  const mime = type.split(';')[0].trim().toLowerCase();
  if (!FORMATS.has(mime)) throw new Error('STT_INVALID_AUDIO');
  return mime;
}
export function validateAudio(bytes, mime) {
  const matches = mime === 'audio/webm' ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : mime === 'audio/ogg' ? bytes.subarray(0, 4).toString() === 'OggS'
    : mime === 'audio/mp4' ? bytes.subarray(4, 8).toString() === 'ftyp'
    : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE';
  if (!matches || bytes.length < 44 || bytes.length > AUDIO_LIMIT) throw new Error('STT_INVALID_AUDIO');
}

export function createWhisper({ python = resolve('.stt-venv/bin/python'), model = resolve(process.env.STT_MODEL_PATH || '.stt-models/base'),
  worker = resolve('server/whisper_worker.py'), spawnProcess, idleMs,
  device = process.env.STT_DEVICE || 'cpu', computeType = process.env.STT_COMPUTE_TYPE || (device === 'cuda' ? 'float16' : 'int8'),
  threads = Number(process.env.VOICE_CPU_THREADS || 2), beamSize = Number(process.env.STT_BEAM_SIZE || 1) } = {}) {
  if (!['cpu', 'cuda'].includes(device) || !['int8', 'float16', 'int8_float16', 'float32'].includes(computeType)
    || !Number.isInteger(threads) || threads < 1 || threads > 16 || !Number.isInteger(beamSize) || beamSize < 1 || beamSize > 5) throw new Error('Configuración STT inválida. Revisa STT_DEVICE, STT_COMPUTE_TYPE, VOICE_CPU_THREADS y STT_BEAM_SIZE.');
  const engine = createVoiceWorker({ command: python, args: [worker, resolve(model)],
    env: { PATH: process.env.PATH, HF_HUB_OFFLINE: '1', OMP_NUM_THREADS: String(threads), PYTHONDONTWRITEBYTECODE: '1',
      STT_DEVICE: device, STT_COMPUTE_TYPE: computeType, STT_BEAM_SIZE: String(beamSize), VOICE_CPU_THREADS: String(threads),
      LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || '' }, prefix: 'STT',
    maxInput: AUDIO_LIMIT, maxOutput: 20000, spawnProcess, idleMs });
  async function health() {
    try {
      await access(python, constants.X_OK);
      await Promise.all(['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt'].map(file => access(resolve(model, file))));
      return { ready: true, model: `Whisper ${model.split('/').at(-1)} / español / ${device} / ${computeType}`, detail: 'Reconocimiento local preparado. Mantén pulsado el micrófono y revisa el texto antes de enviarlo.' };
    } catch { return { ready: false, detail: 'Falta instalar reconocimiento local. Ejecuta npm run setup:stt en el PC.' }; }
  }
  async function transcribe(bytes, signal) {
    if (!(await health()).ready) throw new Error('STT_NOT_CONFIGURED');
    if (signal.aborted) throw new Error('STT_CANCELLED');
    const response = await engine.request(bytes, signal);
    if (!response.ok) {
      const code = response.bytes.toString('utf8');
      if (['STT_INVALID_AUDIO', 'STT_AUDIO_TOO_LONG', 'STT_NO_SPEECH'].includes(code)) throw new Error(code);
      engine.close(); throw new Error('STT_UNAVAILABLE');
    }
    let result;
    try { result = JSON.parse(response.bytes.toString('utf8')); } catch { /* Sin salida válida. */ }
    if (typeof result?.text !== 'string' || !result.text.trim() || result.text.length > 2000
      || !Number.isFinite(result.durationMs) || result.durationMs < 400 || result.durationMs > 16000) {
      engine.close(); throw new Error('STT_UNAVAILABLE');
    }
    return { text: result.text.trim(), durationMs: Math.round(result.durationMs) };
  }
  async function warmup(signal) {
    if (!(await health()).ready) throw new Error('STT_NOT_CONFIGURED');
    const result = await engine.request(Buffer.from('WARMUP'), signal);
    let ready;
    try { ready = JSON.parse(result.bytes.toString('utf8')).ready; } catch {}
    if (!result.ok || ready !== true) { engine.close(); throw new Error('STT_UNAVAILABLE'); }
  }
  return { health, transcribe, warmup, close: engine.close };
}
