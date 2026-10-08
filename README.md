# Cortana · Holograma

Humanoide sobre **negro puro** para una caja Pepper’s Ghost, modos vertical/horizontal y **Gangnam Style** activable desde PC. Conversación por texto con selector **Gemma 4 en Ollama Cloud, GPT o Qwen local**. Los proveedores cloud requieren su propia clave API. El celular presenta el avatar; voz y simulador táctico quedan para después.

## Abrir la demo

Requiere **Node.js ≥22.12**. Primera instalación:

```bash
npm ci
npm run demo
```

- **PC:** [control, baile y conversación](http://localhost:3000/control).
- **Celular:** misma Wi-Fi; abre la dirección en **Pantalla externa**. Equipo actual: `http://192.168.1.66:3000/hologram`; la IP puede cambiar.
- Puerto 3000. Detener con `Ctrl+C`; después de compilar basta `npm start`.
- Visor y baile usan recursos locales. GPT y Ollama Cloud necesitan internet; una caída del proveedor conserva la figura.

Si el celular no conecta: comprueba IP, servidor, misma Wi-Fi y aislamiento de clientes. Si hay firewall, habilita TCP 3000 en esa red según tu sistema; no necesitas abrir puertos del router.

## Preparar la caja y orientación

1. Abre `/hologram` en el celular: una figura sobre negro.
2. Toca la **esquina superior izquierda** para calibrar. En **Orientación** elige **Automática**, **Vertical** o **Horizontal** según el montaje.
3. Gira también el dispositivo. El modo adapta la imagen si la postura del viewport no coincide; **Rotación de pantalla** añade 0/90/180/270°. No garantiza bloquear la orientación física del SO.
4. Ajusta tamaño, X/Y, vista del cuerpo y espejos. Puedes escribir porcentajes exactos junto a los deslizadores: tamaño 25–200 %, X/Y −45…45 %, y giro en pasos de 5°. Los valores válidos se aplican al escribir; Enter confirma y ajusta los límites. X/Y positivos mueven a la derecha/abajo.
5. El **Patrón de prueba** con F y punto comprueba lateralidad; puedes cerrar el panel y conservarlo visible. Comienza con reflector a unos 45° y calibra la caja real.
6. Desactiva patrón, pulsa **Pantalla completa** si está disponible y **×** para ocultar controles. Ajusta brillo y bloqueo automático desde el dispositivo.

Los ajustes se guardan en cada navegador/origen; los del PC no calibran remotamente el celular. **Restablecer** vuelve a automático y valores iniciales. HTTP LAN puede limitar fullscreen/wake lock; usa ajustes del dispositivo si hace falta. **Contornos** muestra malla triangular. Sin piso ni texto de chat en la proyección.

Si se corta la conexión con el PC, el avatar ya cargado conserva su figura, movimiento y ajustes. El control y la calibración avisan **PC sin conexión**; el visor con ajustes cerrados sigue mostrando solo la figura. Al restaurar el servidor se recupera su sesión automáticamente. Reiniciar el servidor vacía el contexto de conversación; la reconexión no reenvía mensajes.

## Baile

En el control pulsa **Bailar Gangnam Style**; los visores conectados cambian de movimiento. **Reposo** lo detiene. Al abrir un visor nuevo recupera la selección actual. Funciona sin API; no incluye música. Reiniciar chat conserva el baile; reiniciar servidor vuelve a reposo.

Es una recreación libre de un baile presente en Fortnite, descargada de **ProgramAsWeights/avatar**, con código MIT y humanoide **Quaternius CC0**. No es el archivo oficial del juego. [Fuentes, licencias y hashes](public/models/README.md).

## Probar tu GLB Cortana

En **Avatar**, pulsa **Cortana importada**. También puedes abrir [control Cortana](http://localhost:3000/control?avatar=cortana) o [visor Cortana](http://localhost:3000/hologram?avatar=cortana). La dirección para celular que aparece en ese control incluye la selección de Cortana.

La copia local utiliza las **texturas originales** de ojos, rostro, cuerpo y cabello sobre negro puro. El original de Descargas permanece intacto. Para regresar pulsa **Humanoide + Gangnam**. GPT y Qwen funcionan igual en ambas vistas. La selección del modelo viaja en la URL; cada pantalla debe abrir la variante deseada. La calibración existente se conserva y puede necesitar ajuste para esta silueta.

Esta primera prueba muestra una **pose estática**. El archivo incluye una animación llamada `Twerking`; no se activa automáticamente. [Guía para preparar varias animaciones](docs/GUIA_RIG_ANIMACIONES.md). Gangnam Style sigue disponible con el humanoide original, pues usa otro esqueleto. [Atribución y cambios](public/models/README.md): licencia CC BY-NC 4.0 declarada en los metadatos del archivo.

## Probar Gemma 4 31B en Ollama Cloud

En **Proveedor**, elige **Ollama Cloud / Gemma 4**, modelo `gemma4:31b`, y pulsa **Cambiar modelo**. No descarga el modelo en la laptop. Guarda una clave creada en [Ollama API keys](https://ollama.com/settings/keys) en el `.env` existente del PC:

```dotenv
LLM_PROVIDER=ollama-cloud
OLLAMA_CLOUD_MODEL=gemma4:31b
OLLAMA_API_KEY=tu_clave_privada
```

Reinicia `npm start` para cargar la clave. [Guía completa y prueba de aceptación](docs/API_OLLAMA_CLOUD.md). Gemma respondió realmente en este equipo: 0.48–0.83 s, contexto y cancelación comprobados. En otro PC debes configurar tu propia clave. El plan Free tiene créditos/modelos iniciales limitados; el acceso gratuito a Gemma 31B de tu cuenta está sin verificar. No se activan pagos. [Condiciones actuales de Ollama](https://ollama.com/pricing).

## Configurar GPT

GPT sigue disponible como **OpenAI / `gpt-4.1-mini`**, mediante Responses. La prueba actual arranca en Ollama Cloud si copias el `.env.example`. Crea una clave propia en [OpenAI Platform](https://platform.openai.com/api-keys) y guárdala solo en `.env` del PC. Si el archivo ya existe, edítalo; no lo reemplaces.

```dotenv
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=tu_clave_privada
```

Reinicia con `Ctrl+C` y `npm start`; recarga `/control`. La suscripción ChatGPT/Codex y la API tienen facturación separada. [Guía de configuración](docs/API_OPENAI.md). No pegues claves en el chat ni en variables `VITE_`.

Conversación desde `localhost` en PC: Enter envía, Shift+Enter agrega línea. **Cancelar** detiene la espera; **Nueva conversación** vacía contexto. Entrada de 2000 caracteres, seis pares recientes, 256 tokens de salida y timeout 60 s. Errores de clave/cuota se explican en el control; no hay cambio automático a Ollama ni reintentos automáticos.

## Usar tu Qwen local y alternar con GPT

1. Mantén [Ollama](https://ollama.com/) activo en este PC. `ollama list` debe mostrar tu modelo. Qwen se probó en H-23; el catálogo actual muestra **`phi4-mini:latest` y `llama3.1:latest`**.
2. En `/control`, sección **Conversación**, selecciona **Local / Ollama (Qwen)** y elige uno de los modelos disponibles. Para Qwen, debe aparecer instalado en la lista.
3. Pulsa **Cambiar modelo** y envía un mensaje. **Actualizar modelos** renueva la lista si instalaste otro modelo o encendiste Ollama después.
4. Para volver, selecciona **GPT / OpenAI** y pulsa **Cambiar modelo**. Conserva la clave y configuración OpenAI existentes; no necesitas reiniciar para alternar.

Cada cambio empieza una conversación nueva. La selección se comparte entre las pestañas de control y dura hasta reiniciar el servidor; entonces vuelve al proveedor de `.env` (GPT si no se indica otro). Cancela o termina la respuesta antes de cambiar. El proveedor activo aparece sobre el selector; las opciones editadas se aplican al pulsar el botón.

**Probar conexión** comprueba el proveedor aplicado sin generar texto. Informa falta de clave, servicio caído, modelo ausente y errores de acceso. Para Cloud confirma el catálogo; la clave/cuota se comprueban al enviar un mensaje. Para GPT confirma clave/modelo, con cuota de generación todavía pendiente. No borra el chat ni cambia el avatar. Aplica primero cualquier selección nueva con **Cambiar modelo**.

Para arrancar siempre en Qwen, edita solo estas líneas de tu `.env`, conservando las de OpenAI, y reinicia:

```dotenv
LLM_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:32b
```

Usa el nombre exacto que muestra `ollama list` si tu modelo es otro. No se descarga ningún modelo automáticamente. El backend se conecta a Ollama en loopback; el celular sigue mostrando el avatar. Si Ollama no responde, revisa su servicio y pulsa **Actualizar modelos**. Salida local de 48 tokens, timeout 60 s; un modelo grande puede superar ese tiempo. Sin coste por llamada; rendimiento sujeto al equipo. **Todavía no hay micrófono ni audio.**

## Verificación

44 pruebas aprobadas: controles numéricos, proyección, texturas, proveedores, cancelación, diagnóstico y recuperación de sesión sin consultas duplicadas. Build correcto; dos cortes/reinicios PC comprobados. Evidencia previa de respuestas Qwen, cancelación y recargas en los reportes. **Cloud real verificado; GPT requiere clave válida (401 inicial; ahora ausente), sin generación GPT comprobada. Celular físico, caja y ensayo integrado pendientes.** Las capturas digitales no prueban el efecto óptico ni rendimiento móvil.

```bash
npm test
npm run build
```

Ensayo digital de negro: con la demo compilada, ejecuta `npm run qa:visual -- loading` y abre `http://127.0.0.1:3001/hologram`. Enter en terminal libera el GLB real. `npm run qa:visual -- error` provoca fallo del recurso. Detén un ensayo antes de iniciar el otro. El visor conserva negro y el diagnóstico aparece al abrir calibración; no se carga la clave API en estos ensayos.

[Roadmap](ROADMAP.MD) · [Especificación](SPECIFICACTIONS.MD) · [Plan](docs/plans/2026-10-07-mvp-holograma.md) · [Reporte de calibración](docs/reports/2026-10-07-H-06-calibracion-precisa.md) · [GPT/orientación/baile](docs/reports/2026-10-07-H-20-22-gpt-orientacion-baile.md).

Avatar provisional de Quaternius; no es el modelo oficial de Cortana/Halo. El CesiumMan anterior permanece con su atribución y licencia como recurso histórico.
