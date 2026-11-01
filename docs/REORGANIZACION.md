# Evaluación y reorganización de Cortana

Fecha: 2026-10-23. Responsable: Codex. Solicitud: concentrar el prototipo en Cortana, migrar a Vue y retirar código, modelos y documentación redundantes.

## Evaluación de la solución

La base de ejecución es apropiada para el alcance actual: Node mantiene conversación y credenciales en PC, Three representa el rig en navegador y Piper/Whisper permiten voz local. Los problemas principales eran el HTML construido manualmente, la mezcla de controles con el renderizador, dos caminos de avatar/animación y un historial documental que competía con la planificación actual.

Vue está justificado para estado, formularios y ciclo de vida de los componentes. Se usa Vue 3.5.44, Composition API y SFC con JavaScript; se conservan los servicios de voz probados. No se añadió Router, Pinia, Nuxt, TypeScript ni un framework 3D adicional: dos rutas y este estado local no los necesitan. El backend conserva sus validaciones, reservas, cancelación y pruebas.

`server/app.js` sigue concentrando la coordinación HTTP, pero sus invariantes de concurrencia están probadas. Dividirlo ahora añadiría archivos sin una necesidad funcional; revisar esa frontera si crecen los contratos.

## Cambios

- Cortana es el único avatar en `/control` y `/hologram`, incluidos enlaces antiguos con parámetros. Reposo/saludo se integran en el mismo visor; se retira la herramienta de preview duplicada. El saludo vuelve automáticamente a reposo y los clips avanzan con tiempo real incluso con pocos frames.
- Componentes con responsabilidades explícitas: representación, calibración, conversación, proveedor y voz. La lógica de peticiones/presentación vive en composables; el renderizador no construye HTML ni controla chat.
- `npm run dev` incluye las APIs del backend mediante middleware de Vite con las mismas protecciones de origen. Producción conserva Node y `dist/`.
- Se retiraron CesiumMan, Quaternius, Gangnam, sus licencias específicas y código vendor; se conserva la atribución y licencia declarada de Cortana. Modelos de voz instalados y `.env` permanecen fuera de la limpieza.
- Se retiraron el simulador archivado, reportes/capturas/WAV históricos, guías duplicadas, el panel auxiliar de ensayo de micrófono y sus tests específicos. Se conservan los criterios humanos aplazados en voz/roadmap.
- Se consolidaron especificación, diseño y guía de animaciones en arquitectura, README y roadmap. `AGENTS.md` queda en 28 líneas; npm tiene un único lockfile.
- Se corrigieron estados de la migración: disponibilidad real de Escuchar, foco del borrador después de actualizar Vue, bloqueo de envío mientras se reinicia, límites numéricos al confirmar y descarte de respuestas después de cancelar/salir.

La copia previa, incluidos los cambios sin commit, se guardó en `/tmp/cortana-refactor-20261023/source-before.tgz`. Es una copia temporal local para recuperación, sin `.env` ni pesos privados; no reemplaza un respaldo permanente o Git. El árbol activo contiene documentación vigente, no otro archivo histórico.

## Reducción del árbol activo

| Medida | Antes | Después |
|---|---:|---:|
| Archivos del proyecto | 184 | 66 |
| Documentos Markdown | 40 | 7 |
| Recursos públicos (bytes) | 6,446,370 | 5,082,750 |

Inventario de código, herramientas, pruebas, recursos, documentación y configuración; excluye `.git`, `node_modules`, `dist`, `.env` y entornos/pesos instalados. Incluye cambios previos sin commit y los archivos nuevos de esta migración.

## Skills utilizadas

- `find-skills`: catálogo consultado con `npx skills find vue`; se revisaron instalaciones, procedencia y estrellas antes de elegir.
- [vue-best-practices](https://skills.sh/vuejs-ai/skills/vue-best-practices), `vuejs-ai/skills`: 42.5K instalaciones y unas 3.1K estrellas al consultar. Es comunitaria, no documentación oficial. Se leyeron sus referencias de reactividad, SFC, flujo de datos y composables desde una copia temporal, sin instalación global. Instalación opcional: `npx skills add vuejs-ai/skills --skill vue-best-practices`.
- `agent-md-refactor`: instrucciones esenciales y enlaces a los contratos vigentes. Los conflictos de alcance se resolvieron por la instrucción explícita más reciente del propietario.
- `impeccable`/distill y habilidad de navegador: eliminación de controles repetidos, divulgación progresiva y revisión renderizada. Detector mecánico sobre los componentes/CSS: `[]`.

## Verificación

- `npm ci --ignore-scripts`: instalación limpia del lockfile; 39 paquetes auditados, cero vulnerabilidades informadas. No es una auditoría de seguridad completa.
- `npm test`: 88/88 tras instalación limpia. Se retiraron seis pruebas específicas de funciones eliminadas y se añadieron cinco para conversación Vue y retorno/validación del saludo. No se eliminaron pruebas para ocultar fallos.
- `npm run build`: correcto. `git diff --check`: correcto. Modelo Cortana y hash del GLB conservados; curvas regenerables y verificadas contra el rig/malla reales.
- Navegador, control y visor: cuerpo completo, texturas, envío explícito, respuesta, cancelación, entrega tardía descartada y recuperación. Conversación probada en instancia aislada con fixtures identificados, sin llamadas LLM ni micrófono; no se presenta como integración real de proveedor.
- Calibración: 75 % persiste al recargar; entrada 250 se acota a 200 al confirmar; restablecimiento y panel oculto comprobados. Render revisado en escritorio y 390×844 de escritorio, no un teléfono físico.
- Negro normal del visor: cinco puntos de fondo RGB `(0,0,0)`. Fallo de carga ensayado por separado; diagnóstico visible al abrir calibración y panel ocultable.

La carga inicial JS queda en unos 105 kB sin comprimir; Three/visor se cargan aparte, unos 627 kB. El total JS aumenta por Vue respecto al bundle previo: la mejora es desacoplar el arranque de los controles y la mantenibilidad, no una reducción del total descargado. Vite conserva una advertencia de tamaño del chunk 3D. No se certifican FPS ni rendimiento móvil con esta prueba de escritorio.

## Integración de ramas · C-10, 2026-11-01

Se unifica `origin/main` en `32ede1d` (Gemini, Piper → RVC, instalación portable y descarga verificada) con `codex/cortana-vue-cleanup` en `30724e1` (nueve clips conversacionales). La fusión conserva ambos historiales y se registra en `main` local. La reversión de la rama remota de limpieza no se aplica: retiraría la adaptación Vue solicitada. Antes de integrar se guardó el historial completo en `/tmp/cortana-before-unify-20261101.bundle`; es una copia temporal, no un respaldo permanente.

Se conserva Vue 3 con Composition API y `<script setup>`, un único punto de entrada y npm como único gestor. La raíz contiene arranque/configuración; `src/components`, `src/composables`, `src/services` y `src/scene` separan interfaz, estado, servicios y Three.js; `server`, `tools`, `tests`, `public/models` y `docs` mantienen sus responsabilidades. No se recuperan el simulador, avatares alternativos ni documentos históricos retirados.

La resolución del servidor conserva `createTts()` y el timeout propio de RVC, junto con duraciones por gesto del catálogo compartido. El selector Vue conserva Gemini y corrige una lectura de `working` que evaluaba el objeto ref en lugar de su valor e impedía aplicar cualquier cambio de proveedor. El README presenta primero el inicio mínimo y después la instalación opcional de voz.

Verificación actual:

- `npm ci`: instalación correcta desde el lockfile; sin dependencias nuevas.
- `npm test`: **107/107**, incluidos origen privado, cancelación, concurrencia, recuperación, Gemini, RVC y rig real. Una prueba adicional cruza Gemini con gestos, plazo propio del motor de voz, recuperación tras timeout y exclusión del micrófono. Son contratos con fixtures; no inferencia real.
- `npm run animations:bake`: nueve clips regenerados sin red; SHA-256 idénticos de curvas y GLB antes/después.
- `npm run build`: correcto; se mantiene la advertencia de tamaño del chunk Three/visor, aproximadamente 628 kB sin comprimir.
- Navegador sobre la entrega compilada y backend aislado sin `.env`: cambio OpenAI → Gemini aplicado desde Vue, envío explícito, respuesta sintética y cancelación confirmada. Control renderizado en escritorio y viewport vertical solicitado de 390×844, sin desbordamiento horizontal. Avatar con materiales reales y cuerpo completo; visor con controles ocultos y fondo negro.
- Capturas: [control escritorio](evidence/C-10-unificacion-desktop.png) y [control vertical](evidence/C-10-unificacion-vertical.png). El navegador de QA muestra pocos FPS; esta revisión no certifica fluidez ni rendimiento en un dispositivo físico.

## Pendiente y siguiente paso

C-02 conserva la batería completa del circuito real de voz. C-03 mantiene pendiente la evaluación artística completa de los nueve movimientos; las capturas y pruebas de rig no la sustituyen. C-09 conserva pendiente verificar la instalación completa desde checkout limpio y la publicación de pesos en Release. El commit solicitado se limita a `main` local. Los ensayos humanos y físicos continúan aplazados y no bloquean el software.
