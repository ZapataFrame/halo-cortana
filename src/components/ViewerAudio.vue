<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { createViewerAudio } from '../services/viewer-audio.js';
import { createViewerWake } from '../services/viewer-wake.js';
const props = defineProps({ token: String, settingsOpen: Boolean });
const emit = defineEmits(['phase']);
const enabled = shallowRef(false), wakeEnabled = shallowRef(false), wakeError = shallowRef(false);
const audioPhase = shallowRef('off'), wakePhase = shallowRef('off');
const status = shallowRef('Activa el sonido o «Ey Cortana» una vez en este visor.');
const wakeDetail = shallowRef('');
let player, wake;

function syncPhase() {
  if (audioPhase.value === 'playing') emit('phase', 'speaking');
  else if (wakePhase.value === 'listening') emit('phase', 'listening');
  else if (wakePhase.value === 'processing') emit('phase', 'processing');
  else emit('phase', null);
}

function startAudio() {
  player?.close();
  player = createViewerAudio({ token: props.token, onState(value) {
    const wasPlaying = audioPhase.value === 'playing';
    audioPhase.value = value.phase;
    enabled.value = ['ready', 'preparing', 'playing'].includes(value.phase);
    status.value = value.detail;
    if (wasPlaying && value.phase !== 'playing') wake?.notifySpeechEnded();
    syncPhase();
  } });
  return player.enable();
}

function enable() { startAudio(); }

async function enableWake() {
  wake?.stop(false); wakeError.value = false;
  wake = createViewerWake({
    token: props.token,
    isBusy: () => ['preparing', 'playing'].includes(audioPhase.value),
    onState(value) {
      wakeEnabled.value = ['standby', 'listening', 'processing'].includes(value.phase);
      wakeError.value = value.phase === 'error';
      wakeDetail.value = value.detail;
    },
    onPhase(phase) {
      wakePhase.value = phase || 'off';
      syncPhase();
    },
  });
  // Desbloquear audio y pedir micrófono dentro del mismo clic del usuario.
  const audioPromise = enabled.value ? Promise.resolve() : startAudio();
  const wakePromise = wake.enable();
  await Promise.all([audioPromise, wakePromise]);
}

function stopWake() { wake?.stop(); wakeEnabled.value = false; wakeError.value = false; wakePhase.value = 'off'; syncPhase(); }
function stop() { stopWake(); player?.stop(); }
onMounted(() => window.addEventListener('pagehide', stop));
onUnmounted(() => { window.removeEventListener('pagehide', stop); wake?.stop(false); player?.close(); });
</script>

<template>
  <section v-if="!enabled || settingsOpen || wakeError" class="viewer-audio" aria-label="Sonido y voz del visor">
    <div class="viewer-actions">
      <button v-if="!wakeEnabled" class="primary" @click="enableWake">Activar «Ey Cortana» (voz + mic)</button>
      <button v-else @click="stopWake">Desactivar «Ey Cortana»</button>
      <button v-if="!enabled" @click="enable">Solo activar sonido</button>
      <button v-else @click="stop">Desactivar sonido</button>
    </div>
    <p role="status">{{ wakeDetail || status }}</p>
    <p v-if="!token">Usa el enlace «Abrir visor con voz» o el enlace HTTPS de «Conectar otra pantalla» del control del PC.</p>
  </section>
</template>

<style scoped>
.viewer-audio { position:absolute; z-index:3; right:12px; bottom:12px; width:min(340px,calc(100% - 24px)); padding:16px; background:#141414; border:1px solid var(--line); }
.viewer-actions { display:grid; gap:8px; }
p { margin:10px 0 0; overflow-wrap:anywhere; }
button { width:100%; }
</style>
