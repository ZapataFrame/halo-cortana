# Prueba local de la voz de Cortana

C-07, 2026-10-28. Experimento independiente de la aplicación: Piper genera una frase fija y RVC v2 transforma su timbre usando la voz de Descargas. No necesita Gemini, clave API ni micrófono. La voz del backend continúa igual.

## Preparación aislada

Requiere Node, `uv`, compilador C/C++ y `ffmpeg`. Todos los entornos, paquetes, modelos auxiliares, cachés y resultados quedan dentro de `.rvc-qa/`, excluido de Git. No utilizar `sudo pip`, instalación global ni activar los entornos de voz/STT existentes.

```bash
node tools/setup-rvc-qa.mjs
```

Para que al terminar la descarga genere también la comparación:

```bash
node tools/setup-rvc-qa.mjs --model-dir "$HOME/Downloads/Cortana Halo_ - (Erica Edwards) - Español Latino - Weights Model"
```

El instalador crea `.rvc-qa/venv` con Python 3.10 para RVC y `.rvc-qa/piper-venv` con Python 3.13 para Piper. RVC usa dependencias antiguas; se mantiene separado de Piper y del sistema. Se fijan versiones principales y, al completar la instalación, se guarda el inventario en `.rvc-qa/requirements-installed.txt`.

Para RVC se fija `pyworld==0.3.4`, compatible con Cython 0.29.37. `fairseq` se instala desde el commit oficial `4a388e64cd646ed7d7ad8de8fae55df2b8eea91d` (v0.12.2): el paquete fuente de PyPI omite `clib/libbase/balanced_assignment.cpp`. Se evita así depender de una compilación incompleta.

Los modelos auxiliares HuBERT/RMVPE suman unos 371 MB, además de PyTorch y Piper. Las descargas de modelos comprueban SHA-256 y revisión; una descarga interrumpida se conserva en `.part` y se intenta reanudar. No se redistribuyen los pesos de Cortana. Referencias: [rvc-python](https://github.com/daswer123/rvc-python), [auxiliares RVC](https://huggingface.co/Daswer123/RVC_Base/tree/bbb6736b97a98df0a87fe3592c0a061c53f0a75f) y [voz base](VOZ_PC.md).

## Generar la comparación

Desde la raíz del proyecto, después de completar la preparación:

```bash
.rvc-qa/piper-venv/bin/python tools/compare-rvc.py base
.rvc-qa/venv/bin/python tools/compare-rvc.py convert \
  --model "$HOME/Downloads/Cortana Halo_ - (Erica Edwards) - Español Latino - Weights Model/model.pth" \
  --index "$HOME/Downloads/Cortana Halo_ - (Erica Edwards) - Español Latino - Weights Model/model.index"
```

Resultados en `.rvc-qa/output/`:

- `01-piper.wav`: voz base, frase sintética identificada como prueba.
- `02-cortana.wav`: primera conversión, incluye inicialización de modelos auxiliares/JIT.
- `03-cortana-caliente.wav`: segundo pase con modelos cargados; no es otra frase.
- `piper.json` y `rvc.json`: hashes, parámetros, duración y tiempos medidos. Factor de tiempo real = segundos de conversión / segundos de audio; menor que 1 significa conversión más rápida que la duración del audio.

Escuchar original y convertido al mismo volumen: comprobar parecido, claridad de consonantes, acento, pausas y ruido. Empezar con tono sin desplazar, índice 0.5 y RMVPE; cambiar un parámetro por vez si hace falta. Un resultado numérico o la mera existencia de WAV no acredita calidad perceptual.

## Estado y límites

Prueba técnica completada el 2026-10-28 en Linux x86_64, Intel Core i5-12450H, RVC con cuatro hilos de PyTorch y CPU explícita. Instalación aislada, importación de RVC/fairseq/PyWORLD y comprobaciones de dependencias correctas. Los modelos auxiliares y Piper pasan SHA-256; la voz de Cortana se abre con `weights_only=True`. Su índice se pudo leer: 768 dimensiones y 50 926 vectores.

| Medición | Resultado |
|---|---|
| Síntesis Piper, sin carga inicial | 0.97 s para 4.16 s de audio, mono PCM16 a 22 050 Hz |
| Primera conversión RVC | 8.37 s para 4.14 s de audio, mono PCM16 a 48 000 Hz |
| Segunda conversión, modelos cargados | 6.27 s; factor de tiempo real 1.51 |
| Señal convertida | Pico 0.990, RMS 0.128/0.133; sin silencio completo |

La conversión en esta configuración CPU tarda más que la duración del audio; estas cifras no incluyen LLM, transferencia ni reproducción y corresponden a una sola frase. No son un benchmark de GPU ni una garantía de latencia conversacional. El parecido, la naturalidad y la claridad siguen pendientes de escuchar los dos WAV; no se declara aceptación perceptual, humana ni física.

Audios e informes completos en `.rvc-qa/output/`; entorno instalado registrado en `.rvc-qa/requirements-installed.txt` y proceso en `.rvc-qa/setup.log`. Los pesos originales permanecen en Descargas.

Este experimento no modifica el contrato WAV del backend ni añade RVC a la aplicación. Incorporarlo a la conversación requiere un incremento posterior con adaptación del audio, timeout, cancelación y revisión de sus tiempos reales.
