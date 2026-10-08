# Voz de Cortana en PC

H-15 añade respuesta hablada. Micrófono/reconocimiento pertenecen a H-16. El celular muestra la figura y su estado; el audio sale del control PC, sin duplicarse en el visor.

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
