# Forma de trabajo de Halo Strategy Lab

## Propósito y documentos

Prioridad inicial desde 2026-10-07: MVP holográfico para 2026-10-08. Visor/calibración y LLM por texto implementados parcialmente; D-32 (2026-10-08) adelanta voz PC mientras queda pendiente validación física. El simulador táctico permanece diferido.

- `SPECIFICACTIONS.MD`: alcance, requisitos, decisiones, contratos y criterios de aceptación. El nombre se conserva como lo solicitó el propietario.
- `ROADMAP.MD`: tareas ordenadas, dependencias, estados y evidencia de avance.
- `Cortana.md`: diseño actual del avatar/visor negro, calibración, conversación y voz PC. `docs/VOZ_PC.md` documenta instalación, contratos, atribución de H-15/H-16 y ensayo humano pendiente. H-16 implementado no equivale a aceptación ≥8/10; respetar su estado en roadmap antes de iniciar H-17.
- `docs/plans/2026-10-07-mvp-holograma.md`: tarjetas detalladas H-00…H-19, pruebas y contingencias del MVP activo. H-19 identifica dispositivo/caja/hora sin dar por probadas las tareas físicas.
- Ampliación vigente H-20…H-22: GPT principal solicitado por el propietario, orientación automática/vertical/horizontal y baile libre. Ollama es alternativa explícita; sin fallback automático. Credencial privada pendiente no bloquea funciones visuales independientes.
- Ampliación 2026-10-08 H-25…H-28: merge de calibración en main, texturas originales de Cortana, guía de rig/múltiples clips y prueba temporal Ollama Cloud/Gemma 4. `docs/GUIA_RIG_ANIMACIONES.md` y `docs/API_OLLAMA_CLOUD.md` registran preparación y límites. Credencial cloud no bloquea visor; no declarar generación sin cuenta real.
- H-29: diagnóstico explícito sin generación desde PC. Catálogo Cloud no valida clave/cuota; conservar presentación/contexto y descartar resultados si cambia proveedor o comienza un chat. Evidencia real H-28 separada del diagnóstico.
- H-30 prepara recuperación PC de H-12: estado público validado, sesión/revisión y ciclo de vida sin duplicar consultas; avisos solo fuera de proyección. No sustituye pruebas de H-11 manual ni H-07/H-12 móvil.
- Q-11 resuelta/D-32: propietario autorizó adelantar voz PC. Ejecutar H-15 (TTS) tras H-10/H-26/H-28; después H-16 (STT) y H-17. Conservar aceptación física pendiente en H-07/H-08/H-12/H-14.
- `docs/API_OPENAI.md`: alta/configuración API y distinción de costes; no implica gasto autorizado ni cuenta verificada.
- `docs/archive/`: definiciones anteriores del simulador; no ejecutar su orden de tareas durante el MVP holográfico.
- `docs/reports/`: reportes cuando un avance, experimento o bloqueo lo justifique.

Leer estos documentos y las instrucciones aplicables antes de modificar código. Las instrucciones explícitas más recientes del usuario tienen prioridad. No interpretar propuestas ni supuestos como requisitos aprobados.

## Antes de implementar

1. Revisar el estado real del repositorio, archivos existentes y cambios ajenos.
2. Leer decisiones y preguntas pendientes de la especificación.
3. Buscar en la roadmap la primera tarea `TODO` cuyas dependencias estén `DONE` y cuyas decisiones necesarias estén resueltas. Respetar el orden de prioridad.
4. Si una tarea está bloqueada, registrar el motivo y continuar con otra independiente. No adivinar plataforma, presupuesto, hardware, fechas ni alcance de simulación.
5. Presentar un plan breve con objetivo, archivos afectados, validación y dudas materiales. Preguntar solo por información necesaria que no exista en el contexto.
6. Marcar la tarea elegida `IN_PROGRESS`. Mantener una sola tarea principal activa por agente y registrar quién la trabaja.

Se permite trabajo documental y experimentos reversibles mientras haya decisiones pendientes; no comprometer una arquitectura definitiva sin resolver sus dependencias.

## Durante la implementación

- Trabajar en incrementos pequeños que se puedan demostrar y verificar por separado.
- Preservar trabajo ajeno. No revertir, borrar ni sobrescribir cambios que no se comprendan.
- Usar español en documentación e interfaz. Usar nombres técnicos consistentes en código y contratos.
- Separar el estado del escenario, reglas de simulación, representación 3D, interfaz, comandos y proveedores de IA/voz.
- El editor manual y Cortana deben usar el mismo ejecutor de comandos. Ningún LLM modifica directamente el mundo ni ejecuta código.
- Validar acciones, referencias, argumentos, límites y estado antes de ejecutar. No depender del prompt para garantizar integridad.
- Introducir proveedores mediante adaptadores y configuración. Nunca guardar claves, audio privado ni credenciales en el repositorio.
- Mantener la aplicación operativa con controles manuales cuando fallen los servicios de IA o voz.
- Registrar decisiones relevantes y su motivo en la especificación. Si cambia el alcance, ajustar también las tareas y criterios de aceptación.
- Usar modelos simples o recursos provisionales para validar funcionalidad antes de invertir en arte final.
- No ampliar el alcance por iniciativa propia hacia multijugador, físicas avanzadas o autonomía estratégica de Cortana.
- No interpretar propuestas de `Cortana.md` como selección técnica confirmada: verificar documentación oficial al elegir versiones, dependencias o modelos y registrar la decisión.
- Respetar la prioridad actual: visor negro/modelo/calibración, luego conversación LLM por texto y después voz. No iniciar tareas T del simulador; seleccionar tareas H de la roadmap activa.
- Mantener la estética blanco/negro y modelos de contornos; distinguir bandos con símbolos y líneas, sin depender de colores.
- Para este MVP, PC Linux sirve/controla y móvil presenta un humanoide; el visor web es propuesta del plan para el plazo corto. No exigir APK ni exportación Windows para mañana. Verificar dispositivo/caja reales antes de declarar compatibilidad o éxito óptico.
- Mantener un recorrido base sin costes. No prometer rendimiento por el nombre de la GPU ni compatibilidad entre proveedores solo por permitir cambiar una URL.
- Usar contratos y un estado mínimo real para probar comandos antes del editor. Las respuestas ficticias o mocks no cuentan como ejecución de producto.
- En el corte actual el LLM conversa y no recibe herramientas del juego. No confundir respuesta pregrabada/mock con integración real. Mantener visor operativo aunque falle el proveedor.
- La suscripción ChatGPT/Codex no se interpreta como saldo API. No activar pagos ni copiar credenciales de sesión; claves solo en backend, nunca en visor móvil/bundle.
- El plan solicitado precede a la implementación. Cerrar H-00 con evidencia documental; no marcar H-02…H-14 como realizadas por haber descrito sus objetivos.

## Trabajo con agentes de IA

El proyecto prevé desarrollo con agentes. Cuando se deleguen tareas, asignar objetivo, archivos, dependencias y aceptación explícitos; evitar edición concurrente del mismo archivo. La integración mantiene un responsable que revisa cambios y evidencia. Actualizar roadmap y especificación de forma coordinada; no permitir que cada agente adopte una arquitectura distinta. La cantidad de agentes no sustituye mediciones, revisión visual ni validación del usuario.

## Verificación

Elegir verificaciones proporcionales al riesgo:

- Reglas y comandos: pruebas de argumentos inválidos, referencias ambiguas, estados incompatibles y ausencia de mutaciones parciales.
- Persistencia: guardar, cargar, detectar formatos inválidos y verificar migraciones cuando existan.
- Simulación: semilla fija, pasos de tiempo controlados y resultados comparables; desacoplar velocidad de renderizado y lógica.
- Interfaz 3D: comprobar cámara, selección, colocación, terreno e interacción en la plataforma objetivo.
- Voz/LLM: medir el flujo completo y comprobar recuperación ante transcripciones incorrectas y servicios no disponibles.
- Presentación visual: inspeccionar la aplicación renderizada. Compilar o revisar el DOM no demuestra calidad visual.

No crear pruebas que solo repitan la implementación. No declarar una verificación exitosa si no se ejecutó; registrar lo pendiente y la razón.

## Cierre obligatorio de cada tarea

1. Verificar sus criterios de aceptación y revisar el diff.
2. Actualizar especificación si cambió un requisito, contrato, supuesto o decisión.
3. Actualizar `ROADMAP.MD`: estado, fecha, evidencia, limitaciones y siguiente tarea disponible.
4. Crear un reporte si hubo una decisión arquitectónica, benchmark, integración importante, riesgo material o bloqueo que no se explique con una línea en la roadmap.
5. Si existe un repositorio Git funcional, crear commits independientes por cambio coherente cuando esté autorizado por el contexto. No mezclar cambios ajenos ni fingir un commit si no se pudo crear.
6. Comunicar qué quedó listo, cómo se verificó, qué queda pendiente y qué sigue.

Una tarea es `DONE` solo cuando su entregable existe, cumple sus criterios y tiene evidencia. Un borrador de requisitos no equivale a aprobación del alcance. Si el trabajo queda incompleto, mantener `IN_PROGRESS` o pasar a `BLOCKED` con una explicación concreta.

## Estados de la roadmap

| Estado | Significado |
|---|---|
| `TODO` | Pendiente; ejecutar únicamente si están satisfechas sus dependencias. |
| `IN_PROGRESS` | Trabajo activo; indicar responsable y avance. |
| `BLOCKED` | Falta una decisión, recurso o dependencia; indicar qué lo desbloquea. |
| `DONE` | Entregable verificado con evidencia. |
| `DEFERRED` | Fuera de la entrega actual; conservar contexto sin ejecutarlo. |

## Reportes

Ruta: `docs/reports/AAAA-MM-DD-ID-descripcion.md`. Crear el directorio cuando se necesite el primer reporte.

Contenido mínimo: tarea, objetivo, cambios, verificación ejecutada y resultados, decisiones con motivos, problemas pendientes y siguiente paso. Incluir entorno y mediciones si se evaluó rendimiento. No generar reportes vacíos ni duplicar toda la especificación.

## Decisiones y preguntas

Las decisiones tendrán identificador `D-XX`, estado `PROPUESTA`, `CONFIRMADA` o `DESCARTADA`, fecha y motivo. Las dudas tendrán identificador `Q-XX` y tareas afectadas. Al recibir una respuesta, registrar su efecto en ambos documentos y conservar contexto suficiente para entender el cambio.
