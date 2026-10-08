# Cortana · Holograma

Humanoide sobre **negro puro** para una caja Pepper’s Ghost, modos vertical/horizontal y **Gangnam Style** activable desde PC. Conversación por texto con selector GPT o Qwen local en Ollama; GPT requiere su clave API. El celular presenta el avatar; voz y simulador táctico quedan para después.

## Abrir la demo

Requiere **Node.js ≥22.12**. Primera instalación:

```bash
npm ci
npm run demo
```

- **PC:** [control, baile y conversación](http://localhost:3000/control).
- **Celular:** misma Wi-Fi; abre la dirección en **Pantalla externa**. Equipo actual: `http://192.168.1.66:3000/hologram`; la IP puede cambiar.
- Puerto 3000. Detener con `Ctrl+C`; después de compilar basta `npm start`.
- Visor y baile usan recursos locales. GPT necesita internet; una caída del proveedor conserva la figura.

Si el celular no conecta: comprueba IP, servidor, misma Wi-Fi y aislamiento de clientes. Si hay firewall, habilita TCP 3000 en esa red según tu sistema; no necesitas abrir puertos del router.

## Preparar la caja y orientación

1. Abre `/hologram` en el celular: una figura sobre negro.
2. Toca la **esquina superior izquierda** para calibrar. En **Orientación** elige **Automática**, **Vertical** o **Horizontal** según el montaje.
3. Gira también el dispositivo. El modo adapta la imagen si la postura del viewport no coincide; **Rotación de pantalla** añade 0/90/180/270°. No garantiza bloquear la orientación física del SO.
4. Ajusta tamaño, X/Y, vista del cuerpo y espejos. El **Patrón de prueba** con F y punto comprueba lateralidad; comienza con reflector a unos 45° y calibra la caja real.
5. Desactiva patrón, pulsa **Pantalla completa** si está disponible y **×** para ocultar controles. Ajusta brillo y bloqueo automático desde el dispositivo.

Los ajustes se guardan en cada navegador/origen; los del PC no calibran remotamente el celular. **Restablecer** vuelve a automático y valores iniciales. HTTP LAN puede limitar fullscreen/wake lock; usa ajustes del dispositivo si hace falta. **Contornos** muestra malla triangular. Sin piso ni texto de chat en la proyección.

## Baile

En el control pulsa **Bailar Gangnam Style**; los visores conectados cambian de movimiento. **Reposo** lo detiene. Al abrir un visor nuevo recupera la selección actual. Funciona sin API; no incluye música. Reiniciar chat conserva el baile; reiniciar servidor vuelve a reposo.

Es una recreación libre de un baile presente en Fortnite, descargada de **ProgramAsWeights/avatar**, con código MIT y humanoide **Quaternius CC0**. No es el archivo oficial del juego. [Fuentes, licencias y hashes](public/models/README.md).

## Configurar GPT

El proveedor predeterminado es **OpenAI / `gpt-4.1-mini`**, mediante Responses. Crea una clave propia en [OpenAI Platform](https://platform.openai.com/api-keys) y guárdala solo en `.env` del PC. Si el archivo ya existe, edítalo; no lo reemplaces.

```dotenv
LLM_PROVIDER=openai
OPENAI_MODEL=gpt-4.1-mini
OPENAI_API_KEY=tu_clave_privada
```

Reinicia con `Ctrl+C` y `npm start`; recarga `/control`. La suscripción ChatGPT/Codex y la API tienen facturación separada. [Guía de configuración](docs/API_OPENAI.md). No pegues claves en el chat ni en variables `VITE_`.

Conversación desde `localhost` en PC: Enter envía, Shift+Enter agrega línea. **Cancelar** detiene la espera; **Nueva conversación** vacía contexto. Entrada de 2000 caracteres, seis pares recientes, 256 tokens de salida y timeout 60 s. Errores de clave/cuota se explican en el control; no hay cambio automático a Ollama ni reintentos automáticos.

## Usar tu Qwen local y alternar con GPT

1. Mantén [Ollama](https://ollama.com/) activo en este PC. `ollama list` debe mostrar tu modelo (en este equipo: **`qwen2.5:32b`**).
2. En `/control`, sección **Conversación**, selecciona **Local / Ollama (Qwen)** y elige `qwen2.5:32b` en **Modelo**.
3. Pulsa **Cambiar modelo** y envía un mensaje. **Actualizar modelos** renueva la lista si instalaste otro modelo o encendiste Ollama después.
4. Para volver, selecciona **GPT / OpenAI** y pulsa **Cambiar modelo**. Conserva la clave y configuración OpenAI existentes; no necesitas reiniciar para alternar.

Cada cambio empieza una conversación nueva. La selección se comparte entre las pestañas de control y dura hasta reiniciar el servidor; entonces vuelve al proveedor de `.env` (GPT si no se indica otro). Cancela o termina la respuesta antes de cambiar. El proveedor activo aparece sobre el selector; las opciones editadas se aplican al pulsar el botón.

Para arrancar siempre en Qwen, edita solo estas líneas de tu `.env`, conservando las de OpenAI, y reinicia:

```dotenv
LLM_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:32b
```

Usa el nombre exacto que muestra `ollama list` si tu modelo es otro. No se descarga ningún modelo automáticamente. El backend se conecta a Ollama en loopback; el celular sigue mostrando el avatar. Si Ollama no responde, revisa su servicio y pulsa **Actualizar modelos**. Salida local de 48 tokens, timeout 60 s; un modelo grande puede superar ese tiempo. Sin coste por llamada; rendimiento sujeto al equipo. **Todavía no hay micrófono ni audio.**

## Verificación

23 pruebas automatizadas y build correctos. Selector GPT→Qwen→GPT, respuesta real Qwen (58,1 s) y cancelación comprobados en navegador PC. Baile y orientación cuentan con evidencia previa. **GPT real pendiente de clave; celular físico, caja y ensayo integrado pendientes.** Las capturas digitales no prueban el efecto óptico ni rendimiento móvil.

```bash
npm test
npm run build
```

[Roadmap](ROADMAP.MD) · [Especificación](SPECIFICACTIONS.MD) · [Plan](docs/plans/2026-10-07-mvp-holograma.md) · [Reporte actual](docs/reports/2026-10-07-H-20-22-gpt-orientacion-baile.md).

Avatar provisional de Quaternius; no es el modelo oficial de Cortana/Halo. El CesiumMan anterior permanece con su atribución y licencia como recurso histórico.
