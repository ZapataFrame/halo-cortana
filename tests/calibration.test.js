import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CALIBRATION, STORAGE_KEY, loadCalibration, normalizeCalibration, saveCalibration } from '../src/calibration.js';

test('datos corruptos, versión futura y almacenamiento bloqueado mantienen valores seguros', () => {
  assert.deepEqual(loadCalibration({ getItem: () => '{broken' }), DEFAULT_CALIBRATION);
  assert.deepEqual(loadCalibration({ getItem() { throw new Error('denied'); } }), DEFAULT_CALIBRATION);
  assert.deepEqual(normalizeCalibration({ version: 2, scale: 10 }), DEFAULT_CALIBRATION);
  assert.equal(saveCalibration({ setItem() { throw new Error('quota'); } }, DEFAULT_CALIBRATION), false);
});

test('calibración acota magnitudes y no interpreta cadenas como opciones', () => {
  const result = normalizeCalibration({ version: 1, scale: Infinity, x: 99, y: -99, rotation: 45, mirrorX: 'false', mirrorY: true, turn: 999 });
  assert.equal(result.scale, 1); assert.equal(result.x, .45); assert.equal(result.y, -.45);
  assert.equal(result.rotation, 0); assert.equal(result.mirrorX, false); assert.equal(result.mirrorY, true); assert.equal(result.turn, 180);
});

test('calibraciones anteriores usan modo automático y persisten los nuevos modos', () => {
  assert.equal(normalizeCalibration({ version: 1, rotation: 90 }).orientation, 'auto');
  assert.equal(normalizeCalibration({ version: 1, orientation: 'sideways' }).orientation, 'auto');
  const storage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  for (const orientation of ['portrait', 'landscape', 'auto']) {
    saveCalibration(storage, { ...DEFAULT_CALIBRATION, orientation, mirrorX: true });
    const value = loadCalibration(storage);
    assert.equal(value.orientation, orientation); assert.equal(value.mirrorX, true);
  }
});

test('ajustes de reflexión sobreviven tres lecturas y conservan espejos independientes', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const calibration = { ...DEFAULT_CALIBRATION, scale: .71, x: -.2, y: .12, rotation: 270, mirrorX: true };
  assert.equal(saveCalibration(storage, calibration), true);
  assert.ok(values.has(STORAGE_KEY));
  for (let i = 0; i < 3; i++) assert.deepEqual(loadCalibration(storage), calibration);
});
