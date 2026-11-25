import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const SONG_LIMIT = 20 * 1024 * 1024;
export const SONG_MAX_SECONDS = 300;
const RATE = 22050, BYTES_PER_SECOND = RATE * 2;
const MAX_PCM = (SONG_MAX_SECONDS + 1) * BYTES_PER_SECOND;

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(BYTES_PER_SECOND, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function duration(bytes) {
  if (bytes.length < 44 || bytes.length > MAX_PCM + 44 || !bytes.subarray(0, 4).equals(Buffer.from('RIFF'))
    || bytes.subarray(8, 16).toString() !== 'WAVEfmt ' || bytes.readUInt32LE(16) !== 16
    || bytes.readUInt16LE(20) !== 1 || bytes.readUInt16LE(22) !== 1 || bytes.readUInt32LE(24) !== RATE
    || bytes.readUInt32LE(28) !== BYTES_PER_SECOND || bytes.readUInt16LE(32) !== 2 || bytes.readUInt16LE(34) !== 16
    || bytes.subarray(36, 40).toString() !== 'data' || bytes.readUInt32LE(40) !== bytes.length - 44
    || (bytes.length - 44) % 2) throw new Error('La canción guardada no es válida. Carga de nuevo un WAV o MP3.');
  const seconds = (bytes.length - 44) / BYTES_PER_SECOND;
  if (seconds < 0.1 || seconds > SONG_MAX_SECONDS) throw new Error('La canción debe durar entre 0.1 segundos y cinco minutos.');
  return Math.round(seconds * 1000);
}

// Formato de entrada fijo y protocolos acotados: nunca interpreta listas ni URL.
export function normalizeSong(bytes, signal) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 44 || bytes.length > SONG_LIMIT) throw new Error('Selecciona un WAV o MP3 de hasta 20 MiB.');
  const wave = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE';
  const mp3 = bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (!wave && !mp3) throw new Error('El archivo no contiene audio WAV o MP3 válido.');
  signal.throwIfAborted();
  return new Promise((resolveAudio, reject) => {
    const child = spawn('ffmpeg', ['-nostdin', '-v', 'error', '-threads', '1', '-protocol_whitelist', 'pipe',
      '-f', wave ? 'wav' : 'mp3', '-i', 'pipe:0', '-t', String(SONG_MAX_SECONDS + 1), '-vn',
      '-ar', String(RATE), '-ac', '1', '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1'], { stdio: ['pipe', 'pipe', 'ignore'], signal });
    const chunks = []; let size = 0, tooLarge = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    child.stdin.on('error', () => {});
    child.stdout.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_PCM) { tooLarge = true; child.kill('SIGKILL'); }
      else chunks.push(chunk);
    });
    child.on('error', error => { clearTimeout(timer); reject(new Error(error.code === 'ENOENT'
      ? 'Falta ffmpeg en el PC. Instálalo para preparar canciones.' : 'Preparación de canción cancelada.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (signal.aborted) { reject(new Error('Preparación de canción cancelada.')); return; }
      if (code !== 0 || tooLarge) { reject(new Error('No se pudo preparar el audio. Usa un WAV o MP3 válido de hasta cinco minutos.')); return; }
      try { const audio = wav(Buffer.concat(chunks)); duration(audio); resolveAudio(audio); } catch (error) { reject(error); }
    });
    child.stdin.end(bytes);
  });
}

export function createSongStore({ file = resolve('.cortana-media/song.wav'), normalize = normalizeSong } = {}) {
  return {
    async read() {
      try {
        if ((await stat(file)).size > MAX_PCM + 44) throw new Error('Canción demasiado grande. Cárgala de nuevo.');
        const audio = await readFile(file);
        return { audio, durationMs: duration(audio) };
      } catch (error) {
        if (error.code === 'ENOENT') throw new Error('Carga primero un WAV o MP3 en «Canción de Cortana» del control del PC.');
        throw error;
      }
    },
    async status() {
      try { const { durationMs } = await this.read(); return { ready: true, durationMs, detail: 'Canción preparada en este PC.' }; }
      catch (error) { return { ready: false, detail: error.message }; }
    },
    async save(bytes, signal) {
      const audio = await normalize(bytes, signal), durationMs = duration(audio);
      signal.throwIfAborted();
      await mkdir(dirname(file), { recursive: true, mode: 0o700 });
      const temp = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, audio, { mode: 0o600, flag: 'wx' });
        signal.throwIfAborted();
        await rename(temp, file);
      } finally { await rm(temp, { force: true }); }
      return { ready: true, durationMs, detail: 'Canción preparada en este PC.' };
    },
  };
}
