import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

// Un proceso local y una petición activa; los modelos sobreviven entre turnos.
export function createVoiceWorker({ command, args, env, prefix, maxInput, maxOutput,
  idleMs = 60000, spawnProcess = spawn }) {
  let processState, job, idleTimer;
  const failure = suffix => new Error(`${prefix}_${suffix}`);

  function finish(error, value) {
    const current = job; job = undefined;
    if (!current) return;
    current.signal.removeEventListener('abort', current.abort);
    if (error) current.reject(error); else current.resolve(value);
  }

  function stop(suffix = 'UNAVAILABLE') {
    clearTimeout(idleTimer);
    const old = processState; processState = undefined;
    old?.child.kill('SIGKILL');
    finish(failure(suffix));
  }

  function start() {
    if (processState) return processState;
    const child = spawnProcess(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env, cwd: tmpdir() });
    const state = { child }; processState = state;
    child.stderr.resume(); // Nunca publicar texto, audio o rutas del motor.
    child.stdin.on('error', () => { if (processState === state) stop(); });
    child.on('error', () => { if (processState === state) stop(); });
    child.on('close', () => { if (processState === state) stop(); });
    child.stdout.on('data', chunk => {
      if (processState !== state) return;
      const current = job;
      if (!current) { stop(); return; }
      let offset = 0;
      if (current.headerBytes < 5) {
        const count = Math.min(5 - current.headerBytes, chunk.length);
        chunk.copy(current.header, current.headerBytes, 0, count);
        current.headerBytes += count; offset = count;
        if (current.headerBytes < 5) return;
        current.size = current.header.readUInt32BE(1);
        if (current.header[0] > 1 || !current.size || current.size > maxOutput
          || current.header[0] === 1 && current.size > 1024) { stop(); return; }
      }
      const bytes = chunk.subarray(offset);
      if (current.received + bytes.length > current.size) { stop(); return; }
      current.parts.push(bytes); current.received += bytes.length;
      if (current.received !== current.size) return;
      const value = { ok: current.header[0] === 0, bytes: Buffer.concat(current.parts, current.size) };
      finish(null, value);
      idleTimer = setTimeout(() => { if (processState === state && !job) stop(); }, idleMs);
      idleTimer.unref();
    });
    return state;
  }

  return {
    async request(bytes, signal) {
      if (signal.aborted) throw failure('CANCELLED');
      if (job) throw failure('BUSY');
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > maxInput) throw failure('INVALID_INPUT');
      clearTimeout(idleTimer);
      const state = start();
      return new Promise((resolve, reject) => {
        const current = { resolve, reject, signal, header: Buffer.alloc(5), headerBytes: 0, received: 0, parts: [] };
        current.abort = () => { if (job === current) stop('CANCELLED'); };
        job = current; signal.addEventListener('abort', current.abort, { once: true });
        if (signal.aborted) { current.abort(); return; }
        const header = Buffer.alloc(4); header.writeUInt32BE(bytes.length);
        state.child.stdin.write(Buffer.concat([header, bytes]));
      });
    },
    close() { stop('CANCELLED'); },
  };
}
