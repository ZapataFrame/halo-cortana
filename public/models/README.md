# Avatar y baile — fuentes y licencias

## Recursos activos

**Humanoide:** Superhero Male, de Quaternius Universal Base Characters Standard. [Autor y pack original](https://quaternius.com/packs/universalbasecharacters.html), CC0 1.0. Descargado el 2026-10-07 del [GLB publicado por ProgramAsWeights](https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/public/assets/character.glb), commit `ddd5fc34a445bcded3cf9836607aaeebc19a5c78`. Su [ficha de procedencia](https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/ASSETS.md) identifica el archivo original y conserva la licencia del pack, copiada aquí como `QUATERNIUS-LICENSE.txt`.

- Archivo `dancer.glb`: 741320 bytes, 14318 triángulos, 65 huesos, un skin, cero animaciones incorporadas.
- SHA-256: `d6f3b64cab629f6ddca9ba063811aeffd3663a8a4e49ade47cd9505dc2bbd70f`.
- Sin imágenes, URIs externas ni decodificadores obligatorios. Binario descargado sin modificaciones; el visor reemplaza material por blanco/gris.

**Baile:** recreación Gangnam Style de ProgramAsWeights, descargada del mismo commit; código original [gangnam.ts](https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/src/motion/gangnam.ts), [licencia MIT](https://github.com/programasweights/avatar/blob/ddd5fc34a445bcded3cf9836607aaeebc19a5c78/LICENSE), copyright 2026 ProgramAsWeights. Aviso íntegro en `LICENSE-Gangnam-MIT.txt` y fuentes usadas en `tools/vendor/avatar/`.

- `dancer-motion.json`: 162676 bytes, clips `idle` (pose neutra) y `gangnam` (7.272727 s, 132 BPM, 16 tiempos, 220 muestras a unos 30 FPS).
- SHA-256: `1560639ce2fab3e3173e51bc9ca2a96e67b7e3c23a377a977a9f95bb59090a1a`.
- Adaptación: curvas/IK del código MIT convertidas a keyframes locales, floats redondeados y UUIDs estables. El móvil reproduce el clip con Three.js; no ejecuta el editor, IA ni IK del proyecto de origen.
- Regenerar desde la raíz con `node tools/bake-dance.mjs` en Node 22.22.2 y dependencias instaladas. El parser TypeScript de Node avisa que su API es experimental; solo se usa al regenerar, nunca al presentar.
- Gangnam Style aparece como gesto en [Fortnite](https://www.fortnite.com/item-shop/emotes/gangnam-style-49d85afc). Aquí se usa la recreación MIT; no se descargan archivos del juego, música ni audio de PSY. No se afirma patrocinio de Epic, PSY, Quaternius ni ProgramAsWeights.

Personaje provisional; no es el modelo oficial de Cortana/Halo. Las licencias de código MIT y geometría CC0 se conservan por separado.

## Recurso anterior conservado

`humanoid.glb` es **Cesium Man**, © 2017 Cesium, obtenido del repositorio de recursos de muestra del Khronos Group el 2026-10-07.

- Origen: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan
- Binario original: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb
- Licencia: Creative Commons Attribution 4.0 International (CC BY 4.0). Conservar esta atribución y `LICENSE-CesiumMan.md` al redistribuir.
- Marcas/logo: quedan excluidos de la licencia CC. Véase `LicenseRef-LegalMark-Cesium.txt`. No se afirma patrocinio de Cesium.
- Archivo original sin modificaciones: **438,044 bytes**, **4,672 triángulos**, una animación, skin incorporado.
- SHA-256: `b7001eaeea8254bd44773bcd247e78696d94169388fbb2a1800fc69434e777d9`.
- GLB autosuficiente: sin URIs externas ni extensiones obligatorias.
- Presentación anterior: materiales/texturas sustituidos por blanco/gris y clip incorporado lento, sin logo. El visor activo ya no carga este archivo.

El intento inicial del pack Quaternius no produjo un binario utilizable; CesiumMan permitió verificar la primera versión. La nueva solicitud de baile se integra con el humanoide compatible descargado posteriormente de ProgramAsWeights. Se conserva el archivo anterior y su atribución para no perder contexto ni condiciones de redistribución.

## Cortana aportada por el propietario — texturas originales H-26 (base H-24)

- Original: `/home/zapata/Downloads/cortana/charactershalo_4cortana.glb`, 4,868,160 bytes; SHA-256 `e1e716f77e805998e84df73903e4e4d16f2454c147617c76f1f7a327a5ea98f5`. El original no se modifica.
- Metadatos incorporados: **Characters>Halo 4>Cortana**, autor **jameslucino117** ([perfil](https://sketchfab.com/jameslucino117)), [origen declarado](https://sketchfab.com/3d-models/charactershalo-4cortana-ae7434fc1c3c4707b3a6474095d0c4be), licencia declarada [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Atribución extraída del archivo; la página de origen devolvió 403 al verificarla. No se verificó una autorización adicional del titular de Halo/Microsoft. No se presenta como CC0 ni como recurso apto para explotación comercial.
- Copia adaptada `cortana.glb`: 4,867,260 bytes; SHA-256 `7b8d39c4e400230d31f2df6dc9a6497af45151b9a1f732a7edefd6ea9ae84edc`. **18,948 triángulos**, cuatro meshes, un skin de **79 joints**, una animación **Twerking** (195 canales), ocho imágenes incorporadas en el original. Sin URIs externas.
- Adaptación H-26: materiales antiguos `KHR_materials_pbrSpecularGlossiness` de este archivo (especular y brillo cero) convertidos a PBR difuso, metallic=0/roughness=1. Se conservan ocho PNG incorporados, cuatro mapas difusos/emisivos, tres normales y alpha del cabello. BIN original intacto byte a byte; geometría, skin y canales de animación conservados. El visor conserva los materiales y se comprobó la carga real de cuatro materiales con texturas. La variante monocromática H-24 queda en el historial Git.
- Regenerar: `node tools/prepare-cortana.mjs /ruta/charactershalo_4cortana.glb`. El visor además centra/escala y gira el modelo 180° para mostrar el frente.
- Seleccionar **Cortana importada** en control o abrir `/hologram?avatar=cortana`. Es una vista estática de prueba: conserva animación en el GLB, pero no la reproduce ni aplica Gangnam Style del otro esqueleto. El avatar predeterminado y baile original siguen disponibles.
