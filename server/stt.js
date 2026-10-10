import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

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

export function createWhisper({ python = resolve('.stt-venv/bin/python'), model = resolve('.stt-models/base'), worker = resolve('server/whisper_worker.py') } = {}) {
  async function health() {
    try {
      await access(python, constants.X_OK);
      await Promise.all(['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt'].map(file => access(resolve(model, file))));
      return { ready: true, model: 'Whisper base / español / CPU', detail: 'Reconocimiento local preparado. Mantén pulsado el micrófono y revisa el texto antes de enviarlo.' };
    } catch { return { ready: false, detail: 'Falta instalar reconocimiento local. Ejecuta npm run setup:stt en el PC.' }; }
  }
  async function transcribe(bytes, signal) {
    if (!(await health()).ready) throw new Error('STT_NOT_CONFIGURED');
    if (signal.aborted) throw new Error('STT_CANCELLED');
    return new Promise((resolveResult, reject) => {
      const child = spawn(python, [worker, model], { stdio: ['pipe', 'pipe', 'pipe'],
        env: { PATH: process.env.PATH, HF_HUB_OFFLINE: '1', OMP_NUM_THREADS: '4' } });
      const chunks = []; let size = 0, overflow = false;
      const abort = () => child.kill('SIGKILL');
      signal.addEventListener('abort', abort, { once: true });
      child.stdin.on('error', () => {}); child.stderr.resume();
      child.stdout.on('data', chunk => { size += chunk.length; if (size > 20000) { overflow = true; abort(); } else chunks.push(chunk); });
      child.on('error', () => { signal.removeEventListener('abort', abort); reject(new Error('STT_UNAVAILABLE')); });
      child.on('close', code => {
        signal.removeEventListener('abort', abort);
        if (signal.aborted) { reject(new Error('STT_CANCELLED')); return; }
        let result;
        try { result = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* Sin salida válida. */ }
        if (!overflow && code === 2 && ['STT_INVALID_AUDIO', 'STT_AUDIO_TOO_LONG', 'STT_NO_SPEECH'].includes(result?.error)) {
          reject(new Error(result.error)); return;
        }
        if (code !== 0 || overflow || typeof result?.text !== 'string' || !result.text.trim() || result.text.length > 2000
          || !Number.isFinite(result.durationMs) || result.durationMs < 400 || result.durationMs > 16000) {
          reject(new Error('STT_UNAVAILABLE')); return;
        }
        resolveResult({ text: result.text.trim(), durationMs: Math.round(result.durationMs) });
      });
      child.stdin.end(bytes);
    });
  }
  return { health, transcribe };
}
