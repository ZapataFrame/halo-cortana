# Halo Strategy Lab — Especificación activa

Actualizado: 2026-10-08. Estado: **MVP holográfico implementado y probado parcialmente en PC para 2026-10-08**. Hora de entrega pendiente. El juego de estrategia está diferido por instrucción del propietario.

Fuente de trabajo: esta especificación, `Cortana.md`, `ROADMAP.MD` y `docs/plans/2026-10-07-mvp-holograma.md`. La definición del simulador del 2026-10-05 se conserva en `docs/archive/SPECIFICACTIONS-2026-10-05.md`; no es alcance de mañana.

## 1. Alcance confirmado ahora

- HC-01: entregar mañana un MVP centrado en la representación holográfica.
- HC-02: adquirir de internet un cuerpo humanoide sencillo; no requiere ser el modelo final de Cortana.
- HC-03: visualizarlo en un celular u otro dispositivo con pantalla sobre fondo completamente negro.
- HC-04: calibrarlo para una caja de reflexión como las imágenes/referencia del propietario, con un reflector principal.
- HC-05: integrar un LLM real o API, empezando por texto después de lograr la visualización.
- HC-06: reconocimiento de voz y flujo hablado en etapas posteriores.
- HC-07: comenzar con un plan de implementación muy específico, dividido en etapas/tareas individuales y métricas.
- HC-08: dejar de lado por ahora editor, batalla y comandos de estrategia.
- HC-09: GPT disponible mediante API; petición posterior HC-15 prueba temporal con Ollama Cloud.
- HC-10: incluir modos de montaje automático, vertical y horizontal, sin perder calibración.
- HC-12: permitir cambiar desde el control PC entre GPT y Qwen local mediante Ollama, conservando OpenAI.
- HC-11: incorporar un baile presente en Fortnite mediante una recreación disponible con licencia libre.

- HC-13: recuperar texturas originales de Cortana desde Descargas.
- HC-14: documentar rig y preparación de varios movimientos.
- HC-15: probar Ollama Cloud con Gemma 4 31B; conservar GPT/Qwen y no activar pagos.

Se conservan Linux como PC principal, poca experiencia y preferencia por recursos sencillos. La petición vigente añade Cloud/Gemma; falta OLLAMA_API_KEY. GPT sigue disponible, con configuración presente al revisar el entorno, pero sin llamada real verificada. No activar pagos, contratar servicios ni reutilizar credenciales de sesión. La alternativa local conserva un recorrido sin coste por llamada. No asumir Android/iOS ni que exista ya reflector fabricado.

## 2. Cortes de entrega

| Corte | Incluye | Qué prueba que funciona |
|---|---|---|
| A: visual primero | Modelo local, visor móvil negro, encuadre, calibración y caja física. | Cuerpo visible mediante reflector real con evidencia de montaje. |
| B: texto + LLM | Control PC, proveedor real, respuesta textual, estado básico reflejado en presentación. | 3 respuestas nuevas y un seguimiento con proveedor/modelo registrados. |
| C: posterior | TTS, STT mediante botón, avatar asociado a audio. | Audio real, transcripción y conversación de voz verificadas. |

La solicitud completa para mañana es A+B. A constituye una entrega parcial útil si B está bloqueada; declararlo explícitamente. No considerar mocks, videos de respaldo o JSON generado como integración real. No introducir juego, RAG dedicado, escucha continua, clonación de voz, avatar final ni lip-sync fino en este corte.

## 3. Arquitectura seleccionada para mañana

Visor móvil web con Three.js y modelo glTF/GLB servido localmente; servidor Node en PC y control textual separado. La ruta web es para una sola figura y acceso rápido al dispositivo, no una decisión sobre el motor del futuro juego. Runtime verificado: Node 22.22.2/npm 10.9.7; dependencias fijadas: Three 0.186.1 y Vite 8.3.3; build ejecutado. JavaScript sin framework.

PC sirve aplicación/assets y API en un mismo origen. Ruta `/hologram` dibuja; `/control` opera desde PC. Implementado: chat restringido a loopback con comprobación de Host/Origin y estado de presentación de solo lectura en LAN. GET del visor por IP LAN comprobado desde PC (200); POST chat por IP LAN rechazado (403). Esto no verifica conectividad de un celular físico. Internet solo necesario para descargar recursos inicialmente y para proveedor en nube; visor con assets locales funciona sin acceso externo mientras el PC/red estén activos.

El móvil renderiza el modelo; no es un stream de escritorio ni una segunda simulación. Calibración por dispositivo en almacenamiento local. La prueba actual arranca en Ollama Cloud/Gemma 4 por D-29. OpenAI/gpt-4.1-mini/Responses y Ollama local continúan seleccionables. No hay fallback automático. El renderizador y el baile no esperan al LLM ni se detienen ante sus fallos.

## 4. Requisitos funcionales y aceptación

| ID | Requisito | Criterio de aceptación | Tareas |
|---|---|---|---|
| HRF-01 | Humanoide adquirido de internet | Archivo local, cuerpo completo, licencia/origen/hash y recursos dependientes disponibles. | H-02, H-04 |
| HRF-02 | Negro puro | Canvas/página RGB 0/0/0 en puntos de fondo durante carga, presentación y error; sin HUD. | H-05 |
| HRF-03 | Encuadre | Cabeza/pies completos y márgenes; resize sin deformación. | H-04, H-07 |
| HRF-04 | Calibración | Escala, X/Y, rotación, espejo horizontal/vertical, reset y patrón temporal. | H-06 |
| HRF-05 | Persistencia | Ajustes restaurados en 3 recargas; datos inválidos vuelven a valores seguros. | H-06 |
| HRF-06 | Móvil real | Ruta LAN usable, ajustes ocultos, 5 min estable y recuperación tras orientación/segundo plano. | H-03, H-07 |
| HRF-07 | Prueba física | Figura identificable en caja desde posición documentada, dos montajes y foto/video. | H-08 |
| HRF-08 | LLM configurado | Pregunta en español obtiene respuesta real con modelo/proveedor/timing registrado. | H-09 |
| HRF-09 | Backend privado | Clave solo en servidor, entrada acotada, timeout y errores controlados; no recibe endpoints arbitrarios del cliente. | H-10 |
| HRF-10 | Chat PC | 3 preguntas y seguimiento contextual, cancelación y reintento manual sin respuestas tardías. | H-11 |
| HRF-11 | Estado móvil | Recupera sesión/revisión sin duplicar solicitudes; conserva figura ante corte de red/proveedor. | H-12 |
| HRF-12 | Entrega repetible | Dos ensayos, instrucciones, recursos locales/licencia y reporte de limitaciones. | H-13, H-14 |
| HRF-13 | TTS posterior | Una salida de voz y avatar ligado a reproducción real, con interrupción. | H-15 |
| HRF-14 | STT posterior | Pulsar para hablar, transcripción editable; no enviar comandos del juego. | H-16, H-17 |
| HRF-15 | GPT principal | Backend Responses con clave privada, 3 respuestas reales y seguimiento; errores de clave/cuota no activan Ollama. | H-20 |
| HRF-16 | Modos de orientación | Automático/vertical/horizontal persistentes; adaptación al resize y giro adicional compatible con espejos, sin deformación. | H-21 |
| HRF-18 | Selector GPT/local | Listar modelos instalados de Ollama, seleccionar Qwen y volver a GPT sin reiniciar; validar catálogo, bloquear cambio durante respuesta y vaciar contexto/cache al cambiar. | H-23 |
| HRF-17 | Baile libre | Recursos locales con licencias/hash, esqueleto animado y botón PC para iniciar/detener en todos los visores. Funciona sin API. | H-22 |

## 5. Calidad y métricas propuestas

Las métricas móviles/físicas siguen siendo objetivos. Resultados PC en `docs/reports/2026-10-07-H-01-12-visor-llm.md`:

- Modelo inicial preferentemente ≤10 MB y ≤30 mil triángulos; adaptar según asset y dispositivo.
- Mediana ≥30 FPS medida durante 60 s; visor estable 5 min y demo con LLM estable 10 min.
- Fondo digital muestreado en 5 puntos fuera de la figura: RGB `(0,0,0)`. Brillo físico se evalúa en la caja, no se deduce de ese muestreo.
- Conversación: medir carga inicial y 3 latencias; timeout seleccionado de 60 s tras un 504 real con 30 s en CPU; sin promesa de respuesta rápida. Latencias directas/por backend se registran por separado.
- Estado móvil mediante consulta periódica: llegada ≤2 s en LAN. No requiere animación labial ni sincronización fonética todavía.
- Límites implementados: 2,000 caracteres de entrada, 6 pares recientes, 48 tokens de salida Ollama local y 256 OpenAI/Cloud. El límite local se reduce para la demo en CPU; se indica respuesta limitada si el proveedor lo declara.
- Sin dependencia CDN en presentación; una pérdida de internet no rompe el visor local. Caída del PC sí interrumpe recursos/red y se documenta recuperación.
- Pantalla completa/mantener pantalla despierta según capacidades del dispositivo, con alternativa manual. No exigir API de micrófono móvil para mañana.

## 6. Modelo y presentación

Modelo activo: **Superhero Male de Quaternius**, Universal Base Characters Standard, CC0; GLB autocontenido de 741320 bytes, 14318 triángulos y 65 huesos. Obtenido de [ProgramAsWeights/avatar](https://github.com/programasweights/avatar/tree/ddd5fc34a445bcded3cf9836607aaeebc19a5c78), que conserva la licencia original y documenta su procedencia. La nueva solicitud de baile justifica este rig compatible. El CesiumMan anterior se conserva con su licencia como recurso histórico; ya no es el avatar activo. Ficha, hashes y modificaciones en `public/models/README.md`.

Una sola figura, material blanco/gris luminoso sobre negro. Reposo neutro y recreación **Gangnam Style** de ProgramAsWeights, código MIT: 16 tiempos a 132 BPM, ciclo de 7.273 s. Curvas descargadas convertidas a keyframes locales de 30 FPS; no ejecutar IK en el móvil. No incluye archivos extraídos de Epic ni música. Nada de escenario, piso, grid, skybox, cuatro figuras para pirámide ni paneles permanentes en la zona reflejada.

Orientación guardada en calibración v1: `auto`, `portrait`, `landscape`; datos anteriores usan `auto`. Si la postura del viewport no coincide con el modo elegido, añadir 90° en sentido horario a la rotación de calibración, módulo 360. El patrón usa exactamente ese giro. El modo transforma la imagen; no promete bloquear la orientación física del SO. Espejos siguen en ejes de pantalla.

Calibración precisa: campos numéricos junto a los rangos. Tamaño 25–200 %, X/Y −45…45 % del viewport (derecha/abajo positivos), giro del cuerpo −180…180° en pasos de 5°. Porcentajes enteros; internamente tamaño y X/Y conservan el contrato fraccionario v1. Valores válidos se aplican al escribir sin truncar dígitos; Enter confirma y acota a límites. Entradas vacías o con paso inválido conservan el último ajuste válido. El patrón F/punto permanece visible al ocultar ajustes, se apaga con su checkbox o Restablecer y nunca se activa automáticamente al recargar.

`POST /api/animation {"animation":"idle"|"gangnam"}` es privado al PC y valida catálogo cerrado. `GET /api/presentation` añade `animation` a `sessionId`, `revision`, `phase`; no publica texto ni claves. Los visores consultan cada segundo, recuperan el movimiento actual al abrirse y lo conservan si falla la red. No se exige sincronización exacta de frames entre pantallas. Reiniciar servidor devuelve reposo; reiniciar chat no cambia baile/calibración.

La [referencia física](https://wisnuwisdantio.com/category/experiments/peppers-ghost-holographic-projection/) documenta un reflector y distintas posiciones de pantalla. Punto de partida 45°; la caja real determina espejo/rotación/distancias. No prometer altura proyectada sin medidas. Patrón asimétrico temporal prueba lateralidad y se retira en presentación.

### Alternativa Cortana aportada (H-24/H-26)

Petición 2026-10-08: evaluar y probar el GLB añadido en Descargas. Copia local opcional con texturas originales desde H-26, seleccionable con `?avatar=cortana`, disponible tanto en control como visor; valor desconocido conserva `dancer`. La selección viaja en la URL de cada pantalla, incluida la dirección LAN generada desde control. No añade endpoints ni sincronización global de avatar. Conversación/proveedor, calibración, orientación y estado mantienen sus contratos.

El modelo contiene 18,948 triángulos, skin de 79 joints y una animación Twerking. Se usa pose estática; animación nativa y retargeting de Gangnam no forman parte de esta prueba. Botones de movimiento se deshabilitan en el control Cortana; ese visor ignora Gangnam solicitado desde otros controles. Avatar/baile originales permanecen disponibles por la ruta sin parámetro. Centro, escala y giro inicial 180° se aplican al cargar; no cambian calibración guardada.

Adaptación reproducible en `tools/prepare-cortana.mjs`: conserva rig/geometría/animación, ocho imágenes incorporadas, alpha, mapas normales/emisivos y atribución. En este archivo los materiales antiguos tienen especular y brillo cero: se convierten a PBR baseColor/metallic=0/roughness=1 conservando los mapas difusos. El script rechaza materiales especulares que necesiten otra conversión. Sustituye la adaptación monocromática histórica H-24. El visor clona estos materiales; carga real sin mapas se considera error. CSP permite imágenes/blob de GLB, sin habilitar scripts externos. Ficha de hashes y licencia **declarada en el archivo** CC BY-NC 4.0 en `public/models/README.md`; origen web respondió 403. No se modifica el original de Descargas ni se selecciona este modelo como avatar final.

Verificación digital reproducible: `npm run qa:visual -- loading|error` sirve el visor y assets reales en loopback 3001. `loading` retiene el GLB hasta pulsar Enter; `error` provoca fallo de lectura. No carga `.env` ni llama a un LLM. El servidor lee los recursos antes de enviar HTTP 200 para responder con un error completo si falla la lectura. Negro de carga/normal/error comprobado en H-05; esto no valida pantalla ni reflector físicos.

## 7. LLM, credenciales y costes

La tarifa de uso con clave API es distinta de la suscripción ChatGPT/Codex. No considerar una suscripción como saldo API; verificar cuenta propia. Consultar [planes](https://learn.chatgpt.com/docs/pricing), [tarifas API](https://developers.openai.com/api/docs/pricing) y la guía `docs/API_OPENAI.md`.

Primera interacción por texto, contexto breve de Cortana, sin herramientas de mundo. Respuesta real visible en control PC. El estado cambia `idle → processing → responded`; cancelación vuelve a `idle`, fallo a `error`; no anunciar habla si no hay audio. OpenAI Responses y proveedor local tienen adaptadores distintos, no una promesa de compatibilidad universal de URL.

Mantener claves fuera del navegador, bundle, URL, assets y logs. No copiar credenciales de sesión de ChatGPT/Codex. No activar facturación por iniciativa del agente. Ollama respondió realmente con `phi4-mini:latest` (3.8B Q4_K_M), en CPU; sus mediciones previas se conservan como históricas. GPT permanece disponible; la configuración de ejemplo arranca temporalmente en Cloud por D-29. Se escogió [gpt-4.1-mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) para conversación breve por su perfil de baja latencia sin etapa de razonamiento; no se ha medido aún en este equipo. Al cierre H-28 el entorno indica configuración GPT presente; no se inspeccionó su valor ni se ha realizado una llamada real a OpenAI. Ausencia de configuración devuelve 503; 401/403/429 del proveedor tienen mensajes controlados. Sin reintento automático ni cambio silencioso al modelo local.

### Selección de proveedor desde PC (H-23)

`GET /api/providers` privado a loopback/Host/Origin local devuelve proveedor/modelo activos, modelos GPT/Cloud configurados, indicador booleano cloudConfigured y nombres instalados obtenidos de `GET /api/tags` de Ollama. Sin clave ni URL privada. `POST /api/provider {"provider":"openai"|"ollama"|"ollama-cloud","model":"nombre"}` permite únicamente GPT/Cloud configurados en servidor o un modelo instalado en Ollama local. Rechaza campos adicionales, endpoints arbitrarios y cambios durante generación (409). Una consulta fallida no muta selección/contexto. El servidor vuelve a validar que no comenzó un chat mientras consultaba el catálogo.

El cambio es compartido por los controles conectados, dura hasta reiniciar servidor y vacía historial e IDs completados; el panel borra la conversación/reintento al confirmar. Calibración y movimiento se conservan. El arranque sigue usando `LLM_PROVIDER`, `OPENAI_MODEL`, `OLLAMA_MODEL` y `OLLAMA_CLOUD_MODEL` de entorno; no se modifica `.env` ni se aplica fallback automático. Qwen usa el adaptador Ollama existente, con 48 tokens y timeout 60 s; no se promete latencia por tamaño/modelo.

El propietario confirmó Ollama el 2026-10-08. Catálogo real: `qwen2.5:32b` y `llama3.1:latest`. No descargar otro modelo por iniciativa propia. Referencias verificadas: [catálogo Ollama](https://docs.ollama.com/api/tags) y [chat Ollama](https://docs.ollama.com/api/chat).

### Prueba temporal Ollama Cloud / Gemma 4 (H-28)

Proveedor `ollama-cloud`, modelo configurado `gemma4:31b`; backend directo a `https://ollama.com/api/chat`, destino fijo y redirecciones rechazadas. `OLLAMA_API_KEY` solo en .env/backend; no se reutilizan claves OpenAI ni credenciales de sesión. No necesita descarga de pesos. `think:false`, stream:false, salida 256 tokens, historial/cancelación/timeout del contrato existente; solo contenido final, sin herramientas. Cambiar a Cloud sin clave prepara selección, pero el chat devuelve 503/NOT_CONFIGURED. 401/402/403/404/429 muestran mensajes de clave/acceso/créditos/modelo/cuota de Ollama, sin fallback.

Catálogo público real HTTP 200 confirmó el nombre. Las pruebas de contrato no prueban generación; falta autenticación y tres respuestas más seguimiento. [API oficial](https://docs.ollama.com/cloud), [plan Free y límites](https://ollama.com/pricing); no prometer Gemma gratuito/ilimitado sin comprobar cuenta. Guía `docs/API_OLLAMA_CLOUD.md`; guía de rig `docs/GUIA_RIG_ANIMACIONES.md` es entregable documental, no selección automática de nuevos clips.

## 8. Decisiones activas

IDs nuevos conservan separación respecto a D-01…D-12 del plan histórico.

| ID | Estado | Fecha | Decisión |
|---|---|---|---|
| D-13 | CONFIRMADA | 2026-10-07 | Holograma/modelo primero; simulador diferido. |
| D-14 | CONFIRMADA | 2026-10-07 | MVP solicitado para mañana, 2026-10-08; hora pendiente. |
| D-15 | CONFIRMADA | 2026-10-07 | Humanoide de internet, fondo negro y celular/pantalla para caja. |
| D-16 | CONFIRMADA | 2026-10-07 | LLM por texto después del visor, voz después. |
| D-17 | CONFIRMADA | 2026-10-07 | Selección técnica tras autorización de implementar: Three 0.186.1 + Vite 8.3.3 + Node 22.22.2; sin APK. Compatible con runtime y build verificado. No fija motor del juego. |
| D-18 | CONFIRMADA | 2026-10-07 | Control/chat loopback y estado público mínimo en LAN. Selección local original sustituida por D-22; controles privados siguen vigentes. |
| D-19 | CONFIRMADA | 2026-10-07 | Calibración versionada y contornos triangulares opcionales. CesiumMan inicial reemplazado como avatar activo por D-24. |
| D-20 | CONFIRMADA | 2026-10-07 | Timeout local 60 s y salida 48 tokens tras fallo real con 30 s en CPU. Historial seis pares, reintento manual e IDs idempotentes; ninguna respuesta cancelada se agrega al contexto. |
| D-21 | CONFIRMADA | 2026-10-07 | Separar H-19 (dispositivo/caja/hora) de preparación PC. H-04 mide render técnico en PC; H-07/H-08 conservan aceptación móvil/física. No dar esas pruebas por realizadas. |
| D-22 | CONFIRMADA | 2026-10-07 | Petición del propietario: GPT principal. Selección técnica gpt-4.1-mini/Responses, clave solo backend; Ollama opcional explícito. Sin activar pagos; llamada real pendiente de clave. |
| D-23 | CONFIRMADA | 2026-10-07 | Petición del propietario: modos automático/vertical/horizontal. Adaptación de imagen según viewport más rotación adicional, persistencia compatible v1; sin depender del bloqueo de orientación del navegador. |
| D-26 | CONFIRMADA | 2026-10-08 | Probar reversiblemente el GLB Cortana aportado en Descargas mediante variante opcional monocromática/estática. Mantener avatar/baile originales y atribución del archivo; no dar por resuelto retargeting ni elegir arte final. |
| D-25 | CONFIRMADA | 2026-10-08 | Petición del propietario: conservar GPT y añadir selección de Qwen local en Ollama desde PC. Catálogo local validado, cambio explícito sin reinicio, contexto nuevo y selección temporal; sin descargas ni pagos. |
| D-24 | CONFIRMADA | 2026-10-07 | Petición de baile libre: recreación Gangnam Style MIT + humanoide Quaternius CC0 compatible. Curvas horneadas a keyframes, control compartido desde PC y recursos locales sin música. No es un asset oficial de Fortnite. |
| D-27 | CONFIRMADA | 2026-10-07 | Elección de implementación en H-06: calibración numérica en porcentajes/grados junto a rangos, mismo contrato v1. Patrón visible sin panel para ajustar reflexión; corregir atributo hidden del SVG. Mediciones/UI verificadas; óptica real pendiente. ID antes D-25 en rama de calibración, renumerado al integrar para conservar D-25 del selector. |
| D-28 | CONFIRMADA | 2026-10-08 | Petición del propietario: mostrar las texturas originales de Cortana. Excepción de color para el avatar importado; conservar interfaz monocromática y negro puro. Reutilizar rig existente; no rerig ni activar clips automáticamente. |
| D-29 | CONFIRMADA | 2026-10-08 | Petición vigente: prueba temporal de Ollama Cloud con Gemma 4 31B. Adaptador directo y arranque cloud; conservar GPT y local en selector, sin fallback ni pagos. Acceso real/free de la cuenta pendiente de clave/cuota. |

D-08 (voz primero) queda reemplazada para el corte actual por D-13/D-16. Decisiones del juego siguen conservadas en archivo histórico; no ejecutar su roadmap mientras este objetivo esté activo.

## 9. Preguntas activas y aceptación

| ID | Dato faltante | Impacto |
|---|---|---|
| Q-06 | Modelo/SO/navegador de celular y hora límite mañana. | H-19, H-07 y ensayo/compatibilidad reales. |
| Q-07 | Clave API privada y acceso del proyecto al modelo GPT. | H-20; GPT disponible. Configuración presente en el entorno al cierre H-28; validez/acceso todavía sin llamada real. Pregunta enviada para guardarla en .env; no compartirla por chat. |
| Q-08 | Pantalla útil, reflector/material/medidas, posición pantalla y caja ya fabricada. | H-06/H-08. |
| Q-10 | OLLAMA_API_KEY y acceso/cuota a gemma4:31b de la cuenta. | H-28: adaptador listo, generación real pendiente; pregunta enviada para configurar .env privado. |
| Q-09 | Confirmar que se presentará con este PC; datos de otro equipo si cambia. | Equipo actual verificado: CachyOS, 15 GiB RAM, Node 22.22.2, Ollama en CPU. Compatibilidad de otro equipo sin comprobar. |

Q-06/Q-08 y configuración privada Q-07/Q-10 enviadas al propietario. La configuración GPT aparece presente al cierre; autenticación real de GPT y clave/acceso Cloud siguen pendientes. Los faltantes no impiden implementar funciones independientes; sí impiden declarar éxito físico o una respuesta real de GPT.

A+B completos cuando HRF-01…HRF-12 tienen evidencia. A sola se informa como entrega parcial. Pruebas documentales no son aceptación del holograma; revisión del propietario se registra después de una demostración real.
