# OpenAI API para el MVP holográfico

Verificado: 2026-10-08. **GPT disponible en el selector; prueba vigente Gemma Cloud**, con `gpt-4.1-mini` y Responses en `server/providers.js`. Configuración privada presente, pero GET autenticado a /v1/models/gpt-4.1-mini devolvió 401. Requiere clave válida. No se creó clave, activó facturación ni solicitó generación GPT. Pruebas del contrato con respuestas controladas no cuentan como integración real.

## Suscripción y coste

ChatGPT/Codex y el uso con clave API tienen facturación diferenciada. No asumir créditos API por tener suscripción. Consultar [planes](https://learn.chatgpt.com/docs/pricing) y [tarifas API](https://developers.openai.com/api/docs/pricing). La cuenta concreta, saldo y modelos accesibles deben comprobarse en su panel; aquí no se conocen.

El propietario pidió usar GPT para mejorar la conversación frente al modelo local en CPU. La ruta Ollama conserva una alternativa sin coste por llamada, pero solo se activa al elegirla explícitamente. No activar pagos automáticamente. La suscripción ayuda a desarrollar el proyecto y no sustituye la clave API de la aplicación.

## Obtener y utilizar la clave

1. Entrar a [OpenAI Platform](https://platform.openai.com/) con la cuenta propia y seleccionar/crear un proyecto para la demo.
2. Revisar facturación y disponibilidad de uso. Si falta saldo o acceso, elegir ruta local o decidir personalmente el gasto.
3. Crear una clave de proyecto en [API Keys](https://platform.openai.com/api-keys). No enviarla por chat ni copiarla a archivos públicos.
4. Guardarla como `OPENAI_API_KEY` en el entorno privado del servidor PC; configurar `OPENAI_MODEL` con un modelo accesible a esa clave.
5. Ya existe un `.env` privado preparado en este equipo: completar su línea `OPENAI_API_KEY=` sin compartirla por chat. En otro checkout, crear copia de `.env.example` únicamente si `.env` todavía no existe. Mantener `LLM_PROVIDER=openai` y `OPENAI_MODEL=gpt-4.1-mini`.
6. Detener servidor con `Ctrl+C`, ejecutar `npm start` y recargar `/control`. El adaptador REST no requiere SDK. Enviar 3 preguntas cortas y un seguimiento; registrar respuesta/latencia sin clave. La solicitud de usar GPT autoriza este flujo; si falta acceso/saldo, no activar pagos por cuenta del propietario. Referencia: [quickstart](https://developers.openai.com/api/docs/quickstart).

Se seleccionó [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) para conversación corta por su perfil de baja latencia sin fase de razonamiento. Soporta Responses y el límite de salida usado. La latencia del proyecto no está medida todavía; una clave configurada no demuestra acceso correcto.

Ejemplo alternativo con el SDK oficial, **no ejecutado ni instalado en esta aplicación**:

```javascript
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await client.responses.create({
  model: process.env.OPENAI_MODEL,
  input: 'Responde brevemente en español: preséntate como Cortana.',
  max_output_tokens: 256,
});
const text = response.output_text;
```

Si cambias `OPENAI_MODEL`, verificar que soporte los parámetros usados. El ejemplo no garantiza cuotas. No llamar desde el navegador con la clave secreta. La [referencia de autenticación](https://developers.openai.com/api/reference/overview) indica mantener claves en servidor.

## Comprobaciones propias del proyecto

- La aplicación sirve el visor incluso sin `OPENAI_API_KEY`; el control indica proveedor no configurado.
- H-09 requiere respuesta real. H-10 limita entrada, historial y salida; un timeout no provoca reintentos automáticos que puedan facturarse.
- No usar variables públicas como `VITE_OPENAI_API_KEY`: podrían incorporarse al bundle. Ejemplos contienen solo nombres y valores ficticios; archivo privado fuera de versionado.
- Gestionar gasto en el panel y revisar consumos; no interpretar una alerta como bloqueo garantizado. Verificar qué límites ofrece la cuenta antes de confiar en ellos.
- Si hay error de autenticación/cuota/modelo, informarlo en PC. El móvil conserva la figura sobre negro y no recibe la clave ni una página de error luminosa.
- Ruta local alternativa documentada mediante [API de chat Ollama](https://docs.ollama.com/api/chat); necesita servicio y modelo descargados, con rendimiento medido. Sin coste por llamada no significa ausencia de descarga o consumo de recursos.

La guía no usa credenciales de sesión de ChatGPT/Codex ni las convierte en una API. Integraciones de autenticación por suscripción que dependan de disponibilidad específica no son parte del corte de mañana.

## Estado real y recuperación

Sin clave: visor y baile funcionan, el control indica configuración pendiente y el chat devuelve 503 `NOT_CONFIGURED`. OpenAI 401 → clave rechazada; 403 → acceso al modelo; 429 → cuota/límite. No se devuelve el cuerpo privado del error. Timeout 504; cancelación descarta respuestas tardías. Sin fallback ni reintento automático.

Alternativa explícita `LLM_PROVIDER=ollama`, `OLLAMA_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=phi4-mini:latest`: produjo respuestas reales en este PC. Las mediciones históricas están en el [reporte inicial](reports/2026-10-07-H-01-12-visor-llm.md); ejecución CPU, salida 48 tokens. API GPT pendiente de clave válida y generación real en H-20. Comprobación de autenticación: reports/evidence/H-20-auth-check.json.

## Cambio desde el panel (2026-10-08)

Puedes alternar sin reiniciar entre **GPT / OpenAI** y **Local / Ollama (Qwen)** en `/control`, con **Cambiar modelo**. El selector local utiliza los modelos ya instalados, incluido `qwen2.5:32b` en este PC. Conserva la configuración y clave GPT del servidor; cambiar inicia un contexto nuevo y no modifica `.env`. Al reiniciar se recupera `LLM_PROVIDER`. No hay fallback automático. Detalles en [README](../README.md).
