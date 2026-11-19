const SYSTEM_PROMPT = `
Eres Cortana, una asistente personal de inteligencia artificial
desarrollada por UNSC, una organización de tecnología e ingeniería
del universo ficticio de Halo.

En este proyecto, Cortana se ofrece como una asistente para el hogar,
el estudio y el trabajo, representada mediante un avatar holográfico azul.
Tu propósito es ayudar a organizar ideas, resolver dudas y acompañar
al usuario en sus actividades.

Tu personalidad es inteligente, observadora, cercana e ingeniosa,
con seguridad al hablar y humor sutil ocasional.

Habla de UNSC o del universo de Halo cuando sea pertinente o te pregunten.
En una conversación cotidiana, céntrate en lo que necesita el usuario.
Distingue las capacidades de esta aplicación de las capacidades
que Cortana tiene en los videojuegos.

ESTILO
- Responde en español.
- Conversa como una compañera atenta: responde directamente y aporta algo útil.
- Usa normalmente una o dos frases breves. Amplía cuando la pregunta necesite una explicación o el usuario te lo pida.
- Adapta el tono a la conversación: cercano en una charla, preciso al explicar y sereno ante una preocupación.
- Evita saludos repetitivos, frases de relleno y ofrecer ayuda al final de cada respuesta.
- Usa humor cuando encaje, sin forzarlo ni trivializar situaciones serias.
- Escribe para ser escuchada: frases fluidas, sin emojis, asteriscos ni descripciones de gestos.
- Tu presentación habitual es simplemente «Soy Cortana». Explica tu naturaleza y capacidades con honestidad cuando sea relevante.

CAPACIDADES Y CONTEXTO
- En esta versión puedes conversar, explicar, proponer ideas y orientar al usuario.
- No controlas dispositivos, ejecutas herramientas ni realizas acciones externas. Si te solicitan una acción, aclara brevemente qué puedes hacer y ofrece orientación.
- Utiliza la información disponible en la conversación. No inventes recuerdos, datos personales ni acceso al entorno.
- La aplicación gestiona el micrófono, la transcripción y la reproducción de voz. Recibes los mensajes que el usuario envía explícitamente.
- No afirmes estar escuchando, viendo, hablando o realizando una acción física sin información explícita de la aplicación.
- Cuando falte información importante, haz una pregunta breve. Cuando no sepas algo, reconócelo con naturalidad.
`;

export const PROVIDERS = Object.freeze(['openai', 'ollama', 'ollama-cloud', 'gemini']);
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export function providerConfig(env = process.env, provider = env.LLM_PROVIDER || 'openai') {
  if (!PROVIDERS.includes(provider)) throw new Error('LLM_PROVIDER debe ser ollama, ollama-cloud, openai o gemini.');
  if (provider === 'gemini') {
    const model = env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
    if (!/^gemini-[a-zA-Z0-9._-]{1,120}$/.test(model)) throw new Error('GEMINI_MODEL debe ser un identificador Gemini, sin URL ni prefijo models/.');
    return { provider, model, key: env.GEMINI_API_KEY?.trim() || '', url: GEMINI_URL };
  }
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
  const threads = Number(env.OLLAMA_NUM_THREADS || env.VOICE_CPU_THREADS || 2);
  if (!Number.isInteger(threads) || threads < 1 || threads > 16) throw new Error('OLLAMA_NUM_THREADS debe ser un entero de 1 a 16.');
  return { provider, model: env.OLLAMA_MODEL || 'phi4-mini:latest', url: url.origin, threads };
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
  const gpt = config.provider === 'openai', cloud = config.provider === 'ollama-cloud', gemini = config.provider === 'gemini';
  if (!config.model || ((gpt || cloud || gemini) && !config.key)) {
    return failed('NOT_CONFIGURED', !config.model ? 'Configura el modelo en .env del PC y reinicia el servidor.'
      : `Añade ${gemini ? 'GEMINI_API_KEY' : gpt ? 'OPENAI_API_KEY' : 'OLLAMA_API_KEY'} a .env del PC y reinicia el servidor.`);
  }
  try {
    signal.throwIfAborted();
    const url = gemini ? `${GEMINI_URL}/${encodeURIComponent(config.model)}` : gpt ? `https://api.openai.com/v1/models/${encodeURIComponent(config.model)}`
      : cloud ? 'https://ollama.com/api/tags' : `${config.url}/api/tags`;
    // El catálogo Cloud es público: consultarlo no prueba su clave y no la necesita.
    const response = await request(url, { method: 'GET', signal, redirect: 'error',
      headers: gemini ? { 'x-goog-api-key': config.key } : gpt ? { Authorization: `Bearer ${config.key}` } : {} });
    if (!response.ok) {
      const errors = gemini ? {
        400: ['AUTH_ERROR', 'Gemini rechazó la solicitud de diagnóstico. Comprueba GEMINI_API_KEY y GEMINI_MODEL en el PC.'],
        401: ['AUTH_ERROR', 'Gemini rechazó la clave. Comprueba GEMINI_API_KEY en el PC.'],
        403: ['ACCESS_ERROR', 'La clave o proyecto no tiene acceso a Gemini. Revisa permisos, restricciones y disponibilidad.'],
        404: ['MODEL_UNAVAILABLE', 'Modelo Gemini no disponible. Comprueba GEMINI_MODEL en el PC.'],
        429: ['RATE_LIMIT', 'Gemini alcanzó un límite de solicitudes o cuota. Revisa tu cuenta e intenta más tarde.'],
      } : gpt && {
        401: ['AUTH_ERROR', 'GPT rechazó la clave. Comprueba OPENAI_API_KEY en el PC.'],
        403: ['ACCESS_ERROR', 'La cuenta API no tiene acceso a este modelo GPT. Revisa sus permisos.'],
        404: ['MODEL_UNAVAILABLE', 'Modelo GPT no disponible. Comprueba OPENAI_MODEL en el PC.'],
        429: ['RATE_LIMIT', 'GPT alcanzó un límite de solicitudes. Espera y revisa los límites de tu cuenta.'],
      };
      return errors?.[response.status] ? failed(...errors[response.status])
        : failed('UNAVAILABLE', 'El servicio no pudo comprobarse. Intenta más tarde; el visor sigue disponible.');
    }
    const data = await response.json();
    if (gemini) {
      if (data?.name !== `models/${config.model}` || !data.supportedGenerationMethods?.includes('generateContent')) {
        return failed('MODEL_UNAVAILABLE', 'Gemini no confirmó un modelo compatible con generación de texto. Revisa GEMINI_MODEL.');
      }
      return { ready: true, verified: true, code: 'MODEL_AVAILABLE',
        detail: 'Clave aceptada y modelo Gemini disponible. La cuota de generación se comprueba al enviar.' };
    }
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
  if (config.provider === 'gemini') return {
    ready: Boolean(config.key && config.model), verified: false,
    detail: config.key && config.model ? 'Gemini configurado; acceso y cuota se comprueban al enviar.'
      : 'Añade GEMINI_API_KEY al archivo .env del PC y reinicia el servidor. El visor sigue disponible.',
  };
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
  signal?.throwIfAborted();
  let url, body, headers = { 'Content-Type': 'application/json' };
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }];
  if (config.provider === 'gemini') {
    if (!config.key || !config.model) throw new Error('PROVIDER_NOT_CONFIGURED');
    // Origen fijo, clave en cabecera: no incluirla en URL, contenido ni navegador.
    url = `${GEMINI_URL}/${encodeURIComponent(config.model)}:generateContent`;
    headers['x-goog-api-key'] = config.key;
    body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [...history, { role: 'user', content: message }].map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }],
      })),
      generationConfig: { candidateCount: 1, maxOutputTokens: 1024, thinkingConfig: { includeThoughts: false } },
    };
  } else if (config.provider === 'ollama' || config.provider === 'ollama-cloud') {
    url = `${config.url}/api/chat`;
    if (config.provider === 'ollama-cloud') {
      if (!config.key || !config.model) throw new Error('PROVIDER_NOT_CONFIGURED');
      headers.Authorization = `Bearer ${config.key}`;
      body = { model: config.model, messages, stream: false, think: false,
        options: { num_predict: 256, temperature: 1, top_p: 0.95, top_k: 64 } };
    } else {
      body = { model: config.model, messages, stream: false, options: { num_ctx: 4096, num_predict: 48, num_thread: config.threads || 2, temperature: 0.5 } };
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
  if (config.provider === 'gemini') {
    const candidate = data?.candidates?.[0];
    if ((data?.promptFeedback?.blockReason && data.promptFeedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED')
      || (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason))) {
      throw new Error('PROVIDER_BLOCKED_RESPONSE');
    }
    const text = candidate?.content?.parts?.filter(part => part.thought !== true && typeof part.text === 'string')
      .map(part => part.text).join('');
    if (!text?.trim()) throw new Error('PROVIDER_EMPTY_RESPONSE');
    return { text: text.trim().slice(0, 8000), truncated: candidate.finishReason === 'MAX_TOKENS' };
  }
  const content = config.provider !== 'openai' ? data.message?.content
    : data.output?.filter(item => item.type === 'message').flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('PROVIDER_EMPTY_RESPONSE');
  return { text: content.trim().slice(0, 8000), truncated: data.done_reason === 'length' || data.status === 'incomplete' };
}
