# Cortana

Prototipo conversacional con un avatar 3D sobre negro puro. El PC controla conversación, voz y micrófono; el visor puede abrirse en otra pantalla para una presentación Pepper’s Ghost.

## Iniciar

Requiere Node.js ≥22.12 y npm.

Para abrir el visor y el control:

```bash
npm ci
npm run demo
```

Para instalar también **voz de Cortana y micrófono** en Linux x86_64, instala `uv`, `ffmpeg` y un compilador C/C++ (`gcc`/`g++`), detén el servidor y ejecuta:

```bash
npm run setup:demo
npm run demo
```

El instalador descarga la [voz de Cortana desde Releases](https://github.com/ZapataFrame/halo-cortana/releases/tag/cortana-voice-v1), Piper, Whisper y los modelos auxiliares; verifica hashes y crea entornos virtuales locales. La primera instalación descarga cientos de MB y compila dependencias; si se interrumpe, repite `npm run setup:demo`. Windows/macOS y otras arquitecturas no están verificados. Consulta [modelo de voz](docs/MODELO_VOZ.md) para su procedencia y licencia declarada.

Se crea `.env` privado solo si no existe. Añade tu propia `GEMINI_API_KEY` o configura otro proveedor de la tabla siguiente y reinicia el servidor. Sin clave puedes probar el avatar, la calibración y, con los motores instalados, **Voz y micrófono → Probar voz**.

- [Control PC](http://localhost:3000/control): conversación, voz, saludo y calibración.
- [Visor](http://localhost:3000/hologram): Cortana, controles ocultos. Toca la esquina superior izquierda para calibrar.
- En otra pantalla, utiliza la URL con la IP del PC mostrada en **Conectar otra pantalla**, con ambos equipos en la misma red. Mantén el servidor abierto.

`npm run dev` inicia Vue y las APIs del mismo backend en [localhost:5173](http://localhost:5173). `npm run build` genera `dist/`; `npm start` sirve esa entrega en el puerto 3000. Las rutas antiguas con `?avatar=cortana` siguen abriendo Cortana; ya no hay selector de avatares.

## Configurar conversación

Crea `.env` a partir de `.env.example` si no existe. Si ya tienes uno, conserva sus valores. El visor funciona aunque el proveedor no responda.

| Proveedor | Variables del PC |
|---|---|
| Ollama local | `LLM_PROVIDER=ollama`, `OLLAMA_MODEL` con un nombre de `ollama list` |
| Ollama Cloud | `LLM_PROVIDER=ollama-cloud`, `OLLAMA_CLOUD_MODEL`, `OLLAMA_API_KEY` |
| OpenAI | `LLM_PROVIDER=openai`, `OPENAI_MODEL`, `OPENAI_API_KEY` |
| Google Gemini | `LLM_PROVIDER=gemini`, `GEMINI_MODEL`, `GEMINI_API_KEY` |

Reinicia el servidor tras cambiar `.env`. La interfaz permite seleccionar los modelos configurados o instalados y probar conexión sin generar texto. Cambiar modelo inicia una conversación nueva. No hay cambio automático de proveedor. Las claves nunca deben ir en variables `VITE_`; suscripciones y saldo API son independientes.

Para Gemini, añade tu clave de [Google AI Studio](https://aistudio.google.com/api-keys) a `GEMINI_API_KEY` en `.env`. El modelo predeterminado es `gemini-3.5-flash-lite`; `GEMINI_MODEL` acepta el identificador, sin URL ni prefijo `models/`. Elige **Google Gemini** en **Proveedor y modelo** o establece `LLM_PROVIDER=gemini` para arrancar con él. `.env` es privado y está excluido de Git; `.env.example` permanece sin credenciales. **Probar conexión** consulta los metadatos del modelo: no genera texto ni certifica cuota de generación.

## Usar Cortana

Escribe y pulsa **Enviar mensaje**; Enter envía y Shift+Enter agrega una línea. **Cancelar respuesta** detiene la espera y **Nueva conversación** vacía el contexto. La respuesta permanece disponible si falla el audio.

Despliega **Voz y micrófono** para preparar los motores, activar lectura automática, escuchar una respuesta o mantener pulsado para dictar. El resultado se añade al editor: debes revisarlo y enviarlo. Instalación y contratos: [voz PC](docs/VOZ_PC.md).

Para que suene también en otra pantalla, abre **Abrir visor con voz** o los enlaces de **Conectar otra pantalla** y pulsa **Activar sonido del visor** una vez. La lectura se prepara una sola vez y se programa en PC y visores enlazados. **Detener voz** cancela todas las salidas; si comparten altavoces, baja a cero el **Volumen del PC** para evitar eco.

La voz de Cortana usa Piper seguido de RVC local con `TTS_PROVIDER=rvc`. `npm run setup:demo` prepara la voz y el micrófono; `npm run setup:cortana` descarga solo los pesos de Cortana. Las rutas privadas `RVC_MODEL_PATH`/`RVC_INDEX_PATH` son opcionales para otra ubicación. Reutiliza entornos aislados; la primera preparación en CPU puede superar un minuto. `TTS_PROVIDER=piper` selecciona la voz base. Reinicia tras cambiar `.env`. La Release actual está en borrador y sin índice; el procedimiento de recuperación para su propietario y la selección explícita sin índice están en [voz PC](docs/VOZ_PC.md).

Cortana acompaña la escucha, la espera y la reproducción de voz con movimientos de atención, reflexión y explicación. El reposo incluye balanceo y cambios periódicos de apoyo. En **Movimiento** puedes elegir saludo, sí, no, pensar, manos en cadera, escucha, explicación o cambio de postura. **Automático** libera el gesto manual; los gestos también terminan por sí solos.

Los nueve clips funcionan sobre el rig existente; reposo y explicación adaptan curvas CC0 de Quaternius. No hay sincronización labial ni expresiones faciales nuevas. Detalles, procedencia y límites de revisión en [animaciones](docs/ANIMACIONES.md). Regenerar sin red: `npm run animations:bake`.

En **Calibrar imagen** ajusta orientación, tamaño, posición, giro, espejos y contornos. El patrón temporal sirve para comprobar lateralidad. Los ajustes se guardan por navegador; calibrar el PC no cambia otra pantalla. Durante un corte el visor cargado conserva a Cortana; reconectar no reenvía mensajes.

## Estructura y comprobaciones

```text
src/
  components/   Interfaz Vue
  composables/  Estado y flujos reactivos
  services/     Red y audio sin dependencia de Vue
  scene/        Avatar, movimiento y proyección Three.js
server/     APIs privadas, proveedores y trabajadores de voz
tools/      Instaladores/modelos de voz, horneado de movimiento y QA
public/     Solo modelo, curvas y atribución de Cortana
tests/      Contratos, cancelación, recuperación y geometría
docs/       Arquitectura, voz, animaciones y evidencia de verificación
```

```bash
npm test
npm run build
```

`npm run qa:visual -- loading` retiene el GLB hasta pulsar Enter en terminal; `-- error` provoca un fallo de carga. Sirve el visor compilado en loopback 3001 sin cargar `.env` ni consultar al LLM.

[Guion de visita web · 25 minutos](docs/PRESENTATION_SCRIPT.md) · [Roadmap y plan](ROADMAP.MD) · [Arquitectura](docs/ARQUITECTURA.md) · [Evaluación de la reorganización](docs/REORGANIZACION.md) · [Modelo y atribución](public/models/README.md).
