# Voz de Cortana en PC

H-15 añade respuesta hablada; H-16 implementa reconocimiento local con revisión antes de enviar. El celular muestra la figura y su estado; micrófono y audio corresponden al control PC, sin duplicarse en el visor. La aceptación con voz humana sigue pendiente.

## Instalación Linux

Requiere Node ≥22.12, [uv](https://docs.astral.sh/uv/getting-started/installation/) y [hf](https://huggingface.co/docs/huggingface_hub/en/guides/cli). Prepara Python 3.13 en `.voice-venv` (uv puede descargarlo si falta), seis versiones fijadas y la voz pública de 114,199,011 bytes. Necesita internet durante instalación; después la síntesis es local en CPU, sin GPU, clave ni coste por llamada.

```bash
npm run setup:voice
npm run build
npm start
```

Ejecuta desde la raíz. El script comprueba SHA-256 de modelo, configuración y ficha, fijados en `tools/voice-model.json`. Entorno/pesos ignorados por Git y fuera de `public`/`dist`; otro equipo debe instalarlos. No modifica `.env` ni el LLM. Windows requiere adaptar rutas Python y no está probado.

## Uso

1. Abre [control Cortana](http://localhost:3000/control?avatar=cortana) en PC. **Probar voz** lee una frase fija identificada como prueba, sin consultar al LLM.
2. Envía una pregunta. **Escuchar respuesta** lee la respuesta guardada en esa conversación, sin repetir llamadas a Gemma/GPT.
3. Activa **Leer respuestas automáticamente** para respuestas nuevas. Empieza desactivado en cada recarga. Si el navegador bloquea audio, pulsa el botón manual.
4. Ajusta **Volumen** o pulsa **Detener voz** durante preparación/reproducción. Conserva el texto. Una pregunta nueva, cambio de proveedor, nueva conversación o salida del control detienen voz anterior.

Una reserva compartida por PC evita audios superpuestos entre controles. Otro control recibe aviso para esperar. Al desaparecer la pestaña expira la reserva; perder conexión detiene audio. Reiniciar servidor no reanuda lecturas antiguas. El bloqueo de reproducción automática se maneja siguiendo el [contrato de play()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play).

**Hablando** y pulso del avatar corresponden a reproducción real; no a llegada de texto ni generación WAV. No implica labios ni movimientos nuevos. La lectura quita formato Markdown, código y URLs; el texto original permanece visible.

## Contrato y recuperación

- `GET /api/tts` privado: disponibilidad y nombre de voz; sin rutas locales.
- `POST /api/tts {requestId,speechId}` privado: una respuesta guardada o `requestId: "voice-test"` (frase fija). No acepta texto arbitrario, modelos, destinos ni campos extra. Devuelve WAV mono PCM16 a 22,050 Hz; no guarda audio del chat en disco. Generación máxima 20 s, salida máxima 12 MiB.
- `POST /api/tts/playback {speechId,playing}` privado: propietario de salida, reproducción/fin y renovación cada 5 s. Reserva preparada expira a los 15 s sin renovación. Otro control no puede renovarla/detenerla. Preparación no anuncia `speaking`.
- Presentación pública conserva cuatro campos; fase añade `speaking`. No publica texto/audio/identificador privado de salida. Fase anterior vuelve al detener/terminar.
- Falta de instalación, timeout, fallo de motor o bloqueo de audio: aviso en control; texto/avatar/calibración continúan. Errores sin stderr ni rutas/textos privados. Síntesis sin shell, texto por stdin y cancelación que termina ese proceso.

## Voz y atribución

[Piper 1.4.1](https://github.com/OHF-Voice/piper1-gpl) es un motor neuronal local GPL-3.0; dependencia separada sin copiar su código al frontend. Integra su [API Python](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md).

**Daniela high**, español de Argentina, un hablante y 22,050 Hz, repositorio `rhasspy/piper-voices`, revisión `c10ece1aade47bb51c153c893d14e5bf8e5b7117`. [Ficha original](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/es/es_AR/daniela/high/MODEL_CARD): entrenamiento por larcanio, ajuste desde lessac-high; dataset [OpenSLR 61](https://www.openslr.org/61/) CC BY-SA 4.0. Conservar atribuciones al redistribuir voz/muestras; etiqueta MIT general del repositorio no reemplaza ficha particular. No es voz oficial de Cortana ni clonación encargada.

## Aceptación

Tres respuestas reales convertidas a WAV, reproducción automática/manual, interrupción durante preparación/habla, audio único, retorno de estado, recuperación y negro del visor. Registrar latencias LLM, síntesis e inicio por separado. Fixtures prueban contratos, no sonido real. Audición por altavoces, preferencia de voz y montaje físico se documentan separados de los eventos de reproducción del navegador.

## Reconocimiento local en PC — H-16

```bash
npm run setup:stt
npm run build
npm start
```

Requiere los mismos `uv` y `hf`. Instala Python 3.13 y 23 paquetes fijados en `.stt-venv`, separado del entorno Piper; descarga Whisper base multilingüe (145,217,532 bytes de pesos y 2.7 MB de recursos). Verifica revisión/SHA-256/tamaño de `tools/stt-model.json`. Solo necesita internet para instalar; inferencia en CPU int8/español, sin claves ni coste por llamada. Recursos ignorados por Git y fuera del servidor estático. No cambia `.env` ni el LLM.

1. Abre [control Cortana](http://localhost:3000/control?avatar=cortana) en PC mediante **localhost**, con micrófono conectado. No se pide permiso al cargar.
2. **Mantén pulsado para hablar** y concede permiso al navegador. Si la primera pulsación termina al conceder permiso, vuelve a mantenerla pulsada. Solo comienza cuando aparece **Escuchando**.
3. Habla una frase y suelta el botón. Alternativa de teclado: enfoca el botón con Tab y mantén Espacio o Enter. Captura mínima 0.6 s, máxima 15 s; pedir permiso aún no cuenta como escucha.
4. El micrófono se apaga; aparece **Transcribiendo**. El resultado se añade al borrador existente en una línea nueva, hasta 2000 caracteres. Si excede ese límite, se conserva el borrador completo y se informa. **Corrige lo necesario y pulsa Enviar**; grabar/transcribir nunca consulta al LLM.
5. **Descartar grabación** cancela captura o transcripción. Salir, cambiar de pestaña, perder foco/conexión o reiniciar servidor apagan captura y descartan resultados antiguos; no borran el mensaje. Un reset/cambio de proveedor/chat iniciado desde otro control también invalida reconocimiento pendiente.

La voz propia de Cortana se detiene antes de reservar/captar. Otra salida TTS o captura en otro control impide iniciar; una grabación también impide otra salida TTS. Desactiva reproducción de otras aplicaciones al probar: la exclusión no garantiza cancelación acústica perfecta de sonidos externos. Chrome/Firefox se proponen según soporte MediaRecorder; permisos/micrófono/navegador reales y Windows aún no verificados. HTTP por IP LAN no habilita captura móvil en este corte. [Contexto seguro y permiso](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).

Si se deniega permiso, habilítalo manualmente en los permisos del sitio; no se vuelve a pedir en bucle. Si no hay micrófono, está ocupado, falta instalar STT, hay silencio o falla/transcurre timeout, conserva el borrador y ofrece escribir/regrabar. Un aviso de modelo preparado solo indica recursos presentes; una instalación dañada se informa al transcribir.

## Contrato STT y recursos

- `GET /api/stt`: diagnóstico privado en loopback/Host/Origin; sin rutas ni secretos.
- `POST /api/stt/session {captureId,action}`: campos cerrados, ID alfanumérico/guiones 8–80 caracteres; acciones `reserve`, `start`, `stop`, `cancel`. `reserve` no anuncia escucha; `start` sigue al evento real de MediaRecorder; `stop` apaga fase de escucha y conserva reserva para transcribir. Reserva expira tras 35 s, renovada al iniciar captura. Cancelación solo del propietario e idempotente.
- `POST /api/stt`: binario con `Content-Type` WAV/WebM/Ogg/MP4 y `X-Capture-Id` privado. Exige reserva detenida y valida formato/firma/≤2 MiB. PyAV decodifica incrementalmente PCM mono 16 kHz, máximo 16 s; energía/VAD filtran silencio. Salida `{text,durationMs,elapsedMs,sessionId,revision,phase,animation}` únicamente al control. Máximo 30 s incluyendo carga/inferencia. No acepta texto, URLs/modelos ni destinos elegidos por el navegador.
- 400 audio inválido, 403 origen, 409 propietario/etapa/concurrencia, 413 tamaño/duración, 422 sin voz, 499 cancelación, 503 instalación, 504 timeout, 502 motor. Mensajes públicos sin stderr, ruta ni audio privado.
- Audio pasa por memoria del navegador/backend/worker y stdin sin shell; no se escribe en disco, no se publica en LAN y no se envía al proveedor LLM. Cancelación mata el worker. `listening` corresponde a captura confirmada; `processing` a STT, restaurando fase previa al terminar/cancelar; no agrega historial/chat.

Motor [faster-whisper 1.2.1](https://github.com/SYSTRAN/faster-whisper), MIT. Modelo [Systran/faster-whisper-base](https://huggingface.co/Systran/faster-whisper-base/blob/ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66/README.md), revisión `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`, conversión de Whisper base OpenAI, MIT según ficha y [licencia original](https://github.com/openai/whisper/blob/main/LICENSE). Dependencias/licencias en el entorno instalado; preservar atribuciones si se redistribuyen. Pesos/CPU configurados en backend, sin acceso a `.env` desde worker.

## Ensayo de aceptación humana pendiente

Registrar PC/OS/navegador, micrófono, ruido, frase objetivo, texto antes de corregir, sentido correcto sí/no y latencia. Propuesta para acordar con el propietario; **no son frases humanas ya aceptadas/probadas**:

1. Hola Cortana, preséntate en una frase.
2. Explícame qué es un holograma.
3. ¿Cómo puedo ajustar el brillo de la pantalla?
4. Quiero conversar sobre este proyecto.
5. Mi nombre es Ana y estudio ingeniería.
6. ¿Puedes recordar mi nombre?
7. Necesito un modelo sobre un fondo negro.
8. Ayúdame a preparar una demostración.
9. El micrófono está conectado a la computadora.
10. Gracias Cortana, hasta luego.

Éxito H-16: ≥8/10 mantienen intención y datos importantes; corregir una palabra funciona antes de enviar; cero envíos automáticos; descartar en captura/transcripción no entrega texto tardío; TTS propia se detiene antes de captar. Probar permiso denegado/tardío, frase corta, silencio, pérdida de foco/conexión y recuperación sin perder borrador. No guardar grabaciones privadas en Git. Después H-17: cinco conversaciones completas y dos interrupciones, con latencia por etapa.

Benchmark técnico reproducible: `node tools/verify-stt.mjs` sintetiza diez frases públicas con Piper y usa HTTP/backend/worker reales, más WAV/WebM/Ogg/MP4 y silencio. No abre micrófono ni llama al LLM; audios temporales en `.stt-models/qa` ignorada y evidencia JSON explícitamente sintética. Base tardó 2.4–2.9 s en este PC; contiene errores y **no certifica ≥8/10 con voz humana**. Comparación experimental small (6.2–7.5 s y errores todavía presentes) en reporte H-16; no cambia el modelo instalado por defecto.
