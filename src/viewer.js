import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEFAULT_CALIBRATION, loadCalibration, normalizeCalibration, saveCalibration } from './calibration.js';
import { applyProjection, effectiveRotation } from './projection.js';

export function createViewer(container, { compact = false, avatarId = 'dancer' } = {}) {
  const imported = avatarId === 'cortana';
  const numericControls = [
    ['scale', 'Tamaño', 'Tamaño', 25, 200, 1, 100, '%'],
    ['x', 'Horizontal', 'Posición horizontal', -45, 45, 1, 100, '%'],
    ['y', 'Vertical', 'Posición vertical', -45, 45, 1, 100, '%'],
    ['turn', 'Vista del cuerpo', 'Vista del cuerpo', -180, 180, 5, 1, '°'],
  ].map(([key, label, name, min, max, step, multiplier, unit]) => {
    const id = `${compact ? 'preview' : 'projection'}-${key}-value`;
    return `<div class="calibration-field">
      <div class="calibration-field-heading"><label for="${id}">${label}</label><span class="calibration-number"><input id="${id}" aria-label="${name} en ${unit === '%' ? 'porcentaje' : 'grados'}" type="number" min="${min}" max="${max}" step="${step}" data-setting="${key}" data-multiplier="${multiplier}"><span aria-hidden="true">${unit}</span></span></div>
      <input aria-label="${name}" data-setting="${key}" type="range" min="${min / multiplier}" max="${max / multiplier}" step="${step / multiplier}">
    </div>`;
  }).join('');
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
      ${numericControls}
      <p class="small muted">Los valores válidos se aplican al escribir. Enter confirma y ajusta los límites. X/Y son porcentajes de pantalla; positivos mueven a la derecha y abajo.</p>
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
  const baseEmissive = new WeakMap();
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
    scene.traverse(item => { if (item.isMesh) for (const material of [].concat(item.material || [])) material.wireframe = settings.wireframe; });
    if (renderer && !isPattern) renderer.render(scene, camera);
  }

  function updateInputs() {
    panel.querySelectorAll('[data-setting]').forEach(input => {
      if (input.type === 'checkbox') input.checked = settings[input.dataset.setting];
      else input.value = input.type === 'number' ? Math.round(settings[input.dataset.setting] * Number(input.dataset.multiplier)) : settings[input.dataset.setting];
    });
  }
  function persist() {
    if (!saveCalibration(localStorage, settings)) notice.textContent = 'No fue posible guardar los ajustes; seguirán activos en esta sesión.';
    updateInputs(); resize();
  }
  panel.querySelectorAll('[data-setting]').forEach(input => {
    if (input.type === 'number') input.addEventListener('input', () => {
      const value = input.valueAsNumber;
      if (!Number.isFinite(value) || input.validity.stepMismatch || value < Number(input.min) || value > Number(input.max)) return;
      settings = normalizeCalibration({ ...settings, [input.dataset.setting]: value / Number(input.dataset.multiplier) });
      // No reescribir el campo mientras se teclea: permitir 100 sin truncar el primer 1.
      panel.querySelector(`input[type="range"][data-setting="${input.dataset.setting}"]`).value = settings[input.dataset.setting];
      notice.textContent = '';
      if (!saveCalibration(localStorage, settings)) notice.textContent = 'No fue posible guardar los ajustes; seguirán activos en esta sesión.';
      resize();
    });
    function applyValue() {
      if (input.type === 'number' && (!Number.isFinite(input.valueAsNumber) || input.validity.stepMismatch)) {
        notice.textContent = 'Valor inválido: usa porcentajes enteros y ángulos en pasos de 5°. Se conservó el ajuste anterior.';
        updateInputs(); return;
      }
      const value = input.type === 'checkbox' ? input.checked : input.dataset.setting === 'orientation' ? input.value : Number(input.value) / Number(input.dataset.multiplier || 1);
      settings = normalizeCalibration({ ...settings, [input.dataset.setting]: value });
      notice.textContent = ''; persist();
    }
    input.addEventListener(input.type === 'number' ? 'blur' : 'input', applyValue);
    if (input.type === 'number') input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); applyValue(); }
      if (event.key === 'Escape') { updateInputs(); input.blur(); }
    });
  });
  container.querySelector('[data-action="reset"]').addEventListener('click', () => {
    notice.textContent = '';
    settings = { ...DEFAULT_CALIBRATION }; isPattern = false; pattern.setAttribute('hidden', '');
    panel.querySelector('[data-action="pattern"]').checked = false;
    surface.hidden = false; persist();
  });
  container.querySelector('[data-action="pattern"]').addEventListener('change', event => {
    isPattern = event.target.checked; pattern.toggleAttribute('hidden', !isPattern); surface.hidden = isPattern; resize();
  });
  container.querySelector('.calibration-hotspot')?.addEventListener('click', () => { panel.hidden = false; });
  container.querySelector('[data-action="hide"]')?.addEventListener('click', () => {
    panel.hidden = true;
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
      new GLTFLoader().loadAsync(imported ? '/models/cortana.glb' : '/models/dancer.glb'),
      imported ? Promise.resolve(null) : fetch('/models/dancer-motion.json').then(response => { if (!response.ok) throw new Error(); return response.json(); }),
    ]).then(([gltf, motion]) => {
      if (destroyed) return;
      const character = gltf.scene;
      character.name = 'HologramRig';
      if (imported) character.rotation.y += Math.PI;
      avatar = new THREE.Group(); avatar.add(character);
      if (motion?.clips?.length) {
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
      if (mixer) { mixer.stopAllAction(); actions.get('idle').reset().play(); mixer.update(0); }
      avatar.updateMatrixWorld(true);
      avatar.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
      const bounds = new THREE.Box3().setFromObject(avatar);
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const fit = 2 / size.y;
      avatar.scale.multiplyScalar(fit);
      avatar.position.addScaledVector(center, -fit);
      modelWidth = Math.max(motion ? (motion.envelope.max[0] - motion.envelope.min[0]) * fit : size.x * fit, size.z * fit);
      avatar.traverse(item => {
        if (!item.isMesh) return;
        if (imported) {
          const originals = [].concat(item.material);
          const copies = originals.map(material => {
            if (!material.map || !material.emissiveMap) throw new Error('AVATAR_TEXTURE_MISSING');
            const copy = material.clone();
            baseEmissive.set(copy, copy.emissiveIntensity ?? 1);
            material.dispose(); return copy;
          });
          item.material = Array.isArray(item.material) ? copies : copies[0];
        } else {
          item.material = new THREE.MeshStandardMaterial({ color: 0xbcbcbc, roughness: 0.7, metalness: 0.1, emissive: 0x303030, emissiveIntensity: 0.4 });
          baseEmissive.set(item.material, 0.4);
        }
        item.frustumCulled = false;
      });
      currentAction = null; mixer?.stopAllAction(); playAnimation(animation);
      body.add(avatar);
      modelReady = true; surface.dataset.status = 'ready';
      surface.dataset.avatar = imported ? 'cortana' : 'dancer';
      const textureMaterials = new Set();
      avatar.traverse(item => { if (item.isMesh) for (const material of [].concat(item.material)) if (material.map) textureMaterials.add(material); });
      surface.dataset.texturedMaterials = String(textureMaterials.size);
      if (imported) notice.textContent = 'Cortana con texturas originales · pose estática. Gangnam Style usa el humanoide original.';
      diagnostics.textContent = 'Modelo cargado · midiendo FPS…'; resize();
    }).catch(error => {
      surface.dataset.status = 'error'; diagnostics.textContent = error.message === 'AVATAR_TEXTURE_MISSING'
        ? 'No se pudieron cargar las texturas de Cortana. Revisa la conexión y recarga.'
        : 'No se pudo cargar el modelo. Revisa la conexión con el PC y recarga.';
    });
    function frame(now) {
      if (destroyed) return;
      animationId = requestAnimationFrame(frame);
      const delta = Math.min((now - last) / 1000, 0.05); last = now;
      if (document.hidden) return;
      mixer?.update(delta);
      if (currentAction) surface.dataset.animationTime = currentAction.time.toFixed(2);
      // Pulso visual solo al procesar texto; no simula habla sin TTS.
      if (avatar) avatar.traverse(item => {
        if (item.isMesh) for (const material of [].concat(item.material)) {
          material.emissiveIntensity = (baseEmissive.get(material) ?? 0.4) * (phase === 'processing' ? 2 + Math.sin(now / 250) * 0.3 : 1);
        }
      });
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
    if (imported) value = 'idle';
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
      const textures = new Set();
      scene.traverse(item => { if (item.isMesh) {
        item.geometry.dispose();
        for (const material of [].concat(item.material)) {
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
          material.dispose();
        }
      } });
      textures.forEach(texture => texture.dispose());
      renderer?.dispose();
    },
  };
}
