import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
import { generateReply, providerHealth, localModels, checkProviderConnection } from './providers.js';
import { createPiper, speechText } from './tts.js';
import { createWhisper, AUDIO_LIMIT, validateAudioType, validateAudio } from './stt.js';

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

function readAudio(req, signal) {
  return new Promise((resolveBytes, reject) => {
    const chunks = []; let size = 0;
    const cleanup = () => { req.off('data', data); req.off('end', end); req.off('error', error); signal.removeEventListener('abort', abort); };
    const error = () => { cleanup(); reject(new Error('STT_INVALID_AUDIO')); };
    const abort = () => { cleanup(); req.resume(); reject(new Error('STT_CANCELLED')); };
    const data = chunk => {
      size += chunk.length;
      if (size > AUDIO_LIMIT) { cleanup(); req.resume(); reject(new Error('STT_AUDIO_TOO_LARGE')); }
      else chunks.push(chunk);
    };
    const end = () => { cleanup(); resolveBytes(Buffer.concat(chunks)); };
    req.on('data', data); req.on('end', end); req.on('error', error);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export function createApp({ config, configs = { [config.provider]: config }, models = localModels, root = resolve('dist'), port = 3000, reply = generateReply, health = providerHealth, check = checkProviderConnection, checkTimeoutMs = 8000, timeoutMs = 60000, readAsset = readFile, tts = createPiper(), ttsTimeoutMs = 20000, speechLeaseMs = 15000, stt = createWhisper(), sttTimeoutMs = 30000, captureLeaseMs = 35000 } = {}) {
  const sessionId = randomUUID();
  let revision = 0, chatGeneration = 0, phase = 'idle', animation = 'idle', active = null, history = [];
  const completed = new Map();
  let speech;
  function stopSpeech() {
    if (!speech) return;
    speech.controller.abort(); clearTimeout(speech.timer); speech = undefined; revision++;
  }
  function renewSpeech() {
    clearTimeout(speech.timer);
    speech.timer = setTimeout(stopSpeech, speechLeaseMs); speech.timer.unref();
  }
  let capture;
  function stopCapture() {
    if (!capture) return;
    capture.controller.abort(); clearTimeout(capture.timer); capture = undefined; revision++;
  }
  const state = () => ({ sessionId, revision, phase: capture?.stage === 'recording' ? 'listening'
    : capture?.stage === 'transcribing' ? 'processing' : speech?.playing ? 'speaking' : phase, animation });
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
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { json(res, 400, { error: 'Ruta inválida.' }); return; }
    try {
      if (req.method === 'GET' && pathname === '/api/presentation') { json(res, 200, state()); return; }
      if (req.method === 'GET' && pathname === '/api/tts') {
        if (!localWrite(req, res)) return;
        json(res, 200, await tts.health()); return;
      }
      if (req.method === 'GET' && pathname === '/api/stt') {
        if (!localWrite(req, res)) return;
        json(res, 200, await stt.health()); return;
      }
      if (req.method === 'GET' && pathname === '/api/providers') {
        if (!localWrite(req, res)) return;
        let installed = [], detail = '';
        try { if (configs.ollama) installed = await models(configs.ollama); }
        catch { detail = 'Ollama no responde. Inicia Ollama en el PC y pulsa Actualizar modelos.'; }
        json(res, 200, { provider: config.provider, model: config.model, openaiModel: configs.openai?.model,
          cloudModel: configs['ollama-cloud']?.model, cloudConfigured: Boolean(configs['ollama-cloud']?.key),
          localModels: installed, detail }); return;
      }
      if (req.method === 'GET' && pathname === '/api/info') {
        const addresses = Object.values(networkInterfaces()).flat().filter(item => item && !item.internal && item.family === 'IPv4').map(item => `http://${item.address}:${port}/hologram`);
        json(res, 200, { provider: config.provider, model: config.model, health: await health(config), localControl: LOCAL.has(req.socket.remoteAddress), viewerUrls: addresses, limits: { input: 2000, historyPairs: 6, timeoutMs } }); return;
      }
      if (req.method === 'POST' && pathname.startsWith('/api/')) {
        if (!localWrite(req, res)) return;
        if (pathname === '/api/stt') {
          const token = capture;
          if (!token || token.id !== req.headers['x-capture-id'] || token.stage !== 'stopped') {
            json(res, 409, { error: 'La grabación ya no está activa. Graba de nuevo.' }); return;
          }
          let timedOut = false;
          clearTimeout(token.timer); token.stage = 'transcribing'; revision++;
          token.timer = setTimeout(() => { timedOut = true; token.controller.abort(); }, sttTimeoutMs);
          const disconnected = () => { if (!res.writableEnded && capture === token) stopCapture(); };
          res.on('close', disconnected);
          const started = performance.now();
          try {
            const mime = validateAudioType(req.headers['content-type']);
            if (Number(req.headers['content-length']) > AUDIO_LIMIT) throw new Error('STT_AUDIO_TOO_LARGE');
            const bytes = await readAudio(req, token.controller.signal); validateAudio(bytes, mime);
            const result = await stt.transcribe(bytes, token.controller.signal);
            if (token.controller.signal.aborted || capture !== token) throw new Error('STT_CANCELLED');
            stopCapture();
            json(res, 200, { ...result, elapsedMs: Math.round(performance.now() - started), ...state() });
          } catch (error) {
            const cancelled = token.controller.signal.aborted;
            if (capture === token) stopCapture();
            const details = {
              STT_NOT_CONFIGURED: [503, 'Falta instalar reconocimiento local. Ejecuta npm run setup:stt en el PC.'],
              STT_AUDIO_TOO_LARGE: [413, 'La grabación supera 2 MiB. Graba una frase más corta.'],
              STT_AUDIO_TOO_LONG: [413, 'La grabación supera 16 segundos. Graba una frase más corta.'],
              STT_INVALID_AUDIO: [400, 'El audio no es válido. Graba de nuevo desde el micrófono.'],
              STT_NO_SPEECH: [422, 'No se detectó voz. Acércate al micrófono y vuelve a grabar.'],
            }[error.message];
            if (!res.destroyed) json(res, timedOut ? 504 : cancelled ? 499 : details?.[0] || 502,
              { error: timedOut ? 'La transcripción tardó demasiado. Puedes escribir o volver a grabar.'
                : cancelled ? 'Transcripción cancelada.' : details?.[1] || 'No se pudo transcribir. Puedes escribir el mensaje.',
                code: timedOut ? 'STT_TIMEOUT' : cancelled ? 'STT_CANCELLED' : details ? error.message : 'STT_UNAVAILABLE' });
          } finally { clearTimeout(token.timer); res.off('close', disconnected); }
          return;
        }
        const body = await readJson(req);
        if (pathname === '/api/stt/session') {
          if (!body || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'action,captureId'
            || typeof body.captureId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(body.captureId)
            || !['reserve', 'start', 'stop', 'cancel'].includes(body.action)) {
            json(res, 400, { error: 'Solicitud de micrófono inválida.' }); return;
          }
          if (body.action === 'cancel') {
            if (capture?.id === body.captureId) stopCapture();
            json(res, 200, state()); return;
          }
          if (body.action === 'reserve') {
            if (active || speech || capture) { json(res, 409, { error: 'Hay una voz, grabación o respuesta en curso. Deténla antes de grabar.' }); return; }
            const token = { id: body.captureId, stage: 'preparing', controller: new AbortController() };
            capture = token; token.timer = setTimeout(stopCapture, captureLeaseMs); token.timer.unref();
            let ready;
            try { ready = await stt.health(); }
            catch { ready = { ready: false, detail: 'No se pudo preparar el reconocimiento. Puedes escribir el mensaje.' }; }
            if (capture !== token || token.controller.signal.aborted) { json(res, 499, { error: 'Preparación de micrófono cancelada.' }); return; }
            if (!ready.ready) { stopCapture(); json(res, 503, { error: ready.detail }); return; }
            token.stage = 'reserved';
          } else {
            const expected = body.action === 'start' ? 'reserved' : 'recording';
            if (capture?.id !== body.captureId || capture.stage !== expected) {
              json(res, 409, { error: 'La grabación ya no está activa. Graba de nuevo.' }); return;
            }
            capture.stage = body.action === 'start' ? 'recording' : 'stopped'; revision++;
            if (body.action === 'start') {
              clearTimeout(capture.timer); capture.timer = setTimeout(stopCapture, captureLeaseMs); capture.timer.unref();
            }
          }
          json(res, 200, state()); return;
        }
        if (pathname === '/api/tts' || pathname === '/api/tts/playback') {
          const playback = pathname.endsWith('/playback');
          if (!body || Array.isArray(body) || typeof body.speechId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(body.speechId)
            || Object.keys(body).sort().join(',') !== (playback ? 'playing,speechId' : 'requestId,speechId')
            || (playback ? typeof body.playing !== 'boolean' : typeof body.requestId !== 'string')) {
            json(res, 400, { error: 'Solicitud de voz inválida.' }); return;
          }
          if (playback) {
            if (!body.playing) {
              if (speech?.id === body.speechId) stopSpeech();
              json(res, 200, state()); return;
            }
            if (active || speech?.id !== body.speechId || !speech?.prepared) {
              json(res, 409, { error: 'La voz ya no está disponible. Pulsa Escuchar de nuevo.' }); return;
            }
            if (!speech.playing) { speech.playing = true; revision++; }
            renewSpeech(); json(res, 200, state()); return;
          }
          if (active || speech || capture) { json(res, 409, { error: 'Hay otra voz, micrófono o respuesta en curso. Deténla antes de escuchar.' }); return; }
          const text = body.requestId === 'voice-test'
            ? 'Hola, soy Cortana. Esta es una prueba de voz en español.' : completed.get(body.requestId)?.result.reply;
          if (!text || !speechText(text)) { json(res, 404, { error: 'Esta respuesta ya no está en la conversación. Envía un mensaje nuevo.' }); return; }
          const token = { id: body.speechId, controller: new AbortController(), playing: false, prepared: false };
          speech = token;
          const started = performance.now(); let timedOut = false;
          const timer = setTimeout(() => { timedOut = true; token.controller.abort(); }, ttsTimeoutMs);
          const disconnected = () => { if (!res.writableEnded && speech === token) stopSpeech(); };
          res.on('close', disconnected);
          try {
            const audio = await tts.synthesize(speechText(text), token.controller.signal);
            if (token.controller.signal.aborted || speech !== token) throw new Error('TTS_CANCELLED');
            token.prepared = true; renewSpeech();
            res.writeHead(200, { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store',
              'X-Synthesis-Ms': String(Math.round(performance.now() - started)) });
            res.end(audio);
          } catch (error) {
            const cancelled = token.controller.signal.aborted;
            if (speech === token) stopSpeech();
            const missing = error.message === 'TTS_NOT_CONFIGURED';
            if (!res.destroyed) json(res, timedOut ? 504 : cancelled ? 499 : missing ? 503 : 502,
              { error: timedOut ? 'La voz tardó demasiado. El texto sigue disponible.' : missing
                ? 'Falta instalar la voz local. Ejecuta npm run setup:voice en el PC.' : 'No se pudo generar la voz. El texto sigue disponible.' });
          } finally { clearTimeout(timer); res.off('close', disconnected); }
          return;
        }
        if (pathname === '/api/provider/check') {
          if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) {
            json(res, 400, { error: 'La comprobación usa el proveedor activo del PC. Envía un objeto vacío.' }); return;
          }
          if (active) { json(res, 409, { error: 'Espera o cancela la respuesta antes de comprobar la conexión.' }); return; }
          const checkedConfig = config, generation = chatGeneration, start = performance.now();
          const signal = AbortSignal.timeout(checkTimeoutMs);
          let checked;
          try { checked = await check(checkedConfig, signal); }
          catch { checked = { ready: false, verified: false, code: signal.aborted ? 'TIMEOUT' : 'UNAVAILABLE', detail: 'No se pudo comprobar la conexión. Intenta de nuevo.' }; }
          // Otra pestaña puede haber cambiado el proveedor o completado un chat durante el GET.
          if (config !== checkedConfig || chatGeneration !== generation) {
            json(res, 409, { error: 'El proveedor o la conversación cambió durante la prueba. Vuelve a comprobar.' }); return;
          }
          json(res, 200, { provider: checkedConfig.provider, model: checkedConfig.model,
            health: { ready: Boolean(checked.ready), verified: Boolean(checked.verified), code: checked.code, detail: checked.detail },
            elapsedMs: Math.round(performance.now() - start) }); return;
        }
        if (pathname === '/api/provider') {
          if (active) { json(res, 409, { error: 'Espera o cancela la respuesta antes de cambiar de modelo.' }); return; }
          if (!body || !['openai', 'ollama', 'ollama-cloud'].includes(body.provider) || !configs[body.provider]
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
            json(res, 400, { error: body.provider === 'ollama-cloud'
              ? 'El modelo cloud se configura en OLLAMA_CLOUD_MODEL del PC.'
              : 'El modelo GPT se configura en OPENAI_MODEL del PC.' }); return;
          }
          // La consulta del catálogo puede coincidir con un envío de otra pestaña.
          if (active) { json(res, 409, { error: 'Hay una respuesta en curso. Espera o cancélala.' }); return; }
          config = { ...selected, model: body.model };
          stopSpeech(); stopCapture();
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
          stopSpeech(); stopCapture(); history = []; completed.clear(); setPhase('idle'); json(res, 200, state()); return;
        }
        if (pathname !== '/api/chat') { json(res, 404, { error: 'Ruta no disponible.' }); return; }
        const { message, requestId } = validateChat(body);
        if (completed.has(requestId)) {
          const cached = completed.get(requestId);
          if (cached.message !== message) { json(res, 409, { error: 'El identificador ya corresponde a otro mensaje.' }); return; }
          json(res, 200, { ...cached.result, cached: true }); return;
        }
        if (active) { json(res, 409, { error: 'Hay una respuesta en curso. Espera o cancélala.' }); return; }
        stopSpeech(); stopCapture();
        const controller = new AbortController();
        const requestConfig = config;
        const token = { requestId, controller };
        active = token; chatGeneration++; setPhase('processing');
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
          const cloud = requestConfig.provider === 'ollama-cloud';
          const providerError = cloud ? {
            PROVIDER_NOT_CONFIGURED: [503, 'NOT_CONFIGURED', 'Falta OLLAMA_API_KEY. Guárdala en .env del PC y reinicia el servidor.'],
            PROVIDER_HTTP_401: [502, 'AUTH_ERROR', 'Ollama Cloud rechazó la clave. Comprueba OLLAMA_API_KEY en el PC.'],
            PROVIDER_HTTP_402: [503, 'USAGE_LIMIT', 'Ollama Cloud requiere créditos o acceso adicional para este modelo. Revisa tu cuenta; no se activan pagos desde la aplicación.'],
            PROVIDER_HTTP_403: [502, 'ACCESS_ERROR', 'Tu cuenta de Ollama Cloud no tiene acceso al modelo. Revisa sus permisos y el plan gratuito disponible.'],
            PROVIDER_HTTP_404: [502, 'MODEL_UNAVAILABLE', 'El modelo cloud no está disponible. Comprueba OLLAMA_CLOUD_MODEL con el catálogo de Ollama.'],
            PROVIDER_HTTP_429: [503, 'RATE_LIMIT', 'Ollama Cloud alcanzó un límite de uso o solicitudes. Revisa tu cuota e intenta más tarde.'],
          }[error.message] : {
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
      // Leer antes de enviar 200: un fallo de disco debe cerrar la respuesta con error.
      const content = req.method === 'HEAD' ? undefined : await readAsset(target);
      res.writeHead(200, { 'Content-Type': MIME[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(content);
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      const clientError = pathname.startsWith('/api/');
      json(res, clientError ? 400 : 404, { error: clientError ? error.message : 'Archivo no disponible.' });
    }
  });
  server.on('close', () => { active?.controller.abort(); stopSpeech(); stopCapture(); });
  return server;
}
