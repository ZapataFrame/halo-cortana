// Prototipo H-35: curvas originales sobre los huesos del GLB local, sin retargeting.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AnimationClip, QuaternionKeyframeTrack, Texture, Quaternion, Vector3, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../public/models/cortana.glb', import.meta.url));
// Solo geometría al hornear; el visor carga las ocho imágenes reales del GLB.
const loader = new GLTFLoader().register(() => ({ name: 'BAKE_TEXTURE', loadTexture: async () => new Texture() }));
const { scene } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.rotation.y = Math.PI; // Ejes frontales del visor; no se incluye en los tracks.
scene.updateMatrixWorld(true);
const bones = [];
scene.traverse(item => { if (item.isBone) bones.push(item); });
const original = bones.map(b => b.quaternion.clone());
const bone = name => {
  const found = bones.find(b => new RegExp(`^mixamorig${name}_0\\d+$`).test(b.name));
  if (!found) throw new Error(`Falta hueso ${name}`);
  return found;
};
function aim(name, childName, direction) {
  scene.updateMatrixWorld(true);
  const b = bone(name), child = bone(childName);
  const from = child.getWorldPosition(new Vector3()).sub(b.getWorldPosition(new Vector3())).normalize();
  const delta = new Quaternion().setFromUnitVectors(from, new Vector3(...direction).normalize());
  const parent = b.parent.getWorldQuaternion(new Quaternion());
  b.quaternion.copy(parent.clone().invert().multiply(delta).multiply(parent).multiply(b.quaternion));
}
function turn(name, axis, radians) {
  const b = bone(name);
  b.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(...axis), radians));
}
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function pose(time, wave) {
  bones.forEach((b, i) => b.quaternion.copy(original[i]));
  // Brazos cómodos y separados del torso. Piernas/pelvis fijas: sin deriva de pies.
  aim('LeftArm', 'LeftForeArm', [0.16, -1, 0]);
  aim('LeftForeArm', 'LeftHand', [0.04, -1, 0.12]);
  aim('RightArm', 'RightForeArm', [-0.16, -1, 0]);
  aim('RightForeArm', 'RightHand', [-0.04, -1, 0.12]);
  if (wave) {
    const lift = smooth(time / 0.8) * smooth((3.6 - time) / 0.9);
    const swing = Math.sin(Math.max(0, time - 0.8) * Math.PI * 3) * 0.13 * lift;
    aim('RightArm', 'RightForeArm', [-0.16 - lift * 0.72, -1 + lift * 0.65, lift * 0.16]);
    aim('RightForeArm', 'RightHand', [-0.04 + swing, -1 + lift * 2, 0.12 + lift * 0.1]);
    // Abrir los dedos del gesto original (cerrados) al levantar la mano.
    for (const finger of ['Index', 'Middle', 'Ring', 'Pinky']) {
      for (const joint of [1, 2, 3]) bone(`RightHand${finger}${joint}`).quaternion.slerp(new Quaternion(), lift * 0.95);
    }
    bone('RightHand').quaternion.slerp(new Quaternion(), lift * 0.7);
    turn('RightHand', [0, 1, 0], lift * 1.1);
    turn('RightHand', [0, 0, 1], swing * 0.7);
  } else {
    const breath = (1 - Math.cos(time / 4 * Math.PI * 2)) / 2;
    turn('Spine2', [1, 0, 0], breath * 0.012);
    turn('Head', [0, 0, 1], breath * 0.008);
  }
  scene.updateMatrixWorld(true);
}
const envelope = new Box3();
const clips = [];
for (const [name, duration] of [['idle', 4], ['wave', 3.6]]) {
  const frames = Math.round(duration * 30), times = [], samples = bones.map(() => []);
  for (let frame = 0; frame <= frames; frame++) {
    const t = frame / frames * duration;
    pose(t, name === 'wave'); times.push(t);
    bones.forEach((b, i) => {
      const q = b.quaternion.clone().normalize().toArray(), previous = samples[i].slice(-4);
      if (previous.length && q.reduce((s, v, k) => s + v * previous[k], 0) < 0) q.forEach((v, k) => { q[k] = -v; });
      samples[i].push(...q);
    });
    scene.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
    envelope.union(new Box3().setFromObject(scene));
  }
  const tracks = bones.map((b, i) => {
    const values = samples[i], constant = values.every((v, k) => Math.abs(v - values[k % 4]) < 1e-8);
    return new QuaternionKeyframeTrack(`${b.name}.quaternion`, constant ? [0] : times, constant ? values.slice(0, 4) : values);
  });
  const clip = new AnimationClip(name, duration, tracks);
  clip.uuid = `00000000-0000-4000-8000-00000000000${clips.length + 1}`;
  clips.push(AnimationClip.toJSON(clip));
}
const result = { version: 1, status: 'prototype', sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  author: 'Cortana / Codex, 2026-10-16', fps: 30,
  envelope: { min: envelope.min.toArray(), max: envelope.max.toArray() }, clips };
await writeFile(new URL('../public/models/cortana-motion.json', import.meta.url), JSON.stringify(result) + '\n');
console.log(JSON.stringify({ clips: clips.map(c => ({ name: c.name, duration: c.duration })), envelope: result.envelope }));
