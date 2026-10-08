import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const VOICE = 'es_AR-daniela-high';
const DEFAULT_MODEL = `.voice-models/es/es_AR/daniela/high/${VOICE}.onnx`;
export function createPiper({ python = resolve('.voice-venv/bin/python'), model = resolve(DEFAULT_MODEL),
  worker = resolve('server/piper_worker.py'), spawnProcess = spawn } = {}) {
  return {
    async health() {
      try { await access(python, constants.X_OK); await access(model); await access(model + '.json'); }
      catch { return { ready: false, voice: VOICE, detail: 'Falta instalar la voz local. Ejecuta npm run setup:voice en el PC.' }; }
      return { ready: true, voice: VOICE, detail: 'Daniela · español · voz local en el PC' };
    },
    async synthesize(text, signal) {
      if (!(await this.health()).ready) throw new Error('TTS_NOT_CONFIGURED');
      if (signal.aborted) throw new Error('TTS_CANCELLED');
      // El texto nunca es un argumento ni se ejecuta en una shell.
      return new Promise((resolveAudio, reject) => {
        const child = spawnProcess(python, [worker, model], { stdio: ['pipe', 'pipe', 'pipe'] });
        const chunks = []; let bytes = 0, failed = false;
        const abort = () => { child.kill('SIGKILL'); };
        signal.addEventListener('abort', abort, { once: true });
        child.stdout.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > 12 * 1024 * 1024) { failed = true; child.kill('SIGKILL'); }
          else chunks.push(chunk);
        });
        // No publicar stderr del motor: puede contener texto o rutas privadas.
        child.stderr.resume(); child.stdin.on('error', () => {});
        child.on('error', () => { signal.removeEventListener('abort', abort); reject(new Error('TTS_UNAVAILABLE')); });
        child.on('close', code => {
          signal.removeEventListener('abort', abort);
          if (signal.aborted) { reject(new Error('TTS_CANCELLED')); return; }
          const audio = Buffer.concat(chunks);
          if (code !== 0 || failed || audio.length < 44 || audio.toString('ascii', 0, 4) !== 'RIFF'
            || audio.toString('ascii', 8, 12) !== 'WAVE') { reject(new Error('TTS_UNAVAILABLE')); return; }
          resolveAudio(audio);
        });
        child.stdin.end(text, 'utf8');
      });
    },
  };
}

export function speechText(text) {
  return text.replace(/```[\s\S]*?```/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' enlace ').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 4000);
}
