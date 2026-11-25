<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { createViewerAudio } from '../services/viewer-audio.js';
import { createViewerWake } from '../services/viewer-wake.js';
const props = defineProps({ token: String, settingsOpen: Boolean });
const emit = defineEmits(['phase']);
const enabled = shallowRef(false), wakeEnabled = shallowRef(false), wakeError = shallowRef(false);
const audioPhase = shallowRef('off'), wakePhase = shallowRef('off');
const status = shallowRef('Activa «Hey Cortana» una vez. Después espera el tono y di tu pregunta o comando.');
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
    if (value.phase === 'error') { wake?.stop(false); wakeEnabled.value = false; wakePhase.value = 'off'; wakeDetail.value = ''; }
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
  if (!enabled.value) startAudio();
  await wake.enable();
}

function stopWake() { wake?.stop(); wakeEnabled.value = false; wakeError.value = false; wakePhase.value = 'off'; syncPhase(); }
function stop() { stopWake(); player?.stop(); }
async function stopPerformance() {
  try {
    const response = await fetch('/api/voice/stop', { method: 'POST', headers: { Authorization: `Bearer ${props.token}`, 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error();
    wakeDetail.value = 'Actuación detenida. Di «Hey Cortana» para continuar.';
  } catch { wakeDetail.value = 'No se pudo detener. Comprueba la conexión con el PC.'; }
}
onMounted(() => window.addEventListener('pagehide', stop));
onUnmounted(() => { window.removeEventListener('pagehide', stop); wake?.stop(false); player?.close(); });
</script>

<template>
  <section v-if="!enabled || settingsOpen || wakeError" class="viewer-audio" :class="{ 'settings-open': settingsOpen }" aria-label="Sonido y voz del visor">
    <div class="viewer-actions">
      <button v-if="!wakeEnabled" class="primary" @click="enableWake">Activar «Hey Cortana» (voz + mic)</button>
      <button v-else @click="stopWake">Desactivar «Hey Cortana»</button>
      <button v-if="!enabled" @click="enable">Solo activar sonido</button>
      <button v-else @click="stop">Desactivar sonido</button>
      <button v-if="enabled" @click="stopPerformance">Detener actuación</button>
    </div>
    <p role="status">{{ wakeDetail || status }}</p>
    <p>«Hey Cortana, baila», «baila la Macarena» o «canta». También reconoce «Ey Cortana».</p>
    <p v-if="!token">Usa el enlace «Abrir visor con voz» o el enlace HTTPS de «Conectar otra pantalla» del control del PC.</p>
  </section>
</template>

<style scoped>
.viewer-audio { position:absolute; z-index:3; right:12px; bottom:12px; width:min(340px,calc(100% - 24px)); padding:16px; background:#141414; border:1px solid var(--line); }
.viewer-audio.settings-open { position:static; width:100%; padding:0; border:0; margin:20px 0; }
.viewer-actions { display:grid; gap:8px; }
p { margin:10px 0 0; overflow-wrap:anywhere; }
button { width:100%; }
</style>
