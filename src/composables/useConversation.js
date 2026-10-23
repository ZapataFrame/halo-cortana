import { shallowRef, onScopeDispose } from 'vue';
import { requestJson } from '../services/api.js';

export function useConversation({ beforeAction = async () => {}, request = requestJson } = {}) {
  const messages = shallowRef([]), busy = shallowRef(false), resetting = shallowRef(false), status = shallowRef('');
  let active, retry, resetJob;
  async function send(message) {
    message = message.trim();
    if (active || resetting.value || !message || message.length > 2000) return;
    const requestId = retry?.message === message ? retry.requestId : crypto.randomUUID();
    const job = { requestId, message, controller: new AbortController() }; active = job; busy.value = true;
    try {
      await beforeAction(); if (active !== job) return;
      if (retry?.requestId !== requestId) messages.value = [...messages.value, { id: `${requestId}-user`, role: 'user', text: message }];
      status.value = 'Cortana está preparando su respuesta…';
      const data = await request('/api/chat', { method: 'POST', body: { message, requestId }, signal: job.controller.signal, timeoutMs: 65000 });
      if (active !== job || job.controller.signal.aborted) return;
      messages.value = [...messages.value, { id: requestId, role: 'assistant', text: data.reply, model: data.model, elapsedMs: data.elapsedMs, truncated: data.truncated }];
      status.value = 'Respuesta recibida.'; retry = undefined; return requestId;
    } catch (error) {
      if (active !== job) return;
      retry = { message, requestId }; status.value = `${error.message} Puedes volver a enviar el mensaje.`;
    } finally { if (active === job) { active = undefined; busy.value = false; } }
  }
  async function cancel() {
    const old = active; active = undefined; busy.value = false; old?.controller.abort(); retry = undefined;
    if (!old) return;
    try { await request('/api/cancel', { method: 'POST', body: { requestId: old.requestId } }); status.value = 'Solicitud cancelada. Puedes continuar.'; }
    catch { status.value = 'Se detuvo la espera. Comprueba la conexión con el PC.'; }
  }
  function clear() { messages.value = []; retry = undefined; status.value = 'Nueva conversación lista.'; }
  async function reset() {
    if (active || resetting.value) return;
    const job = new AbortController(); resetJob = job; resetting.value = true;
    try {
      await beforeAction(); job.signal.throwIfAborted();
      await request('/api/reset', { method: 'POST', body: {}, signal: job.signal });
      if (resetJob === job) clear();
    } catch (error) { if (!job.signal.aborted) status.value = error.message; }
    finally { if (resetJob === job) { resetJob = undefined; resetting.value = false; } }
  }
  function invalidate() { active?.controller.abort(); resetJob?.abort(); active = resetJob = undefined; busy.value = resetting.value = false; retry = undefined; }
  onScopeDispose(invalidate);
  return { messages, busy, resetting, status, send, cancel, clear, reset, invalidate };
}
