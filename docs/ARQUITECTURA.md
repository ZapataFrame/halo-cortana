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

- `GET /api/presentation`: solo `{sessionId,revision,phase,animation}`; público en LAN. Fases `idle|processing|responded|error|speaking|listening`; movimientos del catálogo cerrado compartido `src/services/animation-catalog.js`: `idle|wave|nod|shake_head|think|hands_on_hips|listen|explain|shift_weight`. `animation` representa la selección manual; el visor deriva su postura automática de `phase` cuando vale `idle`. No publica conversación, audio ni claves.
- `POST /api/animation {animation}`: privado; catálogo cerrado, sin campos adicionales. Los gestos finitos expiran según su duración; posturas manuales, tras 8 s. `idle` libera la prioridad manual y el visor sigue la fase actual. Cada nueva solicitud sustituye el temporizador anterior; no se exige sincronía exacta de frames entre pantallas.
- Chat/proveedor/TTS/STT: loopback, Host y Origin local. Límite de entrada 2000 caracteres; seis pares de contexto; timeout LLM 60 s, cancelación e IDs idempotentes. Cambiar proveedor limpia historial y caché; no fallback automático.
- `GET /api/providers` enumera modelos permitidos. `POST /api/provider` valida contra ese catálogo; diagnóstico `POST /api/provider/check {}` no genera texto ni certifica cuota mediante un catálogo público.
- Dictado revisable: no envío automático. `listening` requiere captura confirmada; `speaking` requiere reproducción real. Las reservas excluyen micrófono y TTS entre controles.
- Polling: una consulta activa, timeout 2.5 s, siguiente lectura 1 s después (3 s en segundo plano). Se descartan revisiones antiguas; reinicio reconoce sesión nueva. Avisos fuera del visor cerrado.
- Calibración v1 mantiene su clave de almacenamiento, rangos y orientación. Recursos locales, materiales originales y fondo negro puro. Fullscreen/wake lock dependen del navegador.

El backend de desarrollo se monta como middleware de Vite y utiliza el mismo `createApp` que la entrega compilada. Las credenciales se cargan solo en el proceso Node; no se exponen a Vue. Producción sigue con `npm run demo` y servidor Node independiente.

## Movimiento corporal

`motion-player` mantiene un solo mixer con mezcla de 0.35 s y descarta finalizaciones de acciones que ya no son actuales. Escucha confirmada selecciona `listen`; espera de ≥0.6 s, `think`; reproducción real, `explain`. Un gesto manual tiene prioridad temporal y vuelve a la fase vigente al terminar. En reposo conversacional hay un cambio de apoyo tras 18 s. Asentimiento y negación son manuales; el LLM no elige acciones a partir de texto libre.

El generador adapta dos clips CC0 de torso de Quaternius y añade curvas propias/IK sobre el rig existente. Se conservan el GLB, las texturas, la calibración y el fondo negro. Diagnóstico, catálogo, procedencia y límites de revisión: [animaciones](ANIMACIONES.md). El modelo no tiene morph targets faciales; sincronización labial y arte final siguen fuera de este incremento. Los LLM conversan; no reciben herramientas ni controlan dispositivos.

Referencias de implementación: [SFC de Vue](https://vuejs.org/guide/scaling-up/sfc.html), [composables](https://vuejs.org/guide/reusability/composables.html), [sistema de animación de Three](https://threejs.org/manual/en/animation-system.html).
