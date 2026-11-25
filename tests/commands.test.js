import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { createApp } from '../server/app.js';
import { parseCommand } from '../server/commands.js';
import { createSongStore, normalizeSong } from '../server/song.js';

function wave(seconds = .2) {
  const pcm = Buffer.alloc(Math.round(seconds * 22050) * 2);
  for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / 22050) * 4000), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF'); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(22050, 24); h.writeUInt32LE(44100, 28); h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
const WAV = wave(), signal = () => new AbortController().signal;
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64, 1)]);
function foreignHost(url, method = 'POST') {
  return new Promise((resolve, reject) => {
    const req = request(url, { method, headers: { Host: 'pc-remoto.example', 'Content-Type': 'application/json' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end(method === 'POST' ? '{}' : undefined);
  });
}
async function until(check) {
  for (let i = 0; i < 100; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail('No se completó la transición esperada.');
}
async function setup(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'cortana-commands-'));
  const songs = createSongStore({ file: join(directory, 'song.wav') });
  let llm = 0, ttsCalls = 0;
  const server = createApp({ config: { provider: 'ollama', model: 'fixture' },
    health: async () => ({ ready: false }), models: async () => [],
    reply: async () => { llm++; return { text: 'Respuesta conversacional', truncated: false }; },
    tts: { synthesize: async () => { ttsCalls++; throw new Error('TTS no disponible'); }, close() {} },
    stt: { transcribe: async () => ({ text: 'Hey Cortana, baila la Macarena' }), close() {} },
    songs, relayOptions: { delayMs: 30, readyTimeoutMs: 150 }, animationMs: 500, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { token } = await fetch(base + '/api/voice/link').then(r => r.json());
  const auth = { Authorization: `Bearer ${token}` };
  t.after(async () => { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); await rm(directory, { recursive: true, force: true }); });
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { base, auth, post, songs, directory, calls: () => ({ llm, ttsCalls }) };
}

test('comandos cerrados: despertar, cuatro bailes, canto y parada; preguntas y texto arbitrario no ejecutan acciones', () => {
  for (const [text, animation] of [['bailar', 'gangnam_style'], ['Hey Cortana, baila Gangnam Style', 'gangnam_style'],
    ['baila Hip Hop', 'hip_hop'], ['Baila la Macarena, por favor.', 'macarena'], ['ponte a bailar Twerking', 'twerk'],
    ['baila el baile coreano', 'gangnam_style'], ['baila perreo', 'twerk']]) {
    assert.deepEqual(parseCommand(text), { type: 'dance', animation });
  }
  for (const text of ['cantar', '¡Hey Cortana, canta!', 'pon la canción']) assert.equal(parseCommand(text).type, 'sing');
  assert.equal(parseCommand('Hey Cortana').type, 'wake');
  assert.equal(parseCommand('deja de bailar').type, 'stop');
  assert.equal(parseCommand('baila salsa').type, 'unknown-dance');
  for (const text of ['¿Por qué baila Cortana?', 'No quiero bailar', 'Explícame qué significa cantar', 'ejecuta rm -rf /', 'canta y abre una URL']) assert.equal(parseCommand(text), null);
});

test('WAV y MP3 se decodifican con ffmpeg real; duración, firma y cancelación están acotadas', async () => {
  const audio = await normalizeSong(WAV, signal());
  assert.equal(audio.subarray(0, 4).toString(), 'RIFF');
  assert.equal(audio.readUInt32LE(40), WAV.length - 44);
  const mp3 = execFileSync('ffmpeg', ['-v', 'error', '-f', 'wav', '-i', 'pipe:0', '-f', 'mp3', 'pipe:1'], { input: WAV });
  const decoded = await normalizeSong(mp3, signal());
  assert.ok(decoded.length > 44);
  assert.throws(() => normalizeSong(Buffer.alloc(60), signal()), /WAV o MP3/);
  const cancelled = new AbortController(); cancelled.abort();
  assert.throws(() => normalizeSong(WAV, cancelled.signal), { name: 'AbortError' });
  await assert.rejects(normalizeSong(wave(301), signal()), /cinco minutos/);
});

test('canción persistente privada; una carga inválida o cancelada conserva el audio anterior', async t => {
  const f = await setup(t);
  assert.equal((await f.songs.status()).ready, false);
  await f.songs.save(WAV, signal());
  assert.equal((await createSongStore({ file: join(f.directory, 'song.wav') }).status()).ready, true);
  await assert.rejects(f.songs.save(Buffer.alloc(60), signal()), /WAV o MP3/);
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(f.songs.save(WAV, cancelled.signal));
  assert.deepEqual((await f.songs.read()).audio, await readFile(join(f.directory, 'song.wav')));
  assert.deepEqual((await f.songs.read()).audio.subarray(44), WAV.subarray(44));
});

test('baile hablado y escrito sin LLM/TTS; idempotencia, rechazo de origen, retorno y recuperación conversacional', async t => {
  const f = await setup(t, { animationMs: 70 });
  const wake = await fetch(f.base + '/api/voice/wake', { method: 'POST', headers: { ...f.auth, 'Content-Type': 'audio/webm' }, body: WEBM }).then(r => r.json());
  assert.equal(wake.command, 'baila la Macarena');
  const spoken = await f.post('/api/voice/ask', { text: wake.command }, f.auth).then(r => r.json());
  assert.equal(spoken.animation, 'macarena'); assert.equal(spoken.command, 'dance');
  const body = { message: 'baila Hip Hop', requestId: 'dance-test-01' };
  const typed = await f.post('/api/chat', body).then(r => r.json());
  assert.equal(typed.animation, 'hip_hop');
  const cached = await f.post('/api/chat', body).then(r => r.json());
  assert.equal(cached.cached, true); assert.equal(cached.revision, typed.revision);
  assert.deepEqual(f.calls(), { llm: 0, ttsCalls: 0 });
  assert.equal((await f.post('/api/voice/ask', { text: 'baila' }, { ...f.auth, Origin: 'https://otro.example' })).status, 403);
  await new Promise(resolve => setTimeout(resolve, 90));
  const state = await fetch(f.base + '/api/presentation').then(r => r.json());
  assert.equal(state.animation, 'idle'); assert.deepEqual(Object.keys(state).sort(), ['animation', 'phase', 'revision', 'sessionId']);
  assert.equal((await f.post('/api/chat', { message: 'Háblame del proyecto', requestId: 'question-test-01' })).status, 200);
  assert.deepEqual(f.calls(), { llm: 1, ttsCalls: 0 });
});

test('API de canción exige PC/origen/tipo/tamaño, prueba PC usa archivo y funciona sin TTS', async t => {
  const f = await setup(t);
  for (const path of ['/api/song', '/api/performance/stop']) {
    assert.equal((await f.post(path, {}, { Origin: 'https://otro.example' })).status, 403);
    assert.equal(await foreignHost(f.base + path), 403);
  }
  assert.equal(await foreignHost(f.base + '/api/song', 'GET'), 403);
  assert.equal((await f.post('/api/song', {})).status, 400);
  assert.equal((await fetch(f.base + '/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: Buffer.alloc(20 * 1024 * 1024 + 1) })).status, 413);
  assert.equal((await fetch(f.base + '/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: WAV })).status, 200);
  const ready = await fetch(f.base + '/api/song').then(r => r.json()); assert.equal(ready.ready, true);
  const song = await f.post('/api/tts', { requestId: 'song', speechId: 'song-on-pc-01' });
  assert.equal(song.status, 200); assert.equal(song.headers.get('content-type'), 'audio/wav');
  assert.deepEqual(Buffer.from(await song.arrayBuffer()).subarray(44), WAV.subarray(44));
  assert.equal((await f.post('/api/voice/ask', { text: 'baila' }, f.auth)).status, 409);
  assert.equal((await f.post('/api/performance/stop', {})).status, 200);
  assert.equal((await f.post('/api/voice/ask', { text: 'baila' }, f.auth)).status, 200);
  assert.deepEqual(f.calls(), { llm: 0, ttsCalls: 0 });
});

test('canto en visor: WAV idéntico, preparación, confirmación de reproducción, exclusión, parada y descarte', async t => {
  const f = await setup(t);
  assert.equal((await f.post('/api/voice/ask', { text: 'canta' }, f.auth)).status, 422);
  await f.songs.save(wave(2), signal());
  const ac = new AbortController(), cues = [];
  const response = await fetch(f.base + '/api/voice/events', { headers: { ...f.auth, 'X-Voice-Client': 'sing-viewer-01' }, signal: ac.signal });
  const reader = response.body.getReader();
  let downloaded;
  const pump = (async () => {
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) return;
      buffer += new TextDecoder().decode(value);
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        const cue = JSON.parse(frame.slice(6)); cues.push(cue);
        if (cue.phase === 'prepared') {
          downloaded = Buffer.from(await fetch(f.base + '/api/voice/audio/' + cue.speechId, { headers: f.auth }).then(r => r.arrayBuffer()));
          await f.post('/api/voice/ready', { clientId: 'sing-viewer-01', speechId: cue.speechId }, f.auth);
        }
      }
    }
  })().catch(error => { if (!ac.signal.aborted) throw error; });
  try {
    const result = await f.post('/api/voice/ask', { text: 'canta' }, f.auth).then(r => r.json());
    assert.equal(result.command, 'sing'); assert.equal(result.spoken, true); assert.equal(result.phase, 'responded');
    assert.deepEqual(downloaded, (await f.songs.read()).audio);
    await until(() => cues.some(c => c.phase === 'scheduled'));
    assert.equal((await f.post('/api/voice/playback', { clientId: 'sing-viewer-01', speechId: 'obsolete', playing: true }, f.auth)).status, 409);
    assert.equal((await f.post('/api/voice/playback', { clientId: 'sing-viewer-01', speechId: result.speechId, playing: true }, f.auth)).status, 200);
    assert.equal((await fetch(f.base + '/api/presentation').then(r => r.json())).phase, 'speaking');
    assert.equal((await f.post('/api/voice/ask', { text: 'baila' }, f.auth)).status, 409);
    assert.equal((await f.post('/api/voice/stop', {}, { ...f.auth, Origin: 'https://otro.example' })).status, 403);
    assert.equal((await f.post('/api/voice/stop', {}, f.auth)).status, 200);
    assert.equal((await fetch(f.base + '/api/voice/audio/' + result.speechId, { headers: f.auth })).status, 404);
    assert.equal((await f.post('/api/voice/ask', { text: 'baila Twerk' }, f.auth)).status, 200);
    assert.deepEqual(f.calls(), { llm: 0, ttsCalls: 0 });
  } finally { ac.abort(); await pump; }
});

test('preparación de canto cancelable por PC y recuperación tras visor sin confirmar audio', async t => {
  const f = await setup(t);
  await f.songs.save(WAV, signal());
  const ac = new AbortController();
  const sse = await fetch(f.base + '/api/voice/events', { headers: { ...f.auth, 'X-Voice-Client': 'slow-viewer-01' }, signal: ac.signal });
  try {
    const timedOut = await f.post('/api/voice/ask', { text: 'canta' }, f.auth);
    assert.equal(timedOut.status, 422); assert.match((await timedOut.json()).error, /visor/);
    const pending = f.post('/api/chat', { message: 'canta', requestId: 'cancel-song-01' });
    await new Promise(resolve => setTimeout(resolve, 25));
    await f.post('/api/cancel', { requestId: 'cancel-song-01' });
    assert.equal((await pending).status, 422);
    assert.equal((await f.post('/api/voice/ask', { text: 'baila' }, f.auth)).status, 200);
  } finally { ac.abort(); await sse.body.cancel().catch(() => {}); }
});

test('carga de canción reserva el motor; desconectar cancela y conserva el archivo anterior', async t => {
  const f = await setup(t);
  await f.songs.save(WAV, signal());
  const save = f.songs.save.bind(f.songs);
  let began = false, aborted = false;
  f.songs.save = async (_bytes, signal) => new Promise((resolve, reject) => {
    began = true;
    signal.addEventListener('abort', () => { aborted = true; reject(new Error('Carga cancelada.')); }, { once: true });
  });
  const ac = new AbortController();
  const pending = fetch(f.base + '/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: WAV, signal: ac.signal }).catch(() => null);
  await until(() => began);
  assert.equal((await f.post('/api/voice/ask', { text: 'baila' }, f.auth)).status, 409);
  assert.equal((await fetch(f.base + '/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: WAV })).status, 409);
  ac.abort(); await pending;
  await until(() => aborted);
  assert.deepEqual((await f.songs.read()).audio.subarray(44), WAV.subarray(44));
  f.songs.save = save;
  assert.equal((await fetch(f.base + '/api/song', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: WAV })).status, 200);
});

test('finalizar o desconectar el visor no interrumpe una canción que el PC sigue reproduciendo', async t => {
  const f = await setup(t);
  await f.songs.save(WAV, signal());
  const ac = new AbortController();
  const sse = await fetch(f.base + '/api/voice/events', { headers: { ...f.auth, 'X-Voice-Client': 'pc-song-viewer-01' }, signal: ac.signal });
  const speechId = 'pc-song-owner-01';
  try {
    const audio = await f.post('/api/tts', { requestId: 'song', speechId });
    assert.equal(audio.status, 200); await audio.arrayBuffer();
    assert.equal((await f.post('/api/voice/ready', { clientId: 'pc-song-viewer-01', speechId }, f.auth)).status, 200);
    assert.equal((await f.post('/api/tts/schedule', { speechId })).status, 200);
    assert.equal((await f.post('/api/tts/playback', { speechId, playing: true })).status, 200);
    for (const playing of [true, false, true]) {
      assert.equal((await f.post('/api/voice/playback', { clientId: 'pc-song-viewer-01', speechId, playing }, f.auth)).status, 200);
      assert.equal((await fetch(f.base + '/api/presentation').then(r => r.json())).phase, 'speaking');
    }
    ac.abort(); await sse.body.cancel().catch(() => {});
    assert.equal((await fetch(f.base + '/api/voice/audio/' + speechId, { headers: f.auth })).status, 200);
    assert.equal((await f.post('/api/tts/playback', { speechId, playing: false })).status, 200);
    assert.equal((await fetch(f.base + '/api/voice/audio/' + speechId, { headers: f.auth })).status, 404);
  } finally { ac.abort(); await sse.body.cancel().catch(() => {}); }
});
