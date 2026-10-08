import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Vector3, AnimationMixer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

test('Cortana adaptada carga sin texturas externas, conserva atribución, rig y animación', async () => {
  const bytes = await readFile(new URL('../public/models/cortana.glb', import.meta.url));
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.ok(!json.extensionsRequired?.includes('KHR_materials_pbrSpecularGlossiness'));
  assert.equal(json.asset.extras.license.split(' ')[0], 'CC-BY-NC-4.0');
  assert.ok(json.asset.extras.author.includes('jameslucino117'));
  assert.equal(json.images, undefined); assert.ok(json.buffers.every(buffer => !buffer.uri));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  let triangles = 0, skinned = 0;
  gltf.scene.traverse(item => { if (item.isMesh) triangles += (item.geometry.index?.count || item.geometry.attributes.position.count) / 3; if (item.isSkinnedMesh) skinned++; });
  assert.equal(triangles, 18948); assert.ok(skinned > 0);
  const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
  assert.ok(size.toArray().every(n => Number.isFinite(n) && n > 0));
  assert.equal(gltf.animations.length, 1); assert.equal(gltf.animations[0].name, 'Twerking');
  // La animación se conserva para trabajo futuro; no se arranca en el visor de prueba.
  const mixer = new AnimationMixer(gltf.scene), action = mixer.clipAction(gltf.animations[0]);
  action.play(); mixer.setTime(1); gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
  assert.ok(new Box3().setFromObject(gltf.scene).getSize(new Vector3()).toArray().every(Number.isFinite));
});
