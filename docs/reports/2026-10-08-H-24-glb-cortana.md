# H-24 — Evaluación y prueba del GLB Cortana aportado

Fecha: 2026-10-08. Responsable: Codex. Estado: DONE (variante estática de prueba).

## Objetivo y cambios

El propietario añadió `charactershalo_4cortana.glb` a Descargas y pidió evaluar su uso. Se examinó el archivo completo: GLB 2 autocontenido, 4,868,160 bytes, 18,948 triángulos, cuatro meshes, skin de 79 joints y un clip Twerking con 195 canales. Metadatos: jameslucino117, Sketchfab, CC BY-NC 4.0 declarada. Hash/origen/atribución conservados en `public/models/README.md` y dentro del derivado. La página de Sketchfab devolvió 403; no se presenta como verificación independiente de titularidad.

El loader actual no incluye `KHR_materials_pbrSpecularGlossiness`. Se creó `tools/prepare-cortana.mjs` para sustituir esos materiales por PBR monocromático y eliminar referencias a texturas, sin modificar geometría, rig, canales ni binario. Resultado `public/models/cortana.glb` de 4,866,236 bytes. Original de Descargas intacto; copia derivada documentada con hashes. Sin nuevas dependencias ni descargas.

D-26: variante opcional en `/control?avatar=cortana` y `/hologram?avatar=cortana`; opción Cortana importada desde el control, con retorno Humanoide + Gangnam. Parámetro desconocido utiliza el avatar existente. Direcciones LAN y enlace Abrir visor conservan la selección. No se cambia el avatar predeterminado ni contratos de proveedor/chat.

El visor centra, ajusta altura y gira 180° para mostrar el frente, conserva controles de calibración y renderiza pose estática sobre negro. La animación nativa se conserva en el archivo pero no se reproduce. Gangnam pertenece al rig anterior y no se retargetea; botones deshabilitados en control Cortana, visor Cortana ignora ese movimiento si otra pestaña lo solicita.

## Verificación ejecutada

- `npm test`: **24/24 correctas**, incluyendo carga del derivado con GLTFLoader real, 18,948 triángulos, rig, dimensiones finitas, atribución y animación conservados. Se probó actualización del clip nativo en el test sin afirmar playback de producto. Prueba original de Gangnam sigue pasando.
- `npm run build`: correcto tras adaptación y corrección frontal. Advertencia previa de bundle mayor a 500 kB; no se agregaron dependencias.
- Navegador PC, visor a 1280×720: figura completa y centrada, cabeza/pies visibles, material blanco/gris sobre negro y panel oculto. Primera carga mostró espalda: corregida con giro inicial 180°, recompilada y revisada de nuevo de frente.
- Panel abierto confirmó `18.948 triángulos`, pose estática y controles de orientación/escala/espejos disponibles. No se afirma nueva aceptación de todos los rangos, persistencia o caja física.
- Control Cortana: avatar cargado; opciones de retorno/importación, botones de movimiento deshabilitados, atribución visible, selector GPT/Ollama conservado y enlaces local/LAN con `?avatar=cortana`. Retorno al control original cargó su modelo y recuperó botones de movimiento habilitados.
- Captura: [Cortana frontal sobre negro](evidence/H-24-cortana-hologram.png). Revisión visual del fondo; no se hizo muestreo RGB automatizado nuevo (Pillow no estaba instalado y no se añadió para esta tarea).
- `git diff --check`: correcto. Original y copia difieren solo por adaptación documentada; original nunca escrito.

## Problemas y límites

Una recarga de revisión encontró servidor temporal detenido y mostró negro con error accesible solo al abrir ajustes. Se reinició la instancia y se repitió carga/revisión con éxito. No se atribuye ese fallo al GLB. La figura no tiene materiales/texturas originales en esta variante; no se afirma fidelidad del color. La copia mantiene bytes de imágenes sin uso en el buffer, por lo que no es una optimización de tamaño.

Esto es una prueba visual utilizable, no selección de avatar final, retargeting, animación nueva, validación móvil ni prueba óptica. H-19/H-07/H-08 y H-20 conservan sus pendientes. El clip nativo y una pose de reposo más neutra pueden evaluarse en una tarea futura si el propietario lo solicita.

## Siguiente paso

Reiniciar la demo habitual y elegir Cortana importada. Abrir en celular la dirección que ofrece ese control y calibrar esta silueta. Para baile original volver a Humanoide + Gangnam. No se toca la selección GPT/Qwen ni sus credenciales.

Referencia técnica consultada: [GLTFLoader oficial](https://threejs.org/docs/pages/GLTFLoader.html); la extensión especular antigua no está en la lista soportada. No se cambiaron versiones.
