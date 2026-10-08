import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { DEFAULT_CALIBRATION } from '../src/calibration.js';
import { applyProjection, effectiveRotation } from '../src/projection.js';

function point(settings, value) {
  const projection = new Group(), orientation = new Group();
  projection.add(orientation);
  applyProjection(projection, orientation, { ...DEFAULT_CALIBRATION, ...settings }, 1.5, 2);
  projection.updateMatrixWorld(true);
  return new Vector3(...value).applyMatrix4(orientation.matrixWorld);
}
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);

test('modos adaptan montajes 16:9 y 9:16 sin acumular giro al redimensionar', () => {
  const portrait = { ...DEFAULT_CALIBRATION, orientation: 'portrait' };
  const landscape = { ...DEFAULT_CALIBRATION, orientation: 'landscape' };
  assert.equal(effectiveRotation(portrait, 390, 844), 0);
  assert.equal(effectiveRotation(portrait, 844, 390), 90);
  assert.equal(effectiveRotation(landscape, 390, 844), 90);
  assert.equal(effectiveRotation(landscape, 844, 390), 0);
  assert.equal(effectiveRotation(DEFAULT_CALIBRATION, 390, 844), 0);
  for (let i = 0; i < 3; i++) {
    assert.equal(effectiveRotation({ ...landscape, rotation: 270 }, 390, 844), 0);
    assert.equal(effectiveRotation({ ...landscape, rotation: 270 }, 844, 390), 270);
  }
});

test('espejos invierten ejes de pantalla también con rotación 90° y 270°', () => {
  for (const rotation of [0, 90, 180, 270]) {
    const normal = point({ rotation }, [.3, .7, 0]);
    const horizontal = point({ rotation, mirrorX: true }, [.3, .7, 0]);
    const vertical = point({ rotation, mirrorY: true }, [.3, .7, 0]);
    close(horizontal.x, -normal.x); close(horizontal.y, normal.y);
    close(vertical.x, normal.x); close(vertical.y, -normal.y);
  }
});

test('desplazamiento permanece en coordenadas de viewport al girar o reflejar', () => {
  for (const rotation of [0, 90, 180, 270]) {
    const shifted = point({ rotation, x: .2, y: -.1, mirrorX: true, mirrorY: true }, [0, 0, 0]);
    close(shifted.x, 1.2); close(shifted.y, .3);
  }
});
