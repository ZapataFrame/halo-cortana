import { MathUtils } from 'three';

// El modo describe cómo se montará la pantalla. Si el viewport todavía está
// en la postura contraria, adaptar la imagen; el giro fino sigue siendo aparte.
export function effectiveRotation(settings, width, height) {
  const mismatch = (settings.orientation === 'landscape' && width < height)
    || (settings.orientation === 'portrait' && width > height);
  return (settings.rotation + (mismatch ? 90 : 0)) % 360;
}

// Espejos en ejes de pantalla, después de orientar la figura. El desplazamiento
// pertenece al viewport y tampoco gira con el personaje.
export function applyProjection(projection, orientation, settings, halfHeight, aspect) {
  projection.position.set(settings.x * 2 * halfHeight * aspect, -settings.y * 2 * halfHeight, 0);
  projection.rotation.set(0, 0, 0);
  projection.scale.set(settings.scale * (settings.mirrorX ? -1 : 1), settings.scale * (settings.mirrorY ? -1 : 1), settings.scale);
  orientation.rotation.z = -MathUtils.degToRad(settings.rotation);
}
