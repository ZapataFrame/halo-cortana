import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEFAULT_CALIBRATION, loadCalibration, normalizeCalibration, saveCalibration } from './calibration.js';
import { applyProjection, effectiveRotation } from './projection.js';

export function createViewer(container, { compact = false } = {}) {
  container.innerHTML = `
    <div class="render-surface" aria-label="Humanoide holográfico" data-status="loading"></div>
    <svg class="calibration-pattern" viewBox="0 0 200 200" aria-label="Patrón asimétrico de calibración" hidden>
      <path d="M45 160V40h85M45 95h60" fill="none" stroke="white" stroke-width="10"/>
      <circle cx="157" cy="155" r="9" fill="white"/>
    </svg>
    ${compact ? '' : `<button class="calibration-hotspot" aria-label="Abrir calibración" title="Calibración"></button>`}
    <section class="calibration-panel" ${compact ? '' : 'hidden'} aria-label="Calibración del visor">
      <div class="panel-heading"><span class="eyebrow">AJUSTE DE REFLEXIÓN</span>${compact ? '' : '<button class="icon-button" data-action="hide" aria-label="Ocultar calibración">×</button>'}</div>
      <p class="viewer-diagnostics" aria-live="polite">Cargando modelo…</p>
      <label class="select-row">Orientación<select aria-label="Orientación" data-setting="orientation"><option value="auto">Automática</option><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label>
      <p class="small muted">El modo adapta la imagen al montaje. Gira también el dispositivo; usa la rotación para afinar la reflexión.</p>
      <label>Tamaño <output data-value="scale"></output><input aria-label="Tamaño" data-setting="scale" type="range" min="0.25" max="2" step="0.01"></label>
      <label>Horizontal <output data-value="x"></output><input aria-label="Posición horizontal" data-setting="x" type="range" min="-0.45" max="0.45" step="0.01"></label>
      <label>Vertical <output data-value="y"></output><input aria-label="Posición vertical" data-setting="y" type="range" min="-0.45" max="0.45" step="0.01"></label>
      <label>Vista del cuerpo <output data-value="turn"></output><input aria-label="Vista del cuerpo" data-setting="turn" type="range" min="-180" max="180" step="5"></label>
      <label class="select-row">Rotación de pantalla<select aria-label="Rotación de pantalla" data-setting="rotation"><option value="0">0°</option><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></label>
      <div class="check-grid">
        <label><input data-setting="mirrorX" type="checkbox"> Espejo horizontal</label>
        <label><input data-setting="mirrorY" type="checkbox"> Espejo vertical</label>
        <label><input data-setting="wireframe" type="checkbox"> Contornos</label>
        <label><input data-action="pattern" type="checkbox"> Patrón de prueba</label>
      </div>
      <div class="button-row"><button class="button secondary" data-action="reset">Restablecer</button>${compact ? '' : '<button class="button" data-action="fullscreen">Pantalla completa</button>'}</div>
      ${compact ? '<p class="small muted">Estos ajustes pertenecen a este navegador. Calibra también en el celular.</p>' : '<p class="small muted">Oculta este panel antes de colocar la pantalla en la caja. Toca la esquina superior izquierda para volver a abrirlo.</p>'}
      <p class="viewer-notice small" role="status"></p>
    </section>`;
  const surface = container.querySelector('.render-surface');
  const pattern = container.querySelector('.calibration-pattern');
  const panel = container.querySelector('.calibration-panel');
  const diagnostics = container.querySelector('.viewer-diagnostics');
  const notice = container.querySelector('.viewer-notice');
  let settings = loadCalibration(localStorage), renderer, mixer, avatar, modelWidth = 1.2, animation = 'idle';
  const actions = new Map();
  let currentAction;
  let animationId, frameCount = 0, fpsStart = performance.now(), last = performance.now(), phase = 'idle';
  let destroyed = false, isPattern = false, modelReady = false, wakeLock;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 8);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const projection = new THREE.Group();
  const orientation = new THREE.Group();
  const body = new THREE.Group();
  orientation.add(body); projection.add(orientation); scene.add(projection);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
  keyLight.position.set(-3, 4, 6); scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0xffffff, 2);
  rim.position.set(3, 2, -4); scene.add(rim);

  function resize() {
    const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const rotation = effectiveRotation(settings, width, height);
    const rotated = rotation === 90 || rotation === 270;
    const halfHeight = rotated ? Math.max(modelWidth * 0.65, 1.3 / aspect) : Math.max(1.3, modelWidth * 0.65 / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    renderer?.setSize(width, height, false);
    applyProjection(projection, orientation, { ...settings, rotation }, halfHeight, aspect);
    surface.dataset.orientation = settings.orientation;
    surface.dataset.rotation = String(rotation);
    surface.dataset.viewportWidth = String(width);
    surface.dataset.viewportHeight = String(height);
    body.rotation.y = THREE.MathUtils.degToRad(settings.turn);
    pattern.style.transform = `translate(calc(-50% + ${settings.x * width}px), calc(-50% + ${settings.y * height}px)) scale(${settings.scale * (settings.mirrorX ? -1 : 1)}, ${settings.scale * (settings.mirrorY ? -1 : 1)}) rotate(${rotation}deg)`;
    scene.traverse(item => { if (item.isMesh && item.material) item.material.wireframe = settings.wireframe; });
    if (renderer && !isPattern) renderer.render(scene, camera);
  }

  function updateInputs() {
    panel.querySelectorAll('[data-setting]').forEach(input => {
      if (input.type === 'checkbox') input.checked = settings[input.dataset.setting];
      else input.value = settings[input.dataset.setting];
    });
    panel.querySelectorAll('[data-value]').forEach(output => {
      const key = output.dataset.value;
      output.textContent = key === 'scale' ? `${Math.round(settings[key] * 100)}%` : key === 'turn' ? `${settings[key]}°` : `${Math.round(settings[key] * 100)}%`;
    });
  }
  function persist() {
    if (!saveCalibration(localStorage, settings)) notice.textContent = 'No fue posible guardar los ajustes; seguirán activos en esta sesión.';
    updateInputs(); resize();
  }
  container.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('input', () => {
    settings = normalizeCalibration({ ...settings, [input.dataset.setting]: input.type === 'checkbox' ? input.checked : input.dataset.setting === 'orientation' ? input.value : Number(input.value) });
    persist();
  }));
  container.querySelector('[data-action="reset"]').addEventListener('click', () => {
    settings = { ...DEFAULT_CALIBRATION }; isPattern = false; pattern.hidden = true;
    panel.querySelector('[data-action="pattern"]').checked = false;
    surface.hidden = false; persist();
  });
  container.querySelector('[data-action="pattern"]').addEventListener('change', event => {
    isPattern = event.target.checked; pattern.hidden = !isPattern; surface.hidden = isPattern; resize();
  });
  container.querySelector('.calibration-hotspot')?.addEventListener('click', () => { panel.hidden = false; });
  container.querySelector('[data-action="hide"]')?.addEventListener('click', () => {
    panel.hidden = true;
    isPattern = false; pattern.hidden = true; surface.hidden = false;
    panel.querySelector('[data-action="pattern"]').checked = false;
  });
  async function requestWakeLock() {
    if (!navigator.wakeLock || !window.isSecureContext) {
      notice.textContent = 'Si la pantalla se apaga, desactiva temporalmente el bloqueo automático en el dispositivo.'; return;
    }
    try { wakeLock = await navigator.wakeLock.request('screen'); }
    catch { notice.textContent = 'Mantén la pantalla despierta desde los ajustes del dispositivo.'; }
  }
  container.querySelector('[data-action="fullscreen"]')?.addEventListener('click', async () => {
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else notice.textContent = 'Este navegador no ofrece pantalla completa; oculta sus barras manualmente.';
      await requestWakeLock();
    } catch { notice.textContent = 'Pantalla completa no disponible. Usa la pantalla en horizontal y oculta las barras del navegador.'; }
  });
  const visibility = () => {
    last = performance.now(); frameCount = 0; fpsStart = last;
    if (!document.hidden && wakeLock?.released) requestWakeLock();
  };
  document.addEventListener('visibilitychange', visibility);
  updateInputs();
  const observer = new ResizeObserver(resize); observer.observe(container);
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    surface.append(renderer.domElement); resize();
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault(); modelReady = false; surface.dataset.status = 'error';
      diagnostics.textContent = 'Se perdió el contexto gráfico. Recarga el visor.';
    });
    Promise.all([
      new GLTFLoader().loadAsync('/models/dancer.glb'),
      fetch('/models/dancer-motion.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }),
    ]).then(([gltf, motion]) => {
      if (destroyed) return;
      const character = gltf.scene;
      character.name = 'HologramRig';
      avatar = new THREE.Group(); avatar.add(character);
      if (motion.clips?.length) {
        mixer = new THREE.AnimationMixer(character);
        for (const json of motion.clips) {
          const clip = THREE.AnimationClip.parse(json);
          actions.set(clip.name, mixer.clipAction(clip));
        }
        playAnimation(animation);
        mixer.update(0);
        avatar.updateMatrixWorld(true);
        avatar.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
      }
      // Ajustar siempre desde la pose de reposo, incluso si el PC ya baila.
      mixer.stopAllAction(); actions.get('idle').reset().play(); mixer.update(0);
      avatar.updateMatrixWorld(true);
      avatar.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
      const bounds = new THREE.Box3().setFromObject(avatar);
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const fit = 2 / size.y;
      avatar.scale.multiplyScalar(fit);
      avatar.position.addScaledVector(center, -fit);
      modelWidth = Math.max((motion.envelope.max[0] - motion.envelope.min[0]) * fit, size.z * fit);
      avatar.traverse(item => {
        if (!item.isMesh) return;
        item.material = new THREE.MeshStandardMaterial({ color: 0xbcbcbc, roughness: 0.7, metalness: 0.1, emissive: 0x303030, emissiveIntensity: 0.4 });
        item.frustumCulled = false;
      });
      currentAction = null; mixer.stopAllAction(); playAnimation(animation);
      body.add(avatar);
      modelReady = true; surface.dataset.status = 'ready';
      diagnostics.textContent = 'Modelo cargado · midiendo FPS…'; resize();
    }).catch(() => {
      surface.dataset.status = 'error'; diagnostics.textContent = 'No se pudo cargar el modelo. Revisa la conexión con el PC y recarga.';
    });
    function frame(now) {
      if (destroyed) return;
      animationId = requestAnimationFrame(frame);
      const delta = Math.min((now - last) / 1000, 0.05); last = now;
      if (document.hidden) return;
      mixer?.update(delta);
      if (currentAction) surface.dataset.animationTime = currentAction.time.toFixed(2);
      // Pulso visual solo al procesar texto; no simula habla sin TTS.
      if (avatar) avatar.traverse(item => { if (item.isMesh) item.material.emissiveIntensity = phase === 'processing' ? 0.8 + Math.sin(now / 250) * 0.3 : 0.4; });
      if (!isPattern) renderer.render(scene, camera);
      frameCount++;
      if (now - fpsStart >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - fpsStart));
        surface.dataset.fps = String(fps);
        if (modelReady) diagnostics.textContent = `${animation === 'gangnam' ? 'Gangnam Style' : 'En reposo'} · ${fps} FPS · ${renderer.info.render.triangles.toLocaleString('es')} triángulos`;
        frameCount = 0; fpsStart = now;
      }
    }
    animationId = requestAnimationFrame(frame);
  } catch {
    surface.dataset.status = 'error';
    diagnostics.textContent = 'WebGL no está disponible. Prueba otro navegador compatible.';
  }
  function playAnimation(value) {
    if (!['idle', 'gangnam'].includes(value)) return;
    animation = value; surface.dataset.animation = value;
    const next = actions.get(value);
    if (!next || next === currentAction) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (currentAction) next.crossFadeFrom(currentAction, 0.25, false);
    currentAction = next;
  }
  return {
    setAnimation: playAnimation,
    setPhase(value) { phase = value; surface.dataset.phase = value; },
    destroy() {
      destroyed = true; cancelAnimationFrame(animationId); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); wakeLock?.release();
      scene.traverse(item => { if (item.isMesh) { item.geometry.dispose(); item.material.dispose(); } });
      renderer?.dispose();
    },
  };
}
