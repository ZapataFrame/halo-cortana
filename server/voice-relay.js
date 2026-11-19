import { randomBytes, timingSafeEqual } from 'node:crypto';

// Audio efímero para visores enlazados; el contrato público de presentación no cambia.
export function createVoiceRelay({ now = Date.now, delayMs = 800, readyTimeoutMs = 4000, viewerLeaseMs = 15000 } = {}) {
  const token = randomBytes(32).toString('base64url'), clients = new Map();
  let current, waiters = new Set();
  const send = (res, data) => res.write(`data: ${JSON.stringify({ ...data, serverNow: now() })}\n\n`);
  const cue = () => current ? { speechId: current.id, phase: current.phase, startAt: current.startAt || null, durationMs: current.durationMs } : { speechId: null, phase: 'stopped', startAt: null, durationMs: 0 };
  const wake = () => { for (const callback of [...waiters]) callback(); };
  const broadcast = () => { for (const { res } of clients.values()) send(res, cue()); wake(); };
  const authorized = req => {
    const candidate = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
    return candidate.length === token.length && timingSafeEqual(candidate, Buffer.from(token));
  };
  const sameOrigin = req => {
    if (!req.headers.origin) return true;
    const host = req.headers.host || '';
    return req.headers.origin === `http://${host}` || req.headers.origin === `https://${host}`;
  };
  const authorize = req => authorized(req) && sameOrigin(req);
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  return {
    token,
    authorize,
    prepare(id, bytes) {
      if (current) this.stop();
      current = { id, bytes, phase: 'prepared', durationMs: Math.max(0, (bytes.length - 44) / 44.1), ready: new Set() };
      broadcast();
    },
    stop() { if (!current) return; current = undefined; broadcast(); },
    async schedule(id) {
      const job = current;
      if (!job || job.id !== id) throw new Error('La voz ya no está disponible.');
      if (job.phase === 'scheduled') return { ...cue(), serverNow: now() };
      const participants = [...clients.keys()];
      await new Promise((resolve, reject) => {
        let timer;
        const finish = error => { clearTimeout(timer); waiters.delete(check); error ? reject(error) : resolve(); };
        const check = () => {
          if (current !== job) finish(new Error('Reproducción cancelada.'));
          else if (participants.every(client => !clients.has(client) || job.ready.has(client))) finish();
        };
        timer = setTimeout(() => finish(new Error('Un visor no terminó de preparar el audio. Activa su sonido y vuelve a intentar.')), readyTimeoutMs);
        waiters.add(check); check();
      });
      if (current !== job) throw new Error('Reproducción cancelada.');
      // Peticiones concurrentes comparten exactamente la misma fecha de inicio.
      if (job.phase !== 'scheduled') { job.startAt = now() + delayMs; job.phase = 'scheduled'; broadcast(); }
      return { ...cue(), serverNow: now() };
    },
    async handle(req, res, pathname) {
      if (!pathname.startsWith('/api/voice/')) return false;
      if (!authorize(req)) {
        json(res, 403, { error: 'Abre el enlace de visor con voz desde el control del PC.' }); return true;
      }
      if (req.method === 'GET' && pathname === '/api/voice/time') { json(res, 200, { serverNow: now() }); return true; }
      if (req.method === 'GET' && pathname === '/api/voice/events') {
        const id = req.headers['x-voice-client'];
        if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(id) || clients.size >= 8 || clients.has(id)) {
          json(res, 409, { error: 'El visor ya está conectado o se alcanzó el límite de ocho visores.' }); return true;
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        clients.set(id, { res, seenAt: now() }); send(res, cue());
        const heartbeat = setInterval(() => {
          const client = clients.get(id); if (!client) { clearInterval(heartbeat); return; }
          if (now() - client.seenAt >= viewerLeaseMs) { res.end(); return; }
          send(res, { phase: 'heartbeat' });
        }, Math.min(5000, viewerLeaseMs / 2)); heartbeat.unref();
        res.on('close', () => { clearInterval(heartbeat); if (clients.get(id)?.res === res) clients.delete(id); wake(); });
        return true;
      }
      if (req.method === 'GET' && pathname.startsWith('/api/voice/audio/')) {
        if (!current || pathname !== `/api/voice/audio/${current.id}`) json(res, 404, { error: 'La lectura terminó o fue cancelada.' });
        else { res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }); res.end(current.bytes); }
        return true;
      }
      if (req.method === 'POST' && ['/api/voice/ready', '/api/voice/heartbeat'].includes(pathname)) {
        if (!req.headers['content-type']?.startsWith('application/json')) { json(res, 400, { error: 'Envía JSON.' }); return true; }
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 512) { json(res, 400, { error: 'Solicitud demasiado grande.' }); return true; } }
        const body = JSON.parse(raw);
        if (pathname.endsWith('/heartbeat')) {
          if (!body || Object.keys(body).join(',') !== 'clientId' || !clients.has(body.clientId)) json(res, 409, { error: 'Reconecta el sonido del visor.' });
          else { clients.get(body.clientId).seenAt = now(); json(res, 200, { ready: true }); }
          return true;
        }
        if (Object.keys(body).sort().join(',') !== 'clientId,speechId' || !clients.has(body.clientId) || current?.id !== body.speechId) json(res, 409, { error: 'La lectura cambió. Espera la siguiente.' });
        else { current.ready.add(body.clientId); wake(); json(res, 200, { ready: true }); }
        return true;
      }
      json(res, 404, { error: 'Ruta de voz no disponible.' }); return true;
    },
    close() { this.stop(); for (const { res } of clients.values()) res.end(); clients.clear(); },
  };
}
