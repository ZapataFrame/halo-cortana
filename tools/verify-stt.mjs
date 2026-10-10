// Benchmark de audio SINTÉTICO público. No abre micrófono ni demuestra aceptación humana H-16.
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createApp } from '../server/app.js';
import { createPiper } from '../server/tts.js';
import { createWhisper } from '../server/stt.js';

const small = process.argv.includes('--compare-small');

const phrases = [
  'Hola Cortana, preséntate en una frase.',
  'Explícame qué es un holograma.',
  '¿Cómo puedo ajustar el brillo de la pantalla?',
  'Quiero conversar sobre este proyecto.',
  'Mi nombre es Ana y estudio ingeniería.',
  '¿Puedes recordar mi nombre?',
  'Necesito un modelo sobre un fondo negro.',
  'Ayúdame a preparar una demostración.',
  'El micrófono está conectado a la computadora.',
  'Gracias Cortana, hasta luego.',
];
const server = createApp({ config: { provider: 'qa-only', model: 'sin-llm' },
  stt: small ? createWhisper({ model: '.stt-models/small' }) : createWhisper(),
  reply: async () => { throw new Error('Este benchmark nunca debe llamar al LLM.'); } });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function recognize(bytes, type = 'audio/wav') {
  const captureId = crypto.randomUUID();
  for (const action of ['reserve', 'start', 'stop']) {
    const response = await post('/api/stt/session', { captureId, action });
    if (!response.ok) throw new Error(`Etapa QA ${action}: ${response.status}`);
  }
  const response = await fetch(base + '/api/stt', { method: 'POST', headers: { 'Content-Type': type, 'X-Capture-Id': captureId }, body: bytes });
  return { status: response.status, ...await response.json() };
}
await mkdir('.stt-models/qa', { recursive: true });
const evidence = { date: new Date().toISOString(), source: 'Piper/Daniela: diez frases sintéticas públicas; NO micrófono humano',
  model: `Whisper ${small ? 'small' : 'base'} / CPU int8 / español`, acceptanceHuman: 'PENDIENTE: acordar y medir diez frases humanas en el PC', results: [], formats: [] };
try {
  const piper = createPiper();
  for (let i = 0; i < phrases.length; i++) {
    const bytes = await piper.synthesize(phrases[i], AbortSignal.timeout(20000));
    if (i === 0) await writeFile('.stt-models/qa/phrase.wav', bytes);
    const result = await recognize(bytes);
    evidence.results.push({ expected: phrases[i], status: result.status, text: result.text, durationMs: result.durationMs, elapsedMs: result.elapsedMs });
    console.log(JSON.stringify(evidence.results.at(-1)));
    if (result.status !== 200) throw new Error('Falló transcripción real del benchmark.');
  }
  for (const [ext, codec, type] of [['webm', 'libopus', 'audio/webm'], ['ogg', 'libopus', 'audio/ogg'], ['m4a', 'aac', 'audio/mp4']]) {
    const converted = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', '.stt-models/qa/phrase.wav', '-c:a', codec, `.stt-models/qa/phrase.${ext}`]);
    if (converted.status !== 0) throw new Error('FFmpeg no pudo preparar formato sintético QA.');
    const result = await recognize(await readFile(`.stt-models/qa/phrase.${ext}`), type);
    evidence.formats.push({ type, status: result.status, text: result.text, elapsedMs: result.elapsedMs });
  }
  const silent = Buffer.alloc(44 + 16000 * 2);
  silent.write('RIFF'); silent.writeUInt32LE(silent.length - 8, 4); silent.write('WAVEfmt ', 8); silent.writeUInt32LE(16, 16);
  silent.writeUInt16LE(1, 20); silent.writeUInt16LE(1, 22); silent.writeUInt32LE(16000, 24); silent.writeUInt32LE(32000, 28);
  silent.writeUInt16LE(2, 32); silent.writeUInt16LE(16, 34); silent.write('data', 36); silent.writeUInt32LE(silent.length - 44, 40);
  evidence.silence = await recognize(silent);
  if (evidence.silence.status !== 422) throw new Error('El silencio no se rechazó.');
  const state = await (await fetch(base + '/api/presentation')).json();
  evidence.finalState = state;
  await writeFile(`docs/reports/evidence/H-16-stt${small ? '-small' : ''}-synthetic.json`, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ formats: evidence.formats, silenceStatus: evidence.silence.status, finalPhase: state.phase }));
} finally { server.closeAllConnections(); server.close(); }
