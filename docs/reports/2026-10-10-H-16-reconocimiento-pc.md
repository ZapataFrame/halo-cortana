# H-16 — Captura y reconocimiento local PC

Fecha: 2026-10-10. Responsable: Codex. Rama: `codex/reconocimiento-voz-pc`, base `a1d0bb9`, PR #2 ya integrado en main. Estado: **IN_PROGRESS: implementación y revisión visual PC verificadas; aceptación humana pendiente**.

## Objetivo y cambios

Continuar H-15 con pulsación para captar voz, transcripción editable y envío explícito, sin reactivar el simulador. Linux PC mantiene autoridad y micrófono/audio; el móvil presenta figura/estado. Gemma Cloud y GPT conservan su contrato: STT no consulta al LLM ni modifica credenciales.

- `src/voice-input.js`: controlador de captura separado, reserva previa, permisos tardíos, cierre de pistas, límite 15 s, cancelación durante reserva/captura/STT, descarte de respuesta tardía y recuperación. Mouse/pointer y Espacio/Enter en botón enfocado. TTS propio se detiene antes del permiso/captura.
- `server/stt.js`/`whisper_worker.py`: adaptador Whisper base CPU int8/español; PyAV con decodificación incremental acotada a 16 s, energía/VAD, entrada/salida acotadas y proceso cancelable. Audio únicamente en memoria/stdin; sin shell, archivos privados, logs o claves de proveedor en worker.
- `server/app.js`: endpoints STT privados, ID/acciones/formato/firma/límites, exclusión TTS/captura/chat, reserva 35 s renovada al comenzar, timeout 30 s y limpieza ante cancel/reset/proveedor/chat/reinicio. Reservar durante diagnóstico también queda protegido contra reset/cancel concurrente.
- Control PC: mantener pulsado, contador, descartar, transcripción añadida al borrador, aviso para corregir/enviar. Mensaje manual siempre recuperable. Contrato público mantiene cuatro campos y agrega `listening`; reconocimiento usa `processing`, restaurando fase previa al acabar. No publica texto/audio en LAN.
- `npm run setup:stt`: Python 3.13 aislado, 23 paquetes fijados, cinco archivos/revisión/tamaño/SHA-256, pesos fuera de público/Git. No cambia `.env`, Piper ni modelo LLM.
- Guía, especificación, roadmap y tarjetas sincronizadas. Fecha inicial 2026-10-08 conservada como histórica, sin nueva fecha inferida.

## Verificación ejecutada

Entorno: Node 22.22.2, Python 3.13.14, Intel Core i5-1334U/12 CPU lógicas. Whisper CPU int8 con cuatro hilos, sin CUDA. faster-whisper 1.2.1/CTranslate2 4.8.2/PyAV 19.0.1; dependencias completas en `tools/stt-requirements.txt`.

| Verificación | Resultado y límite |
|---|---|
| `npm test` | 68/68 aprobadas. Permisos denegados/tardíos, pistas cerradas, pulsación corta, fin inesperado, timeout/límites, silencio, error, origen, dueño/etapa, concurrencia, cancelación, reset y nueva sesión. Fixtures de captura/LLM prueban contrato; no cuentan como voz humana/producto real. |
| `npm run build` | Correcto, JS 665.96 kB/171.04 kB gzip. Conserva advertencia de bundle >500 kB; no medir rendimiento móvil a partir del build. |
| `npm run setup:stt` | Correcto; revisión/hash/tamaño comprobados. Entorno separado del TTS y `.env` intacto. |
| `node tools/verify-stt.mjs` | Motor/backend HTTP reales, diez frases públicas sintetizadas por Piper. Diez respuestas 200; reconocimiento 2407–2917 ms, mediana 2606 ms. WAV/WebM/Ogg/MP4 reales aceptados y silencio 422. Cero llamadas LLM, estado final idle. |
| `node tools/verify-stt.mjs --compare-small` | Diez frases sintéticas con modelo small experimental: 6160–7470 ms, mediana 6593 ms; errores presentes. No cambia selección del producto. Misma lista de frases, síntesis nueva en cada ejecución; no comparación acústica controlada ni precisión humana certificada. |
| Worker real: cancelar a 100 ms | `STT_CANCELLED` en 106 ms; proceso termina sin texto entregado. WAV sintético de 17 s rechazado `STT_AUDIO_TOO_LONG` durante decodificación. |
| Navegador control Cortana | DOM real inspeccionado: Cloud/Gemma seleccionado, voz/micrófono habilitados, texto editable, Enviar, avatar cargado y calibración 101 %. La pestaña desapareció y posteriores intentos no pudieron conectar la vista; no captura visual ni permiso/micrófono humanos ejecutados. DOM/build no prueban calidad visual. |

Primer `npm test` en sandbox falló en archivos que abren sockets; la ejecución con acceso a loopback pasó. No se atribuye ese fallo a reconocimiento ni se oculta. No se autorizó/grabó micrófono personal, ni se alteraron permisos del navegador por herramientas.

Evidencia:

- `docs/reports/evidence/H-16-stt-synthetic.json`: textos objetivo/resultantes, duración/latencia, formatos, silencio y fase final.
- `docs/reports/evidence/H-16-stt-small-synthetic.json`: comparación experimental.
- `docs/reports/evidence/H-16-worker-limits.json`: cancelación real y duración rechazada.

## Decisión y límites de precisión

D-34 elige captura web localhost y Whisper base local para evitar API pagada, escucha continua y reconocimiento remoto dependiente del navegador. Revisión base `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`, pesos 145,217,532 bytes, MIT según ficha. Fuentes: [faster-whisper](https://github.com/SYSTRAN/faster-whisper), [modelo base](https://huggingface.co/Systran/faster-whisper-base), [permiso/contexto seguro](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

El benchmark detectó errores relevantes: «holograma»→«olorama», «ingeniería»→«en que niría», «fondo negro»→«fondo nera». Small corrigió algunas palabras pero mantuvo errores y tardó más del doble. Se conserva base como punto de partida rápido con revisión obligatoria; **no se afirma alcanzar ≥8/10**. La cadena sintética Piper→Whisper tampoco permite atribuir todos los errores solo a Whisper ni extrapolarlos al acento/micrófono humano.

Para comparar small se descargó públicamente `Systran/faster-whisper-small`, revisión `536b0662742c02347bc0e980a01041f333bce120`, a `.stt-models/small`. Ese experimento no se distribuye ni instala en `setup:stt`. En otro PC el comparador requiere primero ese recurso. No se activaron pagos ni se descargó Gemma localmente.

## Seguimiento: revisión visual y teclado

Al retomar H-16 se comprobó que el servidor estaba detenido y se inició `npm start`. `GET /api/stt` y `/api/tts` devolvieron 200/ready; presentación 200/idle. El navegador integrado recuperó conexión y permitió inspeccionar la aplicación renderizada en PC: Cortana texturada, controles de voz/micrófono legibles, instrucciones completas, borrador y Enviar. Se recargó después de compilar los cambios. Capturas reales de viewport, sin montajes ni datos de voz personales:

- `evidence/H-16-control-ready.png`: control de dictado disponible.
- `evidence/H-16-draft.png`: «Preséntate como Cortana» añadido mediante sugerencia UI, pendiente de envío. Presentación mantuvo revisión 0/idle; no se consultó al LLM.
- `evidence/H-16-control-review.json`: verificaciones y límites de este seguimiento.

Se detectó por revisión del código un riesgo: al acabar por límite de 15 s con Enter todavía pulsado, enfocar inmediatamente el editor permitiría que la repetición de la tecla enviara el texto. No se presenta como un incidente observado con micrófono real. `src/voice-input-controls.js` conserva el gesto hasta soltar, recibe keyup en la ventana aunque el botón esté deshabilitado y aplaza el foco. Descartar/pérdida de foco liberan ese gesto; perder pointer durante STT no descarta una transcripción legítima. El editor también ignora Enter repetido y no intercepta la confirmación de composición de texto.

`npm test` final: **74/74**; seis pruebas nuevas de eventos/foco, además de las 68 anteriores. Incluyen límite con Enter mantenido, Espacio liberado fuera del botón, pointer correcto, pérdida de captura, descartar/blur y controles deshabilitados/destruidos. Son eventos controlados con EventTarget, no una certificación de permisos o teclado/micrófono nativos. `npm run build` final correcto: JS 666.51 kB/171.32 kB gzip; advertencia >500 kB conservada. `git diff --check` correcto. No se repitieron descarga, benchmark de modelos ni llamadas Cloud; no había cambios en el motor STT.

## Pendiente y siguiente paso

Q-12: registrar navegador/micrófono/ruido PC y acordar diez frases de `docs/VOZ_PC.md`. Se solicitó al propietario ese contexto y participación al retomar la tarea; aún sin resultados humanos. Comprobar permiso inicial/denegado/tardío, captura humana, ≥8/10 con sentido útil antes de corregir, edición/envío explícito, cancelación en captura/STT, TTS detenido antes de captar y recuperación. Añadir ensayo de Enter/Espacio mantenidos hasta el límite y liberados durante STT. Revisión visual PC completada; no equivale a prueba de micrófono ni móvil/caja. Sin audios privados en Git.

H-16 conserva IN_PROGRESS hasta esa evidencia. Después H-17: cinco conversaciones voz→texto revisado→LLM→TTS→avatar, dos interrupciones y fallo de proveedor con latencia por etapa. H-07/H-08/H-12/H-14 físicos y GPT real H-20 siguen pendientes; este avance no los cierra.
