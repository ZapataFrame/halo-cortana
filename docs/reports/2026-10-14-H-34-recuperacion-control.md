# H-34 — Recuperación de la preparación inicial del control

Fecha: 2026-10-14. Responsable: Codex. Corrección de H-30/H-32 dentro de la continuación del MVP. Estado: DONE en software PC; H-16/H-17 y pruebas del teléfono/caja mantienen su aceptación pendiente.

## Problema reproducido y objetivo

Una respuesta 503 inicial de `/api/info` dejaba chat, TTS y micrófono deshabilitados y no publicaba la dirección LAN. El polling de presentación podía seguir conectado, incluso con Cortana cargada. Restablecer `/api/info` a 200 no recuperaba esos controles: su preparación solo se intentaba una vez. Es un fallo distinto del trayecto físico entre teléfono y PC; no se atribuye a él la causa original del problema móvil.

## Cambios y decisión

- `src/main.js`: preparación inicial con un intento activo, límite de 5 s por consulta y reintento cuando presentación vuelve a responder. Una preparación terminada deja de consultar información/catálogo/voz. Las comprobaciones de catálogo, TTS y STT siguen independientes; no se modifica el borrador ni se envía chat.
- `src/presentation-sync.js`: aviso de disponibilidad en cada lectura válida, incluso con revisión idéntica. Se mantienen la única consulta/temporizador existentes y el descarte de estados antiguos, inválidos o posteriores a la parada. El estado visual no se reaplica por cada aviso.
- Al salir del control se aborta la preparación pendiente. Reanudar permite prepararlo de nuevo sin acumular enlaces LAN.
- D-37 registra el motivo y límites. README y diseño de Cortana actualizados. Sin nuevas dependencias, servicios, controles visibles ni permisos de red/micrófono.

## Verificación ejecutada

1. `npm test`: **88/88**. La nueva prueba comprueba disponibilidad con revisiones duplicadas sin repetir transiciones, ni aceptar payload inválido, error de red o respuesta tardía tras parar.
2. `npm run build` y `git diff --check`: correctos. Persiste advertencia previa de bundle >500 kB (678.06 kB, gzip 175.33 kB en el build final).
3. Navegador real con recursos de producto y API local aislada en loopback 3003: 503 inicial → API recuperada → chat, TTS, micrófono y dirección LAN disponibles **sin recargar**. Cortana `ready`; el texto manual permanece editable. Configuración QA explícita sin generación LLM; no se pidió permiso ni se capturó audio.
4. Información retenida: abortada a **5000 ms**; siguiente intento válido recuperó el control. Máximo observado de consultas de información simultáneas: **1**. Tras completar preparación, presentación pasó de 71 a 73 consultas mientras información permanecía en 3; cero chats y cero sesiones de captura.
5. Salir hacia el visor durante otra consulta retenida la abortó a **194 ms**; cero consultas de información activas después. El visor no prepara los controles privados.
6. Demo real en 3000 abierta con el bundle nuevo: controles de texto/catálogo/TTS/STT habilitados, dirección LAN presente, Cortana `ready`, cuatro materiales texturados y calibración 101 % conservada. No fue necesario reiniciar el backend ni vaciar su contexto.

Dos observaciones iniciales de estabilidad no completaron las dos consultas adicionales esperadas: se había navegado desde QA a la demo real en el navegador de una sola pestaña. Se descartaron y se repitió la observación manteniendo QA abierta, con resultado correcto. La primera captura tras recuperar mostraba un fotograma anterior; se volvió a capturar y se inspeccionó la imagen actualizada. No se usan esos intentos como fallos del producto ni como evidencia positiva.

Evidencia: [JSON de estados y contadores](evidence/H-34-recuperacion-control.json), [bloqueo anterior](evidence/H-34-arranque-antes.png) y [control recuperado](evidence/H-34-arranque-recuperado.png). El servidor QA usa una configuración sin generación y devuelve una dirección de ejemplo del puerto aislado; no es una URL de demo móvil. Se retira al terminar.

## Pendientes y siguiente paso

La corrección cubre la preparación inicial tras fallos transitorios; no comprueba el firewall ni el acceso desde otro dispositivo. Un catálogo o motor que falla después de obtener información inicial informa en su control según H-32; no se añaden reintentos automáticos del proveedor ni de generación.

Prioridad siguiente: comprobar la dirección de Pantalla externa en el teléfono real (H-19/H-07) y ejecutar las diez frases humanas H-16. H-17 sigue esperando ≥8/10 útiles y las comprobaciones manuales; esta corrección no sustituye esa evidencia.
