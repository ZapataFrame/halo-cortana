# Voz de Cortana en PC

TTS y STT funcionan en el control mediante localhost. Otra pantalla solo representa a Cortana. No se pide micrófono al abrir la aplicación.

## Instalación Linux

Requiere Node ≥22.12, `uv` y `hf`. Estos comandos descargan motores/modelos públicos; después la inferencia es local en CPU.

```bash
npm run setup:voice
npm run setup:stt
npm run demo
```

Los instaladores preparan Python 3.13 y dependencias fijadas, verifican revisión/tamaño/SHA-256 y conservan recursos fuera de `public` y Git: `.voice-venv`, `.voice-models`, `.stt-venv`, `.stt-models`. No modifican `.env` ni el proveedor LLM. Windows no está verificado.

## Uso y recuperación

En **Voz y micrófono**, **Probar voz** reproduce una frase fija identificada como prueba. **Escuchar respuesta** lee una respuesta ya guardada, sin volver a consultar al LLM. La lectura automática empieza desactivada; si el navegador bloquea audio, usa reproducción manual. Volumen y **Detener voz** actúan sobre la reproducción actual.

Mantén pulsado el botón del micrófono o Espacio/Enter con ese botón enfocado. Solo comienza al aparecer **Escuchando**. Suelta para transcribir; se apagan las pistas antes de subir el audio al backend local. El resultado se añade al borrador, nunca se envía automáticamente. La captura admite 0.6–15 s; si se alcanza el límite con una tecla aún pulsada, el editor espera a soltarla antes de recibir foco.

Cancelar, salir, segundo plano, pérdida de foco/conexión o reinicio invalidan resultados pendientes. Una nueva conversación o cambio de proveedor detiene el audio anterior. Si falta instalación, permiso o dispositivo, conserva el texto y permite seguir escribiendo. No hay escucha continua.

## Contratos y recursos

- `GET /api/tts` y `GET /api/stt`: disponibilidad privada, sin rutas ni secretos.
- `POST /api/tts {requestId,speechId}`: respuesta guardada o `voice-test`, sin texto arbitrario. WAV mono PCM16 a 22050 Hz, máximo 20 s/12 MiB.
- `POST /api/tts/playback {speechId,playing}`: propietario de reproducción y renovación cada 5 s; reserva expira a 15 s sin renovación. La síntesis por sí sola no anuncia habla.
- `POST /api/stt/session {captureId,action}`: `reserve|start|stop|cancel`, ID privado, reserva de 35 s. Captura y TTS se excluyen entre controles.
- `POST /api/stt`: WAV/WebM/Ogg/MP4 con firma válida, ≤2 MiB y `X-Capture-Id`; PCM mono 16 kHz, decodificación acotada a 16 s y timeout total de 30 s. Silencio se rechaza.
- Audio/texto viajan por memoria y stdin/stdout sin shell; no se guardan grabaciones, no se exponen a LAN ni se envían al LLM. Los workers reciben entorno reducido.
- Cada motor conserva un proceso/modelo hasta 60 s de inactividad. Cancelación activa mata ese proceso; el siguiente turno lo recrea. Cerrar servidor libera hijos.

400 entrada inválida; 403 origen; 409 reserva/concurrencia; 413 tamaño/duración; 422 sin voz; 499 cancelación; 503 instalación; 504 timeout; 502 motor. Mensajes sin stderr ni contenido privado.

## Procedencia y licencia

[Piper 1.4.1](https://github.com/OHF-Voice/piper1-gpl), GPL-3.0; voz **Daniela high**, español de Argentina, `rhasspy/piper-voices` revisión `c10ece1aade47bb51c153c893d14e5bf8e5b7117`. [Ficha particular](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/es/es_AR/daniela/high/MODEL_CARD): larcanio, ajuste desde lessac-high, dataset [OpenSLR 61](https://www.openslr.org/61/) CC BY-SA 4.0. La licencia general del repositorio no reemplaza la ficha de voz. No es una voz oficial de Cortana.

[faster-whisper 1.2.1](https://github.com/SYSTRAN/faster-whisper), MIT; [Whisper base convertido por Systran](https://huggingface.co/Systran/faster-whisper-base), revisión `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66`, CPU int8/español. Fichas, hashes y requisitos exactos en `tools/*-model.json` y `tools/*-requirements.txt`. Preservar atribuciones al redistribuir recursos.

## Aceptación pendiente

La prueba experimental de la voz RVC de Cortana se prepara aparte, con entornos virtuales propios y sin cambiar el motor de la aplicación: [procedimiento y estado](PRUEBA_RVC.md). El paquete `.pth`/`.index` convierte audio; no sustituye directamente un modelo Piper.

La conexión física y el ensayo humano siguen aplazados. Su aceptación futura exige diez frases reales, ≥8/10 con intención/datos conservados, revisión antes de enviar, permisos, interrupciones y recuperación. La interfaz de ensayo auxiliar se retiró para concentrar el producto en conversar; este criterio se conserva y no se declara cumplido por pruebas de código.

Antes de cerrar el flujo completo: cinco conversaciones, dos interrupciones con recuperación y latencias por etapa. Identificar pruebas sintéticas, motores/proveedor reales y reproducción digital. `node tools/verify-stt.mjs` usa frases públicas y escribe evidencia sintética en `.stt-models/qa`; no abre micrófono ni certifica precisión humana.
