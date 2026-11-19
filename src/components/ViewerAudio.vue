<script setup>
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { createViewerAudio } from '../services/viewer-audio.js';
const props = defineProps({ token: String, settingsOpen: Boolean });
const emit = defineEmits(['speaking']);
const enabled = shallowRef(false), status = shallowRef('Activa el sonido una vez en este visor para escuchar la misma voz del PC.');
let player;
function enable() {
  player?.close();
  player = createViewerAudio({ token: props.token, onState(value) {
    enabled.value = ['ready', 'preparing', 'playing'].includes(value.phase);
    status.value = value.detail; emit('speaking', value.phase === 'playing');
  } });
  player.enable();
}
function stop() { player?.stop(); }
onMounted(() => window.addEventListener('pagehide', stop));
onUnmounted(() => { window.removeEventListener('pagehide', stop); player?.close(); });
</script>

<template>
  <section v-if="!enabled || settingsOpen" class="viewer-audio" aria-label="Sonido del visor">
    <button v-if="!enabled" @click="enable">Activar sonido del visor</button>
    <button v-else @click="stop">Desactivar sonido del visor</button>
    <p role="status">{{ status }}</p>
    <p v-if="!token">Usa el enlace «Abrir visor con voz» del control del PC.</p>
  </section>
</template>

<style scoped>
.viewer-audio { position:absolute; z-index:3; right:12px; bottom:12px; width:min(330px,calc(100% - 24px)); padding:16px; background:#141414; border:1px solid var(--line); }
p { margin:10px 0 0; overflow-wrap:anywhere; }
button { width:100%; }
</style>
