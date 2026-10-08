import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AnimationMixer, AnimationClip, Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

test('baile descargado anima huesos reales, permanece acotado y vuelve a reposo', async () => {
  const bytes = await readFile(new URL('../public/models/dancer.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene; scene.name = 'HologramRig';
  const motion = JSON.parse(await readFile(new URL('../public/models/dancer-motion.json', import.meta.url), 'utf8'));
  const mixer = new AnimationMixer(scene);
  const actions = new Map(motion.clips.map(data => { const clip = AnimationClip.parse(data); return [clip.name, mixer.clipAction(clip)]; }));
  const idle = actions.get('idle'), dance = actions.get('gangnam');
  idle.play(); mixer.update(0);
  const arm = scene.getObjectByName('upperarm_r'), initial = arm.quaternion.clone();
  idle.stop(); dance.play();
  let first;
  for (const time of [.5, 2, 5.5, 7.1]) {
    mixer.setTime(time);
    scene.updateMatrixWorld(true);
    scene.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
    const size = new Box3().setFromObject(scene).getSize(new Vector3());
    assert.ok(size.toArray().every(n => Number.isFinite(n) && n > 0 && n < 3));
    assert.ok(arm.quaternion.angleTo(initial) > .4, 'los brazos deben cambiar de pose');
    if (time === .5) first = arm.quaternion.clone();
    if (time === 5.5) assert.ok(arm.quaternion.angleTo(first) > .2, 'la segunda fase levanta el brazo');
  }
  dance.stop(); idle.reset().play(); mixer.update(0);
  assert.ok(arm.quaternion.angleTo(initial) < 1e-6);
  assert.equal(scene.position.length(), 0);
  assert.equal(motion.license, 'MIT');
});
