<script setup>
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue';
import ProviderSettings from './ProviderSettings.vue';
import VoiceControls from './VoiceControls.vue';
import { useConversation } from '../composables/useConversation.js';
const props = defineProps({ info: Object, connected: Boolean, presentation: Object });
const editor = useTemplateRef('editor'), log = useTemplateRef('log'), voice = useTemplateRef('voice');
const draft = shallowRef(''), providerBusy = shallowRef(false), microphoneBusy = shallowRef(false), voiceReady = shallowRef(false);
const { messages, busy, resetting, status, send, cancel, reset, clear, invalidate } = useConversation({ beforeAction: () => voice.value?.stop() });
const locked = computed(() => !props.connected || !props.info?.localControl || busy.value || resetting.value || providerBusy.value || microphoneBusy.value);
const remaining = computed(() => 2000 - draft.value.trim().length - (draft.value.trim() ? 1 : 0));
function append(text) { draft.value = draft.value.trim() ? `${draft.value.trim()}\n${text}` : text; }
async function submit() {
  if (locked.value) return;
  const requestId = await send(draft.value);
  if (requestId) { draft.value = ''; voice.value?.readAutomatic(requestId); }
  await nextTick(); editor.value?.focus();
}
function keydown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!event.repeat) submit(); }
}
watch(messages, async () => { await nextTick(); if (log.value) log.value.scrollTop = log.value.scrollHeight; });
watch(() => props.connected, value => { if (!value) invalidate(); });
watch(() => props.presentation?.sessionId, (value, previous) => { if (previous && value !== previous) { invalidate(); clear(); status.value = 'El servidor reinició la conversación. Tu borrador sigue disponible.'; } });
</script>

<template>
  <section class="conversation" aria-labelledby="conversation-title">
    <div class="section-heading"><h2 id="conversation-title">Conversación</h2><button :disabled="locked" @click="reset">Nueva conversación</button></div>
    <p v-if="info && !info.localControl" class="muted">Abre localhost en el PC para conversar.</p>
    <ProviderSettings :info="info" :connected="connected" :locked="busy || resetting || microphoneBusy" :before-change="() => voice?.stop()" @busy="providerBusy = $event" @changed="clear(); draft = ''" />
    <VoiceControls ref="voice" :info="info" :connected="connected" :presentation="presentation" :locked="busy || resetting || providerBusy" :editor="editor" :remaining="remaining" @busy="microphoneBusy = $event" @transcript="append" @ready="voiceReady = $event" />
    <div ref="log" class="messages" role="log" aria-label="Conversación" aria-live="polite">
      <div v-if="!messages.length" class="empty"><h3>Habla con Cortana.</h3><p>Escribe una pregunta o utiliza el micrófono del PC.</p><button :disabled="locked" @click="draft = 'Preséntate como Cortana'; editor?.focus()">Preparar un saludo</button></div>
      <article v-for="message in messages" :key="message.id" class="message" :class="message.role">
        <strong>{{ message.role === 'user' ? 'Tú' : 'Cortana' }}</strong><p>{{ message.text }}</p>
        <template v-if="message.role === 'assistant'"><p class="muted">{{ message.model }} · {{ (message.elapsedMs / 1000).toFixed(1) }} s<span v-if="message.truncated"> · Respuesta limitada</span></p><button :disabled="locked || !voiceReady" @click="voice?.read(message.id)">Escuchar respuesta</button></template>
      </article>
    </div>
    <p role="status" class="chat-status">{{ status || (!connected ? 'Conectando con el PC…' : info?.health?.ready === false ? info.health.detail : 'El texto se envía solo cuando tú lo decides.') }}</p>
    <form @submit.prevent="submit">
      <label for="message">Mensaje para Cortana</label><textarea id="message" ref="editor" v-model="draft" :disabled="locked" maxlength="2000" rows="3" placeholder="Escribe o dicta un mensaje…" @keydown="keydown" />
      <div class="composer"><span class="muted">{{ draft.length }} / 2000 · Shift + Enter: nueva línea</span><button v-if="busy" type="button" @click="cancel">Cancelar respuesta</button><button v-else class="primary" :disabled="locked || !draft.trim()">Enviar mensaje</button></div>
    </form>
  </section>
</template>

<style scoped>
.conversation { min-width:0; }
.messages { min-height:180px; max-height:360px; overflow:auto; padding:16px 0; }
.empty { padding:8px 0; }
.empty h3 { margin:0 0 10px; font-size:24px; font-weight:450; }
.empty p { color:var(--muted); }
.message { margin:0 0 28px; }
.message p { white-space:pre-wrap; overflow-wrap:anywhere; }
.message.user { color:var(--muted); }
.chat-status { min-height:24px; color:var(--muted); font-size:13px; }
.composer { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-top:12px; }
@media(max-width:440px) { .composer { align-items:stretch; flex-direction:column; } }
</style>
