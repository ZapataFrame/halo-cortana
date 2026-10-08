# Gemma 4 31B con Ollama Cloud

Configuración H-28, verificada documentalmente el 2026-10-08. Clave configurada por el propietario: respuestas y cancelación reales verificadas en esta cuenta.

La aplicación usa la API directa de Ollama Cloud. El nombre es **`gemma4:31b`** y está presente en el catálogo público consultado. No hay que descargar sus pesos en la laptop ni instalar otro servidor. La API exige una clave, guardada únicamente en el backend. [Documentación oficial Cloud](https://docs.ollama.com/cloud).

1. Inicia sesión en [Ollama](https://ollama.com/) y crea una clave en [API keys](https://ollama.com/settings/keys).
2. Edita el `.env` existente en la raíz; conserva las variables de GPT y Qwen. No pegues la clave en este chat ni en variables `VITE_`.

```dotenv
LLM_PROVIDER=ollama-cloud
OLLAMA_CLOUD_MODEL=gemma4:31b
OLLAMA_API_KEY=tu_clave_privada
```

3. Detén el servidor con Ctrl+C y ejecuta `npm start`. Si instalas esta rama por primera vez, ejecuta antes `npm run build`.
4. Abre `http://localhost:3000/control?avatar=cortana`. En Proveedor selecciona **Ollama Cloud / Gemma 4**, comprueba `gemma4:31b` y pulsa **Cambiar modelo**.
5. Envía una pregunta. «Configurado» solo significa que existe una clave; la primera respuesta verifica acceso al modelo y disponibilidad de cuota.

**Probar conexión** consulta el catálogo público sin enviar la clave ni generar texto. Modelo presente y clave configurada mantienen el indicador sin comprobación de acceso: este botón no puede validar una credencial Cloud ni su cuota. La generación real H-28 se verificó por separado. El diagnóstico conserva conversación, figura y calibración.

`ollama signin` autentica el uso cloud mediante la app/CLI local; **no llena `OLLAMA_API_KEY` para este backend directo**. Si ya iniciaste sesión en la CLI, crea igualmente la clave de API para este flujo. [Autenticación oficial](https://docs.ollama.com/api/authentication).

## Qué ejecuta la aplicación

- Backend → `https://ollama.com/api/chat`, destino fijo, autorización Bearer privada. No admite URLs o claves desde el control.
- Conversación en español, seis pares recientes, sin herramientas; respuesta no streaming, `think:false`, hasta 256 tokens, timeout 60 s y cancelación manual. Solo devuelve `message.content`, nunca el campo de pensamiento. [Contrato de chat](https://docs.ollama.com/api/chat).
- Modelo configurado por `OLLAMA_CLOUD_MODEL`, no lista de modelos instalados. El selector local continúa consultando únicamente Ollama en loopback.
- Un envío activo. Cambiar proveedor inicia conversación nueva, limpia cache y mantiene movimiento/calibración. No cambia automáticamente a GPT o Qwen ante error.
- Visor, texturas y ajustes siguen funcionando sin la clave y ante fallos del proveedor. Todavía no hay reconocimiento ni síntesis de voz.

Las opciones iniciales de Gemma son temperatura 1, top-p 0.95 y top-k 64, según la ficha oficial; se desactiva pensamiento para el chat breve del MVP. Hay que medir calidad/latencia reales, no asumirlas. [Ficha de Gemma 4](https://ollama.com/library/gemma4%3A31b-cloud).

## Plan gratuito y errores

Ollama ofrece un plan Free con créditos iniciales y acceso a modelos iniciales. Su página indica que otros modelos pueden requerir créditos adicionales. **No se ha verificado que Gemma 31B esté cubierto por la cuota gratuita de esta cuenta ni que sea ilimitado.** La aplicación no compra créditos ni activa una suscripción. [Planes y uso oficiales](https://ollama.com/pricing).

| Mensaje / código | Acción |
|---|---|
| `NOT_CONFIGURED` | Guardar `OLLAMA_API_KEY` y reiniciar; elegir Cloud no crea una clave. |
| `AUTH_ERROR` | Comprobar que la clave de Ollama esté vigente y sin espacios. |
| `ACCESS_ERROR` / `USAGE_LIMIT` | Consultar permisos y uso de la cuenta. Elegir otro proveedor manualmente si no hay acceso gratuito. |
| `MODEL_UNAVAILABLE` | Comprobar el nombre en [catálogo](https://ollama.com/api/tags); no usar el sufijo CLI `:cloud` en esta API. |
| `RATE_LIMIT` | Esperar y reintentar manualmente; no iniciar varias llamadas. |
| `TIMEOUT` | Cancelar/reintentar; el visor continúa. |

## Recorrido de validación y resultado real

Enviar tres mensajes y un seguimiento: presentación, explicación breve de Pepper’s Ghost, «Me llamo Ana», «¿Cómo me llamo?». Registrar respuesta, modelo y latencia de cada llamada; comprobar contexto. Cancelar una solicitud y enviar otra, revisar que la figura permanece visible. No copiar claves ni conversación personal a los reportes.

Las 29 pruebas automáticas validan contratos, estados y errores con fixtures; **no cuentan como respuestas de Gemma Cloud**. El catálogo público devolvió HTTP 200 y confirmó el nombre. Primero el backend devolvió 503/`NOT_CONFIGURED` sin clave. Después de configurarla, tres preguntas+seguimiento y recuperación devolvieron 200 (484–833 ms), y cancelar devolvió 499/idle sin contaminar contexto. Evidencia previa: `docs/reports/2026-10-08-H-28-ollama-cloud.md`; validación real: `docs/reports/2026-10-08-H-28-validacion-cloud-real.md`. Esto no comprueba plan/saldo ni gratuidad ilimitada.
