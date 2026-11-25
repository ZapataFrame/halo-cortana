<script setup>
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue';
import { createSpeechPlayer } from '../services/speech-player.js';
import { createClockedAudio } from '../services/clocked-audio.js';
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
let controls, prepare, warmup, songUpload;
const song = shallowRef({ ready: false, detail: 'Comprobando canción…' }), songBusy = shallowRef(false);
const warming = shallowRef(false);
const output = createClockedAudio();
const player = createSpeechPlayer({ synchronize: true, createAudio: () => output, unlockAudio: () => output.unlock(), onState: value => { speech.value = value; } });
const input = createVoiceInput({
  stopSpeech: () => player.stop(false),
  onState(value) { capture.value = value; controls?.onState(value.phase); },
  onTranscript(text) { if (text.length > props.remaining) return false; emit('transcript', text); },
});
watch([micBusy, warming, songBusy], ([mic, warm, song]) => emit('busy', mic || warm || song), { flush: 'sync' });
watch(() => Boolean(local.value && voiceReady.value && !voiceBusy.value), value => emit('ready', value), { immediate: true });
watch(volume, value => player.setVolume(value / 100));
watch(automatic, value => { if (!value) player.stop(); });
function enableAutomatic() { if (automatic.value) player.unlock().catch(error => { automatic.value = false; speech.value = { phase: 'error', detail: error.message }; }); }
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
    requestJson('/api/song', { signal: attempt.signal }).then(data => { song.value = data; }).catch(error => { if (!attempt.signal.aborted) song.value = { ready: false, detail: error.message }; }),
    requestJson('/api/tts', { signal: attempt.signal }).then(data => { voiceReady.value = data.ready; speech.value = { phase: 'idle', detail: data.detail }; }).catch(error => { if (!attempt.signal.aborted) speech.value = { phase: 'error', detail: error.message }; }),
    (async () => {
      const support = voiceCaptureSupport();
      if (!support.ready) { capture.value = { phase: 'error', detail: support.detail }; return; }
      try { const data = await requestJson('/api/stt', { signal: attempt.signal }); micReady.value = data.ready; capture.value = { phase: 'idle', detail: data.detail }; }
      catch (error) { if (!attempt.signal.aborted) capture.value = { phase: 'error', detail: error.message }; }
    })(),
  ]);
}, { immediate: true });
async function prepareEngines() {
  if (warming.value) return;
  warming.value = true; warmup = new AbortController();
  speech.value = { phase: 'preparing', detail: 'Preparando modelos locales. La primera vez puede tardar más de un minuto…' };
  try {
    const result = await requestJson('/api/engines/warmup', { method: 'POST', body: {}, signal: warmup.signal, timeoutMs: 183000 });
    voiceReady.value = result.tts.ready; micReady.value = result.stt.ready;
    speech.value = { phase: result.tts.ready ? 'idle' : 'error', detail: result.tts.ready ? `Voz preparada en ${(result.tts.elapsedMs / 1000).toFixed(1)} s.` : result.tts.detail };
    capture.value = { phase: result.stt.ready ? 'idle' : 'error', detail: result.stt.ready ? `Reconocimiento preparado en ${(result.stt.elapsedMs / 1000).toFixed(1)} s. Puedes dictar.` : result.stt.detail };
  } catch (error) { speech.value = { phase: 'error', detail: error.message }; }
  finally { warming.value = false; }
}
async function uploadSong(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file || songBusy.value) return;
  if (!/\.(wav|mp3)$/i.test(file.name) || file.size > 20 * 1024 * 1024) { song.value = { ...song.value, detail: 'Selecciona un WAV o MP3 de hasta 20 MiB y cinco minutos.' }; return; }
  const job = new AbortController(); songUpload = job; songBusy.value = true;
  song.value = { ...song.value, detail: 'Preparando canción en el PC…' };
  try {
    const response = await fetch('/api/song', { method: 'POST', headers: { 'Content-Type': /\.mp3$/i.test(file.name) ? 'audio/mpeg' : 'audio/wav' }, body: file,
      signal: AbortSignal.any([job.signal, AbortSignal.timeout(35000)]) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar la canción.');
    if (songUpload === job && !job.signal.aborted) song.value = { ...data, detail: `${file.name} preparada. Di «Hey Cortana, canta» en el visor.` };
  } catch (error) { if (songUpload === job) song.value = { ...song.value, detail: job.signal.aborted ? 'Carga cancelada. Puedes elegir de nuevo el archivo.' : error.message }; }
  finally { if (songUpload === job) { songBusy.value = false; songUpload = undefined; } }
}
async function stopPerformance() {
  await stop();
  try { await requestJson('/api/performance/stop', { method: 'POST', body: {} }); }
  catch (error) { song.value = { ...song.value, detail: error.message }; }
}
async function stop() { warmup?.abort(); songUpload?.abort(); await Promise.all([player.stop(false), input.cancel(false)]); }
function visibility() { if (document.hidden) input.cancel(false); }
onMounted(() => {
  controls = bindVoiceInputControls({ button: microphone.value, discardButton: discard.value, input: { focus: () => nextTick(() => props.editor?.focus()) }, voiceInput: input, getPhase: () => capture.value.phase, isBusy: () => micBusy.value });
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', stop);
});
onUnmounted(() => { prepare?.abort(); controls?.destroy(); stop(); output.close(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', stop); });
defineExpose({ stop, read: requestId => { if (voiceReady.value) player.play(requestId); }, readAutomatic: requestId => { if (automatic.value && voiceReady.value) player.play(requestId); } });
</script>

<template>
  <details class="voice-settings">
    <summary>Voz y micrófono</summary>
    <label class="checkbox"><input v-model="automatic" type="checkbox" @change="enableAutomatic" :disabled="!local || !voiceReady">Leer respuestas automáticamente</label>
    <div class="actions"><button :disabled="!local || locked || voiceBusy || micBusy || warming" @click="prepareEngines">Preparar motores</button><button :disabled="!local || locked || !voiceReady || voiceBusy || micBusy" @click="player.play('voice-test')">Probar voz</button><button :disabled="!voiceBusy" @click="stop">Detener voz</button></div>
    <label class="volume">Volumen del PC <input v-model.number="volume" type="range" min="0" max="100"><output>{{ volume }} %</output></label>
    <p class="muted" role="status">{{ speech.detail }}</p>
    <p v-if="speech.synthesisMs !== undefined" class="muted">Preparación de voz: {{ (speech.synthesisMs / 1000).toFixed(2) }} s · hasta escuchar: {{ (speech.startMs / 1000).toFixed(2) }} s</p>
    <p class="muted">La misma lectura suena en los visores enlazados con sonido activado. Si PC y visor usan los mismos altavoces, baja a cero el volumen del PC para evitar eco.</p>
    <div class="actions"><button ref="microphone" class="microphone" :aria-pressed="capture.phase === 'recording'" :disabled="!local || locked || !micReady || capture.phase === 'transcribing'">Mantén pulsado para hablar</button><button ref="discard" :disabled="!micBusy">Descartar grabación</button></div>
    <p class="muted">Máximo 15 s. También puedes mantener Espacio o Enter con el botón enfocado. Revisa el texto antes de enviarlo.</p>
    <p role="status">{{ capture.detail }}<span v-if="capture.seconds !== undefined"> {{ capture.seconds }} / 15 s</span></p>
    <div class="song-settings">
      <h3>Canción de Cortana</h3>
      <p class="muted">Elige la grabación que reproducirá con «canta». Se guarda en este PC. WAV o MP3, hasta 20 MiB y cinco minutos.</p>
      <label class="song-file button">Seleccionar WAV o MP3<input aria-label="Cargar canción" type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" :disabled="!local || locked || voiceBusy || micBusy || warming || songBusy" @change="uploadSong"></label>
      <p role="status" class="muted">{{ song.detail }}<span v-if="song.ready"> · {{ (song.durationMs / 1000).toFixed(1) }} s</span></p>
      <div class="actions"><button :disabled="!local || locked || !song.ready || voiceBusy || micBusy || songBusy || warming" @click="player.play('song')">Probar canción</button><button :disabled="!local" @click="stopPerformance">Detener actuación</button></div>
      <p class="muted">«Probar canción» reproduce en el PC y los visores con sonido activado. El micrófono del visor se pausa mientras suena; usa «Detener actuación» para interrumpir.</p>
    </div>
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
.song-settings { margin-top:24px; padding-top:20px; border-top:1px solid var(--line); }
.song-settings h3 { margin:0 0 10px; font-size:16px; font-weight:500; }
.song-file { position:relative; overflow:hidden; }
.song-file input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; }
.song-file:has(input:disabled) { opacity:.45; cursor:default; }
.song-file:focus-within { outline:2px solid var(--text); outline-offset:3px; }
.song-settings p { overflow-wrap:anywhere; }
</style>
