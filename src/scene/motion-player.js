import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat } from 'three';
import { ANIMATIONS, animationForPhase, hasAnimation } from '../services/animation-catalog.js';

// Un solo propietario del mixer. Los estados de voz no interrumpen un gesto manual.
export function createMotionPlayer(root, pack, onChange = () => {}) {
  const mixer = new AnimationMixer(root), actions = new Map();
  let current, manual = 'idle', phase = 'idle', phaseAge = 0, finished = false, idleAge = 0, ambient;
  for (const data of pack.clips) {
    if (!hasAnimation(data.name)) continue;
    const { loop } = ANIMATIONS[data.name];
    const action = mixer.clipAction(AnimationClip.parse(data));
    action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = true; actions.set(data.name, action);
  }
  for (const name of Object.keys(ANIMATIONS)) if (!actions.has(name)) throw new Error(`MOTION_MISSING_${name}`);
  function choose() {
    if (manual !== 'idle' && !finished) return manual;
    if (ambient) return ambient;
    return phase === 'processing' && phaseAge < .6 ? 'idle' : animationForPhase(phase);
  }
  function play(name) {
    const next = actions.get(name); if (current === next) return;
    next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
    if (current) next.crossFadeFrom(current, .35, false);
    current = next; onChange(name);
  }
  mixer.addEventListener('finished', event => {
    if (event.action !== current) return;
    if (ambient === current.getClip().name) ambient = undefined;
    else finished = true;
    play(choose());
  });
  play('idle'); mixer.update(0);
  return {
    setState(nextManual, nextPhase) {
      if (hasAnimation(nextManual) && nextManual !== manual) { manual = nextManual; finished = false; ambient = undefined; idleAge = 0; }
      if (nextPhase !== phase) { phase = nextPhase; phaseAge = 0; ambient = undefined; idleAge = 0; }
      play(choose());
    },
    update(delta) {
      phaseAge += delta;
      if (manual === 'idle' && ['idle','responded'].includes(phase) && !ambient) {
        idleAge += delta;
        if (idleAge >= 18) { ambient = 'shift_weight'; idleAge = 0; }
      }
      play(choose()); mixer.update(delta);
      // Acciones que ya no pesan dejan de consumir muestreo. No detener el fade entrante.
      for (const action of actions.values()) if (action !== current && action.getEffectiveWeight() === 0) action.stop();
    },
    seek(time) { for (const action of actions.values()) if (action !== current) action.stop(); current.stopFading().reset().setEffectiveWeight(1).play(); current.time = Math.max(0, Math.min(time, current.getClip().duration - 1e-6)); mixer.update(0); },
    destroy() { mixer.stopAllAction(); mixer.uncacheRoot(root); },
  };
}
