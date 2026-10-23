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
  const { scene } = await new GLTFLoader().register(() => ({ name: 'TEST_TEXTURE', loadTexture: async () => new Texture() }))
    .parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.rotation.y = Math.PI;
  const bones = []; let skin;
  scene.traverse(o => { if (o.isBone) bones.push(o); if (o.isSkinnedMesh && o.geometry.attributes.position.count > (skin?.geometry.attributes.position.count || 0)) skin = o; });
  const bone = name => bones.find(b => new RegExp(`^mixamorig${name}_0\\d+$`).test(b.name));
  return { scene, pack, bones, bone, skin };
}

test('nueve clips deforman la malla real, cierran sus curvas y conservan suelas y escala', async () => {
  const { scene, pack, bone, skin } = await fixture(), mixer = new AnimationMixer(scene);
  const clips = pack.clips.map(data => AnimationClip.parse(data));
  assert.deepEqual(clips.map(c => c.name).sort(), Object.keys(ANIMATIONS).sort());
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
  for (const clip of clips) {
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

test('voz elige posturas, un gesto manual tiene prioridad y vuelve al estado actual sin callbacks antiguos', async () => {
  const { scene, pack, bones } = await fixture(), changes = [];
  const player = createMotionPlayer(scene, pack, name=>changes.push(name));
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
