<script setup>
import { computed, onUnmounted, shallowRef, watch } from 'vue';
import { requestJson } from '../services/api.js';
const props = defineProps({ info: Object, connected: Boolean, locked: Boolean, beforeChange: Function });
const emit = defineEmits(['busy', 'changed']);
const catalog = shallowRef(null), provider = shallowRef(''), model = shallowRef('');
const working = shallowRef(false), loading = shallowRef(false), detail = shallowRef('Preparando proveedor…');
let controller;
const enabled = computed(() => props.connected && props.info?.localControl);
const names = computed(() => provider.value === 'openai' ? [catalog.value?.openaiModel].filter(Boolean)
  : provider.value === 'ollama-cloud' ? [catalog.value?.cloudModel].filter(Boolean) : catalog.value?.localModels || []);
const unapplied = computed(() => provider.value !== catalog.value?.provider || model.value !== catalog.value?.model);
watch(working, value => emit('busy', value), { flush: 'sync' });
watch(provider, () => { model.value = provider.value === catalog.value?.provider ? catalog.value.model : names.value[0] || ''; });
async function refresh() {
  controller?.abort(); const attempt = new AbortController(); controller = attempt; loading.value = true;
  try {
    const data = await requestJson('/api/providers', { signal: attempt.signal });
    if (controller !== attempt) return;
    catalog.value = data; provider.value = data.provider; model.value = data.model;
    detail.value = data.detail || 'Cambiar modelo inicia una conversación nueva.';
  } catch (error) { if (!attempt.signal.aborted) detail.value = `${error.message} Pulsa Actualizar modelos para reintentar.`; }
  finally { if (controller === attempt) loading.value = false; }
}
watch(() => props.info, info => { if (info?.localControl && props.connected) refresh(); }, { immediate: true });
async function apply() {
  if (!enabled.value || props.locked || working || loading.value || !model.value) return;
  working.value = true;
  try {
    await props.beforeChange?.();
    const data = await requestJson('/api/provider', { method: 'POST', body: { provider: provider.value, model: model.value } });
    catalog.value = { ...catalog.value, provider: data.provider, model: data.model };
    emit('changed'); detail.value = `Conversación preparada con ${data.model}.`;
  } catch (error) { detail.value = error.message; }
  finally { working.value = false; }
}
async function check() {
  working.value = true; detail.value = 'Comprobando conexión…';
  try {
    const data = await requestJson('/api/provider/check', { method: 'POST', body: {}, timeoutMs: 10000 });
    detail.value = `${data.health.detail} (${data.elapsedMs} ms)`;
  } catch (error) { detail.value = error.message; }
  finally { working.value = false; }
}
onUnmounted(() => controller?.abort());
</script>

<template>
  <details class="provider-settings">
    <summary>Proveedor y modelo<span v-if="catalog" class="summary-value"> · {{ catalog.model }}</span></summary>
    <form class="provider-form" @submit.prevent="apply">
      <label>Proveedor<select v-model="provider" :disabled="!enabled || locked || working || loading || !catalog"><option value="openai">OpenAI</option><option value="ollama-cloud">Ollama Cloud</option><option value="ollama">Ollama local</option></select></label>
      <label>Modelo<select v-model="model" :disabled="!enabled || locked || working || loading || !names.length"><option v-for="name in names" :key="name" :value="name">{{ name }}</option><option v-if="!names.length" value="">Sin modelos disponibles</option></select></label>
      <div class="actions"><button :disabled="!enabled || locked || working || loading || !model || !unapplied">Aplicar modelo</button><button type="button" :disabled="!enabled || locked || working || loading" @click="refresh">Actualizar modelos</button><button type="button" :disabled="!enabled || locked || working || loading || !catalog || unapplied" @click="check">Probar conexión</button></div>
    </form>
    <p role="status" class="muted">{{ detail }}</p>
  </details>
</template>

<style scoped>
.provider-settings { border-bottom:1px solid var(--line); padding:18px 0; }
.provider-form { display:grid; grid-template-columns:1fr 1fr; gap:16px; padding-top:20px; }
.provider-form .actions { grid-column:1 / -1; }
.summary-value { color:var(--muted); font-size:12px; margin-left:12px; overflow-wrap:anywhere; }
@media(max-width:440px) { .provider-form { grid-template-columns:1fr; } }
</style>
