// Catálogo compartido por servidor, visor y controles. Duraciones en segundos.
export const ANIMATIONS = Object.freeze({
  idle: { label: 'Reposo', duration: 6, loop: true, manualSeconds: 0 },
  wave: { label: 'Saludar', duration: 3.6, loop: false, manualSeconds: 3.6 },
  nod: { label: 'Sí', duration: 2.4, loop: false, manualSeconds: 2.4 },
  shake_head: { label: 'No', duration: 2.8, loop: false, manualSeconds: 2.8 },
  think: { label: 'Pensar', duration: 6, loop: true, manualSeconds: 8 },
  hands_on_hips: { label: 'Manos en cadera', duration: 6, loop: true, manualSeconds: 8 },
  listen: { label: 'Escuchar', duration: 6, loop: true, manualSeconds: 8 },
  explain: { label: 'Explicar', duration: 7, loop: true, manualSeconds: 8 },
  shift_weight: { label: 'Cambiar de postura', duration: 6, loop: false, manualSeconds: 6 },
});
export const hasAnimation = value => typeof value === 'string' && Object.hasOwn(ANIMATIONS, value);
export function animationForPhase(phase) {
  return ({ listening: 'listen', processing: 'think', speaking: 'explain' })[phase] || 'idle';
}
