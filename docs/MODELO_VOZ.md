# Modelo de voz Cortana

Recurso de terceros: **Cortana Halo3/4 - (Erica Edwards) - Español Latino**, paquete descargado de Weights. Su metadata describe muestras extraídas de Halo 3 y Halo 4 y un modelo RVC v2 con F0 a 48 kHz. No es una voz oficial de este proyecto ni implica afiliación con sus titulares.

Origen del paquete: [Weights](https://models.weights.com/cm9hp3e5f06hdj815ynzyioul.zip). Se conservan sin modificar `model.pth`, `model.index` y `metadata.json`; la metadata original no identifica creador ni licencia. No se atribuye una licencia abierta a estos pesos ni se afirma autorización comercial. La publicación no concede derechos adicionales sobre la voz o las muestras de origen.

Los pesos se distribuyen como archivos de [la Release de voz](https://github.com/ZapataFrame/halo-cortana/releases/tag/cortana-voice-v1). El índice supera 100 MiB y por eso no se incorpora al historial Git. El instalador descarga los dos archivos a `.rvc-qa/voices/cortana/`, fuera de `public/` y del bundle móvil, y verifica tamaño y SHA-256 contra `tools/cortana-voice-model.json` antes de utilizarlos. La voz se carga con el modo restringido `weights_only=True` de PyTorch.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `model.pth` | 57577658 | `5bfbfab44bdb190a20fef16a2ef5eecb19a741f8cbf327b2754017b51bd681e5` |
| `model.index` | 160871619 | `242c7f4119d40986863dbdc2d370e34be1dd6d2b2309a6d934b18e8899d455de` |

Para instalar el recorrido completo en Linux x86_64: `npm ci`, `npm run setup:demo` y `npm run demo`. Requisitos y atribuciones de Piper/Whisper: [voz PC](VOZ_PC.md). La descarga de pesos no incluye credenciales ni saldo de un proveedor LLM.
