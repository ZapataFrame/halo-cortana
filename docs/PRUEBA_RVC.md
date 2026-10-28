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

Preparación en curso. Sintaxis de ambos scripts comprobada; instalación e inferencia completas todavía sin verificar. El entorno global no tiene `torch`, `piper`, `fairseq`, `librosa` ni `numpy` al iniciar la prueba. `nvidia-smi` no se comunica con el controlador, por lo que el experimento selecciona CPU explícitamente. No se ha medido aún latencia RVC ni generado un audio convertido; el parecido queda pendiente de escucha del propietario.

Este experimento no modifica el contrato WAV del backend ni añade RVC a la aplicación. Incorporarlo a la conversación requiere un incremento posterior con adaptación del audio, timeout, cancelación y revisión de sus tiempos reales.
