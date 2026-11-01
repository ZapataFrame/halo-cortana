# Modelo de Cortana

Único avatar de la aplicación. Recursos locales y autocontenidos, sin CDNs ni modelos alternativos.

## Modelo y atribución

`cortana.glb`: 4,867,260 bytes, SHA-256 `7b8d39c4e400230d31f2df6dc9a6497af45151b9a1f732a7edefd6ea9ae84edc`. 18,948 triángulos, 79 joints, cuatro meshes/materiales y ocho PNG incorporados; sin morph targets faciales.

Metadatos del archivo: **Characters>Halo 4>Cortana**, autor **jameslucino117**, [origen declarado](https://sketchfab.com/3d-models/charactershalo-4cortana-ae7434fc1c3c4707b3a6474095d0c4be), licencia declarada [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). La página de origen respondió 403 en la verificación original; no se verificó autorización adicional de Microsoft/Halo ni uso comercial.

Adaptación PBR local: conserva geometría, rig, ocho imágenes, mapas difusos/emisivos/normales y alpha del cabello. Conversión de materiales diffuse-only con `tools/prepare-cortana.mjs`; la aplicación centra/escala y corrige frente 180°. El archivo fuente aportado permanece fuera del repositorio; no se modifica.

El GLB conserva un clip de origen `Twerking`, que no se reproduce en la aplicación.

## Movimientos propios

`cortana-motion.json`: 1,428,400 bytes, SHA-256 `8473166129cd72070a81badcbf1173e5064b930a3cc7de6c6c6bb073c8f3de6c`. Nueve clips muestreados a 30 FPS: reposo, saludo, sí/no, pensar, manos en cadera, escucha, explicación y cambio de apoyo. Base de pelvis/piernas corregida y suelas ancladas mediante IK durante el horneado. Incluye hashes de modelo/fuente de curvas y envolvente muestreada. Son animaciones de desarrollo con revisión artística pendiente.

Reposo y explicación adaptan `Idle_Loop` e `Idle_Talking_Loop` de la [Universal Animation Library de Quaternius](https://quaternius.itch.io/universal-animation-library), publicada como CC0-1.0, con contribuciones de Gonzalo Furnier agradecidas por el autor. Fuente glTF obtenida del [espejo de J-Ponzo](https://github.com/J-Ponzo/gltf-universal-animation-library), revisión `e24c23cf2a1323488a3faa226ea7ea21f644b73e` (edición de 2025). Solo se conservan curvas extraídas, no otro avatar. Referencia y hashes en `tools/animation-sources/quaternius-upper-body.json`; licencia completa en `tools/animation-sources/CC0-1.0.txt`.

Regenerar sin red con `npm run animations:bake`; comprobar con `npm test`. No modifica el GLB. Las curvas adaptadas, correcciones y gestos no cambian los derechos sobre Cortana ni la licencia declarada del modelo. Catálogo, integración y límites de revisión: [animaciones](../../docs/ANIMACIONES.md).
