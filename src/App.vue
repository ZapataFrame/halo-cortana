<script setup>
import { computed } from 'vue';
import AvatarView from './components/AvatarView.vue';
import ConversationPanel from './components/ConversationPanel.vue';
import { usePresentation } from './composables/usePresentation.js';
const projection = location.pathname === '/hologram';
const { presentation, connected, info } = usePresentation();
const phaseLabel = computed(() => !connected.value ? 'PC sin conexión' : ({ idle: 'En reposo', processing: 'Procesando', responded: 'Respuesta lista', speaking: 'Hablando', listening: 'Escuchando', error: 'Proveedor sin respuesta' }[presentation.value?.phase] || 'Preparando Cortana'));
</script>

<template>
  <AvatarView v-if="projection" projection :presentation="presentation" :connected="connected" />
  <div v-else class="dashboard" :data-session-id="presentation?.sessionId" :data-revision="presentation?.revision">
    <header class="topbar"><h1>Cortana</h1><a class="button" href="/hologram" target="_blank" rel="noopener">Abrir visor</a></header>
    <main class="workspace">
      <div><div class="section-heading"><h2>Presencia</h2><span role="status" class="muted">{{ phaseLabel }}</span></div><AvatarView :presentation="presentation" :connected="connected" :local-control="info?.localControl" /></div>
      <ConversationPanel :info="info" :connected="connected" :presentation="presentation" />
    </main>
    <details class="external-screen"><summary>Conectar otra pantalla</summary><p>Abre el visor en la misma red Wi-Fi. localhost corresponde al equipo donde lo abres.</p><ul><li v-for="url in info?.viewerUrls || []" :key="url"><a :href="url" target="_blank" rel="noopener">{{ url }}</a></li></ul><p v-if="!connected" role="status">PC sin conexión. Reintentando…</p><p class="muted">El audio y el micrófono se controlan desde localhost en el PC. La calibración se guarda por navegador.</p></details>
    <footer><span>Prototipo conversacional</span><a href="/models/README.md" target="_blank" rel="noopener">Modelo y atribución</a></footer>
  </div>
</template>
