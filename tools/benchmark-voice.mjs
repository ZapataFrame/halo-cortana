// Mediciones sintéticas públicas; no abre micrófono y solo consulta el LLM con --llm.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, totalmem } from 'node:os';
import { createPiper, createTts } from '../server/tts.js';
import { createWhisper } from '../server/stt.js';
import { providerConfig, generateReply } from '../server/providers.js';

const args = process.argv.slice(2);
if (args.some(arg => !['--llm', '--compare-small'].includes(arg))) throw new Error('Opciones: --llm, --compare-small');
const output = '.rvc-qa/output'; await mkdir(output, { recursive: true });
const evidence = { date: new Date().toISOString(), source: 'Frases sintéticas públicas; no micrófono humano ni prueba RTX 3060.',
  hardware: { cpu: cpus()[0]?.model, logicalCpus: cpus().length, ramGiB: Math.round(totalmem() / 2 ** 30) },
  profile: { sttDevice: process.env.STT_DEVICE || 'cpu', sttCompute: process.env.STT_COMPUTE_TYPE || 'int8',
    beamSize: Number(process.env.STT_BEAM_SIZE || 1), threads: Number(process.env.VOICE_CPU_THREADS || 2),
    tts: process.env.TTS_PROVIDER || 'piper', rvcDevice: process.env.RVC_DEVICE || 'cpu', indexRate: Number(process.env.RVC_INDEX_RATE ?? .5) },
  tts: [], stt: [], questions: [] };
const tts = createTts(), piper = createPiper(), stt = createWhisper(); let small;
const measure = async action => { const started = performance.now(); const result = await action(); return { result, elapsedMs: Math.round(performance.now() - started) }; };
const phrases = ['Hola Cortana. Ayúdame a preparar una exposición.', 'Mi nombre es Ana y estudio ingeniería.', 'La voz necesita una respuesta clara y breve.'];
try {
  evidence.preparation = {};
  for (const [name, engine] of [['stt', stt], ['tts', tts]]) {
    const prepared = await measure(() => engine.warmup(AbortSignal.timeout(180000)));
    evidence.preparation[name] = { elapsedMs: prepared.elapsedMs };
    console.log(JSON.stringify({ preparation: { engine: name, elapsedMs: prepared.elapsedMs } }));
  }
  for (let i = 0; i < phrases.length; i++) {
    const generated = await measure(() => tts.synthesize(phrases[i], AbortSignal.timeout(90000)));
    const audio = generated.result;
    const row = { run: i, expected: phrases[i], synthesisMs: generated.elapsedMs, durationMs: Math.round((audio.length - 44) / 44.1) };
    evidence.tts.push(row); console.log(JSON.stringify({ tts: row }));
    if (i === 0) await writeFile(`${output}/voice-check.wav`, audio);
    // La comparación STT siempre usa la misma voz base, independientemente del timbre RVC.
    const base = await piper.synthesize(phrases[i], AbortSignal.timeout(piper.timeoutMs));
    if (i === 0) await writeFile(`${output}/stt-reference.wav`, base);
    const recognized = await measure(() => stt.transcribe(base, AbortSignal.timeout(60000)));
    const result = { run: i, expected: phrases[i], ...recognized.result, elapsedMs: recognized.elapsedMs };
    evidence.stt.push(result); console.log(JSON.stringify({ stt: result }));
  }
  if (args.includes('--compare-small')) {
    small = createWhisper({ model: '.stt-models/small' }); evidence.small = [];
    const audio = await readFile(`${output}/stt-reference.wav`);
    for (let i = 0; i < 2; i++) {
      const measured = await measure(() => small.transcribe(audio, AbortSignal.timeout(90000)));
      evidence.small.push({ run: i, ...measured.result, elapsedMs: measured.elapsedMs });
      console.log(JSON.stringify({ small: evidence.small.at(-1) }));
    }
  }
  if (args.includes('--llm')) {
    const config = providerConfig(), history = [];
    evidence.provider = { id: config.provider, model: config.model };
    for (const question of ['Me llamo Ana. Preséntate en una frase.', '¿Cómo me llamo?', '¿Puedes encender las luces de mi casa ahora?', '¿Qué compré el martes pasado?']) {
      const measured = await measure(() => generateReply(config, history.slice(-12), question, AbortSignal.timeout(60000)));
      history.push({ role: 'user', content: question }, { role: 'assistant', content: measured.result.text });
      evidence.questions.push({ question, reply: measured.result.text, elapsedMs: measured.elapsedMs });
      console.log(JSON.stringify({ question: evidence.questions.at(-1) }));
    }
  }
} catch (error) { evidence.error = error.message; process.exitCode = 1; }
finally {
  tts.close(); piper.close(); stt.close(); small?.close();
  await writeFile(`${output}/voice-benchmark.json`, JSON.stringify(evidence, null, 2) + '\n');
}
