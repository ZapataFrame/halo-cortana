# Cortana — Plan y roadmap

Actualizado: 2026-10-23. Objetivo: un prototipo conversacional mantenible con Cortana, Vue y presentación 3D. El propietario retiró el simulador, avatares alternativos, placeholders y documentación histórica redundante. Esta es la única planificación vigente.

## Trabajo actual

| ID | Estado | Responsable | Dependencia | Entregable y aceptación |
|---|---|---|---|---|
| C-01 | DONE | Codex, 2026-10-23 | — | Cortana como único avatar, Vue 3, visor/calibración/voz separados y documentación consolidada. 184→66 archivos, 40→7 documentos Markdown. Instalación limpia, 88 pruebas/build correctos; control/visor/render y cancelación/persistencia/fallo de carga comprobados. Evidencia y límites en docs/REORGANIZACION.md. |
| C-02 | TODO | — | C-01 | Verificar flujo completo STT → borrador revisado → envío explícito → LLM → TTS → avatar: cinco conversaciones, dos interrupciones y recuperación, tiempos por etapa. Equivale al pendiente técnico H-17 anterior; identificar evidencia sintética/técnica/real. |
| C-03 | TODO | — | C-01 | Refinar reposo/saludo y transiciones. Producir escucha, reflexión y explicación sobre el rig solo después de revisar las poses base. Mantener pies estables, silueta completa y control manual. |
| C-04 | DEFERRED | Propietario | — | Ensayo humano: diez frases reales, ≥8/10 útiles y revisión/cancelación. Aplazado por el propietario; no bloquea software. |
| C-05 | DEFERRED | Propietario | — | Conexión en pantalla real, reflector, cinco minutos, orientación y recuperación física. Aplazado; no solicitar como siguiente paso de desarrollo. |

## Orden de ejecución

1. C-01 cerrado; consultar su evaluación antes de ampliar el alcance.
2. Ejecutar C-02 sobre la base reorganizada, sin nuevos proveedores ni pagos.
3. Trabajar C-03 en incrementos de una pose/clip; no declarar aceptación artística a partir de geometría o tests.

Se conservan LLM intercambiables, TTS/STT locales, cancelación, reserva exclusiva de audio y calibración v1. No hay herramientas de juego, autonomía de dispositivos, escucha continua, sincronización labial ni exportación instalada en el alcance actual.

## Base existente

Visor/calibración/recuperación, APIs privadas, selección de proveedor, texto y motores de voz tienen implementación y pruebas. El rig local incluye texturas y dos curvas propias de reposo/saludo. La migración no certifica de nuevo generación cloud, precisión de micrófono, calidad de voz ni óptica.

El historial detallado del proyecto anterior se retira del árbol de trabajo. La evaluación y los motivos de la reorganización se conservan en [docs/REORGANIZACION.md](docs/REORGANIZACION.md); los contratos actuales, en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
