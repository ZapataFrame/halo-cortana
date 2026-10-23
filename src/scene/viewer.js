import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEFAULT_CALIBRATION, normalizeCalibration } from './calibration.js';
import { applyProjection, effectiveRotation } from './projection.js';

// Solo representa Cortana. Vue es propietario de controles, mensajes y persistencia.
export function createViewer(container, { onStatus = () => {}, onLayout = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100); camera.position.z = 8;
  const projection = new THREE.Group(), orientation = new THREE.Group(), body = new THREE.Group();
  orientation.add(body); projection.add(orientation); scene.add(projection);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(-3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2); rim.position.set(3, 2, -4); scene.add(rim);
  let settings = { ...DEFAULT_CALIBRATION }, mixer, avatar, current, selected = 'idle', phase = 'idle';
  let width = 1.2, destroyed = false, raf, last = performance.now(), start = last, frames = 0;
  const actions = new Map(), materials = new Map();
  function resize() {
    const w = Math.max(container.clientWidth, 1), h = Math.max(container.clientHeight, 1), aspect = w / h;
    const rotation = effectiveRotation(settings, w, h), rotated = rotation === 90 || rotation === 270;
    const half = rotated ? Math.max(width * 0.65, 1.3 / aspect) : Math.max(1.3, width * 0.65 / aspect);
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false); applyProjection(projection, orientation, { ...settings, rotation }, half, aspect);
    body.rotation.y = THREE.MathUtils.degToRad(settings.turn);
    for (const material of materials.keys()) material.wireframe = settings.wireframe;
    onLayout(`translate(calc(-50% + ${settings.x * w}px), calc(-50% + ${settings.y * h}px)) scale(${settings.scale * (settings.mirrorX ? -1 : 1)}, ${settings.scale * (settings.mirrorY ? -1 : 1)}) rotate(${rotation}deg)`);
  }
  function play(name) {
    const next = actions.get(name); if (!next || next === current) return;
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if (current) next.crossFadeFrom(current, 0.25, false);
    current = next;
  }
  function disposeObject(root) {
    const textures = new Set();
    root?.traverse(item => { if (item.isMesh) {
      item.geometry.dispose(); item.skeleton?.dispose();
      for (const material of [].concat(item.material)) {
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }); material.dispose();
      }
    } });
    textures.forEach(texture => texture.dispose());
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  function contextLost(event) { event.preventDefault(); onStatus({ state: 'error', detail: 'Se perdió el contexto gráfico. Recarga el visor.' }); }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const ready = Promise.all([
    new GLTFLoader().loadAsync('/models/cortana.glb'),
    fetch('/models/cortana-motion.json').then(r => { if (!r.ok) throw new Error('MOTION_UNAVAILABLE'); return r.json(); }),
  ]).then(([gltf, motion]) => {
    if (destroyed) { disposeObject(gltf.scene); return; }
    avatar = gltf.scene; avatar.rotation.y += Math.PI;
    mixer = new THREE.AnimationMixer(avatar);
    for (const data of motion.clips) {
      const action = mixer.clipAction(THREE.AnimationClip.parse(data));
      action.setLoop(data.name === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, data.name === 'idle' ? Infinity : 1);
      action.clampWhenFinished = true; actions.set(data.name, action);
    }
    mixer.addEventListener('finished', event => { if (event.action === actions.get('wave')) play('idle'); });
    play('idle'); mixer.update(0); avatar.updateMatrixWorld(true);
    avatar.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
    const bounds = new THREE.Box3().setFromObject(avatar), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const fit = 2 / size.y, pivot = new THREE.Group(); pivot.add(avatar);
    pivot.scale.setScalar(fit); pivot.position.copy(center).multiplyScalar(-fit); body.add(pivot);
    width = Math.max(motion.envelope.max[0] - motion.envelope.min[0], motion.envelope.max[2] - motion.envelope.min[2]) * fit;
    avatar.traverse(item => { if (item.isMesh) {
      item.frustumCulled = false;
      for (const material of [].concat(item.material)) {
        if (!material.map || !material.emissiveMap) throw new Error('TEXTURES_MISSING');
        materials.set(material, material.emissiveIntensity ?? 1);
      }
    } });
    play(selected); resize(); onStatus({ state: 'ready', detail: 'Cortana cargada', texturedMaterials: materials.size });
  }).catch(() => { if (!destroyed) onStatus({ state: 'error', detail: 'No se pudo cargar Cortana. Comprueba los recursos y recarga.' }); });
  function frame(now) {
    if (destroyed) return;
    // Clips sin física: avanzar con tiempo real evita ralentizarlos con pocos FPS.
    raf = requestAnimationFrame(frame); const delta = Math.max(0, (now - last) / 1000); last = now;
    if (document.hidden) return;
    mixer?.update(delta);
    for (const [material, intensity] of materials) material.emissiveIntensity = intensity * (phase === 'processing' ? 2 + Math.sin(now / 250) * 0.3 : phase === 'speaking' ? 1.6 + Math.sin(now / 150) * 0.2 : 1);
    renderer.render(scene, camera); frames++;
    if (now - start >= 1000) { if (avatar) onStatus({ fps: Math.round(frames * 1000 / (now - start)) }); frames = 0; start = now; }
  }
  raf = requestAnimationFrame(frame);
  return {
    ready,
    setSettings(value) { settings = normalizeCalibration(value); resize(); },
    setPhase(value) { phase = value; },
    setAnimation(value) { if (['idle', 'wave'].includes(value) && value !== selected) { selected = value; play(value); } },
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); observer.disconnect(); mixer?.stopAllAction();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost); disposeObject(avatar); materials.clear(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
