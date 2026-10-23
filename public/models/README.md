# Modelo de Cortana

Único avatar de la aplicación. Recursos locales y autocontenidos, sin CDNs ni modelos alternativos.

## Modelo y atribución

`cortana.glb`: 4,867,260 bytes, SHA-256 `7b8d39c4e400230d31f2df6dc9a6497af45151b9a1f732a7edefd6ea9ae84edc`. 18,948 triángulos, 79 joints, cuatro meshes/materiales y ocho PNG incorporados; sin morph targets faciales.

Metadatos del archivo: **Characters>Halo 4>Cortana**, autor **jameslucino117**, [origen declarado](https://sketchfab.com/3d-models/charactershalo-4cortana-ae7434fc1c3c4707b3a6474095d0c4be), licencia declarada [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). La página de origen respondió 403 en la verificación original; no se verificó autorización adicional de Microsoft/Halo ni uso comercial.

Adaptación PBR local: conserva geometría, rig, ocho imágenes, mapas difusos/emisivos/normales y alpha del cabello. Conversión de materiales diffuse-only con `tools/prepare-cortana.mjs`; la aplicación centra/escala y corrige frente 180°. El archivo fuente aportado permanece fuera del repositorio; no se modifica.

El GLB conserva un clip de origen `Twerking`, que no se reproduce en la aplicación.

## Movimientos propios

`cortana-motion.json`: 213,758 bytes, SHA-256 `c3be9b4114f731fb5e7676b1255bbceffdbfb733d5a8481c1eb7422c1afb31d4`. Curvas originales del proyecto sobre este rig: `idle` 4 s y `wave` 3.6 s, muestreadas a 30 FPS. Incluye hash del modelo y envolvente muestreada. Son prototipos, con refinamiento artístico pendiente.

Regenerar con `npm run animations:bake`; comprobar con `npm test`. No modifica el GLB. La atribución/licencia declarada del modelo sigue vigente y las curvas no cambian los derechos sobre el personaje.
