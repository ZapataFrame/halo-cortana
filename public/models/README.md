# Modelo de Cortana

Único avatar de la aplicación. Recursos locales y autocontenidos, sin CDNs ni modelos alternativos.

## Modelo y atribución

`cortana.glb`: 4,867,260 bytes, SHA-256 `7b8d39c4e400230d31f2df6dc9a6497af45151b9a1f732a7edefd6ea9ae84edc`. 18,948 triángulos, 79 joints, cuatro meshes/materiales y ocho PNG incorporados; sin morph targets faciales.

Metadatos del archivo: **Characters>Halo 4>Cortana**, autor **jameslucino117**, [origen declarado](https://sketchfab.com/3d-models/charactershalo-4cortana-ae7434fc1c3c4707b3a6474095d0c4be), licencia declarada [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). La página de origen respondió 403 en la verificación original; no se verificó autorización adicional de Microsoft/Halo ni uso comercial.

Adaptación PBR local: conserva geometría, rig, ocho imágenes, mapas difusos/emisivos/normales y alpha del cabello. Conversión de materiales diffuse-only con `tools/prepare-cortana.mjs`; la aplicación centra/escala y corrige frente 180°. El archivo fuente aportado permanece fuera del repositorio; no se modifica.

El GLB conserva el clip de origen `Twerking` (195 canales, 15.2 s), habilitado por petición del propietario como **Twerk**, manual y de una sola reproducción; usa directamente las curvas del GLB y su misma atribución/licencia declarada. No se modifica ni duplica el recurso.

## Movimientos propios

`cortana-motion.json`: 2,058,263 bytes, SHA-256 `907f14277c001dd340960e770c9e262719e89bf1b03b80ebf678570e65dd97fe`. Diez clips muestreados a 30 FPS: nueve clips de conversación (reposo, saludo, sí/no, pensar, manos en cadera, escucha, explicación y cambio de apoyo, con base de pelvis/piernas corregida y suelas ancladas mediante IK) y el baile manual **Gangnam Style** (7.8 s, una vez). Incluye hashes del modelo y de las fuentes de curvas y envolvente muestreada. Son animaciones de desarrollo con revisión artística pendiente.

Reposo y explicación adaptan `Idle_Loop` e `Idle_Talking_Loop` de la [Universal Animation Library de Quaternius](https://quaternius.itch.io/universal-animation-library), publicada como CC0-1.0, con contribuciones de Gonzalo Furnier agradecidas por el autor. Fuente glTF obtenida del [espejo de J-Ponzo](https://github.com/J-Ponzo/gltf-universal-animation-library), revisión `e24c23cf2a1323488a3faa226ea7ea21f644b73e` (edición de 2025). Solo se conservan curvas extraídas, no otro avatar. Referencia y hashes en `tools/animation-sources/quaternius-upper-body.json`; licencia completa en `tools/animation-sources/CC0-1.0.txt`.

**Gangnam Style** adapta curvas de 52 huesos extraídas de `Gangnam Style.fbx` de [Mixamo](https://www.mixamo.com/) incluido en el repositorio de ejemplo [V-Sekai/three-vrm-1-sandbox-mixamo](https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo) (revisión `9c13ee8eeefcbf18a0bcc80cd49ac59cd4af73e4`, SHA-256 del FBX `119f68a45ad10afec2facdef4f3f9a85e25659c46a368fb1555d6c116b9ae2d7`; licencia MIT del repositorio y términos de Mixamo para la animación original). Solo se conservan las curvas muestreadas en `tools/animation-sources/mixamo-gangnam-style.json` (SHA-256 `0e2f19c904e51267594a55b301eb4d1700ca0918b0d15e9c9b6cdbe5b051c0cd`), sin malla ni otro avatar.

Regenerar sin red con `npm run animations:bake`; comprobar con `npm test`. No modifica el GLB. Las curvas adaptadas, correcciones y gestos no cambian los derechos sobre Cortana ni la licencia declarada del modelo. Catálogo, integración y límites de revisión: [animaciones](../../docs/ANIMACIONES.md).
