import './style.css';
import { createViewer } from './viewer.js';
import { createPresentationSync } from './presentation-sync.js';

const app = document.querySelector('#app');
const hologram = location.pathname === '/hologram';
const avatarId = new URLSearchParams(location.search).get('avatar') === 'cortana' ? 'cortana' : 'dancer';
const importedAvatar = avatarId === 'cortana';
const viewerPath = `/hologram${importedAvatar ? '?avatar=cortana' : ''}`;
let viewer, disposed = false;

if (hologram) {
  document.body.classList.add('projection-page');
  app.className = 'projection';
  viewer = createViewer(app, { avatarId });
} else {
  app.innerHTML = `
    <div class="dashboard">
      <header class="topbar"><a class="brand" href="/control"><span class="brand-symbol">C</span><span>CORTANA <small>HOLOGRAPHIC INTERFACE</small></span></a><span class="topbar-label">PROTOTIPO / 01</span></header>
      <div class="intro"><div><span class="eyebrow">PEPPER’S GHOST · LABORATORIO LOCAL</span><h1>Una presencia.<br>Una conversación.</h1><p>Proyecta el avatar desde tu pantalla y conversa desde el PC.</p></div><a class="button" href="${viewerPath}" target="_blank" rel="noopener">Abrir visor ↗</a></div>
      <div class="workspace">
        <section class="avatar-card card"><div class="card-heading"><span class="eyebrow">01 / AVATAR</span><span class="phase-chip" data-phase="idle">En reposo</span></div><div class="preview"></div><div class="motion-controls"><span class="eyebrow">AVATAR</span><div class="button-row"><a class="button secondary" href="/control">Humanoide + Gangnam</a><a class="button secondary" href="/control?avatar=cortana">Cortana importada</a></div><p class="small muted">${importedAvatar ? 'Vista de prueba estática · modelo aportado por ti.' : 'Prueba también el GLB Cortana desde la otra opción.'}</p><span class="eyebrow">MOVIMIENTO</span><div class="button-row"><button class="button secondary" data-animation="idle" aria-pressed="true">Reposo</button><button class="button secondary" data-animation="gangnam" aria-pressed="false">Bailar Gangnam Style</button></div><p class="small muted" id="animation-status" role="status">Controla el baile del visor desde este PC.</p></div><div class="avatar-caption"><span>${importedAvatar ? 'CORTANA / SKETCHFAB' : 'QUATERNIUS'}</span><span>${importedAvatar ? 'JAMESLUCINO117 · CC BY-NC 4.0 DECLARADA' : 'HUMANOIDE CC0 · BAILE MIT'}</span></div></section>
        <section class="conversation-card card"><div class="card-heading"><span class="eyebrow">02 / CONVERSACIÓN</span><button class="text-button" id="reset-chat">Nueva conversación</button></div><div class="provider-line"><span class="status-dot"></span><span id="provider-status">Comprobando proveedor…</span></div>
          <form id="provider-form" class="provider-controls">
            <label for="provider-select">Proveedor<select id="provider-select" disabled><option value="openai">GPT / OpenAI</option><option value="ollama-cloud">Ollama Cloud / Gemma 4</option><option value="ollama">Local / Ollama (Qwen)</option></select></label>
            <label for="model-select">Modelo<select id="model-select" disabled></select></label>
            <div class="button-row"><button class="button secondary" id="apply-provider" disabled>Cambiar modelo</button><button class="text-button" id="refresh-models" type="button" disabled>Actualizar modelos</button><button class="text-button" id="check-provider" type="button" disabled>Probar conexión</button></div>
            <p class="small muted" id="provider-help" role="status">Cambiar inicia una conversación nueva. La selección dura hasta reiniciar el servidor.</p>
          </form>
          <div class="messages" aria-label="Conversación" role="log" aria-live="polite"><div class="empty-chat"><span class="empty-symbol">✧</span><h2>Inicia el contacto.</h2><p>Pregúntame algo o cuéntame qué estás construyendo.</p><div class="suggestions"><button>¿Qué es Pepper’s Ghost?</button><button>Preséntate como Cortana</button></div></div></div>
          <p id="chat-status" class="chat-status" role="status"></p><form id="chat-form"><label class="sr-only" for="message">Mensaje para Cortana</label><textarea id="message" placeholder="Escribe un mensaje…" maxlength="2000" rows="2" required></textarea><div class="composer-footer"><span class="small muted">Texto por ahora · voz en la siguiente etapa</span><button class="button" id="send" type="submit">Enviar ↗</button><button class="button secondary" id="cancel" type="button" hidden>Cancelar</button></div></form>
        </section>
        <section class="connection-card card"><div class="card-heading"><span class="eyebrow">03 / PANTALLA EXTERNA</span><span class="small muted">MISMA RED WI-FI</span></div><h2>Lleva el avatar a tu celular.</h2><p>Abre esta dirección en su navegador. Toca la esquina superior izquierda del visor para ajustar espejo, posición y tamaño.</p><div id="viewer-links" class="viewer-links"><a href="${viewerPath}">Abrir visor local</a></div><p class="small muted" id="server-connection" role="status">Conectando con el PC…</p><p class="small muted">Una figura sobre negro puro. Ajusta brillo y bloqueo de pantalla en tu dispositivo.</p></section>
        <section class="adjustment-card card"><div class="card-heading"><span class="eyebrow">04 / CALIBRACIÓN</span><span class="small muted">GUARDADO LOCAL</span></div><div id="desktop-settings"></div></section>
      </div><footer><span>DEMO LOCAL · VISOR + IA</span><a href="/models/README.md" target="_blank" rel="noopener">Modelo y baile / fuentes y licencias ↗</a></footer>
    </div>`;
  const preview = app.querySelector('.preview');
  viewer = createViewer(preview, { compact: true, avatarId });
  // El mismo componente ofrece ajustes en su panel, trasladado al bloque del PC.
  app.querySelector('#desktop-settings').append(preview.querySelector('.calibration-panel'));
  const messages = app.querySelector('.messages'), status = app.querySelector('#chat-status');
  const input = app.querySelector('#message'), send = app.querySelector('#send'), cancel = app.querySelector('#cancel');
  const animationStatus = app.querySelector('#animation-status');
  const motionButtons = [...app.querySelectorAll('button[data-animation]')];
  if (importedAvatar) {
    motionButtons.forEach(button => { button.disabled = true; });
    animationStatus.textContent = 'Pose estática. Para Gangnam Style elige Humanoide + Gangnam.';
  }
  motionButtons.forEach(button => button.addEventListener('click', async () => {
    motionButtons.forEach(item => { item.disabled = true; });
    try {
      const response = await fetch('/api/animation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ animation: button.dataset.animation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      viewer.setAnimation(data.animation);
      motionButtons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.animation === data.animation)));
      animationStatus.textContent = data.animation === 'gangnam' ? 'Baile activo en los visores conectados · sin música.' : 'Avatar en reposo.';
    } catch (error) { animationStatus.textContent = error.message || 'No se pudo cambiar la animación.'; }
    finally { motionButtons.forEach(item => { item.disabled = false; }); }
  }));
  let active = null, retry = null, changingProvider = false, localControl = false, catalog = null;
  const providerSelect = app.querySelector('#provider-select'), modelSelect = app.querySelector('#model-select');
  const providerHelp = app.querySelector('#provider-help');
  const checkProvider = app.querySelector('#check-provider');
  function fillModels() {
    const cloud = providerSelect.value === 'ollama-cloud';
    const names = providerSelect.value === 'openai' ? [catalog?.openaiModel].filter(Boolean)
      : cloud ? [catalog?.cloudModel].filter(Boolean) : catalog?.localModels || [];
    modelSelect.replaceChildren(...names.map(name => new Option(name, name)));
    if (providerSelect.value === catalog?.provider && names.includes(catalog.model)) modelSelect.value = catalog.model;
    else if (providerSelect.value === 'ollama') modelSelect.value = names.find(name => /qwen/i.test(name)) || names[0] || '';
    if (!names.length) modelSelect.add(new Option('Sin modelos disponibles', ''));
    providerHelp.textContent = cloud ? (catalog?.cloudConfigured
      ? 'Gemma se ejecuta en Ollama Cloud. Cada cambio inicia una conversación nueva.'
      : 'Falta OLLAMA_API_KEY en .env del PC. Puedes seleccionar Cloud; para conversar debes configurarla y reiniciar.')
      : providerSelect.value === 'ollama' && !names.length
      ? catalog?.detail || 'No hay modelos instalados en Ollama. Instala tu Qwen y actualiza la lista.'
      : 'Cambiar inicia una conversación nueva. La selección dura hasta reiniciar el servidor.';
    updateControls();
  }
  function updateControls() {
    const locked = Boolean(active || changingProvider || !localControl);
    providerSelect.disabled = locked || !catalog;
    modelSelect.disabled = locked || !modelSelect.value;
    app.querySelector('#apply-provider').disabled = locked || !modelSelect.value;
    app.querySelector('#refresh-models').disabled = locked;
    const unapplied = providerSelect.value !== catalog?.provider || modelSelect.value !== catalog?.model;
    checkProvider.disabled = locked || !catalog || unapplied;
    checkProvider.title = unapplied ? 'Pulsa Cambiar modelo para aplicar la selección antes de probarla.' : 'Comprueba el proveedor activo sin generar texto.';
    input.disabled = locked; send.disabled = locked;
    app.querySelector('#reset-chat').disabled = locked;
  }
  function showProviderHealth(info) {
    app.querySelector('#provider-status').textContent = `${info.provider.toUpperCase()} / ${info.model} · ${info.health.detail}`;
    app.querySelector('.status-dot').classList.toggle('ready', info.health.ready && info.health.verified);
  }
  async function refreshInfo() {
    const response = await fetch('/api/info');
    if (!response.ok) throw new Error('No se pudo consultar el proveedor.');
    const info = await response.json();
    localControl = info.localControl;
    showProviderHealth(info);
    updateControls();
    return info;
  }
  async function refreshModels() {
    const response = await fetch('/api/providers');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo consultar los modelos.');
    catalog = data; providerSelect.value = data.provider; fillModels();
  }
  providerSelect.addEventListener('change', fillModels);
  modelSelect.addEventListener('change', updateControls);
  checkProvider.addEventListener('click', async () => {
    if (checkProvider.disabled) return;
    changingProvider = true; updateControls();
    providerHelp.textContent = 'Comprobando conexión sin generar texto…';
    try {
      const response = await fetch('/api/provider/check', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: '{}', signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo comprobar la conexión.');
      showProviderHealth(data);
      providerHelp.textContent = `Prueba completada en ${(data.elapsedMs / 1000).toFixed(1)} s, sin generar texto.`;
    } catch (error) { providerHelp.textContent = error.name === 'TimeoutError' ? 'La conexión tardó demasiado. Intenta de nuevo.' : error.message; }
    finally { changingProvider = false; updateControls(); }
  });
  app.querySelector('#refresh-models').addEventListener('click', async () => {
    changingProvider = true; updateControls();
    try { await refreshModels(); await refreshInfo(); }
    catch (error) { providerHelp.textContent = error.message; }
    finally { changingProvider = false; updateControls(); }
  });
  app.querySelector('#provider-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (active || changingProvider || !localControl) return;
    changingProvider = true; updateControls();
    try {
      const response = await fetch('/api/provider', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerSelect.value, model: modelSelect.value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      messages.replaceChildren(); retry = null; input.value = '';
      catalog.provider = data.provider; catalog.model = data.model;
      status.textContent = `Nueva conversación con ${data.model}.`;
      fillModels();
      await refreshInfo();
    } catch (error) { providerHelp.textContent = error.message; }
    finally { changingProvider = false; updateControls(); }
  });
  function addMessage(role, text, meta = '') {
    messages.querySelector('.empty-chat')?.remove();
    const article = document.createElement('article'); article.className = `message ${role}`;
    const label = document.createElement('span'); label.className = 'message-label'; label.textContent = role === 'user' ? 'TÚ' : 'CORTANA';
    const content = document.createElement('p'); content.textContent = text;
    article.append(label, content);
    if (meta) { const detail = document.createElement('span'); detail.className = 'small muted'; detail.textContent = meta; article.append(detail); }
    messages.append(article); messages.scrollTop = messages.scrollHeight;
  }
  function busy(value) { send.hidden = value; cancel.hidden = !value; updateControls(); }
  async function submit(message, reused) {
    if (active || changingProvider || !localControl) return;
    const requestId = reused?.requestId || crypto.randomUUID();
    const controller = new AbortController();
    const current = { requestId, message, controller }; active = current; busy(true);
    if (!reused) addMessage('user', message);
    status.textContent = 'Cortana está procesando tu mensaje…'; viewer.setPhase('processing');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, requestId }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
      if (active !== current || controller.signal.aborted) return;
      addMessage('assistant', data.reply, `${data.model} · ${(data.elapsedMs / 1000).toFixed(1)} s${data.truncated ? ' · respuesta limitada' : ''}`);
      status.textContent = 'Respuesta recibida.'; input.value = ''; retry = null;
    } catch (error) {
      if (active !== current || controller.signal.aborted) return;
      retry = { requestId, message };
      status.textContent = `${error.message} Pulsa Enviar para reintentar este mensaje.`;
    } finally {
      if (active === current) { active = null; busy(false); input.focus(); }
    }
  }
  app.querySelector('#chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const message = input.value.trim();
    if (message) submit(message, retry?.message === message ? retry : null);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); app.querySelector('#chat-form').requestSubmit(); }
  });
  app.querySelectorAll('.suggestions button').forEach(button => button.addEventListener('click', () => { input.value = button.textContent; input.focus(); }));
  cancel.addEventListener('click', async () => {
    if (!active) return;
    const old = active; active = null; old.controller.abort();
    status.textContent = 'Cancelando…';
    try {
      const response = await fetch('/api/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: old.requestId }) });
      if (!response.ok) throw new Error();
      status.textContent = 'Solicitud cancelada. Puedes enviar otra pregunta.';
    } catch { status.textContent = 'Se detuvo la espera. Comprueba la conexión con el PC.'; }
    retry = null; busy(false); viewer.setPhase('idle'); input.focus();
  });
  app.querySelector('#reset-chat').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error();
      messages.replaceChildren(); retry = null; status.textContent = 'Nueva conversación lista.'; input.focus();
    } catch { status.textContent = 'No fue posible reiniciar. Comprueba el servidor.'; }
  });
  updateControls();
  refreshInfo().then(async info => {
    if (!info.localControl) { input.disabled = true; send.disabled = true; motionButtons.forEach(item => { item.disabled = true; }); status.textContent = 'Abre http://localhost:3000/control en el PC para conversar.'; }
    else if (!info.health.ready) status.textContent = info.health.detail;
    if (info.localControl) await refreshModels();
    const links = app.querySelector('#viewer-links');
    for (const address of info.viewerUrls) {
      const url = address + (importedAvatar ? '?avatar=cortana' : '');
      const row = document.createElement('div'), link = document.createElement('a'), copy = document.createElement('button');
      link.href = url; link.textContent = url; copy.textContent = 'Copiar'; copy.className = 'text-button';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); copy.textContent = 'Copiado'; } catch { copy.textContent = 'Selecciona la dirección'; } });
      row.append(link, copy); links.append(row);
    }
  }).catch(() => { app.querySelector('#provider-status').textContent = 'Servidor no disponible. Inicia npm run demo.'; });
}

const presentationSync = createPresentationSync({
  interval: () => document.hidden ? 3000 : 1000,
  onState(state) {
    viewer.setPhase(state.phase);
    viewer.setAnimation(state.animation);
    app.dataset.sessionId = state.sessionId; app.dataset.revision = String(state.revision);
    app.querySelectorAll('button[data-animation]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.animation === (importedAvatar ? 'idle' : state.animation))));
    const chip = app.querySelector('.phase-chip');
    if (chip) { chip.dataset.phase = state.phase; chip.textContent = { idle: 'En reposo', processing: 'Procesando', responded: 'Respuesta lista', error: 'Proveedor sin respuesta' }[state.phase] || 'En reposo'; }
  },
  onConnection(connected) {
    viewer.setConnection(connected); app.dataset.connection = connected ? 'connected' : 'offline';
    const connection = app.querySelector('#server-connection');
    if (connection) connection.textContent = connected ? 'Conexión con el PC activa.' : 'PC sin conexión. Reintentando…';
    if (!connected) {
      viewer.setPhase('idle');
      const chip = app.querySelector('.phase-chip');
      if (chip) { chip.dataset.phase = 'offline'; chip.textContent = 'PC sin conexión'; }
    }
  },
});
presentationSync.start();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !disposed) { presentationSync.stop(); presentationSync.start(); }
});
window.addEventListener('pagehide', event => {
  presentationSync.stop();
  if (!event.persisted) { disposed = true; viewer.destroy(); }
});
window.addEventListener('pageshow', event => {
  if (event.persisted && !disposed) presentationSync.start();
});
