import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AnimationClip, AnimationMixer, LoopOnce, Texture, Vector3, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

test('clips Cortana se vinculan al rig real, deforman malla, fijan pies y regresan a reposo', async () => {
  const bytes = await readFile(new URL('../public/models/cortana.glb', import.meta.url));
  const pack = JSON.parse(await readFile(new URL('../public/models/cortana-motion.json', import.meta.url)));
  assert.equal(pack.sourceSha256, createHash('sha256').update(bytes).digest('hex'), 'Regenerar si cambia el GLB');
  const { scene } = await new GLTFLoader().register(() => ({ name: 'TEST_TEXTURE', loadTexture: async () => new Texture() }))
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.rotation.y = Math.PI;
  const clips = pack.clips.map(data => AnimationClip.parse(data)), mixer = new AnimationMixer(scene);
  const feet = ['mixamorigLeftFoot_057', 'mixamorigRightFoot_062'].map(n => scene.getObjectByName(n));
  const hand = scene.getObjectByName('mixamorigRightHand_035');
  let skin; scene.traverse(o => { if (o.isSkinnedMesh && o.geometry.attributes.position.count > (skin?.geometry.attributes.position.count || 0)) skin = o; });
  function sample(clip, t) {
    mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().setLoop(LoopOnce, 1); action.clampWhenFinished = true;
    action.play(); mixer.setTime(t); scene.updateMatrixWorld(true);
    scene.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
    return { hand: hand.getWorldPosition(new Vector3()), feet: feet.map(b => b.getWorldPosition(new Vector3())),
      bounds: new Box3().setFromObject(scene), vertices: Array.from({ length: 120 }, (_, i) => skin.getVertexPosition(Math.floor(i * skin.geometry.attributes.position.count / 120), new Vector3()).applyMatrix4(skin.matrixWorld)) };
  }
  const idle = clips.find(c => c.name === 'idle'), wave = clips.find(c => c.name === 'wave');
  assert.ok(idle && wave);
  const rest = sample(idle, 0);
  for (const clip of clips) {
    for (const track of clip.tracks) {
      assert.ok(track.name.endsWith('.quaternion')); assert.ok(scene.getObjectByName(track.name.slice(0, -11)));
      assert.ok([...track.values, ...track.times].every(Number.isFinite));
    }
    for (let i = 0; i <= 30; i++) {
      const pose = sample(clip, clip.duration * i / 30);
      pose.feet.forEach((p, k) => assert.ok(p.distanceTo(rest.feet[k]) < 1e-6, 'Pies sin deslizamiento'));
      const size = pose.bounds.getSize(new Vector3());
      assert.ok(size.toArray().every(Number.isFinite)); assert.ok(size.y < 1.85 && size.x < 1.2);
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(pose.bounds.min.getComponent(axis) >= pack.envelope.min[axis] - 1e-5);
        assert.ok(pose.bounds.max.getComponent(axis) <= pack.envelope.max[axis] + 1e-5);
      }
    }
    const end = sample(clip, clip.duration);
    assert.ok(end.hand.distanceTo(rest.hand) < 1e-6, 'Regreso a la misma pose');
  }
  const raised = sample(wave, 1.4);
  assert.ok(raised.hand.y - rest.hand.y > 0.5, 'La mano realmente sube');
  assert.ok(raised.vertices.some((p, i) => p.distanceTo(rest.vertices[i]) > 0.05), 'La malla se deforma, no solo los huesos');
  // Repeticiones y cambios no acumulan desplazamiento.
  for (let i = 0; i < 10; i++) {
    sample(wave, 1.4); const returned = sample(idle, 0);
    assert.ok(returned.hand.distanceTo(rest.hand) < 1e-6);
  }
});
