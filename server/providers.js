const SYSTEM_PROMPT = 'Eres Cortana, asistente de una demo holográfica. Responde en español, máximo 25 palabras. Solo conversas: no ejecutas acciones, no tienes voz ni herramientas.';

export function providerConfig(env = process.env) {
  const provider = env.LLM_PROVIDER || 'openai';
  if (!['ollama', 'openai'].includes(provider)) throw new Error('LLM_PROVIDER debe ser ollama u openai.');
  if (provider === 'openai') {
    return { provider, model: env.OPENAI_MODEL || 'gpt-4.1-mini', key: env.OPENAI_API_KEY?.trim() || '', url: 'https://api.openai.com/v1/responses' };
  }
  const url = new URL(env.OLLAMA_URL || 'http://127.0.0.1:11434');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OLLAMA_URL debe apuntar al servicio local del PC.');
  }
  return { provider, model: env.OLLAMA_MODEL || 'phi4-mini:latest', url: url.origin };
}

export async function providerHealth(config) {
  if (config.provider === 'openai') return {
    ready: Boolean(config.key && config.model), verified: false,
    detail: config.key && config.model ? 'GPT configurado; esperando el primer mensaje.' : 'Añade OPENAI_API_KEY al archivo .env del PC y reinicia el servidor.',
  };
  try {
    const response = await fetch(`${config.url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('service');
    const data = await response.json();
    const found = data.models?.some(item => item.name === config.model);
    return { ready: Boolean(found), verified: true, detail: found ? 'Modelo local disponible.' : `Modelo ${config.model} no instalado.` };
  } catch {
    return { ready: false, verified: false, detail: 'Ollama no responde. El visor sigue disponible.' };
  }
}

export async function generateReply(config, history, message, signal, request = fetch) {
  let url, body, headers = { 'Content-Type': 'application/json' };
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }];
  if (config.provider === 'ollama') {
    url = `${config.url}/api/chat`;
    body = { model: config.model, messages, stream: false, options: { num_ctx: 4096, num_predict: 48, temperature: 0.5 } };
  } else {
    if (!config.key || !config.model) throw new Error('PROVIDER_NOT_CONFIGURED');
    url = config.url;
    headers.Authorization = `Bearer ${config.key}`;
    body = { model: config.model, instructions: SYSTEM_PROMPT, input: messages.slice(1), max_output_tokens: 256, store: false };
  }
  const response = await request(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  // No devolver el cuerpo del proveedor: puede contener información privada.
  if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
  const data = await response.json();
  const content = config.provider === 'ollama' ? data.message?.content
    : data.output?.filter(item => item.type === 'message').flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  if (typeof content !== 'string' || !content.trim()) throw new Error('PROVIDER_EMPTY_RESPONSE');
  return { text: content.trim().slice(0, 8000), truncated: data.done_reason === 'length' || data.status === 'incomplete' };
}
