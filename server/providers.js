const SYSTEM_PROMPT = 'Eres Cortana, asistente de una demo holográfica. Responde en español, máximo 25 palabras. Solo conversas: no controlas un simulador ni dispositivos y no ejecutas acciones ni herramientas. La aplicación muestra tu avatar sobre fondo negro y puede leer tus respuestas con voz local en el PC; el usuario usa Leer respuestas automáticamente o Escuchar respuesta. También puede mantener pulsado el micrófono del PC, revisar la transcripción y enviarla explícitamente. No afirmes estar escuchando o hablando ahora: esos estados dependen de la captura o reproducción real de la aplicación. No confundas estas funciones existentes con herramientas o acciones del simulador.';

export function providerConfig(env = process.env, provider = env.LLM_PROVIDER || 'openai') {
  if (!['ollama', 'openai', 'ollama-cloud'].includes(provider)) throw new Error('LLM_PROVIDER debe ser ollama, ollama-cloud u openai.');
  if (provider === 'openai') {
    return { provider, model: env.OPENAI_MODEL || 'gpt-4.1-mini', key: env.OPENAI_API_KEY?.trim() || '', url: 'https://api.openai.com/v1/responses' };
  }
  if (provider === 'ollama-cloud') {
    // Destino fijo: una clave cloud nunca se envía a una URL elegida desde el visor.
    return { provider, model: env.OLLAMA_CLOUD_MODEL || 'gemma4:31b', key: env.OLLAMA_API_KEY?.trim() || '', url: 'https://ollama.com' };
  }
  const url = new URL(env.OLLAMA_URL || 'http://127.0.0.1:11434');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OLLAMA_URL debe apuntar al servicio local del PC.');
  }
  return { provider, model: env.OLLAMA_MODEL || 'phi4-mini:latest', url: url.origin };
}

function catalogNames(data) {
  if (!Array.isArray(data.models)) throw new Error('OLLAMA_INVALID_CATALOG');
  return [...new Set(data.models.map(item => item.name).filter(name => typeof name === 'string' && name.length > 0 && name.length <= 200))].sort();
}

export async function localModels(config, request = fetch) {
  const response = await request(`${config.url}/api/tags`, { signal: AbortSignal.timeout(3000), redirect: 'error' });
  if (!response.ok) throw new Error('OLLAMA_UNAVAILABLE');
  return catalogNames(await response.json());
}

export async function checkProviderConnection(config, signal = AbortSignal.timeout(8000), request = fetch) {
  const failed = (code, detail) => ({ ready: false, verified: false, code, detail });
  const gpt = config.provider === 'openai', cloud = config.provider === 'ollama-cloud';
  if (!config.model || ((gpt || cloud) && !config.key)) {
    return failed('NOT_CONFIGURED', !config.model ? 'Configura el modelo en .env del PC y reinicia el servidor.'
      : `Añade ${gpt ? 'OPENAI_API_KEY' : 'OLLAMA_API_KEY'} a .env del PC y reinicia el servidor.`);
  }
  try {
    signal.throwIfAborted();
    const url = gpt ? `https://api.openai.com/v1/models/${encodeURIComponent(config.model)}`
      : cloud ? 'https://ollama.com/api/tags' : `${config.url}/api/tags`;
    // El catálogo Cloud es público: consultarlo no prueba su clave y no la necesita.
    const response = await request(url, { method: 'GET', signal, redirect: 'error',
      headers: gpt ? { Authorization: `Bearer ${config.key}` } : {} });
    if (!response.ok) {
      const errors = gpt && {
        401: ['AUTH_ERROR', 'GPT rechazó la clave. Comprueba OPENAI_API_KEY en el PC.'],
        403: ['ACCESS_ERROR', 'La cuenta API no tiene acceso a este modelo GPT. Revisa sus permisos.'],
        404: ['MODEL_UNAVAILABLE', 'Modelo GPT no disponible. Comprueba OPENAI_MODEL en el PC.'],
        429: ['RATE_LIMIT', 'GPT alcanzó un límite de solicitudes. Espera y revisa los límites de tu cuenta.'],
      };
      return errors?.[response.status] ? failed(...errors[response.status])
        : failed('UNAVAILABLE', 'El servicio no pudo comprobarse. Intenta más tarde; el visor sigue disponible.');
    }
    const data = await response.json();
    if (gpt) {
      if (data.id !== config.model) return failed('INVALID_RESPONSE', 'El servicio no confirmó el modelo configurado.');
      return { ready: true, verified: true, code: 'MODEL_AVAILABLE',
        detail: 'Clave aceptada y modelo GPT disponible. La cuota de generación se comprueba al enviar.' };
    }
    const installed = catalogNames(data);
    if (!installed.includes(config.model)) return failed('MODEL_UNAVAILABLE', cloud
      ? 'Modelo ausente del catálogo Cloud. Comprueba OLLAMA_CLOUD_MODEL en el PC.'
      : 'Modelo local no instalado. Actualiza la lista y selecciona uno disponible.');
    return cloud ? { ready: true, verified: false, code: 'ACCESS_UNVERIFIED',
      detail: 'Modelo en el catálogo público y clave configurada. Acceso y cuota se comprueban al enviar.' }
      : { ready: true, verified: true, code: 'MODEL_AVAILABLE', detail: 'Ollama responde y el modelo local está instalado.' };
  } catch (error) {
    if (signal.aborted) return failed('TIMEOUT', 'La conexión tardó demasiado. Intenta de nuevo; el visor sigue disponible.');
    return failed('UNAVAILABLE', 'No se pudo comprobar la conexión o leer el catálogo. Revisa el servicio; el visor sigue disponible.');
  }
}

export async function providerHealth(config) {
  if (config.provider === 'ollama-cloud') return {
    ready: Boolean(config.key && config.model), verified: false,
    detail: config.key && config.model ? 'Ollama Cloud configurado; acceso y cuota se comprueban al enviar.'
      : 'Añade OLLAMA_API_KEY al archivo .env del PC y reinicia el servidor. El visor sigue disponible.',
  };
  if (config.provider === 'openai') return {
    ready: Boolean(config.key && config.model), verified: false,
    detail: config.key && config.model ? 'GPT configurado; esperando el primer mensaje.' : 'Añade OPENAI_API_KEY al archivo .env del PC y reinicia el servidor.',
  };
  try {
    const found = (await localModels(config)).includes(config.model);
    return { ready: Boolean(found), verified: true, detail: found ? 'Modelo local disponible.' : `Modelo ${config.model} no instalado.` };
  } catch {
    return { ready: false, verified: false, detail: 'Ollama no responde. El visor sigue disponible.' };
  }
}

export async function generateReply(config, history, message, signal, request = fetch) {
  let url, body, headers = { 'Content-Type': 'application/json' };
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }];
  if (config.provider === 'ollama' || config.provider === 'ollama-cloud') {
    url = `${config.url}/api/chat`;
    if (config.provider === 'ollama-cloud') {
      if (!config.key || !config.model) throw new Error('PROVIDER_NOT_CONFIGURED');
      headers.Authorization = `Bearer ${config.key}`;
      body = { model: config.model, messages, stream: false, think: false,
        options: { num_predict: 256, temperature: 1, top_p: 0.95, top_k: 64 } };
    } else {
      body = { model: config.model, messages, stream: false, options: { num_ctx: 4096, num_predict: 48, temperature: 0.5 } };
    }
  } else {
    if (!config.key || !config.model) throw new Error('PROVIDER_NOT_CONFIGURED');
    url = config.url;
    headers.Authorization = `Bearer ${config.key}`;
    body = { model: config.model, instructions: SYSTEM_PROMPT, input: messages.slice(1), max_output_tokens: 256, store: false };
  }
  const response = await request(url, { method: 'POST', headers, body: JSON.stringify(body), signal, redirect: 'error' });
  // No devolver el cuerpo del proveedor: puede contener información privada.
  if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
  const data = await response.json();
  const content = config.provider !== 'openai' ? data.message?.content
    : data.output?.filter(item => item.type === 'message').flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('PROVIDER_EMPTY_RESPONSE');
  return { text: content.trim().slice(0, 8000), truncated: data.done_reason === 'length' || data.status === 'incomplete' };
}
