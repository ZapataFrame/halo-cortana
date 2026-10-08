// Convierte las curvas MIT descargadas en keyframes locales: el móvil solo
// reproduce un AnimationClip y no calcula cinemática inversa en cada frame.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const vendor = new URL('./vendor/avatar/', import.meta.url);
const runtime = new URL('.bake-runtime/', vendor);
await mkdir(runtime, { recursive: true });
try {
  for (const name of ['types', 'engine', 'gangnam', 'rigDefinition', 'contacts', 'props', 'rig']) {
    const source = await readFile(new URL(`${name}.ts`, vendor), 'utf8');
    const js = stripTypeScriptTypes(source).replace(/from "\.\/(\w+)"/g, 'from "./$1.js"');
    await writeFile(new URL(`${name}.js`, runtime), js);
  }
  const { createGangnam } = await import(new URL('gangnam.js', runtime));
  const { compileMotion, sampleTimeline, sampleContacts } = await import(new URL('engine.js', runtime));
  const { MotionRig } = await import(new URL('rig.js', runtime));
  const bytes = await readFile(new URL('../public/models/dancer.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene;
  scene.name = 'HologramRig';
  const rig = new MotionRig(scene, []);
  rig.apply([]);
  const bones = [];
  scene.traverse(item => { if (item.isBone) bones.push(item); });
  const idle = new AnimationClip('idle', 1, bones.map(bone => new QuaternionKeyframeTrack(`${bone.name}.quaternion`, [0], bone.quaternion.toArray())));
  idle.uuid = '00000000-0000-4000-8000-000000000001';
  idle.tracks.push(new VectorKeyframeTrack('HologramRig.position', [0], scene.position.toArray()));
  const timeline = compileMotion(createGangnam());
  const frames = Math.ceil(timeline.duration * 30), times = [], positions = [], values = bones.map(() => []);
  const envelope = new Box3();
  for (let frame = 0; frame <= frames; frame++) {
    const time = frame / frames * timeline.duration;
    rig.apply(sampleTimeline(timeline, time), sampleContacts(timeline, time), timeline.props);
    times.push(time); positions.push(...scene.position.toArray());
    bones.forEach((bone, index) => {
      const q = bone.quaternion.toArray();
      const last = values[index].slice(-4);
      if (last.length && q.reduce((sum, n, i) => sum + n * last[i], 0) < 0) q.forEach((n, i) => { q[i] = -n; });
      values[index].push(...q);
    });
    scene.updateMatrixWorld(true);
    scene.traverse(item => { if (item.isSkinnedMesh) item.computeBoundingBox(); });
    envelope.union(new Box3().setFromObject(scene));
  }
  const tracks = bones.map((bone, index) => {
    const samples = values[index];
    const constant = samples.every((n, i) => Math.abs(n - samples[i % 4]) < 1e-7);
    return new QuaternionKeyframeTrack(`${bone.name}.quaternion`, constant ? [0] : times, constant ? samples.slice(0, 4) : samples);
  });
  tracks.push(new VectorKeyframeTrack('HologramRig.position', times, positions));
  const dance = new AnimationClip('gangnam', timeline.duration, tracks);
  dance.uuid = '00000000-0000-4000-8000-000000000002';
  const result = { version: 1, source: 'ProgramAsWeights/avatar @ ddd5fc34a445bcded3cf9836607aaeebc19a5c78', license: 'MIT', fps: 30,
    envelope: { min: envelope.min.toArray(), max: envelope.max.toArray() }, clips: [AnimationClip.toJSON(idle), AnimationClip.toJSON(dance)] };
  const json = JSON.stringify(result, (_key, value) => typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value);
  await writeFile(new URL('../public/models/dancer-motion.json', import.meta.url), json + '\n');
  console.log(JSON.stringify({ duration: dance.duration, frames: frames + 1, bones: bones.length, bytes: Buffer.byteLength(json), envelope: result.envelope }));
} finally {
  await rm(runtime, { recursive: true, force: true });
}
