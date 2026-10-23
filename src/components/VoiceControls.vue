<script setup>
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue';
import { createSpeechPlayer } from '../services/speech-player.js';
import { createVoiceInput, voiceCaptureSupport } from '../services/voice-input.js';
import { bindVoiceInputControls } from '../services/voice-input-controls.js';
import { requestJson } from '../services/api.js';
const props = defineProps({ info: Object, connected: Boolean, presentation: Object, locked: Boolean, editor: Object, remaining: Number });
const emit = defineEmits(['busy', 'transcript', 'ready']);
const microphone = useTemplateRef('microphone'), discard = useTemplateRef('discard');
const voiceReady = shallowRef(false), micReady = shallowRef(false), automatic = shallowRef(false), volume = shallowRef(80);
const speech = shallowRef({ phase: 'idle', detail: 'Comprobando voz local…' });
const capture = shallowRef({ phase: 'idle', detail: 'Comprobando micrófono…' });
const micBusy = computed(() => ['preparing', 'recording', 'transcribing'].includes(capture.value.phase));
const voiceBusy = computed(() => ['preparing', 'playing'].includes(speech.value.phase));
const local = computed(() => props.info?.localControl && props.connected);
let controls, prepare;
const player = createSpeechPlayer({ onState: value => { speech.value = value; } });
const input = createVoiceInput({
  stopSpeech: () => player.stop(false),
  onState(value) { capture.value = value; controls?.onState(value.phase); },
  onTranscript(text) { if (text.length > props.remaining) return false; emit('transcript', text); },
});
watch(micBusy, value => emit('busy', value), { flush: 'sync' });
watch(() => Boolean(local.value && voiceReady.value && !voiceBusy.value), value => emit('ready', value), { immediate: true });
watch(volume, value => player.setVolume(value / 100));
watch(automatic, value => { if (!value) player.stop(); });
watch(() => props.presentation, (value, previous) => {
  if (!value) return;
  const changed = Boolean(previous && previous.sessionId !== value.sessionId);
  player.onPresentation(value, changed); input.onPresentation(value, changed);
});
watch(() => props.connected, value => { if (!value) stop(); });
watch(() => props.info, async info => {
  prepare?.abort();
  if (!info?.localControl) return;
  const attempt = new AbortController(); prepare = attempt;
  await Promise.allSettled([
    requestJson('/api/tts', { signal: attempt.signal }).then(data => { voiceReady.value = data.ready; speech.value = { phase: 'idle', detail: data.detail }; }).catch(error => { if (!attempt.signal.aborted) speech.value = { phase: 'error', detail: error.message }; }),
    (async () => {
      const support = voiceCaptureSupport();
      if (!support.ready) { capture.value = { phase: 'error', detail: support.detail }; return; }
      try { const data = await requestJson('/api/stt', { signal: attempt.signal }); micReady.value = data.ready; capture.value = { phase: 'idle', detail: data.detail }; }
      catch (error) { if (!attempt.signal.aborted) capture.value = { phase: 'error', detail: error.message }; }
    })(),
  ]);
}, { immediate: true });
async function stop() { await Promise.all([player.stop(false), input.cancel(false)]); }
function visibility() { if (document.hidden) input.cancel(false); }
onMounted(() => {
  controls = bindVoiceInputControls({ button: microphone.value, discardButton: discard.value, input: { focus: () => nextTick(() => props.editor?.focus()) }, voiceInput: input, getPhase: () => capture.value.phase, isBusy: () => micBusy.value });
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', stop);
});
onUnmounted(() => { prepare?.abort(); controls?.destroy(); stop(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop); });
defineExpose({ stop, read: requestId => { if (voiceReady.value) player.play(requestId); }, readAutomatic: requestId => { if (automatic.value && voiceReady.value) player.play(requestId); } });
</script>

<template>
  <details class="voice-settings">
    <summary>Voz y micrófono</summary>
    <label class="checkbox"><input v-model="automatic" type="checkbox" :disabled="!local || !voiceReady">Leer respuestas automáticamente</label>
    <div class="actions"><button :disabled="!local || locked || !voiceReady || voiceBusy || micBusy" @click="player.play('voice-test')">Probar voz</button><button :disabled="!voiceBusy" @click="player.stop()">Detener voz</button></div>
    <label class="volume">Volumen <input v-model.number="volume" type="range" min="0" max="100"><output>{{ volume }} %</output></label>
    <p class="muted" role="status">{{ speech.detail }}</p>
    <div class="actions"><button ref="microphone" class="microphone" :aria-pressed="capture.phase === 'recording'" :disabled="!local || locked || !micReady || capture.phase === 'transcribing'">Mantén pulsado para hablar</button><button ref="discard" :disabled="!micBusy">Descartar grabación</button></div>
    <p class="muted">Máximo 15 s. También puedes mantener Espacio o Enter con el botón enfocado. Revisa el texto antes de enviarlo.</p>
    <p role="status">{{ capture.detail }}<span v-if="capture.seconds !== undefined"> {{ capture.seconds }} / 15 s</span></p>
  </details>
</template>

<style scoped>
.voice-settings { border-bottom:1px solid var(--line); padding:18px 0; }
.checkbox { display:flex; gap:10px; align-items:center; margin:20px 0; }
.volume { display:flex; align-items:center; gap:12px; margin-top:16px; }
.volume input { max-width:180px; }
.volume output { font-variant-numeric:tabular-nums; min-width:45px; }
.microphone { touch-action:none; user-select:none; }
.microphone[aria-pressed=true] { background:var(--text); color:var(--background); }
</style>
