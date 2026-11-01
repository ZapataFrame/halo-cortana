// Autoría y adaptación fuera del navegador. No modifica el GLB ni requiere Blender.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AnimationClip, QuaternionKeyframeTrack, VectorKeyframeTrack, Texture, Quaternion, Vector3, Box3, AnimationMixer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIMATIONS } from '../src/services/animation-catalog.js';
const sourceURL = new URL('./animation-sources/quaternius-upper-body.json', import.meta.url);
const mapping = { Spine: 'DEF-spine001', Spine1: 'DEF-spine002', Spine2: 'DEF-spine003', Neck: 'DEF-neck', Head: 'DEF-head' };
for (const [side, suffix] of [['Left', 'L'], ['Right', 'R']]) {
  for (const [name, source] of [['Shoulder','shoulder'], ['Arm','upper_arm'], ['ForeArm','forearm'], ['Hand','hand']]) mapping[side + name] = `DEF-${source}${suffix}`;
  for (const [finger, source] of [['Thumb','thumb'], ['Index','f_index'], ['Middle','f_middle'], ['Ring','f_ring'], ['Pinky','f_pinky']]) {
    for (let i = 1; i <= 3; i++) mapping[`${side}Hand${finger}${i}`] = `DEF-${source}0${i}${suffix}`;
  }
}
const sha = data => createHash('sha256').update(data).digest('hex');
const loader = () => new GLTFLoader().register(() => ({ name: 'BAKE_TEXTURE', loadTexture: async () => new Texture() }));
// Opcional: extraer solo curvas de dos clips CC0; nunca conservar otro avatar.
if (process.argv[2] === '--import') {
  const path = process.argv[3]; if (!path) throw new Error('Indica el .gltf de Quaternius.');
  const { dirname, resolve } = await import('node:path');
  const originalJSON = await readFile(path), json = JSON.parse(originalJSON);
  const buffer = await readFile(resolve(dirname(path), json.buffers[0].uri));
  json.buffers[0].uri = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
  globalThis.ProgressEvent ??= class { constructor(type, data) { this.type = type; Object.assign(this, data); } };
  const { scene, animations } = await loader().parseAsync(JSON.stringify(json), '');
  const mixer = new AnimationMixer(scene);
  const sample = (clip, time) => {
    mixer.stopAllAction(); const action = mixer.clipAction(clip).reset(); action.play(); mixer.setTime(time); scene.updateMatrixWorld(true);
    return Object.fromEntries(Object.entries(mapping).map(([key, name]) => {
      const b = scene.getObjectByName(name); if (!b) throw new Error(`Falta ${name}`);
      return [key, b.getWorldQuaternion(new Quaternion()).normalize().toArray().map(v => +v.toFixed(7))];
    }));
  };
  const reference = sample(animations.find(c => c.name === 'A_TPose'), 0);
  const clips = {};
  for (const [key, name] of [['idle','Idle_Loop'], ['explain','Idle_Talking_Loop']]) {
    const clip = animations.find(c => c.name === name); if (!clip) throw new Error(`Falta ${name}`);
    const frames = Math.round(clip.duration * 30);
    clips[key] = { name, duration: clip.duration, frames: Array.from({ length: frames + 1 }, (_, i) => sample(clip, i / frames * (clip.duration - 1e-6))) };
  }
  await mkdir(new URL('./animation-sources/', import.meta.url), { recursive: true });
  await writeFile(sourceURL, JSON.stringify({ author: 'Quaternius / Gonzalo Furnier', license: 'CC0-1.0',
    origin: 'https://quaternius.itch.io/universal-animation-library',
    mirror: 'https://github.com/J-Ponzo/gltf-universal-animation-library',
    gltfSha256: sha(originalJSON), bufferSha256: sha(buffer), reference, clips, mirrorRevision: process.argv[4] || null }) + '\n');
}
const source = JSON.parse(await readFile(sourceURL));
const bytes = await readFile(new URL('../public/models/cortana.glb', import.meta.url));
const { scene } = await loader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.rotation.y = Math.PI;
const bones = []; let skin;
scene.traverse(item => { if (item.isBone) bones.push(item); if (item.isSkinnedMesh) skin = item; });
const bone = name => {
  const found = bones.find(b => new RegExp(`^mixamorig${name}_0\\d+$`).test(b.name));
  if (!found) throw new Error(`Falta hueso ${name}`); return found;
};
const world = b => b.getWorldPosition(new Vector3());
const worldQ = b => b.getWorldQuaternion(new Quaternion());
function applyWorldQ(b, q) { b.quaternion.copy(worldQ(b.parent).invert().multiply(q)).normalize(); scene.updateMatrixWorld(true); }
function aim(name, childName, direction) {
  scene.updateMatrixWorld(true); const b = bone(name), child = bone(childName);
  const from = world(child).sub(world(b)).normalize();
  applyWorldQ(b, new Quaternion().setFromUnitVectors(from, direction.clone().normalize()).multiply(worldQ(b)));
}
function turn(name, axis, radians) {
  const b = bone(name); b.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(...axis), radians)).normalize(); scene.updateMatrixWorld(true);
}
// Recuperar orientaciones relativas de bind sin copiar su escala global 0.01.
// Skeleton.pose() a ciegas cambia las unidades de este recurso exportado.
const bind = new Map(skin.skeleton.bones.map((b, i) => [b, skin.skeleton.boneInverses[i].clone().invert()]));
for (const b of bones) {
  if (!bind.has(b)) continue;
  const relative = bind.get(b).clone(); if (bind.has(b.parent)) relative.premultiply(bind.get(b.parent).clone().invert());
  relative.decompose(new Vector3(), b.quaternion, new Vector3()); b.quaternion.normalize();
}
scene.updateMatrixWorld(true);
// Referencia T de Cortana para transferir las rotaciones globales del otro rig.
for (const [side, sign] of [['Left',1], ['Right',-1]]) {
  aim(`${side}Arm`, `${side}ForeArm`, new Vector3(sign, 0, 0));
  aim(`${side}ForeArm`, `${side}Hand`, new Vector3(sign, 0, 0));
}
const targetReference = Object.fromEntries(Object.keys(mapping).map(name => [name, worldQ(bone(name))]));
const base = bones.map(b => ({ q: b.quaternion.clone(), p: b.position.clone() }));
function reset() { bones.forEach((b, i) => { b.quaternion.copy(base[i].q); b.position.copy(base[i].p); }); scene.updateMatrixWorld(true); }
function retarget(name, time, strength = 1) {
  const clip = source.clips[name], at = time * (clip.frames.length - 1), i = Math.min(Math.floor(at), clip.frames.length - 2), f = at - i;
  for (const key of Object.keys(mapping)) {
    const q = new Quaternion().fromArray(clip.frames[i][key]).slerp(new Quaternion().fromArray(clip.frames[i + 1][key]), f);
    const delta = q.multiply(new Quaternion().fromArray(source.reference[key]).invert());
    applyWorldQ(bone(key), new Quaternion().slerp(delta, strength).multiply(targetReference[key]));
  }
}
// IK de dos segmentos, con dirección explícita de codo/rodilla; no añade huesos.
function reach(rootName, middleName, endName, target, pole) {
  const a = world(bone(rootName)), b = world(bone(middleName)), c = world(bone(endName));
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c), direction = target.clone().sub(a);
  const distance = Math.max(Math.abs(l1 - l2) + 1e-5, Math.min(direction.length(), l1 + l2 - 1e-5));
  direction.normalize(); const along = (l1*l1 - l2*l2 + distance*distance) / (2*distance);
  const bend = pole.clone().addScaledVector(direction, -pole.dot(direction)).normalize();
  const elbow = a.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, l1*l1 - along*along)));
  aim(rootName, middleName, elbow.sub(a)); aim(middleName, endName, target.clone().sub(world(bone(middleName))));
}
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
const feet = ['Left','Right'].map(side => ({ side, position: world(bone(`${side}Foot`)), q: worldQ(bone(`${side}Foot`)) }));
// Relajar ligeramente las rodillas desde bind manteniendo la referencia de suelas.
base[bones.indexOf(bone('Hips'))].p.y -= 0.3;
function pinFeet() {
  for (const { side, position, q } of feet) {
    reach(`${side}UpLeg`, `${side}Leg`, `${side}Foot`, position, new Vector3(side === 'Left' ? .04 : -.04, 0, 1));
    applyWorldQ(bone(`${side}Foot`), q);
  }
}
function arm(side, hand, elbow) { reach(`${side}Arm`, `${side}ForeArm`, `${side}Hand`, hand, elbow); }
function pose(name, time, duration) {
  reset(); const cycle = time / duration, w = Math.PI * 2 * cycle;
  retarget('idle', cycle);
  // Respiración y desplazamiento pequeño de pelvis; tobillos y suelas anclados.
  bone('Hips').position.x += Math.sin(w) * .55;
  bone('Hips').position.z += (1-Math.cos(w)) * .13;
  scene.updateMatrixWorld(true); pinFeet();
  turn('Spine2', [1,0,0], Math.sin(w) * .015);
  turn('Head', [0,1,0], Math.sin(w) * .045);
  for (const side of ['Left','Right']) for (const finger of ['Thumb','Index','Middle','Ring','Pinky']) for (let joint=1;joint<=3;joint++) {
    const b=bone(`${side}Hand${finger}${joint}`); b.quaternion.copy(base[bones.indexOf(b)].q);
    if (finger !== 'Thumb') turn(`${side}Hand${finger}${joint}`, [1,0,0], joint === 1 ? .10 : .16);
  }
  const envelope = smooth(time/.55) * smooth((duration-time)/.55);
  const start = bones.map(b => b.quaternion.clone());
  const head = world(bone('Head')), hip = world(bone('Hips'));
  if (name === 'wave') {
    const lift = smooth(time/.75) * smooth((duration-time)/.8), swing = Math.sin((time-.75)*Math.PI*3) * .085;
    const target = new Vector3(-.36 + swing*lift, 1.50, .12);
    target.lerp(world(bone('RightHand')), 1-lift);
    arm('Right', target, new Vector3(-1,0,-.35));
    // Palma frontal: mano vertical y dedos abiertos; ejes verificados en el visor.
    aim('RightHand', 'RightHandMiddle1', new Vector3(swing * .6, 1, .02));
    turn('RightHand', [0,1,0], .3*lift);
    turn('Head', [0,0,1], -.065*lift); turn('Spine2', [0,1,0], -.07*lift);
    // Cerrar entrada y salida a la base sin discontinuidad de muñeca/dedos.
    bones.forEach((b,i) => b.quaternion.slerpQuaternions(start[i], b.quaternion.clone(), lift));
  } else if (name === 'nod') {
    turn('Neck',[1,0,0], Math.sin(w*2)*.07*envelope);
    turn('Head',[1,0,0], Math.sin(w*2)*.22*envelope);
  } else if (name === 'shake_head') {
    turn('Neck',[0,1,0], Math.sin(w*2)*.08*envelope);
    turn('Head',[0,1,0], Math.sin(w*2)*.28*envelope);
  } else if (name === 'think') {
    arm('Right', head.clone().add(new Vector3(.015,-.12,.13)), new Vector3(-.8,-1,.4));
    aim('RightHand','RightHandMiddle1', new Vector3(.05,.8,-.2));
    turn('Head',[0,0,1], .09 + Math.sin(w)*.025); turn('Head',[1,0,0], .08);
    // Mano izquierda acompaña bajo el codo; sin apoyar dentro del torso.
    arm('Left', new Vector3(.03,1.10,.23), new Vector3(.7,-1,.1));
  } else if (name === 'hands_on_hips') {
    for (const [side,sign] of [['Left',1],['Right',-1]]) {
      arm(side, hip.clone().add(new Vector3(sign*.16,.12,.025)), new Vector3(sign,-.1,-.15));
      aim(`${side}Hand`,`${side}HandMiddle1`,new Vector3(sign*-.12,-1,.1));
    }
    turn('Head',[0,1,0], Math.sin(w)*.035);
  } else if (name === 'listen') {
    turn('Neck',[0,0,1], .05+Math.sin(w)*.018); turn('Head',[1,0,0], .06);
    turn('Spine2',[1,0,0], .035);
  } else if (name === 'explain') {
    retarget('explain', cycle);
    for (const side of ['Left','Right']) for (const finger of ['Thumb','Index','Middle','Ring','Pinky']) for (let joint=1;joint<=3;joint++) { const b=bone(`${side}Hand${finger}${joint}`); b.quaternion.copy(base[bones.indexOf(b)].q); }
    const right = world(bone('RightHand')), left = world(bone('LeftHand'));
    const rightQ = worldQ(bone('RightHand')), leftQ = worldQ(bone('LeftHand'));
    arm('Right', right.add(new Vector3(-.09*Math.sin(w), .10 + .04*Math.sin(w*2), .06 + .04*(1-Math.cos(w)))), new Vector3(-1,-.4,.4));
    arm('Left', left.add(new Vector3(.04*(1-Math.cos(w)), .10 - .035*Math.sin(w), .06 + .035*Math.sin(w*2))), new Vector3(1,-.4,.4));
    applyWorldQ(bone('RightHand'), rightQ); applyWorldQ(bone('LeftHand'), leftQ);
    turn('Head',[0,1,0], Math.sin(w)*.04);
  } else if (name === 'shift_weight') {
    bone('Hips').position.x += Math.sin(w)*1.2; scene.updateMatrixWorld(true); pinFeet();
    turn('Spine',[0,0,1], Math.sin(w)*-.035); turn('Head',[0,1,0], Math.sin(w)*.12);
  }
  scene.updateMatrixWorld(true);
}
const clips = [], bounds = new Box3();
for (const [name, { duration }] of Object.entries(ANIMATIONS)) {
  const frames = Math.round(duration*30), times = [], samples = bones.map(() => []), positions = [];
  for (let frame=0; frame<=frames; frame++) {
    const time = frame/frames*duration; times.push(time); pose(name,frame === frames ? 0 : time,duration);
    bones.forEach((b,i) => {
      const q = b.quaternion.toArray().map(v => +v.toFixed(7)), prev = samples[i].slice(-4);
      if (prev.length && q.reduce((s,v,k)=>s+v*prev[k],0)<0) q.forEach((v,k)=>{q[k]=-v;});
      samples[i].push(...q);
    });
    positions.push(...bone('Hips').position.toArray().map(v => +v.toFixed(6)));
    scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();}); bounds.union(new Box3().setFromObject(scene));
  }
  const tracks = bones.map((b,i) => new QuaternionKeyframeTrack(`${b.name}.quaternion`,times,samples[i]));
  tracks.push(new VectorKeyframeTrack(`${bone('Hips').name}.position`,times,positions));
  const clip = new AnimationClip(name,duration,tracks).optimize();
  clip.uuid = `00000000-0000-4000-8000-${String(clips.length+1).padStart(12,'0')}`;
  const data = AnimationClip.toJSON(clip);
  // Serializar precisión suficiente sin expandir cada Float32 a 17 decimales.
  for (const track of data.tracks) { track.values = track.values.map(v => +v.toFixed(7)); track.times = track.times.map(v => +v.toFixed(7)); }
  clips.push(data);
}
await writeFile(new URL('../public/models/cortana-motion.json',import.meta.url),JSON.stringify({version:2,status:'development',
  sourceSha256:sha(bytes), adaptationSha256:sha(await readFile(sourceURL)), author:'Cortana / Codex, 2026-10-23',fps:30,
  adaptedSource:{author:source.author,license:source.license,origin:source.origin,clips:['Idle_Loop','Idle_Talking_Loop']},
  envelope:{min:bounds.min.toArray(),max:bounds.max.toArray()},clips})+'\n');
console.log(JSON.stringify({clips:clips.map(c=>({name:c.name,duration:c.duration})),envelope:{min:bounds.min.toArray(),max:bounds.max.toArray()}}));
