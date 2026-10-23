<script setup>
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue';
import CalibrationPanel from './CalibrationPanel.vue';
import { loadCalibration, saveCalibration } from '../scene/calibration.js';
import { requestJson } from '../services/api.js';
const props = defineProps({ projection: Boolean, presentation: Object, connected: Boolean, localControl: Boolean });
const surface = useTemplateRef('surface'), settings = shallowRef(loadCalibration(localStorage));
const pattern = shallowRef(false), open = shallowRef(false), transform = shallowRef('');
const diagnostic = shallowRef({ state: 'loading', detail: 'Cargando Cortana…' }), notice = shallowRef('');
const moving = shallowRef(false);
let viewer, disposed = false, wakeLock;
const phase = computed(() => props.connected ? props.presentation?.phase || 'idle' : 'idle');
watch(settings, value => {
  if (!saveCalibration(localStorage, value)) notice.value = 'No se pudieron guardar los ajustes. Siguen activos en esta sesión.';
  viewer?.setSettings(value);
});
watch(phase, value => viewer?.setPhase(value));
watch(() => props.presentation?.animation, value => viewer?.setAnimation(value));
async function move(animation) {
  moving.value = true; notice.value = '';
  try { await requestJson('/api/animation', { method: 'POST', body: { animation } }); }
  catch (error) { notice.value = error.message; }
  finally { moving.value = false; }
}
async function fullscreen() {
  try {
    await document.documentElement.requestFullscreen?.();
    if (navigator.wakeLock && isSecureContext) wakeLock = await navigator.wakeLock.request('screen');
    else notice.value = 'Si la pantalla se apaga, ajusta el bloqueo automático del dispositivo.';
  } catch { notice.value = 'Pantalla completa no disponible. Puedes ocultar las barras del navegador manualmente.'; }
}
async function restoreWakeLock() {
  if (!document.hidden && wakeLock?.released) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* Usar ajustes del dispositivo. */ }
  }
}
onMounted(async () => {
  document.addEventListener('visibilitychange', restoreWakeLock);
  try {
    const { createViewer } = await import('../scene/viewer.js'); if (disposed) return;
    viewer = createViewer(surface.value, {
      onStatus: value => { diagnostic.value = { ...diagnostic.value, ...value }; },
      onLayout: value => { transform.value = value; },
    });
    viewer.setSettings(settings.value); viewer.setPhase(phase.value); viewer.setAnimation(props.presentation?.animation || 'idle');
  } catch { diagnostic.value = { state: 'error', detail: 'WebGL no está disponible. Prueba otro navegador compatible.' }; }
});
onUnmounted(() => { disposed = true; viewer?.destroy(); wakeLock?.release(); document.removeEventListener('visibilitychange', restoreWakeLock); });
</script>

<template>
  <section :class="projection ? 'projection' : 'avatar-section'" aria-label="Cortana">
    <div class="viewport">
      <div v-show="!pattern" ref="surface" class="render-surface" aria-label="Avatar de Cortana" :data-status="diagnostic.state" :data-textured-materials="diagnostic.texturedMaterials" :data-phase="phase" />
      <svg v-show="pattern" class="pattern" viewBox="0 0 200 200" aria-label="Patrón de calibración" :style="{ transform }"><path d="M45 160V40h85M45 95h60" fill="none" stroke="white" stroke-width="10"/><circle cx="157" cy="155" r="9" fill="white"/></svg>
      <button v-if="projection" class="hotspot" aria-label="Abrir calibración" @click="open = true" />
    </div>
    <div v-if="!projection" class="avatar-controls">
      <p role="status">{{ diagnostic.detail }}<span v-if="diagnostic.fps"> · {{ diagnostic.fps }} FPS</span></p>
      <div class="actions"><button :disabled="!localControl || !connected || moving" @click="move('idle')">Reposo</button><button :disabled="!localControl || !connected || moving || diagnostic.state !== 'ready' || presentation?.animation === 'wave'" @click="move('wave')">Saludar</button></div>
      <p class="muted">Reposo y saludo sobre el rig de Cortana. Movimientos en desarrollo.</p>
    </div>
    <details v-if="!projection" class="calibration">
      <summary>Calibrar imagen</summary><CalibrationPanel v-model="settings" v-model:pattern="pattern" />
    </details>
    <section v-else-if="open" class="calibration overlay" aria-label="Calibración del visor">
      <div class="section-heading"><h2>Calibrar imagen</h2><button @click="open = false">Cerrar</button></div>
      <p role="status">{{ diagnostic.detail }}</p><p v-if="!connected" role="status">PC sin conexión. Cortana sigue visible; reintentando…</p>
      <CalibrationPanel v-model="settings" v-model:pattern="pattern" /><button @click="fullscreen">Pantalla completa</button>
      <p v-if="notice" role="status">{{ notice }}</p>
    </section>
    <p v-if="!projection && notice" role="status">{{ notice }}</p>
  </section>
</template>

<style scoped>
.avatar-section { min-width:0; }
.viewport { position:relative; height:510px; background:#000; }
.projection { height:100dvh; background:#000; position:relative; overflow:hidden; }
.projection .viewport { height:100%; }
.render-surface { position:absolute; inset:0; background:#000; }
.render-surface :deep(canvas) { width:100%; height:100%; display:block; }
.pattern { position:absolute; width:60%; height:60%; left:50%; top:50%; transform-origin:center; }
.hotspot { position:absolute; top:0; left:0; width:64px; height:64px; border:0; background:transparent; padding:0; }
.hotspot:focus-visible { outline-offset:-5px; }
.avatar-controls { padding:12px 0 20px; }
.calibration { border-top:1px solid var(--line); padding:20px 0; }
.calibration :deep(.calibration-fields) { margin-top:20px; }
.overlay { position:absolute; z-index:2; top:12px; left:12px; width:min(360px,calc(100% - 24px)); max-height:calc(100dvh - 24px); overflow:auto; background:#141414; padding:20px; border:1px solid var(--line); }
@media(max-width:760px) { .viewport { height:420px; } }
</style>
