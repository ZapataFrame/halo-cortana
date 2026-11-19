# Voz de Cortana en PC

El PC mantiene TTS, STT y conversación. Los visores autorizados también reproducen la misma lectura, preparada una sola vez en el PC. No se pide micrófono al abrir la aplicación.

## Preparar una presentación con voz · C-12, 2026-11-18

1. Inicia `npm run demo` y abre `/control` mediante localhost. En **Voz y micrófono**, pulsa **Preparar motores** antes de la demostración: carga Whisper y la voz sin activar micrófono ni altavoces. El arranque en frío puede ser bastante más lento que las consultas siguientes.
2. Usa **Abrir visor con voz** o los enlaces de **Conectar otra pantalla**. Para enviarlo a otro dispositivo, copia la **dirección del enlace**, que incluye la autorización; copiar solo el texto visible de la URL no la incluye. El fragmento `#audio=...` autoriza escuchar esa sesión; no compartas el enlace con quien no deba oírla. Al reiniciar el servidor necesitas abrir un enlace nuevo. El `/hologram` sin ese fragmento conserva la representación pero no autoriza audio.
3. Pulsa **Activar sonido del visor** una vez en cada navegador. Este gesto desbloquea Web Audio. Los controles se ocultan después de activar; reaparecen al abrir calibración o cuando hay un fallo. No se sortea la política de autoplay.
4. En el PC pulsa **Probar voz**, **Escuchar respuesta** o activa **Leer respuestas automáticamente**. El backend genera un único WAV; cada visor conectado lo descarga y confirma preparación. El PC y los visores programan una fecha común, con estimación de desfase de relojes. El PC espera hasta cuatro segundos por los visores conectados y anuncia un error recuperable si alguno no está listo.
5. **Detener voz**, nueva conversación, nueva pregunta, cambio de proveedor, desconexión del control o expiración de la reserva cancelan la lectura. El servidor elimina el WAV de memoria y avisa a los visores. Una lectura que llegue con más de 200 ms de retraso no se reinicia desde cero; se espera la siguiente.

**Volumen del PC** solo ajusta su salida. Si PC y visor están en el mismo equipo y usan los mismos altavoces, pon ese volumen a cero para evitar duplicación/eco. En equipos distintos puedes mantener ambas salidas. La fecha común reduce el desfase digital; no garantiza sincronía acústica exacta entre redes, navegadores y dispositivos de salida distintos. El reflector y la prueba física siguen aplazados.

### Recuperación del modelo Cortana encontrado

La revisión actual confirmó que la Release `cortana-voice-v1` está en borrador y contiene `model.pth` y `metadata.json`, pero no `model.index`. Por eso la URL pública del instalador devuelve 404. La fuente original `models.weights.com` tampoco resolvió por DNS en esta revisión. No se publicó la Release ni se sustituyó la voz por otra.

El propietario puede recuperar sus propios pesos con GitHub CLI autenticado:

```bash
npm run setup:cortana -- --authenticated --without-index
npm run setup:rvc
```

El instalador comprueba tamaño y SHA-256, incluso al recuperar un asset privado. `--without-index` es una elección explícita: requiere `RVC_INDEX_RATE=0`; no hay cambio automático de motor o de voz. El índice facilita recuperación de características; el timbre sigue procediendo de los mismos pesos entrenados. Esta variante requiere evaluación auditiva y no se presenta como equivalente perceptual al paquete completo. Para usar el paquete con índice conserva la tasa 0.5 y proporciona el índice verificado.

El `.env` privado de este equipo quedó seleccionado explícitamente así, conservando las credenciales existentes:

```dotenv
TTS_PROVIDER=rvc
RVC_MODEL_PATH=.rvc-qa/voices/cortana/model.pth
RVC_INDEX_RATE=0
RVC_DEVICE=cpu
VOICE_CPU_THREADS=2
STT_DEVICE=cpu
STT_COMPUTE_TYPE=int8
STT_BEAM_SIZE=1
```

La configuración por sí sola no acredita que los motores respondan: usar la preparación y las pruebas de la sección de mediciones. No se cambia la selección LLM ante un error.

### CPU y equipo con RTX 3060

El propietario confirmó **Linux** para la laptop de la presentación con RTX 3060. Ese es el destino del perfil CUDA descrito aquí; el equipo actual conserva su perfil CPU. La disponibilidad de la GPU y sus latencias todavía no se han verificado en la laptop de destino.

Se conserva **faster-whisper**, que ya estaba instalado: motor gratuito con licencia MIT, cuantización int8 y VAD. Se añaden selección explícita de dispositivo/modelo/precisión, búsqueda de un candidato por defecto, dos hilos y contexto de vocabulario para Cortana/UNSC. La búsqueda más corta prioriza latencia; usar `STT_BEAM_SIZE=5` permite comparar calidad con el ajuste anterior. El silencio sigue rechazándose y la transcripción siempre se revisa antes de enviarla.

Piper usa una sesión ONNX con hilos acotados, y RVC/Whisper reutilizan los modelos durante tres minutos de inactividad. Los instaladores acotan la compilación y reutilizan la revisión de fairseq ya preparada. No iniciar instalaciones ni comparar modelos mientras se expone.

En la laptop Linux con RTX 3060, comprobar primero que `nvidia-smi` reconoce la GPU y preparar PyTorch CUDA de forma explícita:

```bash
npm run setup:rvc -- --device cuda
# Bibliotecas que necesita CTranslate2 en el entorno de reconocimiento:
uv pip install --python .stt-venv/bin/python nvidia-cublas-cu12 'nvidia-cudnn-cu12==9.*'
```

Después configurar en el `.env` privado de **esa laptop** y reiniciar:

```dotenv
STT_DEVICE=cuda
STT_COMPUTE_TYPE=float16
RVC_DEVICE=cuda:0
```

El cargador del sistema debe encontrar cuBLAS/cuDNN: seguir la [instalación oficial de faster-whisper](https://github.com/SYSTRAN/faster-whisper#gpu). Puedes seleccionar `STT_MODEL_PATH=.stt-models/small` si el modelo existe y medirlo antes de adoptarlo. No se descarga otro modelo durante la conversación. Si CUDA no está disponible, se informa el fallo; no se cambia a CPU silenciosamente. Windows queda fuera del destino confirmado; los tiempos concretos de la RTX 3060 no se han verificado aquí. Ejecutar `npm run qa:voice` en esa laptop antes de adoptar el perfil para la presentación.

Alternativas gratuitas consideradas:

| Motor | Motivo para considerarlo | Decisión de este incremento |
|---|---|---|
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Implementación Whisper con CTranslate2; CPU int8 y CUDA, ya integrada. | Optimizar y medir primero; conserva el contrato de dictado revisable. |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | MIT, C/C++, cuantización y soporte CPU/GPU/OpenVINO. | Candidato si el perfil CPU actual sigue siendo insuficiente; no se afirma una mejora sin medirlo en este equipo. No se añade un segundo servidor ahora. |
| [Vosk](https://alphacephei.com/vosk/) | Reconocimiento offline, modelos ligeros, streaming y vocabulario ajustable. | Alternativa para una interacción más acotada. No se ha medido su precisión para preguntas libres en español de esta presentación. |

Referencias de aceleración: [CTranslate2](https://opennmt.net/CTranslate2/hardware_support.html) y [PyTorch 2.5.1 / CUDA 12.4](https://pytorch.org/get-started/previous-versions/). Usar las instrucciones correspondientes a las versiones fijadas, no prometer tiempos a partir de benchmarks de otra GPU.

### Medición reproducible

```bash
npm run qa:voice
# Comparar también el small que ya esté instalado:
npm run qa:voice -- --compare-small
# Consultar el proveedor configurado, solo si tiene acceso/cuota:
npm run qa:voice -- --llm
```

Son frases públicas sintetizadas; no se abre el micrófono. Resultados y WAV de muestra: `.rvc-qa/output/voice-benchmark.json`, `voice-check.wav` y `stt-reference.wav`. El informe separa inicio en frío, consultas siguientes, voz, reconocimiento y preguntas LLM. Una respuesta generada no acredita precisión general; revisar contexto, veracidad y límites del asistente.

Resultados de esta revisión en i5-1334U, 12 hilos lógicos y 15 GiB de RAM, sin NVIDIA. La CPU llegó al 100 %, con cola superior a 40 procesos y swap activa. Las mediciones anteriores incluían además compilación concurrente. No son una comparación controlada ni permiten prometer un factor de aceleración.

| Comprobación real | Resultado y alcance |
|---|---|
| Whisper base, CPU int8 / beam 1 / dos hilos | 6.32 s en frío y 3.30 s después para el mismo WAV sintético de 2.72 s; reconoció la intención, con «ayúame» en lugar de «ayúdame». En otra tanda observacional: 4.73 s en frío, 2.53/2.55 s después, con el nombre Cortana y la frase completos. |
| Whisper small | Superó el límite de 60 s bajo carga. No se adopta ni se afirma una mejora de precisión. |
| Cortana RVC, CPU / dos hilos / sin índice | Preparación directa de 124.64 s y WAV real posterior válido: mono PCM16 a 22 050 Hz, 780 ms, señal no nula. Otra preparación por API agotó los 180 s bajo mayor carga; no se acredita latencia estable para exponer en estas condiciones. |
| Experimento RVC con cuatro hilos | 227.67 s en frío y 107.96 s después para «Hola Cortana.»; diagnóstico aislado, sin adoptar ese perfil. Más hilos no resultaron una solución acreditada. |
| Reproducción digital | La muestra real previamente sintetizada se reprodujo desde el control y desde `/hologram`, comprobados secuencialmente. El visor confirmó «Lectura terminada» y ocultó controles. Este recorrido usa un WAV ya generado para aislar reproducción; no acredita una nueva síntesis ni una respuesta LLM real. |
| LLM configurado: Ollama Cloud / gemma4:31b | Catálogo accesible, generación real rechazada con `PROVIDER_HTTP_402`. No se activaron pagos ni se cambió de proveedor. La prueba separada con phi4-mini local agotó 90 s bajo carga. No hay preguntas reales validadas en esta revisión. |

**123 pruebas y build correctos**, incluyendo autorización/origen, reserva exclusiva, preparación compartida, misma fecha y bytes, cancelación, desconexión, caducidad de visor y recuperación. Control y visor revisados renderizados en escritorio y 390×844; detector de interfaz sin incidencias. Se comprobó una superficie de navegador a la vez; las pruebas HTTP verifican la coordinación entre participantes. Esto no mide simultaneidad acústica entre dos dispositivos. El build conserva el aviso previo del chunk 3D grande.

Evidencia sin credenciales: [C-12-voz-20261118.json](evidence/C-12-voz-20261118.json). Muestra local ignorada por Git: `.rvc-qa/output/c12-cortana.wav`. La preparación admite hasta tres minutos y se puede detener; una consulta normal conserva su límite de 90 s para RVC. Ante saturación se conserva el texto y se informa el fallo. Para repetir mediciones, terminar instalaciones, reducir carga ajena y comparar el mismo audio/configuración. La RTX 3060, calidad perceptual y batería completa de preguntas siguen sin acreditarse; C-12 queda parcial por esos límites técnicos, sin convertir los ensayos físicos aplazados en un bloqueo.


## Instalación Linux

Requiere Node ≥22.12, `uv`, `ffmpeg` y un compilador C/C++. No requiere instalar `hf` ni paquetes Python globales. Estos comandos descargan motores/modelos públicos; después la inferencia es local en CPU.

```bash
npm run setup:voice
npm run setup:stt
npm run demo
```

Los instaladores preparan Python 3.13 y dependencias fijadas, verifican revisión/tamaño/SHA-256 y conservan recursos fuera de `public` y Git: `.voice-venv`, `.voice-models`, `.stt-venv`, `.stt-models`. No modifican `.env` ni el proveedor LLM. Windows no está verificado. Para la voz Cortana integrada y Whisper en una sola instalación Linux x86_64 usa `npm run setup:demo`: crea `.env` desde el ejemplo solo si falta y descarga los pesos desde la Release con procedencia en [Modelo de voz](MODELO_VOZ.md).

## Uso y recuperación

### Voz de Cortana con RVC

C-08, 2026-10-28: tras revisar la muestra C-07, el propietario solicita integrar la conversión. `TTS_PROVIDER=rvc` selecciona Piper → RVC v2 en el backend; `TTS_PROVIDER=piper` conserva la voz base. No se cambia de motor automáticamente ante un fallo. Reinicia el servidor tras editar `.env`.

```dotenv
TTS_PROVIDER=rvc
RVC_MODEL_PATH="/ruta/privada/model.pth"
RVC_INDEX_PATH="/ruta/privada/model.index"
```

La instalación aislada de [la prueba RVC](PRUEBA_RVC.md) se reutiliza: `.rvc-qa/venv`, `.rvc-qa/piper-venv` y `.rvc-qa/piper-model`. No se instalan paquetes globales. Conserva los archivos de voz en la ruta configurada o actualiza `.env` si los mueves. El control muestra **Cortana · español latino** y utiliza los mismos botones **Probar voz**, **Escuchar respuesta**, **Detener voz** y lectura automática. No requiere cambiar de proveedor LLM.

El worker recibe el WAV de Piper por memoria, lo convierte con RVC y devuelve PCM16 mono a 22 050 Hz, con límite de 20 s por segmento. La fachada divide lecturas extensas sin perder palabras y concatena PCM hasta un máximo de 120 s por lectura. No guarda audios ni descarga modelos durante la conversación. Los modelos se conservan hasta 180 s de inactividad. Cancelar durante cualquiera de las etapas mata el worker activo y descarta sus resultados; la siguiente lectura puede recrearlo. RVC permite hasta 90 s de preparación y el control espera hasta 93 s; Piper permite 45 s en backend para cubrir el arranque en frío. El estado `speaking` solo comienza con reproducción real.

Verificado: 100 pruebas y build correctos; API con motores reales devuelve WAV válido (3.02 s de audio en 11.21 s de preparación). Cancelación real HTTP 499 y recuperación con WAV válido (2.96 s en 13.40 s), sin modificar los cuatro campos públicos. Reproducción digital en navegador observada mediante `speaking` y fin de lectura; control revisado en [escritorio](evidence/C-08-voz-cortana-desktop.jpg) y [390×844](evidence/C-08-voz-cortana-vertical.jpg). Los audios de verificación están en `.rvc-qa/output/04-cortana-integrada.wav` y `05-cortana-recuperada.wav`. Se usó `voice-test`, sin generación LLM ni micrófono real; no cierra C-02 ni la aceptación humana/física. Las cifras CPU corresponden a estas muestras, no garantizan latencia para todas las respuestas.

### Controles

En **Voz y micrófono**, **Probar voz** reproduce una frase fija identificada como prueba. **Escuchar respuesta** lee una respuesta ya guardada, sin volver a consultar al LLM. La lectura automática empieza desactivada; si el navegador bloquea audio, usa reproducción manual. Volumen y **Detener voz** actúan sobre la reproducción actual.

Mantén pulsado el botón del micrófono o Espacio/Enter con ese botón enfocado. Solo comienza al aparecer **Escuchando**. Suelta para transcribir; se apagan las pistas antes de subir el audio al backend local. El resultado se añade al borrador, nunca se envía automáticamente. La captura admite 0.6–15 s; si se alcanza el límite con una tecla aún pulsada, el editor espera a soltarla antes de recibir foco.

Cancelar, salir, segundo plano, pérdida de foco/conexión o reinicio invalidan resultados pendientes. Una nueva conversación o cambio de proveedor detiene el audio anterior. Si falta instalación, permiso o dispositivo, conserva el texto y permite seguir escribiendo. No hay escucha continua.

## Contratos y recursos

- `POST /api/engines/warmup {}`: privado, prepara los motores sin reproducción, excluye otra reserva, cancela al salir y tiene límite total de 120 s.
- `GET /api/voice/link`: privado; concede el token efímero de la sesión. Nunca aparece en `/api/presentation` ni en la información pública LAN.
- `GET /api/voice/events`, `/api/voice/time`, `/api/voice/audio/:speechId` y `POST /api/voice/ready`: requieren `Authorization: Bearer ...`; validan origen, IDs y lectura vigente. Máximo ocho visores conectados. La conexión SSE transmite estados, no conversación.
- `POST /api/tts/schedule {speechId}`: privado; espera confirmación de preparación y devuelve una fecha compartida. Programar todavía no anuncia `speaking`. [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start) programa la salida; los navegadores requieren un [gesto para desbloquear audio](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

- `GET /api/tts` y `GET /api/stt`: disponibilidad privada, sin rutas ni secretos.
- `POST /api/tts {requestId,speechId}`: respuesta guardada o `voice-test`, sin texto arbitrario. WAV mono PCM16 a 22050 Hz, máximo 120 s/12 MiB (los workers reciben segmentos de hasta 20 s).
- `POST /api/tts/playback {speechId,playing}`: propietario de reproducción y renovación cada 5 s; reserva expira a 15 s sin renovación. La síntesis por sí sola no anuncia habla.
- `POST /api/stt/session {captureId,action}`: `reserve|start|stop|cancel`, ID privado, reserva de 35 s. Captura y TTS se excluyen entre controles.
- `POST /api/stt`: WAV/WebM/Ogg/MP4 con firma válida, ≤2 MiB y `X-Capture-Id`; PCM mono 16 kHz, decodificación acotada a 16 s y timeout total de 30 s. Silencio se rechaza.
- El STT permanece privado en loopback y no se comparte con visores. La transcripción solo llega al LLM tras envío explícito. El WAV TTS actual se comparte por memoria exclusivamente con los visores autorizados; se elimina al cancelar/terminar. Los workers reciben entorno reducido, sin claves LLM.
- Cada motor conserva un proceso/modelo hasta 180 s de inactividad. Cancelación activa mata ese proceso; el siguiente turno lo recrea. Cerrar servidor libera hijos. RVC compone dos workers con entornos reducidos, sin claves LLM en los procesos de voz.

400 entrada inválida; 403 origen; 409 reserva/concurrencia; 413 tamaño/duración; 422 sin voz; 499 cancelación; 503 instalación; 504 timeout; 502 motor. Mensajes sin stderr ni contenido privado.

## Procedencia y licencia

[Piper 1.4.1](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0; voz **Daniela high**, español de Argentina, `rhasspy/piper-voices` revisión `c10ece1aade47bb51c153c893d14e5bf8e5b7117`. [Ficha particular](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/es/es_AR/daniela/high/MODEL_CARD): larcanio, ajuste desde lessac-high, dataset [OpenSLR 61](https://www.openslr.org/61/) CC BY-SA 4.0. La licencia general del repositorio no reemplaza la ficha de voz. No es una voz oficial de Cortana.

[faster-whisper 1.2.1](https://github.com/SYSTRAN/faster-whisper), MIT; [Whisper base convertido por Systran](https://huggingface.co/Systran/faster-whisper-base), revisión `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`, CPU int8/español. Fichas, hashes y requisitos exactos en `tools/*-model.json` y `tools/*-requirements.txt`. Preservar atribuciones al redistribuir recursos.

## Aceptación pendiente

La prueba independiente de la voz RVC de Cortana se conserva para comparar parámetros: [procedimiento y resultados](PRUEBA_RVC.md). El paquete `.pth`/`.index` convierte audio; la integración C-08 lo encadena con Piper.

La conexión física y el ensayo humano siguen aplazados. Su aceptación futura exige diez frases reales, ≥8/10 con intención/datos conservados, revisión antes de enviar, permisos, interrupciones y recuperación. La interfaz de ensayo auxiliar se retiró para concentrar el producto en conversar; este criterio se conserva y no se declara cumplido por pruebas de código.

Antes de cerrar el flujo completo: cinco conversaciones, dos interrupciones con recuperación y latencias por etapa. Identificar pruebas sintéticas, motores/proveedor reales y reproducción digital. `node tools/verify-stt.mjs` usa frases públicas y escribe evidencia sintética en `.stt-models/qa`; no abre micrófono ni certifica precisión humana.
