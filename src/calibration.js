export const STORAGE_KEY = 'cortana.hologram.calibration.v1';
export const DEFAULT_CALIBRATION = Object.freeze({
  version: 1, scale: 1, x: 0, y: 0, rotation: 0,
  mirrorX: false, mirrorY: false, wireframe: false, turn: 0, orientation: 'auto',
});

// Datos persistidos son entrada externa: validar antes de usarlos en el render.
export function normalizeCalibration(value) {
  if (!value || value.version !== 1) return { ...DEFAULT_CALIBRATION };
  const number = (key, min, max) => typeof value[key] === 'number' && Number.isFinite(value[key])
    ? Math.max(min, Math.min(max, value[key])) : DEFAULT_CALIBRATION[key];
  return {
    version: 1, scale: number('scale', 0.25, 2),
    x: number('x', -0.45, 0.45), y: number('y', -0.45, 0.45),
    rotation: [0, 90, 180, 270].includes(value.rotation) ? value.rotation : 0,
    mirrorX: value.mirrorX === true, mirrorY: value.mirrorY === true,
    wireframe: value.wireframe === true, turn: number('turn', -180, 180),
    orientation: ['auto', 'portrait', 'landscape'].includes(value.orientation) ? value.orientation : 'auto',
  };
}

export function loadCalibration(storage) {
  try { return normalizeCalibration(JSON.parse(storage.getItem(STORAGE_KEY))); }
  catch { return { ...DEFAULT_CALIBRATION }; }
}

export function saveCalibration(storage, value) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(normalizeCalibration(value))); return true; }
  catch { return false; }
}
