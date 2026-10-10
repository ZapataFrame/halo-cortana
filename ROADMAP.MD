# Halo Strategy Lab — Roadmap activa

Actualizado: 2026-10-10. **Prioridad: holograma y voz PC; aceptación física pendiente.** La fecha inicial 2026-10-08 es histórica; no hay nueva fecha/hora acordada. El simulador está diferido por instrucción del propietario. El propietario autorizó continuar implementación.

## Cómo continuar

Leer `AGENTS.md`, `SPECIFICACTIONS.MD`, `Cortana.md` y `docs/plans/2026-10-07-mvp-holograma.md`. Usar esta tabla para estado y las tarjetas del plan para trabajo/aceptación. Los reportes registran evidencia, no duplican requisitos.

**Planificación completada:** H-00 `DONE`, responsable Codex, con verificación documental registrada.
**Nueva ampliación H-24:** Cortana aportada disponible como variante estática opcional, con evidencia en `docs/reports/2026-10-08-H-24-glb-cortana.md`.

**Ampliación H-23:** selector GPT/Ollama solicitado y confirmado con Qwen local; evidencia en `docs/reports/2026-10-08-H-23-selector-qwen.md`.

**Ampliación anterior:** H-20…H-22 por petición del propietario. GPT preparado; llamada real aún pendiente. Prueba vigente Cloud/Gemma por H-28. Orientación y baile con evidencia técnica, sin cerrar móvil/caja.

**Base integrada:** main remoto a1d0bb9 (PR #2) incluye TTS H-15, diagnóstico H-29 y recuperación H-30, además de calibración/texturas/Gemma del PR #1. Continuación desde esa base en codex/reconocimiento-voz-pc; H-16 añade captura y reconocimiento local. Pruebas físicas siguen en H-19/H-07/H-08.

## Etapas y métricas de salida

| Etapa | Resultado | Métrica/objetivo de salida |
|---|---|---|
| 0 Preparación | Entorno + asset + página LAN | Modelo de internet con ficha/licencia y URL accesible desde dispositivo. |
| 1 Visor | Humanoide sobre negro | Cuerpo completo; cinco muestras de fondo RGB 0/0/0 en carga/normal/error. |
| 2 Caja | Calibración y óptica | Ajustes persistentes, 5 min estable, meta 30 FPS, dos montajes físicos con evidencia. |
| 3 LLM por texto | Conversación real PC/móvil | Tres preguntas + seguimiento; figura no desaparece ante fallo de proveedor. |
| 4 Entrega | Ensayo y paquete | Dos recorridos, 10 min integrado y reinicio desde README. |
| 5 Voz PC adelantada | TTS → STT → flujo hablado | D-32 autoriza continuar antes de aceptación física. Audio real, corrección/cancelación y cinco conversaciones; móvil/caja siguen pendientes. |

A visual es el primer hito. Para cumplir la solicitud completa de mañana se requieren A+B (LLM real por texto). Si se entrega solo A, declararlo parcial. Las métricas móviles/físicas siguen pendientes. Mediciones PC/LLM y límites del navegador están en el reporte; no prueban A físico.

## Tareas activas

| ID | Estado | Depende de | Prioridad | Entregable verificable |
|---|---|---|---|---|
| H-00 | DONE | — | P0 | Plan específico, alcance sincronizado y guía API. Verificados 7 documentos, 60 IDs únicos, dependencias H sin ciclos y referencias concretas existentes. Codex. |
| H-01 | DONE | H-00 | P0 | Node 22.22.2/npm 10.9.7, CachyOS, 15 GiB RAM y LAN 192.168.1.66 comprobados. Three 0.186.1/Vite 8.3.3 instalados y build ejecutado. Dispositivo/hora/caja: H-19. Codex, 2026-10-07. |
| H-02 | DONE | H-01 | P0 | CesiumMan GLB local: 438044 bytes, 4672 triángulos, clip/skin y recursos incorporados. Licencia CC BY 4.0, condiciones de marca y SHA-256 verificados: `public/models/README.md`. Codex, 2026-10-07. |
| H-03 | DONE | H-01 | P0 | Servidor Node/Three/Vite compilado, mismo origen, URL LAN GET 200 y chat LAN 403 desde PC. Lockfile y `.env.example`; rutas privadas rechazadas. Acceso celular: H-19. Codex, 2026-10-07. |
| H-04 | DONE | H-02, H-03 | P0 | Humanoide cargado y completo en capturas PC 1280×720 y vertical efectiva 749×844. Pose normalizada/resize; no se presenta captura PC como celular. Ver reporte. Codex, 2026-10-07. |
| H-05 | DONE | H-04 | P0 | Codex, 2026-10-07. Carga retenida del GLB real, carga completada y fallo provocado: estado DOM verificado, panel oculto y 5 muestras RGB 0/0/0 en cada captura 792×954. Ensayo loopback reproducible y recuperación HTTP probada. Reporte H-05 y `evidence/H-05-black.json`. Física: H-08. |
| H-06 | DONE | H-05 | P0 | Codex, 2026-10-07. Valores numéricos de tamaño/X/Y/giro, límites y reset verificados; todos los ajustes recuperados en 3 recargas. Patrón SVG reparado, visible con panel oculto; escala 0.75 y traslación −45.6/+67.52 px medidas en 380×844. Capturas/DOM en reporte H-06. Arrastre táctil/óptica: H-07/H-08. |
| H-07 | BLOCKED | H-06, H-19 | P0 | Código de presentación/fullscreen/resize disponible. Falta dispositivo físico para acceso, orientación/retorno, 5 min y mediana FPS real; desbloquea H-19. |
| H-08 | TODO | H-07 | P0 | Prueba óptica: dos montajes y evidencia de figura real en caja. |
| H-09 | DONE | H-01 | P1 | Ollama/phi4-mini:latest real en CPU: primera llamada 23.75 s; backend 47.091/5.353/19.1/6.923 s. Contexto conservado; sin coste API/clave. Reporte. Codex, 2026-10-07. |
| H-10 | DONE | H-09, H-03 | P1 | Backend privado/validado, seis pares, IDs idempotentes, timeout 60 s y cancelación real 499→idle→nueva 200. Pruebas de fallos y protección; OpenAI implementado sin llamada/saldo verificados. Codex, 2026-10-07. |
| H-11 | BLOCKED | H-10 | P1 | Panel implementado y una pregunta real respondida; 3 preguntas+seguimiento completos en backend. Falta recorrido UI completo y cancelación UI: locator.fill rechazado por política de navegador (restricción chatgpt.com). Prueba manual pendiente. |
| H-12 | TODO | H-11, H-07 | P1 | Polling/estado mínimo y pulso implementados; recuperación PC preparada/verificada en H-30. Falta comprobar ≤2 s y reconexión PC/móvil físico sin duplicar chat. No cerrar por ensayo PC. |
| H-13 | TODO | H-08, H-12 | P1 | Dos ensayos A+B, recuperación y 10 min integrados. |
| H-14 | TODO | H-13 | P1 | README, `.env.example`, lockfile, modelo/licencias, `dist/` y reporte preparados; pendiente aceptación tras ensayo/reinicio/montaje real. |
| H-15 | DONE | H-10, H-26, H-28 | P1 | Codex, 2026-10-08: Piper/Daniela instalado con versiones/revisión/hash; 55 pruebas/build e instalador correctos. Tres WAV Gemma reales (3.9–5.7 s) y tres respuestas UI reproducidas automáticamente (inicio 5.2–6.7 s), lectura manual, fin, interrupción de preparación/habla y avatar speaking/4 texturas comprobados. Reporte H-15; reproducción digital PC, audición humana/calidad y física no certificadas. |
| H-16 | IN_PROGRESS | H-15 | P1 | Codex, 2026-10-10, rama codex/reconocimiento-voz-pc desde main a1d0bb9 (PR #2). Captura/Whisper/editado implementados. Revisión visual PC completada con capturas; foco del editor espera soltar Enter/Espacio tras límite de grabación, keyup funciona fuera del botón deshabilitado. 74 pruebas/build correctos; borrador UI sin envío ni cambio de presentación. Evidencia técnica sintética/formatos/límites conservada en reporte H-16. Pendientes permiso/micrófono humano/meta ≥8/10 (Q-12); H-17 espera aceptación H-16. |
| H-17 | TODO | H-16 | P1 | Cinco conversaciones de voz y dos interrupciones con recuperación, tras STT. |
| H-19 | BLOCKED | H-00 | P0 | Faltan celular/OS/navegador, caja y hora. Pregunta enviada; abrir URL en ese dispositivo. No bloquea base PC; sí móvil/caja. |
| H-20 | BLOCKED | H-03, H-10 | P0 | Codex, 2026-10-08: GET real /v1/models/gpt-4.1-mini devolvió 401/AUTH_ERROR en 279 ms. Tras último reinicio clave ausente, diagnóstico NOT_CONFIGURED. Sin generación solicitada; falta clave válida y 3 respuestas+seguimiento. Evidence H-20-auth-check.json y H-29-control.json; no activar pagos ni fallback. |
| H-21 | DONE | H-03, H-04 | P0 | Tres modos verificados a 390×844/844×390, giros 0/90 correctos, tres recargas y geometría/espejos probados. Capturas + `docs/reports/evidence/H-21-orientation.json`; calibración v1 compatible. Codex, 2026-10-07. Física sigue en H-07/H-08. |
| H-22 | DONE | H-03, H-04 | P0 | Gangnam Style MIT + humanoide Quaternius CC0 locales, 65 huesos, 14318 triángulos y ciclo de 7.273 s. Botones PC reposo/baile, selección recuperada al abrir visor, GLB/clip reales probados y negro 5 puntos por captura. Licencias/hash/script en ficha; reporte H-20…22. Codex, 2026-10-07. |
| H-23 | DONE | H-03, H-10 | P0 | Codex, 2026-10-08: selector GPT/Ollama con catálogo local validado, contexto/cache nuevos y configuración OpenAI conservada. 23 pruebas y build correctos; UI GPT→Qwen→GPT y cancelación verificados. Respuesta real de qwen2.5:32b en 58.1 s; captura/reporte H-23. Selección hasta reinicio; GPT real sigue pendiente H-20. |
| H-24 | DONE | H-03, H-04 | P0 | Codex, 2026-10-08: GLB Cortana aportado adaptado a PBR monocromático, 18,948 triángulos/79 joints; variante estática opcional control/visor, original y avatar/baile previos conservados. 24 pruebas/build y revisión frontal PC 1280×720; captura/reporte H-24. Animación/retargeting y móvil/caja no verificados. |
| H-25 | DONE | H-06, H-23, H-24 | P0 | Codex, 2026-10-08: integrar rama de calibración en main, preservar cambios del compañero y resolver cuatro conflictos. 25 pruebas y build aprobados; D-25 duplicado de calibración renumerado D-27. Reporte H-25. |
| H-26 | DONE | H-25 | P0 | Codex, 2026-10-08: ocho imágenes originales y cuatro materiales PBR texturados recuperados; BIN original intacto. Rig/clip y negro conservados. 25 pruebas, build, revisión PC 1280×720, cinco muestras RGB 0/0/0 y calibración/patrón comprobados. Reporte H-26. |
| H-27 | DONE | H-26 | P1 | Codex, 2026-10-08: docs/GUIA_RIG_ANIMACIONES.md; rig real, mapa de huesos, Mixamo/Rigify, contrato GLB multi-clip y pruebas. Fuentes oficiales consultadas, enlaces locales comprobados. Guía documental; no exportación/retargeting implementados. |
| H-28 | DONE | H-23, H-10 | P1 | Codex, 2026-10-08: clave cargada, Gemma 4 31B real por backend: 3 preguntas+seguimiento HTTP 200 (833/588/484/657 ms). Contexto Ana conservado; cancelación 499→idle y recuperación 200/540 ms sin incorporar Bruno. Cortana ready/cuatro materiales texturados. Evidence H-28-cloud-live.json y reporte de validación real. Plan/saldo gratuito no inspeccionados; móvil/caja pendientes. |
| H-29 | DONE | H-10, H-23, H-26 | P0 | Codex, 2026-10-08: Probar conexión y endpoint privado, GET sin generación, timeout 8 s, origen/cuerpo/concurrencia protegidos. 37 pruebas/build y UI Cloud→GPT sin clave→phi4-mini→Cloud comprobados; Cortana ready/cuatro materiales/tamaño 101 % conservados. Reporte H-29 y JSON/captura. Catálogo Cloud no valida clave/cuota; siguiente: prueba manual UI H-11 o datos físicos H-19. |
| H-30 | DONE | H-10, H-26, H-29 | P0 | Codex, 2026-10-08: sincronización validada, revisión antigua/duplicada descartada y nueva sesión reconocida; timeout/ciclo de vida sin consultas superpuestas. 44 pruebas/build; dos cortes y reinicios reales en visor/control secuenciales, figura ready/cuatro materiales/tamaño 101 % conservados. Negro 5 puntos en 3 capturas. Reporte H-30. H-12 móvil y H-11 manual siguen pendientes. |
| H-18 | DEFERRED | H-17 | P3 | Avatar final, labios, wake word, app instalada y otras mejoras con nuevo alcance. |

H-19/H-07/H-08 mantienen prioridad física cuando estén disponibles pantalla/caja. D-32 autoriza avanzar H-15→H-16→H-17 en PC mientras esas pruebas quedan pendientes; no cerrar A+B por completar voz. El simulador y H-18 siguen diferidos.

## Tiempos, contingencias y datos pendientes

Objetivo orientativo: 4–6 h visual, 2–3 h LLM, 1 h cierre. No incluye fabricación, descargas grandes o incompatibilidades. La hora de entrega define si cabe el recorrido; reservar al menos una hora de ensayo antes de presentar. Sin horarios inventados ni promesa de capacidad por la GPU.

Q-06/Q-08 pendientes: dispositivo/hora/caja. Q-07: GPT rechazó la clave con 401 y después del reinicio falta su clave; Q-10: clave Cloud cargada y acceso Gemma comprobado, detalle de plan/cuota no inspeccionado; Ollama conserva evidencia histórica y alternativa explícita. Q-09: entorno medido, confirmar si se usará otro PC. Nuevo avatar Quaternius compatible con el baile adquirido en H-22; no rig nuevo ni retargeting. Si falla fullscreen, usar alternativa del dispositivo. Si falla GPT, visor/baile permanecen útiles y B con GPT sigue pendiente.

## Evidencia del cambio

| Fecha | Tarea | Avance | Pendiente |
|---|---|---|---|
| 2026-10-10 | H-16, seguimiento | Revisión visual PC completada y guardada; Whisper/TTS disponibles. Corregido foco tras límite con tecla mantenida, keyup fuera del botón y repetición de Enter. 74/74 pruebas/build; borrador real UI sin envío ni cambio de revisión. Reporte H-16 y evidencia de control/borrador. | Q-12: permiso/micrófono/navegador y diez frases humanas acordadas ≥8/10. H-17 continúa después de esa aceptación. |
| 2026-10-10 | H-16, implementación | Dictado PC y Whisper local, corrección/envío explícito; instalador y hashes, exclusión TTS/captura, cancelación y límites. 68 pruebas/build; diez frases sintéticas, formatos/silencio, comparación small y worker real cancelado en 106 ms. Reporte H-16. | Ensayo humano Q-12; revisión visual inicialmente interrumpida, completada en seguimiento. |
| 2026-10-08 | H-15 | Voz PC adelantada por el propietario: Piper local/Daniela, instalación reproducible, lectura de respuestas guardadas, audio único, volumen, parada y fase speaking ligada a reproducción. 55 pruebas/build; tres WAV y tres respuestas reales reproducidas en UI, parada de preparación/habla y cancelación del proceso real en 106 ms. Reporte docs/reports/2026-10-08-H-15-voz-pc.md. | H-16 reconocimiento PC es siguiente tarea; cinco conversaciones completas siguen H-17. Audición/calidad de voz y pruebas físicas no certificadas. No cerrar H-11 completo por usar botones de sugerencias. |
| 2026-10-08 | Entrega Git | Propietario confirmó push/merge. Fetch verificó origin/main 09ad91b (Merge PR #1) incluyendo 1e67b15. Main local actualizado por fast-forward. Rama nueva codex/verificacion-demo-holograma publicada en origin: e6d2714 (Cloud real) y 7f0aebe (diagnóstico H-29). | Rechazos de publicación anteriores resueltos por el merge del propietario. La nueva rama está publicada; su integración en main y creación de PR siguen pendientes. |
| 2026-10-08 | H-26/H-27 | Texturas originales recuperadas, render negro y calibración comprobados; guía de rig/múltiples clips con datos del GLB y fuentes oficiales. Commits `9dc254b` y `26bc2c7`. Reporte H-26 y guía. | Pose estática; animaciones nuevas son propuesta. Móvil/reflector requieren H-19/H-07/H-08. |
| 2026-10-08 | H-28 real | Clave guardada por el propietario y servidor reiniciado. Cinco respuestas reales, seguimiento Ana y cancelación de Bruno descartada. 0.484–0.833 s por respuesta. Reporte de validación real y JSON. | Plan/saldo no inspeccionados; no afirmar uso gratuito ilimitado. Física y UI completa previa conservan su aceptación pendiente. |
| 2026-10-08 | H-29 | Diagnóstico sin generar texto, HTTP privado, errores y descarte de consultas concurrentes. 37 pruebas, build correcto; Cloud 164 ms/ACCESS_UNVERIFIED, origen 403/campos 400 y presentación idéntica. Panel real en tres proveedores, Cortana texturada y calibración intactas. Reporte docs/reports/2026-10-08-H-29-diagnostico-conexion.md. | H-11 requiere interacción manual de chat; H-19/H-07/H-08 requieren pantalla/caja reales. GPT sin clave después del reinicio; no reponer ni modificar .env ajeno. |
| 2026-10-08 | H-30 | Preparación independiente de H-12: contrato público validado, polling sin duplicados y diagnóstico de conectividad fuera de proyección. 44 pruebas/build y dos cortes/reinicios PC reales. Estado, negro y materiales conservados; revisión 6→0 de sesión nueva aceptada. Reporte docs/reports/2026-10-08-H-30-recuperacion-presentacion.md. | Dispositivo/caja pendientes; consulta enviada sobre adelantar voz en PC y datos del montaje. Sin respuesta, se mantiene orden H-14→H-15; no se declara H-12 físico ni generación nueva en este ensayo. |
| 2026-10-08 | H-28 | Cloud/Gemma directo preparado en rama `codex/cortana-gemma4-cloud`; 29 pruebas/build, catálogo público real y cambio de proveedor en UI. Error de clave ausente real; reporte y guía Cloud. | Q-10: clave y acceso/cuota; generación no verificada. Siguiente trabajo con recurso disponible: H-28 (clave), H-20 (GPT real) o H-19 (pantalla/caja). |
| 2026-10-08 | H-25 | Integración de `9c5614c` sobre `5524e19`, ambos descendientes de `6c93a8c`. Cuatro conflictos resueltos combinando funciones; 25 pruebas, build y ausencia de marcadores verificados. `docs/reports/2026-10-08-H-25-integracion-main.md`. | Texturas H-26, guía H-27 y proveedor cloud H-28 por implementar. |
| 2026-10-08 | H-24 | GLB aportado evaluado/adaptado y render frontal PC comprobado; opciones Cortana importada / Humanoide + Gangnam. 24 pruebas y build; reporte/captura H-24. | Pose estática; animación propia/retargeting pendientes de nuevo alcance. Siguiente H-19/H-20 según recursos; pruebas físicas siguen pendientes. |
| 2026-10-08 | H-23 | Selector GPT/Qwen implementado; Ollama real descubrió qwen2.5:32b y llama3.1:latest. Respuesta UI real 58.1 s, cancelación y vuelta a GPT comprobadas. 23 pruebas, build y captura. Reporte: `docs/reports/2026-10-08-H-23-selector-qwen.md`. | Sin clave GPT en este entorno; H-20 y tareas físicas conservan sus pendientes. Siguiente disponible: configurar clave H-20 o aportar dispositivo/caja H-19; H-08 depende de H-07. |
| 2026-10-07 | H-00 | Plan detallado, guía API y alcance vigente. Verificados 7 documentos, 60 IDs únicos, 19 tareas H sin ciclos, 18 tarjetas de producto, 9 pruebas QA, referencias concretas y un solo AGENTS. Evidencia: `docs/reports/2026-10-07-H-00-plan-holograma.md`. | Implementación H-01…H-14 pendiente; no hay modelo descargado, app ni prueba física/API. Dispositivo/hora/coste por confirmar. |
| 2026-10-07 | H-01…H-12 | Visor/ajustes/chat local implementados, build exitoso y 11 pruebas; negro digital normal/error, LAN 200/403, respuestas reales/contexto/cancelación. Evidencia: `docs/reports/2026-10-07-H-01-12-visor-llm.md`. | Carga/rangos/UI completa por probar; bloqueo de automatización registrado. Celular/caja/FPS/ensayos pendientes. A+B todavía sin aceptación física. |
| 2026-10-07 | H-20…H-22 | GPT principal preparado; orientación y baile verificados. 19 pruebas pasan, build correcto, 6 casos de orientación y 3 recargas, esqueleto/baile real y negro muestreado. Evidencia: `docs/reports/2026-10-07-H-20-22-gpt-orientacion-baile.md`. | H-20 BLOCKED por clave; aún sin respuesta ni latencia GPT. Teléfono/caja/ensayo y pendientes previos siguen abiertos. No se crearon commits: Git no funcional en el entorno. |
| 2026-10-07 | Git / H-05 | `.git` vacío inicializado por petición explícita. Base guardada en `main`: `b90baa9` documentación, `f789637` aplicación y `6c93a8c` evidencia. Trabajo nuevo en `feat/validacion-calibracion-holograma`. Negro carga/normal/error ahora comprobado; reporte `docs/reports/2026-10-07-H-05-negro-y-descargas.md`. | Continuar H-06. La evidencia física y GPT real siguen pendientes; el chat anteriormente rechazado no se reintentó. |
| 2026-10-07 | H-06 | Calibración precisa y patrón asimétrico reparado, verificaciones de UI/recargas/medidas y 20 pruebas aprobadas. H-05 guardado como `ac4636f`. Reporte: `docs/reports/2026-10-07-H-06-calibracion-precisa.md`. | H-07/H-08 requieren dispositivo/caja reales (H-19). H-20 requiere clave privada. Arrastre de rangos no cambió valores en automatización; controles numéricos sí comprobados. |

## Backlog anterior conservado

Archivo completo: `docs/archive/ROADMAP-2026-10-05.md`. Esta tabla conserva IDs/estado histórico y evita que agentes elijan tareas antiguas como siguiente trabajo. `DONE` conserva entregables documentales existentes; el resto pasa a `DEFERRED`. No reactivar automáticamente después del holograma.

| ID | Estado | Entregable histórico |
|---|---|---|
| T-00 | DONE | Auditar material y crear documentación inicial. Evidencia: archivos originales y documentos. |
| T-01 | DONE | Consolidar 30 respuestas y separar decisiones/propuestas/dudas. Evidencia: especificación, roadmap y reporte de requisitos; no equivale a aprobación de cortes propuestos. |
| T-32 | DONE | `Cortana.md` actualizado: voz primero, contextos, comandos reales, estados, presentación móvil y validación. Referencias sincronizadas; comprobados formato, JSON, 18 comandos coincidentes con la especificación y tareas existentes. Responsable: Codex. |
| T-02 | DEFERRED | Comparar stack gratuito Linux/Windows, voz/LLM y presentación móvil; consultar documentación oficial, definir adaptadores y registrar elección con límites. |
| T-04 | DEFERRED | Estructura modular, ejecución reproducible, configuración de ejemplo sin secretos y aplicación que arranca sin escenario. |
| T-03 | DEFERRED | Prototipo: micrófono→voz/LLM, contornos 3D y enlace básico al móvil; medir memoria, latencia y FPS en laptop. Confirmar presupuesto inicial y reportar viabilidad. |
| T-17 | DEFERRED | Adaptador LLM y conversación textual con perfiles; texto es vía de prueba interna. Manejar timeout y capacidades no compatibles. |
| T-20 | DEFERRED | STT español con botón/tecla, transcripción visible y cancelación. Recuperar micrófono después de fallo. |
| T-21 | DEFERRED | TTS e interrupción por botón; no reconocer voz de la propia asistente. Texto útil si falla audio. |
| T-22 | DEFERRED | Cortana provisional y estados reales de escucha/proceso/habla/error, contexto conversacional. |
| T-05 | DEFERRED | Dominio mínimo de escenario real, IDs, plantillas/atributos y revisión de estado; aún sin editor completo. |
| T-16 | DEFERRED | Contrato formal, catálogo habilitable, validación y resultados. Acciones desconocidas o inválidas no mutan datos. |
| T-07 | DEFERRED | Ejecutor real para agregar/mover/rotar/borrar sobre dominio mínimo; entrada manual de prueba y LLM comparten camino. |
| T-08 | DEFERRED | Deshacer/rehacer y registro; revertir eliminación conservando ID/atributos. |
| T-18 | DEFERRED | Referencias relativas, aclaraciones y separación conversación/edición. Verificar ambigüedad, revisión obsoleta y reintentos. |
| T-28 | DEFERRED | Diseño revisable de pantallas/paneles, estados y flujos monocromáticos. Documentar bandos por símbolos/líneas, contornos y selección; revisar antes de implementar editor completo. |
| T-06 | DEFERRED | Cámara, selección, cuadrícula, inspector y mapa predeterminado; conectar dominio y comandos al renderizado. |
| T-09 | DEFERRED | Elevar/bajar/aplanar y agua; superficie y transitabilidad consistentes; deshacer pinceladas completas. |
| T-10 | DEFERRED | Exportar/cargar composición versionada incluyendo terreno/atributos/rutas; validar ida y vuelta y archivo corrupto. |
| T-11 | DEFERRED | Catálogo inicial basado en datos y atributos por instancia; dos bandos sin restringir arquitectura a dos. Corte terrestre propuesto, naves pendientes de priorizar. |
| T-29 | DEFERRED | Rutas por puntos y controles de atributos, validadas contra agua/pendientes; persistencia y comandos de rutas/atributos probados. |
| T-12 | DEFERRED | Reloj fijo, estado inicial y control inicio/pausa/continuación/reinicio/velocidad; no guardar batallas activas. |
| T-13 | DEFERRED | Movimiento sobre rutas legales y navegación; detectar bloqueos sin atravesar agua ni montañas. |
| T-30 | DEFERRED | Línea de visión y tiro bloqueadas por terreno; distinguir alcance visual, conocimiento compartido y alcance de arma. |
| T-14 | DEFERRED | Combate simple por encuentros y política de coordinación aclarada en Q-02; daño, cadencia y eliminación sin proyectiles físicos. |
| T-15 | DEFERRED | Objetivo eliminación, estadísticas/eventos y semilla; comprobar resultados al variar FPS y velocidad en entorno objetivo. |
| T-19 | DEFERRED | Habilitar comandos reales de simulación y velocidad; impedir ejecución en estados incompatibles. |
| T-31 | DEFERRED | Contexto de análisis con datos reales y sugerencias distinguidas de hechos; no ejecutar táctica por iniciativa del LLM. |
| T-27 | DEFERRED | Cliente móvil con avatar sencillo, estados y reconexión; PC autoridad única, salida de audio única. Puede avanzar después de M0 sin esperar combate. |
| T-23 | DEFERRED | Flujo completo voz→acción→resultado→avatar; medir latencias/carga con todos los servicios y comprobar recuperación ante caída del proveedor/móvil. |
| T-24 | DEFERRED | Demo, revisión visual monocromática, bandos sin color y pruebas de carga. Verificar contornos sin revelar enemigos ocultos en vistas limitadas. |
| T-25 | DEFERRED | Distribución Linux principal y Windows, README operativo y configuración gratuita de referencia; declarar plataformas no ejecutadas. |
| T-26 | DEFERRED | Revisión final del propietario, evidencia de requisitos cumplidos, limitaciones y reporte. |
| E-01 | DEFERRED | Ilusión holográfica física/calibración óptica. Reproducción móvil ya está en T-27; no queda diferida. |
| E-02 | DEFERRED | Palabra clave/escucha continua y cancelación avanzada de eco. |
| E-03 | DEFERRED | Modelos finales, gestos y lip-sync fino manteniendo estética. |
| E-04 | DEFERRED | Captura la bandera, obstáculos, cobertura y órdenes tácticas ampliadas. |
| E-05 | DEFERRED | Multijugador, campaña, RAG dedicado y físicas avanzadas. |
| E-06 | DEFERRED | Barcos/submarinos y transporte: embarque, carga, desembarque y rutas acuáticas. |
| E-07 | DEFERRED | Más plantillas y personalización visual/equipamiento avanzada. Atributos por instancia sí incluidos. |
| E-08 | DEFERRED | Timeline navegable, replay y exploración visual del historial. Registro cronológico básico sí incluido. |
