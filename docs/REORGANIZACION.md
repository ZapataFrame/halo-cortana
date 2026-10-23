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

## Pendiente y siguiente paso

La reorganización no cierra el recorrido completo de voz, aprobación artística, precisión humana ni óptica. La siguiente tarea es C-02 (antes H-17): cinco conversaciones, dos interrupciones y latencias por etapa. Los ensayos físicos y humanos permanecen aplazados; el resto del catálogo corporal sigue pendiente. El proyecto no incorpora herramientas de juego ni control de dispositivos.
