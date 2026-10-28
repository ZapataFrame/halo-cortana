# Arquitectura de Cortana

Decisión vigente, 2026-10-23: concentrar el prototipo en Cortana y migrar la interfaz a Vue. Sustituye los planes del simulador y la selección de avatares. Las pruebas físicas y humanas siguen aplazadas por el propietario.

## Responsabilidades

| Parte | Responsabilidad |
|---|---|
| `App.vue` | Componer control o visor según la ruta; compartir una instancia de presentación. |
| `AvatarView.vue` / `CalibrationPanel.vue` | Ciclo de vida del canvas, ajustes por navegador y controles de representación. |
| `ConversationPanel.vue` | Borrador, historial visible, coordinación de proveedor/voz y envío explícito. |
| `ProviderSettings.vue` | Catálogo, selección validada y diagnóstico. Su consulta inicial no bloquea enlaces ni voz. |
| `VoiceControls.vue` | Captura manual, permisos, reproducción, volumen y limpieza al salir. |
| `usePresentation` | Estado público, reconexión y preparación inicial acotada; sin reenvíos de chat. |
| `useConversation` | Peticiones, idempotencia, cancelación y descarte de entregas antiguas. |
| `src/services` | Servicios de red/audio independientes del render de Vue. |
| `src/scene` | Three.js, rig y proyección; no genera interfaz ni modifica la conversación. |
| `server` | Autoridad de conversación, selección de proveedor y reserva exclusiva de audio. |

Vue 3 + Composition API con SFC; se mantiene JavaScript ESM para reutilizar servicios probados. Dos rutas no requieren Router ni un almacén global. Three carga bajo demanda y sus instancias permanecen fuera de proxies reactivos. Las dependencias se fijan en `package.json`/`package-lock.json`; npm es el único gestor.

## Contratos que deben conservarse

- `GET /api/presentation`: solo `{sessionId,revision,phase,animation}`; público en LAN. Fases `idle|processing|responded|error|speaking|listening`; movimientos `idle|wave`. No publica conversación, audio ni claves.
- `POST /api/animation {animation}`: privado; catálogo cerrado, sin campos adicionales. Saludo expira a reposo tras 3.6 s; no se exige sincronía exacta de frames entre pantallas.
- Chat/proveedor/TTS/STT: loopback, Host y Origin local. Límite de entrada 2000 caracteres; seis pares de contexto; timeout LLM 60 s, cancelación e IDs idempotentes. Cambiar proveedor limpia historial y caché; no fallback automático.
- `GET /api/providers` enumera modelos permitidos. `POST /api/provider` valida contra ese catálogo; diagnóstico `POST /api/provider/check {}` no genera texto ni certifica cuota mediante un catálogo público.
- Dictado revisable: no envío automático. `listening` requiere captura confirmada; `speaking` requiere reproducción real. Las reservas excluyen micrófono y TTS entre controles.
- Polling: una consulta activa, timeout 2.5 s, siguiente lectura 1 s después (3 s en segundo plano). Se descartan revisiones antiguas; reinicio reconoce sesión nueva. Avisos fuera del visor cerrado.
- Calibración v1 mantiene su clave de almacenamiento, rangos y orientación. Recursos locales, materiales originales y fondo negro puro. Fullscreen/wake lock dependen del navegador.

El backend de desarrollo se monta como middleware de Vite y utiliza el mismo `createApp` que la entrega compilada. Las credenciales se cargan solo en el proceso Node; no se exponen a Vue. Producción sigue con `npm run demo` y servidor Node independiente.

## Gemini API · C-06, 2026-10-28

Se incorpora un adaptador REST nativo en `server/providers.js`, compartido por desarrollo y producción, sin dependencias nuevas. Usa `generateContent` con `systemInstruction` y contexto `user/model`; la clave viaja en `x-goog-api-key` al origen fijo de Google, con redirecciones desactivadas. No se aceptan URL ni credenciales desde Vue. El modelo configurable por backend aparece en el catálogo permitido del control.

La respuesta toma texto del primer candidato y descarta partes marcadas como pensamiento. Se conservan cancelación, timeout, idempotencia y limpieza del contexto al cambiar proveedor. Bloqueos, respuestas vacías, clave ausente, permisos, modelo y cuota producen errores en español sin exponer el cuerpo del proveedor. Piper, Whisper y el contrato público de presentación se mantienen.

El diagnóstico autenticado consulta `models.get`; confirma metadatos y soporte de `generateContent`, sin certificar cuota de generación. La configuración local por sí sola no acredita conexión. Referencias oficiales: [generación](https://ai.google.dev/api/generate-content), [metadatos](https://ai.google.dev/api/models), [claves](https://ai.google.dev/gemini-api/docs/api-key) y [modelo seleccionado](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

Verificación: 96 pruebas y build correctos. Las pruebas HTTP usan respuestas controladas de Google para validar contrato, errores, privacidad, cambios de proveedor, cancelación y recuperación; no acreditan generación real. Control renderizado en escritorio y 390×844, diagnóstico y envío sin clave comprobados: [escritorio](evidence/C-06-gemini-desktop.jpg), [vertical](evidence/C-06-gemini-vertical.jpg). Falta clave propia para probar conversación real con Gemini; la validación humana y física continúa aplazada.

## Alcance posterior

Escucha atenta, reflexión, explicación, asentimiento y presentación lateral son poses propuestas, aún no generadas. El avatar no tiene morph targets faciales. Retargeting, lipsync y arte final requieren otro incremento. Los LLM conversan; no reciben herramientas ni controlan dispositivos.

Referencias de implementación: [SFC de Vue](https://vuejs.org/guide/scaling-up/sfc.html), [composables](https://vuejs.org/guide/reusability/composables.html), [sistema de animación de Three](https://threejs.org/manual/en/animation-system.html).
