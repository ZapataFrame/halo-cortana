import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
import { generateReply, providerHealth, localModels } from './providers.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

export function validateChat(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Solicitud inválida.');
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) throw new Error('Escribe de 1 a 2000 caracteres.');
  if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId)) throw new Error('Identificador de solicitud inválido.');
  return { message: body.message.trim(), requestId: body.requestId };
}

async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('Envía JSON.');
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 12000) throw new Error('Solicitud demasiado grande.');
  }
  try { return JSON.parse(text); } catch { throw new Error('JSON inválido.'); }
}

export function createApp({ config, configs = { [config.provider]: config }, models = localModels, root = resolve('dist'), port = 3000, reply = generateReply, health = providerHealth, timeoutMs = 60000 } = {}) {
  const sessionId = randomUUID();
  let revision = 0, phase = 'idle', animation = 'idle', active = null, history = [];
  const completed = new Map();
  const state = () => ({ sessionId, revision, phase, animation });
  const setPhase = value => { phase = value; revision++; };
  const localWrite = (req, res) => {
    if (!LOCAL.has(req.socket.remoteAddress)) { json(res, 403, { error: 'El chat se controla desde el PC en localhost.' }); return false; }
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) { json(res, 403, { error: 'Abre el control mediante localhost.' }); return false; }
    if (req.headers.origin && req.headers.origin !== `http://${host}`) { json(res, 403, { error: 'Origen no permitido.' }); return false; }
    return true;
  };

  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { json(res, 400, { error: 'Ruta inválida.' }); return; }
    try {
      if (req.method === 'GET' && pathname === '/api/presentation') { json(res, 200, state()); return; }
      if (req.method === 'GET' && pathname === '/api/providers') {
        if (!localWrite(req, res)) return;
        let installed = [], detail = '';
        try { if (configs.ollama) installed = await models(configs.ollama); }
        catch { detail = 'Ollama no responde. Inicia Ollama en el PC y pulsa Actualizar modelos.'; }
        json(res, 200, { provider: config.provider, model: config.model, openaiModel: configs.openai?.model,
          localModels: installed, detail }); return;
      }
      if (req.method === 'GET' && pathname === '/api/info') {
        const addresses = Object.values(networkInterfaces()).flat().filter(item => item && !item.internal && item.family === 'IPv4').map(item => `http://${item.address}:${port}/hologram`);
        json(res, 200, { provider: config.provider, model: config.model, health: await health(config), localControl: LOCAL.has(req.socket.remoteAddress), viewerUrls: addresses, limits: { input: 2000, historyPairs: 6, timeoutMs } }); return;
      }
      if (req.method === 'POST' && pathname.startsWith('/api/')) {
        if (!localWrite(req, res)) return;
        const body = await readJson(req);
        if (pathname === '/api/provider') {
          if (active) { json(res, 409, { error: 'Espera o cancela la respuesta antes de cambiar de modelo.' }); return; }
          if (!body || !['openai', 'ollama'].includes(body.provider) || !configs[body.provider]
            || typeof body.model !== 'string' || !body.model || body.model.length > 200
            || Object.keys(body).some(key => !['provider', 'model'].includes(key))) {
            json(res, 400, { error: 'Selecciona un proveedor y modelo disponibles.' }); return;
          }
          const selected = configs[body.provider];
          if (body.provider === 'ollama') {
            let installed;
            try { installed = await models(selected); }
            catch { json(res, 503, { error: 'Ollama no responde. Inicia el servicio local y actualiza los modelos.' }); return; }
            if (!installed.includes(body.model)) { json(res, 400, { error: 'El modelo no está instalado en Ollama. Actualiza la lista.' }); return; }
          } else if (body.model !== selected.model) {
            json(res, 400, { error: 'El modelo GPT se configura en OPENAI_MODEL del PC.' }); return;
          }
          // La consulta del catálogo puede coincidir con un envío de otra pestaña.
          if (active) { json(res, 409, { error: 'Hay una respuesta en curso. Espera o cancélala.' }); return; }
          config = { ...selected, model: body.model };
          history = []; completed.clear(); setPhase('idle');
          json(res, 200, { provider: config.provider, model: config.model, ...state() }); return;
        }
        if (pathname === '/api/animation') {
          if (!['idle', 'gangnam'].includes(body.animation)) { json(res, 400, { error: 'Animación no disponible.' }); return; }
          animation = body.animation; revision++;
          json(res, 200, state()); return;
        }
        if (pathname === '/api/cancel') {
          if (active && active.requestId === body.requestId) { active.controller.abort(); active = null; setPhase('idle'); }
          json(res, 200, state()); return;
        }
        if (pathname === '/api/reset') {
          if (active) { json(res, 409, { error: 'Cancela la respuesta antes de reiniciar.' }); return; }
          history = []; completed.clear(); setPhase('idle'); json(res, 200, state()); return;
        }
        if (pathname !== '/api/chat') { json(res, 404, { error: 'Ruta no disponible.' }); return; }
        const { message, requestId } = validateChat(body);
        if (completed.has(requestId)) {
          const cached = completed.get(requestId);
          if (cached.message !== message) { json(res, 409, { error: 'El identificador ya corresponde a otro mensaje.' }); return; }
          json(res, 200, { ...cached.result, cached: true }); return;
        }
        if (active) { json(res, 409, { error: 'Hay una respuesta en curso. Espera o cancélala.' }); return; }
        const controller = new AbortController();
        const requestConfig = config;
        const token = { requestId, controller };
        active = token; setPhase('processing');
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
        const disconnected = () => { if (!res.writableEnded && active === token) controller.abort(); };
        res.on('close', disconnected);
        const start = performance.now();
        try {
          const generated = await reply(requestConfig, history.slice(), message, controller.signal);
          if (controller.signal.aborted || active !== token) throw new Error('CANCELLED');
          history.push({ role: 'user', content: message }, { role: 'assistant', content: generated.text });
          history = history.slice(-12);
          setPhase('responded');
          const result = { reply: generated.text, truncated: generated.truncated, provider: requestConfig.provider, model: requestConfig.model, elapsedMs: Math.round(performance.now() - start), ...state() };
          completed.set(requestId, { message, result });
          if (completed.size > 20) completed.delete(completed.keys().next().value);
          if (!res.destroyed) json(res, 200, result);
        } catch (error) {
          if (active === token) setPhase(controller.signal.aborted && !timedOut ? 'idle' : 'error');
          const providerError = {
            PROVIDER_NOT_CONFIGURED: [503, 'NOT_CONFIGURED', 'Falta la clave de GPT. Añade OPENAI_API_KEY al archivo .env del PC y reinicia el servidor.'],
            PROVIDER_HTTP_401: [502, 'AUTH_ERROR', 'GPT rechazó la clave API. Comprueba OPENAI_API_KEY en el PC.'],
            PROVIDER_HTTP_403: [502, 'ACCESS_ERROR', 'La cuenta API no tiene acceso al modelo seleccionado. Revisa su configuración en OpenAI Platform.'],
            PROVIDER_HTTP_429: [503, 'RATE_LIMIT', 'GPT alcanzó un límite de solicitudes o de saldo API. Revisa los límites de tu cuenta e intenta más tarde.'],
          }[error.message];
          const status = timedOut ? 504 : controller.signal.aborted ? 499 : providerError?.[0] || 502;
          const detail = timedOut ? `El modelo tardó más de ${Math.round(timeoutMs / 1000)} s. Puedes reintentar; el visor continúa.`
            : controller.signal.aborted ? 'Solicitud cancelada.' : providerError?.[2] || 'El proveedor no pudo responder. Revisa su configuración o disponibilidad.';
          if (!res.destroyed) json(res, status, { error: detail, code: timedOut ? 'TIMEOUT' : controller.signal.aborted ? 'CANCELLED' : providerError?.[1] || 'PROVIDER_ERROR' });
        } finally {
          clearTimeout(timer); res.off('close', disconnected);
          if (active === token) active = null;
        }
        return;
      }
      if (pathname.startsWith('/api/')) { json(res, 404, { error: 'Ruta no disponible.' }); return; }
      if (!['GET', 'HEAD'].includes(req.method)) { json(res, 405, { error: 'Método no permitido.' }); return; }
      if (!['/', '/control', '/hologram'].includes(pathname) && !pathname.startsWith('/assets/') && !pathname.startsWith('/models/')) {
        json(res, 404, { error: 'Archivo no disponible.' }); return;
      }
      const target = resolve(root, ['/', '/control', '/hologram'].includes(pathname) ? 'index.html' : `.${pathname}`);
      if (!target.startsWith(root + sep)) { json(res, 403, { error: 'Ruta no permitida.' }); return; }
      if (!(await stat(target)).isFile()) throw new Error('NOT_FOUND');
      res.writeHead(200, { 'Content-Type': MIME[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : await readFile(target));
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      const clientError = pathname.startsWith('/api/');
      json(res, clientError ? 400 : 404, { error: clientError ? error.message : 'Archivo no disponible.' });
    }
  });
  server.on('close', () => active?.controller.abort());
  return server;
}
