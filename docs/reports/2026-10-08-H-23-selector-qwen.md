# H-23 — Selector GPT y Qwen local

Fecha: 2026-10-08. Responsable: Codex. Estado: DONE.

## Objetivo y decisión

El propietario solicitó conservar ChatGPT/GPT y poder elegir su Qwen local; confirmó Ollama. D-25 registra selección explícita desde el control PC, sin reiniciar servidor ni modificar credenciales. La configuración de arranque existente continúa vigente. No se descargaron modelos ni se realizaron llamadas OpenAI.

## Cambios

- Catálogo privado `GET /api/providers`, consultado a Ollama mediante `/api/tags`; devuelve nombres instalados y modelo GPT configurado. Sin clave ni URL privada.
- `POST /api/provider` valida proveedor/modelo, catálogo instalado y ausencia de solicitud activa antes/después de consulta asíncrona. Rechaza campos adicionales y endpoints arbitrarios. Error no muta selección/historial.
- Selector GPT/OpenAI o Local/Ollama, selector de modelo, actualización de lista y botón de aplicación. Prioriza Qwen al elegir local si existe en el catálogo. No se usa fallback automático.
- Cambio vacía contexto/cache de IDs y conversación/reintento/borrador del panel; conserva animación/calibración. Selección compartida hasta reiniciar, con valores iniciales de entorno. Las otras pestañas pueden actualizar el estado del selector con Actualizar modelos.
- Adaptador OpenAI Responses conservado; configuración de ambos proveedores creada únicamente en backend. Ejemplo local actualizado al modelo instalado. README, especificación, Cortana y plan sincronizados.

## Verificación ejecutada

- `npm test`: 23/23 correctas. Incluye GPT→Qwen→GPT, aislamiento de contexto/cache y conservación del baile, catálogo ausente, caída local, origen inválido, entradas inválidas, concurrencia consulta/chat y modelo Qwen enviado en contrato Ollama. Conserva pruebas de autenticación privada, cancelación, timeout y Responses.
- `npm run build`: correcto. Advertencia existente de bundle mayor a 500 kB; no se añadieron dependencias.
- `git diff --check`: correcto.
- `ollama list` real: `qwen2.5:32b` (19 GB) y `llama3.1:latest` (4.9 GB). La primera consulta sin escalación encontró restricción de sockets del sandbox; una consulta autorizada pudo conectar. No era fallo del servicio Ollama.
- Instancia temporal real en `http://localhost:3001/control`, sin `.env` ni clave OpenAI en este entorno. Inspección visual en navegador PC a ancho disponible de 510 px: controles legibles, selector y respuesta dentro de tarjeta, sin desbordamiento visible. No representa medición móvil.
- Desde interfaz: GPT inicial → Local/Ollama, Qwen seleccionado automáticamente → Cambiar modelo. Estado confirmó `OLLAMA / qwen2.5:32b · Modelo local disponible.`
- Consulta real: «Preséntate brevemente como Cortana.» Respuesta: «Soy Cortana, asistente holográfica de Microsoft. Ayudo con información y tareas de manera intuitiva y eficiente.» Tiempo mostrado: **58.1 s**, sin indicador de truncamiento. Es salida del modelo; su mención de Microsoft no constituye afiliación del proyecto.
- Segunda consulta iniciada y cancelada desde UI: «Solicitud cancelada. Puedes enviar otra pregunta.» Controles se recuperan y estado vuelve a reposo.
- Vuelta a GPT desde selector comprobada: conversación visual vacía, `gpt-4.1-mini` activo y aviso de clave ausente. No se intentó una llamada real de pago. El borrador también se limpia al aplicar un cambio.
- Evidencia visual: [selector y respuesta Qwen](evidence/H-23-qwen-control.png). Captura digital no prueba caja física.

## Limitaciones y siguiente paso

Qwen 32B respondió cerca del timeout existente de 60 s; una respuesta futura puede agotar ese tiempo. No se cambian límites automáticamente ni se promete rendimiento. Solo se midió esta respuesta nueva; no se presenta como benchmark o prueba completa de seguimiento de H-11.

GPT real continúa pendiente de clave/acceso (H-20). Dispositivo/caja/óptica y ensayo integrado siguen pendientes (H-19, H-07/H-08 y dependientes). Siguiente: reiniciar la aplicación habitual con el build nuevo y elegir el proveedor deseado en `/control`; resolver H-20/H-19 para continuar las aceptaciones pendientes.

Fuentes verificadas para contratos: [Ollama modelos](https://docs.ollama.com/api/tags) y [Ollama chat](https://docs.ollama.com/api/chat). No se seleccionaron nuevas versiones/dependencias.
