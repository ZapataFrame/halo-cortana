import { shallowRef, onMounted, onUnmounted } from 'vue';
import { createPresentationSync } from '../services/presentation-sync.js';
import { requestJson } from '../services/api.js';

export function usePresentation() {
  const presentation = shallowRef(null), connected = shallowRef(false), info = shallowRef(null);
  let pending, disposed = false;
  async function prepare() {
    if (pending || disposed || info.value && (!info.value.localControl || info.value.voiceToken)) return;
    const controller = new AbortController(); pending = controller;
    try {
      const result = info.value || await requestJson('/api/info', { signal: controller.signal });
      if (disposed || controller.signal.aborted) return; info.value = result;
      if (result.localControl) {
        const link = await requestJson('/api/voice/link', { signal: controller.signal });
        if (!disposed && !controller.signal.aborted) info.value = { ...result, voiceToken: link.token };
      }
    }
    catch { /* Reintentar con polling, incluso sin nueva revisión. */ }
    finally { if (pending === controller) pending = undefined; }
  }
  const sync = createPresentationSync({
    interval: () => document.hidden ? 3000 : 1000, onAvailable: prepare,
    onConnection: value => { connected.value = value; },
    onState(value) {
      if (presentation.value && presentation.value.sessionId !== value.sessionId) { pending?.abort(); pending = undefined; info.value = null; }
      presentation.value = value;
    },
  });
  function suspend() { pending?.abort(); pending = undefined; sync.stop(); }
  function resume() { if (!disposed) sync.start(); }
  function visibility() { if (!document.hidden) { sync.stop(); resume(); } }
  onMounted(() => {
    resume(); document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', suspend); window.addEventListener('pageshow', resume);
  });
  onUnmounted(() => {
    disposed = true; suspend(); document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', suspend); window.removeEventListener('pageshow', resume);
  });
  return { presentation, connected, info };
}
