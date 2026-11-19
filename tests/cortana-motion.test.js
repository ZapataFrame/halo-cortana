import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AnimationClip, AnimationMixer, LoopOnce, Texture, Vector3, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ANIMATIONS, animationForPhase } from '../src/services/animation-catalog.js';
import { createMotionPlayer } from '../src/scene/motion-player.js';

async function fixture() {
  const bytes = await readFile(new URL('../public/models/cortana.glb', import.meta.url));
  const pack = JSON.parse(await readFile(new URL('../public/models/cortana-motion.json', import.meta.url)));
  assert.equal(pack.sourceSha256, createHash('sha256').update(bytes).digest('hex'));
  const { scene, animations } = await new GLTFLoader().register(() => ({ name: 'TEST_TEXTURE', loadTexture: async () => new Texture() }))
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.rotation.y = Math.PI;
  const bones = []; let skin;
  scene.traverse(o => { if (o.isBone) bones.push(o); if (o.isSkinnedMesh && o.geometry.attributes.position.count > (skin?.geometry.attributes.position.count || 0)) skin = o; });
  const bone = name => bones.find(b => new RegExp(`^mixamorig${name}_0\\d+$`).test(b.name));
  return { scene, pack, bones, bone, skin, animations };
}

test('nueve clips de conversación deforman la malla real, cierran sus curvas y conservan suelas y escala', async () => {
  const { scene, pack, bone, skin } = await fixture(), mixer = new AnimationMixer(scene);
  const clips = pack.clips.map(data => AnimationClip.parse(data));
  assert.deepEqual(clips.map(c => c.name).sort(), Object.keys(ANIMATIONS).filter(name => !ANIMATIONS[name].nativeClip).sort());
  const conversationClips = clips.filter(c => c.name !== 'gangnam_style');
  const p = name => bone(name).getWorldPosition(new Vector3());
  function sample(clip, time) {
    mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().setLoop(LoopOnce, 1); action.clampWhenFinished = true;
    action.play(); mixer.setTime(time); scene.updateMatrixWorld(true);
    scene.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingBox(); });
    return { feet: ['LeftFoot','RightFoot','LeftToeBase','RightToeBase'].map(p), hand: p('RightHand'), head: p('Head'),
      hips: p('Hips'), headQ: bone('Head').quaternion.clone(), bounds: new Box3().setFromObject(scene),
      knee: ['Left','Right'].map(side => { const a=p(`${side}UpLeg`), b=p(`${side}Leg`), c=p(`${side}Foot`); return a.sub(b).normalize().angleTo(c.sub(b).normalize()); }),
      vertices: Array.from({ length: 120 }, (_, i) => skin.getVertexPosition(Math.floor(i * skin.geometry.attributes.position.count / 120), new Vector3()).applyMatrix4(skin.matrixWorld)) };
  }
  const idle = clips.find(c => c.name === 'idle'), base = sample(idle, 0);
  base.knee.forEach(angle => assert.ok(angle > 165 * Math.PI/180, 'La base ya no conserva la flexión antigua de 28–37°'));
  for (const clip of conversationClips) {
    const first = sample(clip, 0), middle = sample(clip, clip.duration*.4);
    assert.ok(middle.vertices.some((p, i) => p.distanceTo(first.vertices[i]) > .001), `${clip.name} deforma la malla`);
    for (const track of clip.tracks) {
      const [name, property] = track.name.split('.');
      assert.ok(scene.getObjectByName(name));
      assert.ok(property === 'quaternion' || property === 'position' && name === bone('Hips').name);
      assert.ok([...track.values, ...track.times].every(Number.isFinite));
      assert.equal(track.values.length, track.times.length * (property === 'quaternion' ? 4 : 3));
      const stride = property === 'quaternion' ? 4 : 3;
      for (let k=0;k<stride;k++) assert.ok(Math.abs(track.values[k] - track.values[track.values.length-stride+k]) < 1e-5, `${clip.name}: continuidad`);
      if (property === 'quaternion') for (let i=0;i<track.values.length;i+=4) {
        assert.ok(Math.abs(Math.hypot(...track.values.slice(i,i+4))-1)<1e-5);
      }
    }
    for (let i=0;i<=30;i++) {
      const pose = sample(clip,clip.duration*i/30);
      pose.feet.forEach((p,k) => assert.ok(p.distanceTo(base.feet[k])<2e-5, `${clip.name}: pie y orientación fijos`));
      const size = pose.bounds.getSize(new Vector3()); assert.ok(size.y > 1.65 && size.y < 1.85 && size.x < 1.2);
      for (let axis=0;axis<3;axis++) {
        assert.ok(pose.bounds.min.getComponent(axis)>=pack.envelope.min[axis]-1e-5);
        assert.ok(pose.bounds.max.getComponent(axis)<=pack.envelope.max[axis]+1e-5);
      }
    }
  }
  const wave = sample(clips.find(c=>c.name==='wave'),1.6);
  assert.ok(wave.hand.y-base.hand.y>.55, 'Saludo visible con elevación real');
  assert.ok(wave.headQ.angleTo(base.headQ)>.04, 'Cabeza acompaña al saludo');
  const think = sample(clips.find(c=>c.name==='think'),2);
  assert.ok(think.hand.distanceTo(think.head)<.25, 'Mano próxima al mentón');
  const hips = sample(clips.find(c=>c.name==='hands_on_hips'),2);
  assert.ok(hips.hand.distanceTo(hips.hips)<.24, 'Mano junto a cintura');
  for (const name of ['nod','shake_head']) {
    const clip = clips.find(c=>c.name===name), start = sample(clip,0);
    assert.ok(Array.from({length:24},(_,i)=>sample(clip,clip.duration*i/24).headQ.angleTo(start.headQ)).some(angle=>angle>.18), `${name} es legible`);
  }
});

test('Gangnam Style deforma el cuerpo completo con apoyo al suelo, eleva brazo y vuelve a voz/reposo', async () => {
  const { scene, pack, bones, bone, skin, animations } = await fixture(), mixer = new AnimationMixer(scene);
  const danceSource = await readFile(new URL('../tools/animation-sources/mixamo-gangnam-style.json', import.meta.url));
  assert.equal(pack.danceSha256, createHash('sha256').update(danceSource).digest('hex'));
  const clip = AnimationClip.parse(pack.clips.find(c => c.name === 'gangnam_style'));
  assert.equal(clip.duration, ANIMATIONS.gangnam_style.duration);
  for (const track of clip.tracks) {
    const [name, property] = track.name.split('.');
    assert.ok(scene.getObjectByName(name));
    assert.ok(property === 'quaternion' || property === 'position' && name === bone('Hips').name);
    assert.ok([...track.values, ...track.times].every(Number.isFinite));
    if (property === 'quaternion') for (let i = 0; i < track.values.length; i += 4) {
      assert.ok(Math.abs(Math.hypot(...track.values.slice(i, i + 4)) - 1) < 1e-5);
    }
  }
  const p = name => bone(name).getWorldPosition(new Vector3());
  const sample = time => {
    mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().setLoop(LoopOnce, 1); action.clampWhenFinished = true;
    action.play(); mixer.setTime(time); scene.updateMatrixWorld(true);
    scene.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingBox(); });
    const feetY = ['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'].map(n => p(n).y);
    return { minFootY: Math.min(...feetY), maxFootY: Math.max(...feetY), rightHand: p('RightHand'), leftHand: p('LeftHand'),
      head: p('Head'), bounds: new Box3().setFromObject(scene),
      vertex: skin.getVertexPosition(120, new Vector3()).applyMatrix4(skin.matrixWorld) };
  };
  const start = sample(0);
  let maxHandLift = 0, maxFootSpread = 0;
  for (let i = 0; i <= 39; i++) {
    const pose = sample(clip.duration * i / 39);
    const size = pose.bounds.getSize(new Vector3());
    assert.ok(size.y > 1.45 && size.y < 1.95, `altura Gangnam Style ${size.y}`);
    assert.ok(size.x < 1.35, `ancho Gangnam Style ${size.x}`);
    assert.ok(pose.minFootY >= start.minFootY - 0.03, `suela sin hundirse ${pose.minFootY}`);
    maxHandLift = Math.max(maxHandLift, pose.rightHand.y - pose.head.y);
    maxFootSpread = Math.max(maxFootSpread, pose.maxFootY - pose.minFootY);
  }
  assert.ok(maxHandLift > 0.0, 'El paso del lazo eleva la mano derecha sobre la cabeza');
  assert.ok(maxFootSpread > 0.08, 'El baile levanta los pies del suelo al alternar pasos');
  const changes = [];
  const player = createMotionPlayer(scene, pack, name => changes.push(name), animations);
  const advance = seconds => { for (let t = 0; t < seconds; t += 0.02) player.update(0.02); };
  player.setState('gangnam_style', 'speaking'); advance(1);
  assert.equal(changes.at(-1), 'gangnam_style');
  advance(7.2); assert.equal(changes.at(-1), 'explain');
  player.setState('idle', 'idle'); advance(0.5); assert.equal(changes.at(-1), 'idle');
  player.setState('gangnam_style', 'idle'); advance(0.5); assert.equal(changes.at(-1), 'gangnam_style');
  player.setState('wave', 'idle'); advance(0.5); assert.equal(changes.at(-1), 'wave');
  advance(4); assert.equal(changes.at(-1), 'idle');
  for (const b of bones) assert.ok([...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()].every(Number.isFinite));
  player.destroy();
});

test('Twerk conserva el clip original y vuelve a voz/reposo sin alterar escala ni dejar pistas activas', async () => {
  const { scene, pack, bones, animations, skin } = await fixture(), changes = [];
  const native = animations.find(clip => clip.name === 'Twerking');
  assert.ok(native); assert.ok(Math.abs(native.duration - ANIMATIONS.twerk.duration) < .001);
  const original = JSON.stringify(AnimationClip.toJSON(native));
  const player = createMotionPlayer(scene, pack, name => changes.push(name), animations);
  const sample = () => {
    scene.updateMatrixWorld(true);
    scene.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingBox(); });
    return { size: new Box3().setFromObject(scene).getSize(new Vector3()),
      vertex: skin.getVertexPosition(120, new Vector3()).applyMatrix4(skin.matrixWorld) };
  };
  const advance = seconds => { for (let elapsed = 0; elapsed < seconds; elapsed += .02) player.update(.02); };
  const base = sample();
  player.setState('twerk', 'speaking'); advance(1);
  assert.equal(changes.at(-1), 'twerk');
  const dancing = sample(); assert.ok(dancing.vertex.distanceTo(base.vertex) > .01);
  for (let i = 0; i < 14; i++) {
    advance(1); const pose = sample();
    assert.ok(pose.size.y > .8 && pose.size.y < 2.2, `altura Twerk ${pose.size.y}`);
    for (const bone of bones) assert.ok([...bone.position.toArray(), ...bone.quaternion.toArray(), ...bone.scale.toArray()].every(Number.isFinite));
  }
  advance(1); assert.equal(changes.at(-1), 'explain');
  player.setState('idle', 'idle'); advance(1);
  assert.equal(changes.at(-1), 'idle');
  assert.ok(Math.abs(sample().size.y - base.size.y) < .02);
  player.setState('twerk', 'idle'); advance(.5);
  player.setState('wave', 'idle'); advance(.5); assert.equal(changes.at(-1), 'wave');
  advance(4); assert.equal(changes.at(-1), 'idle');
  assert.equal(JSON.stringify(AnimationClip.toJSON(native)), original);
  player.destroy();
});

test('voz elige posturas, un gesto manual tiene prioridad y vuelve al estado actual sin callbacks antiguos', async () => {
  const { scene, pack, bones, animations } = await fixture(), changes = [];
  const player = createMotionPlayer(scene, pack, name=>changes.push(name), animations);
  const advance = seconds => { for(let t=0;t<seconds;t+=.02) player.update(.02); };
  assert.equal(animationForPhase('error'),'idle');
  player.setState('idle','processing'); advance(.3); assert.equal(changes.at(-1),'idle');
  advance(.4); assert.equal(changes.at(-1),'think');
  player.setState('wave','processing'); advance(.5); assert.equal(changes.at(-1),'wave');
  player.setState('wave','speaking'); advance(3.5); assert.equal(changes.at(-1),'explain');
  player.setState('idle','listening'); advance(.5); assert.equal(changes.at(-1),'listen');
  const before = changes.length; player.setState('idle','listening'); advance(.5); assert.equal(changes.length,before);
  for(let i=0;i<8;i++) {
    player.setState('nod','speaking'); advance(.2);
    player.setState('shake_head','speaking'); advance(.2);
    player.setState('hands_on_hips','speaking'); advance(4); assert.equal(changes.at(-1),'hands_on_hips');
    player.setState('idle','idle'); advance(.5); assert.equal(changes.at(-1),'idle');
    for(const b of bones) assert.ok(b.quaternion.toArray().every(Number.isFinite));
  }
  player.setState('think','idle'); advance(12); assert.equal(changes.at(-1),'think');
  player.setState('idle','idle'); advance(.5); assert.equal(changes.at(-1),'idle');
  advance(19); assert.equal(changes.at(-1),'shift_weight');
  advance(6); assert.equal(changes.at(-1),'idle');
  player.destroy();
});
