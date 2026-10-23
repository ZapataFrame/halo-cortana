# Cortana

Prototipo conversacional con un avatar 3D sobre negro puro. El PC controla conversación, voz y micrófono; el visor puede abrirse en otra pantalla para una presentación Pepper’s Ghost.

## Iniciar

Requiere Node.js ≥22.12 y npm.

```bash
npm ci
npm run demo
```

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

Reinicia el servidor tras cambiar `.env`. La interfaz permite seleccionar los modelos configurados o instalados y probar conexión sin generar texto. Cambiar modelo inicia una conversación nueva. No hay cambio automático de proveedor. Las claves nunca deben ir en variables `VITE_`; suscripciones y saldo API son independientes.

## Usar Cortana

Escribe y pulsa **Enviar mensaje**; Enter envía y Shift+Enter agrega una línea. **Cancelar respuesta** detiene la espera y **Nueva conversación** vacía el contexto. La respuesta permanece disponible si falla el audio.

Despliega **Voz y micrófono** para activar lectura automática, escuchar una respuesta o mantener pulsado para dictar. El resultado se añade al editor: debes revisarlo y enviarlo. Instalación y contratos: [voz PC](docs/VOZ_PC.md).

**Reposo** reproduce un bucle de 4 s; **Saludar** reproduce un gesto de 3.6 s y vuelve a reposo. Son movimientos propios en desarrollo sobre el rig existente. No hay labios sincronizados. Regenerar curvas: `npm run animations:bake`.

En **Calibrar imagen** ajusta orientación, tamaño, posición, giro, espejos y contornos. El patrón temporal sirve para comprobar lateralidad. Los ajustes se guardan por navegador; calibrar el PC no cambia otra pantalla. Durante un corte el visor cargado conserva a Cortana; reconectar no reenvía mensajes.

## Estructura y comprobaciones

```text
src/        Vue: componentes, composables, servicios y escena 3D
server/     APIs privadas, proveedores y trabajadores de voz
tools/      Preparación de Cortana, instalación de voz y QA visual
public/     Solo modelo, curvas y atribución de Cortana
tests/      Contratos, cancelación, recuperación y geometría
docs/       Arquitectura, voz y evaluación de la reorganización
```

```bash
npm test
npm run build
```

`npm run qa:visual -- loading` retiene el GLB hasta pulsar Enter en terminal; `-- error` provoca un fallo de carga. Sirve el visor compilado en loopback 3001 sin cargar `.env` ni consultar al LLM.

[Roadmap y plan](ROADMAP.MD) · [Arquitectura](docs/ARQUITECTURA.md) · [Evaluación de la reorganización](docs/REORGANIZACION.md) · [Modelo y atribución](public/models/README.md).
