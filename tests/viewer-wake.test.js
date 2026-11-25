import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { matchWakeWord } from '../server/wake-word.js';
import { createViewerWake, viewerMicSupport } from '../src/services/viewer-wake.js';

const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64, 1)]);
const WAV = (() => {
  const data = Buffer.alloc(4410, 1);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(22050, 24); header.writeUInt32LE(44100, 28); header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
})();

async function setup(options = {}) {
  const server = createApp({
    config: { provider: 'ollama', model: 'qwen2.5:3b', host: 'http://127.0.0.1:11434' },
    health: async () => ({ ready: true, detail: 'ok' }),
    models: async () => ['qwen2.5:3b'],
    reply: async (_c, _h, message) => ({ text: `Respuesta para ${message}`, truncated: false }),
    tts: {
      health: async () => ({ ready: true, detail: 'ok' }),
      synthesize: async () => WAV,
      warmup: async () => {},
      close() {},
    },
    stt: {
      health: async () => ({ ready: true, detail: 'ok' }),
      transcribe: async () => ({ text: 'Ey Cortana', language: 'es' }),
      warmup: async () => {},
      close() {},
    },
    relayOptions: { delayMs: 40, readyTimeoutMs: 500, viewerLeaseMs: 4000 },
    ...options,
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port, base = `http://127.0.0.1:${port}`;
  const { token } = await fetch(`${base}/api/voice/link`).then(r => r.json());
  const headers = { Authorization: `Bearer ${token}` };
  return { server, base, port, token, headers, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

test('matchWakeWord reconoce variantes de «Ey Cortana», extrae pregunta y rechaza menciones en medio de frases', () => {
  assert.deepEqual(matchWakeWord('Ey Cortana'), { matched: true, command: '' });
  assert.deepEqual(matchWakeWord('Hey, Cortana!'), { matched: true, command: '' });
  assert.deepEqual(matchWakeWord('E Cortana.'), { matched: true, command: '' });
  assert.deepEqual(matchWakeWord('Ej Cortana, canta'), { matched: true, command: 'canta' });
  assert.deepEqual(matchWakeWord('Oye Cortana, ¿qué hora es?'), { matched: true, command: '¿qué hora es?' });
  assert.deepEqual(matchWakeWord('Hola Cortana cuéntame sobre física cuántica'), { matched: true, command: 'cuéntame sobre física cuántica' });
  assert.deepEqual(matchWakeWord('Cortana, ¿cómo estás?'), { matched: true, command: '¿cómo estás?' });
  assert.deepEqual(matchWakeWord('El holograma de Cortana funciona bien'), { matched: false, command: '' });
  assert.deepEqual(matchWakeWord('Cuando digo Hey Cortana se activa'), { matched: false, command: '' });
  assert.deepEqual(matchWakeWord('Hey Cortana, baila Hip Hop'), { matched: true, command: 'baila Hip Hop' });
  assert.deepEqual(matchWakeWord('Buenas tardes a todos'), { matched: false, command: '' });
  assert.deepEqual(matchWakeWord(''), { matched: false, command: '' });
});

test('rutas manos libres del visor exigen token/origen, aceptan HTTPS del mismo host y no filtran datos en presentación', async () => {
  const f = await setup({ httpsPort: 3443 });
  try {
    for (const path of ['/api/voice/wake', '/api/voice/ask', '/api/voice/state', '/api/voice/stop', '/api/voice/playback']) {
      assert.equal((await fetch(f.base + path, { method: 'POST', body: '{}' })).status, 403);
      assert.equal((await fetch(f.base + path, { method: 'POST', headers: { ...f.headers, Origin: 'https://evil.example' }, body: '{}' })).status, 403);
    }
    const httpsOrigin = await fetch(`${f.base}/api/voice/state`, {
      method: 'POST',
      headers: { ...f.headers, 'Content-Type': 'application/json', Origin: `https://127.0.0.1:${f.port}` },
      body: JSON.stringify({ listening: true }),
    });
    assert.equal(httpsOrigin.status, 200);
    const presentation = await fetch(`${f.base}/api/presentation`).then(r => r.json());
    assert.deepEqual(Object.keys(presentation).sort(), ['animation', 'phase', 'revision', 'sessionId']);
    assert.equal(presentation.phase, 'listening');
    const info = await fetch(`${f.base}/api/info`).then(r => r.json());
    assert.ok(Array.isArray(info.secureViewerUrls));
  } finally { await f.close(); }
});

test('flujo completo Ey Cortana -> escucha -> pregunta -> LLM -> voz sincronizada en el visor', async () => {
  let turn = 0;
  const f = await setup({
    stt: {
      health: async () => ({ ready: true, detail: 'ok' }),
      transcribe: async () => ({ text: turn++ === 0 ? 'Ey Cortana' : '¿Quién eres?', language: 'es' }),
      warmup: async () => {},
      close() {},
    },
  });
  const ac = new AbortController();
  let pump;
  try {
    // 1. Conectar visor al canal SSE para verificar que recibe el WAV generado por /api/voice/ask.
    const sse = await fetch(`${f.base}/api/voice/events`, { headers: { ...f.headers, 'X-Voice-Client': 'visor-laptop-01' }, signal: ac.signal });
    const reader = sse.body.getReader(), decoder = new TextDecoder();
    const cues = [];
    pump = (async () => {
      let buf = '';
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
          if (!chunk.startsWith('data: ')) continue;
          const cue = JSON.parse(chunk.slice(6));
          cues.push(cue);
          if (cue.phase === 'prepared') {
            const wavRes = await fetch(`${f.base}/api/voice/audio/${cue.speechId}`, { headers: f.headers });
            assert.equal(wavRes.status, 200);
            await fetch(`${f.base}/api/voice/ready`, {
              method: 'POST',
              headers: { ...f.headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: 'visor-laptop-01', speechId: cue.speechId }),
            });
          }
        }
      }
    })().catch(() => {});

    // 2. Wake word «Ey Cortana» activa fase listening.
    const wakeRes = await fetch(`${f.base}/api/voice/wake`, {
      method: 'POST', headers: { ...f.headers, 'Content-Type': 'audio/webm' }, body: WEBM,
    });
    assert.equal(wakeRes.status, 200);
    const wakeData = await wakeRes.json();
    assert.equal(wakeData.matched, true);
    assert.equal(wakeData.command, '');
    assert.equal(wakeData.phase, 'listening');

    // 3. Pregunta hablada -> transcribe -> LLM -> sintetiza -> programa voz en el visor.
    const askRes = await fetch(`${f.base}/api/voice/ask`, {
      method: 'POST', headers: { ...f.headers, 'Content-Type': 'audio/webm' }, body: WEBM,
    });
    assert.equal(askRes.status, 200);
    const askData = await askRes.json();
    assert.equal(askData.transcript, '¿Quién eres?');
    assert.equal(askData.reply, 'Respuesta para ¿Quién eres?');
    assert.equal(askData.spoken, true);
    assert.equal(askData.phase, 'responded'); // El horario no confirma reproducción real.
    await fetch(`${f.base}/api/voice/playback`, {
      method: 'POST', headers: { ...f.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'visor-laptop-01', speechId: askData.speechId, playing: true }),
    });
    assert.equal((await fetch(`${f.base}/api/presentation`).then(r => r.json())).phase, 'speaking');
    for (let i = 0; i < 20 && !cues.some(c => c.phase === 'scheduled' && c.speechId === askData.speechId); i++) {
      await new Promise(r => setTimeout(r, 10));
    }
    assert.ok(cues.some(c => c.phase === 'scheduled' && c.speechId === askData.speechId));
  } finally { ac.abort(); await pump; await f.close(); }
});

test('concurrencia, expiración de escucha, cancelación y recuperación en rutas manos libres', async () => {
  let releaseLlm, aborted = false;
  const f = await setup({
    wakeLeaseMs: 70,
    reply: (_c, _h, message, signal) => new Promise((resolve, reject) => {
      if (message === 'bloquear') {
        signal.addEventListener('abort', () => { aborted = true; reject(new Error('CANCELLED')); }, { once: true });
        releaseLlm = () => resolve({ text: 'ok', truncated: false });
      } else resolve({ text: `libre ${message}`, truncated: false });
    }),
  });
  try {
    // Expiración automática de fase listening si el visor no pregunta.
    const wake = await fetch(`${f.base}/api/voice/wake`, { method: 'POST', headers: { ...f.headers, 'Content-Type': 'audio/webm' }, body: WEBM });
    assert.equal((await wake.json()).phase, 'listening');
    await new Promise(r => setTimeout(r, 110));
    assert.equal((await fetch(`${f.base}/api/presentation`).then(r => r.json())).phase, 'idle');

    // Concurrencia y cancelación al desconectar.
    const ac = new AbortController();
    const pending = fetch(`${f.base}/api/voice/ask`, {
      method: 'POST', headers: { ...f.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'bloquear' }), signal: ac.signal,
    }).catch(() => null);
    await new Promise(r => setTimeout(r, 30));
    const concurrentWake = await fetch(`${f.base}/api/voice/wake`, { method: 'POST', headers: { ...f.headers, 'Content-Type': 'audio/webm' }, body: WEBM });
    assert.equal(concurrentWake.status, 409);
    ac.abort(); await pending;
    await new Promise(r => setTimeout(r, 30));
    assert.equal(aborted, true);

    // Recuperación limpia tras cancelación.
    const recovered = await fetch(`${f.base}/api/voice/ask`, {
      method: 'POST', headers: { ...f.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hola' }),
    });
    assert.equal(recovered.status, 200);
    assert.equal((await recovered.json()).reply, 'libre hola');
    void releaseLlm;
  } finally { await f.close(); }
});

test('createViewerWake exige HTTPS en LAN, pausa mientras habla y ejecuta chime -> pregunta -> respuesta', async () => {
  assert.equal(viewerMicSupport({ secure: false }).ready, false);
  assert.match(viewerMicSupport({ secure: false }).detail, /setup:https/);

  let rms = 0, busy = false, trackStopped = false;
  const phases = [], chimes = [], requests = [];
  const fakeStream = { getTracks: () => [{ stop() { trackStopped = true; } }] };
  const fakeContext = {
    state: 'running',
    createMediaStreamSource: () => ({ connect() {} }),
    createAnalyser: () => ({
      fftSize: 4,
      getFloatTimeDomainData(arr) { arr.fill(rms); },
    }),
    close: async () => {},
  };
  class FakeRecorder {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
    start() { this.state = 'recording'; }
    stop() {
      if (this.state === 'inactive') return;
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob([WEBM], { type: 'audio/webm' }) });
      this.onstop?.();
    }
  }
  const wake = createViewerWake({
    token: 'tok-test',
    supportCheck: () => ({ ready: true, detail: '' }),
    getMedia: async () => fakeStream,
    createContext: () => fakeContext,
    createRecorder: () => new FakeRecorder(),
    chime: (_ctx, kind) => chimes.push(kind),
    isBusy: () => busy,
    onPhase: p => phases.push(p),
    pollMs: 10, wakeSilenceMs: 20, wakeMinMs: 15, questionSilenceMs: 25, questionMinMs: 15, listenTimeoutMs: 300, chimeGuardMs: 15, postSpeechGuardMs: 10,
    request: async (url, init) => {
      requests.push(url);
      if (url === '/api/voice/wake') return new Response(JSON.stringify({ matched: true, command: '' }), { status: 200 });
      if (url === '/api/voice/ask') return new Response(JSON.stringify({ spoken: true, reply: 'Hola' }), { status: 200 });
      return new Response(JSON.stringify({ phase: 'idle' }), { status: 200 });
    },
  });

  assert.equal(await wake.enable(), true);
  // Mientras Cortana habla, el ruido no dispara /api/voice/wake (anti-eco).
  busy = true; rms = 0.2;
  await new Promise(r => setTimeout(r, 45));
  assert.equal(requests.length, 0);

  // Al terminar de hablar, decir «Ey Cortana» dispara chime y escucha la pregunta.
  busy = false; wake.notifySpeechEnded();
  await new Promise(r => setTimeout(r, 35));
  rms = 0.2; await new Promise(r => setTimeout(r, 25)); rms = 0; // fin «Ey Cortana»
  await new Promise(r => setTimeout(r, 55));
  rms = 0.2; await new Promise(r => setTimeout(r, 30)); rms = 0; // pregunta
  await new Promise(r => setTimeout(r, 70));

  assert.deepEqual(chimes, ['wake']);
  assert.deepEqual(requests, ['/api/voice/wake', '/api/voice/ask']);
  assert.ok(phases.includes('listening'));
  assert.ok(phases.includes('processing'));
  wake.stop();
  assert.equal(trackStopped, true);
});

test('voz iniciada durante una captura descarta el fragmento y vuelve a standby sin enviar eco', async () => {
  let level = .2, busy = false, captures = 0;
  const requests = [];
  const wake = createViewerWake({ token: 'fixture', supportCheck: () => ({ ready: true }),
    getMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
    createContext: () => ({ state: 'running', close: async () => {}, createMediaStreamSource: () => ({ connect() {} }),
      createAnalyser: () => ({ fftSize: 4, getFloatTimeDomainData(samples) { samples.fill(level); } }) }),
    createRecorder: () => ({ state: 'inactive', start() { this.state = 'recording'; captures++; },
      stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob([WEBM]) }); this.onstop?.(); } }),
    pollMs: 5, wakeMinMs: 10, wakeMaxMs: 100, wakeSilenceMs: 20, postSpeechGuardMs: 10,
    isBusy: () => busy, request: async url => { requests.push(url); return Response.json({ matched: false }); },
  });
  try {
    await wake.enable();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(captures, 1);
    busy = true;
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(wake.mode, 'standby'); assert.equal(requests.length, 0);
    level = 0; busy = false; wake.notifySpeechEnded();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(captures, 1);
  } finally { wake.stop(false); }
});

test('dos activaciones con permiso pendiente descartan solo el micrófono antiguo', async () => {
  const pending = []; let oldStopped = false, newStopped = false;
  const wake = createViewerWake({ token: 'fixture', supportCheck: () => ({ ready: true }),
    getMedia: () => new Promise(resolve => pending.push(resolve)),
    createContext: () => ({ state: 'running', close: async () => {}, createMediaStreamSource: () => ({ connect() {} }),
      createAnalyser: () => ({ fftSize: 4, getFloatTimeDomainData(samples) { samples.fill(0); } }) }),
  });
  try {
    const old = wake.enable(), current = wake.enable();
    pending[1]({ getTracks: () => [{ stop() { newStopped = true; } }] });
    assert.equal(await current, true);
    pending[0]({ getTracks: () => [{ stop() { oldStopped = true; } }] });
    assert.equal(await old, false); assert.equal(oldStopped, true); assert.equal(newStopped, false);
  } finally { wake.stop(false); }
  assert.equal(newStopped, true);
});
