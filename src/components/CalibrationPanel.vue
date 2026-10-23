<script setup>
import { DEFAULT_CALIBRATION, normalizeCalibration } from '../scene/calibration.js';
const settings = defineModel({ type: Object, required: true });
const pattern = defineModel('pattern', { type: Boolean, default: false });
const fields = [
  { key: 'scale', label: 'Tamaño (%)', min: 25, max: 200, multiplier: 100 },
  { key: 'x', label: 'Posición horizontal (%)', min: -45, max: 45, multiplier: 100 },
  { key: 'y', label: 'Posición vertical (%)', min: -45, max: 45, multiplier: 100 },
  { key: 'turn', label: 'Giro del cuerpo (°)', min: -180, max: 180, multiplier: 1 },
];
function set(key, value) { settings.value = normalizeCalibration({ ...settings.value, [key]: value }); }
function number(event, field) {
  const n = event.target.valueAsNumber;
  if (Number.isFinite(n) && event.target.validity.valid) set(field.key, n / field.multiplier);
}
function commit(event, field) {
  const n = event.target.valueAsNumber;
  if (Number.isFinite(n)) set(field.key, Math.round(n) / field.multiplier);
  event.target.value = Math.round(settings.value[field.key] * field.multiplier);
}
function reset() { settings.value = { ...DEFAULT_CALIBRATION }; pattern.value = false; }
</script>

<template>
  <div class="calibration-fields">
    <label>Orientación<select :value="settings.orientation" @change="set('orientation', $event.target.value)"><option value="auto">Automática</option><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label>
    <label v-for="field in fields" :key="field.key" class="numeric-setting">
      {{ field.label }}
      <input type="number" :aria-label="field.label" :min="field.min" :max="field.max" step="1" :value="Math.round(settings[field.key] * field.multiplier)" @input="number($event, field)" @change="commit($event, field)" @keydown.enter.prevent="commit($event, field)">
      <input type="range" :aria-label="field.label" :min="field.min" :max="field.max" step="1" :value="settings[field.key] * field.multiplier" @input="set(field.key, Number($event.target.value) / field.multiplier)">
    </label>
    <label>Rotación de pantalla<select :value="settings.rotation" @change="set('rotation', Number($event.target.value))"><option v-for="angle in [0,90,180,270]" :key="angle" :value="angle">{{ angle }}°</option></select></label>
    <div class="checks">
      <label><input type="checkbox" :checked="settings.mirrorX" @change="set('mirrorX', $event.target.checked)">Espejo horizontal</label>
      <label><input type="checkbox" :checked="settings.mirrorY" @change="set('mirrorY', $event.target.checked)">Espejo vertical</label>
      <label><input type="checkbox" :checked="settings.wireframe" @change="set('wireframe', $event.target.checked)">Contornos</label>
      <label><input v-model="pattern" type="checkbox">Patrón de prueba</label>
    </div>
    <p class="muted">Se guarda en este navegador. X/Y positivos desplazan a la derecha y abajo. Gira también el dispositivo según el montaje.</p>
    <button type="button" @click="reset">Restablecer ajustes</button>
  </div>
</template>

<style scoped>
.calibration-fields { display:grid; gap:16px; }
.numeric-setting { display:grid; grid-template-columns:1fr 76px; align-items:center; gap:8px; }
.numeric-setting input[type=range] { grid-column:1 / -1; }
.checks { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.checks label { display:flex; align-items:center; gap:8px; }
</style>
