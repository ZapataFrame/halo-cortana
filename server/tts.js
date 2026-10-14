import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { createVoiceWorker } from './voice-worker.js';

const VOICE = 'es_AR-daniela-high';
const DEFAULT_MODEL = `.voice-models/es/es_AR/daniela/high/${VOICE}.onnx`;
export function createPiper({ python = resolve('.voice-venv/bin/python'), model = resolve(DEFAULT_MODEL),
  worker = resolve('server/piper_worker.py'), spawnProcess, idleMs } = {}) {
  const engine = createVoiceWorker({ command: python, args: [worker, resolve(model)],
    env: { PATH: process.env.PATH, HF_HUB_OFFLINE: '1', PYTHONDONTWRITEBYTECODE: '1' }, prefix: 'TTS',
    maxInput: 16000, maxOutput: 12 * 1024 * 1024, spawnProcess, idleMs });
  return {
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
