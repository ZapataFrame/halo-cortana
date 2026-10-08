# Plan de implementación — MVP holográfico para mañana

Fecha: 2026-10-07. Entrega solicitada: 2026-10-08, hora pendiente. Estado: implementación autorizada y en verificación PC. Responsable: Codex. La aceptación móvil/física sigue pendiente; estados y evidencia en `ROADMAP.MD`.

## 1. Qué debe existir mañana

**Entrega A, primero:** en el celular/pantalla real se ve un humanoide completo adquirido de internet sobre negro puro, con ajustes para reflejarlo en una caja de un reflector. Sin texto, controles ni errores luminosos en la presentación.

**Entrega B, después:** desde control PC se envía texto a un LLM real y el modelo continúa visible. La petición más reciente selecciona GPT como principal; el adaptador está preparado y falta su clave privada. Ollama queda como alternativa explícita. Sin reconocimiento de voz ni animación de boca obligatorios.

**Etapa posterior:** TTS, reconocimiento por voz y asociación de habla/animaciones. Editor y juego de estrategia quedan diferidos.

A es el primer hito de trabajo. La solicitud completa A+B solo se declara lista cuando exista una respuesta real del proveedor; texto pregrabado o un mock no cumple B. Si B queda bloqueada por credenciales/modelo, entregar A y registrar que es únicamente el MVP visual.

## 2. Geometría y referencia física

Las imágenes y [la referencia aportada](https://wisnuwisdantio.com/category/experiments/peppers-ghost-holographic-projection/) muestran configuraciones de un reflector, con pantalla superior o inferior y problemas de inversión. Se propone una sola vista frontal calibrable, no cuatro personajes dispuestos para una pirámide.

Usar 45° como punto de partida y ajustar con la caja real. La necesidad de espejo depende del número y disposición de reflexiones; verificar con un patrón asimétrico. No fabricar un plano con medidas inventadas ni copiar la caja a escala sin medir pantalla/reflector. Es una ilusión por reflexión, no un volumen 3D visible desde cualquier ángulo.

El negro digital debe ser RGB 0/0/0. Que el panel físico parezca completamente negro depende también de pantalla y luz ambiental. No garantizar desaparición del fondo en LCD ni exigir comprar otra pantalla. Registrar ambiente y posición desde la que funciona.

## 3. Stack seleccionado para este corte

**Visor móvil en navegador, Three.js, archivos locales glTF/GLB, controlador y servidor Node.js en el PC.** Selección técnica para una figura y un plazo corto: Node 22.22.2, Three 0.186.1, Vite 8.3.3 y JavaScript sin framework. No fija el motor del futuro simulador de escritorio.

- Un solo origen sirve la aplicación compilada, assets y API. El móvil entra a `http://IP_DEL_PC:PUERTO/hologram`; usar `localhost` solo en PC.
- Ruta `/hologram`: renderizado en negro y calibración local. Ruta `/control`: configuración de demo y conversación en PC.
- Vite 8.3.3; JavaScript con módulos y dependencias fijadas por lockfile. Runtime verificado e instalación realizada. Sin framework de interfaz para este corte.
- Servidor Node con adaptadores independientes `ollama` y `openai`. OpenAI usa Responses; Ollama local usa su contrato propio y ya respondió realmente.
- Renderizado arranca sin servicios de IA. La app no carga un mapa ni espera a que haya clave/modelo para dibujar.
- Ningún asset ni librería necesita un CDN durante la demostración. Una vez instalados los recursos, el visor funciona sin internet mientras el servidor LAN esté activo. API en nube sí requiere internet.
- Sin APK, exportación Windows o PWA obligatoria para mañana. Evaluar esas distribuciones después de validar el dispositivo real.

Three.js documenta carga de glTF y animaciones mediante [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) y [su sistema de animación](https://threejs.org/manual/pages/animation-system.html). Esto permite plantear un visor compacto; el rendimiento y compatibilidad siguen sujetos a prueba real.

## 4. Estructura de entrega

Estructura implementada, reducida para este corte:

```text
src/viewer.js           escena, avatar, ajustes y presentación
src/calibration.js      contrato/persistencia validada
src/projection.js       espejos en ejes de pantalla tras rotación
src/main.js             control PC y consulta de estado
src/style.css, ui.css   visor negro e interfaz
server/app.js           estáticos, estado y endpoints privados
server/providers.js     adaptadores Ollama/OpenAI
server/index.js         configuración y arranque
public/models/          dancer.glb, dancer-motion.json, ficha y licencias
tools/bake-dance.mjs    generación offline de keyframes desde fuentes MIT
tools/vendor/avatar/   fuentes/avisos originales del movimiento
.env.example            ejemplo sin credenciales
package-lock.json       dependencias fijadas
README.md               ejecución y montaje
tests/                 validación/backend/persistencia
docs/reports/           informe y capturas
```

El nombre final del archivo de modelo se decide al adquirirlo. Calibración en almacenamiento del navegador por dispositivo. Secretos únicamente en entorno del servidor; nunca en variables públicas del bundler, URL móvil o modelo.

## 5. Plan de tareas individuales

Los estados actuales están en la roadmap. H-00 representa este plan documental; no confundir las tarjetas con tareas terminadas. Cada tarjeta define objetivo, trabajo, entregable y aceptación. Solo pasar a `DONE` con evidencia del resultado real.

### Etapa 0 — Cerrar lo mínimo y preparar ejecución

**H-01 — Registrar entorno y seleccionar ruta ejecutable (20–30 min). Depende de H-00.**

- Registrar runtime/OS/memoria/red del PC. Celular, reflector y hora se separan en H-19 para no bloquear código independiente ni cerrar una prueba física sin dispositivo.
- En PC comprobar runtime, gestor de paquetes, red LAN y conectividad móvil→PC. Registrar comandos/versiones; no instalar un motor pesado por defecto.
- Confirmar que el enfoque propuesto inicia con una vista móvil sencilla. Decidir proveedor según coste/credenciales, sin bloquear el visor por esa decisión.
- Entregable: reporte breve de entorno, decisión técnica y limitaciones.
- Aceptación PC: runtime compatible, build ejecutado, interfaz LAN y ruta de demo documentada. H-19 exige identificación y acceso desde el dispositivo físico; H-07/H-08 mantienen su aceptación real.

**H-02 — Adquirir un humanoide de internet (30 min de límite). Depende de H-01.**

- Candidato investigado inicialmente: personaje de la versión gratuita de [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), con preferencia por cuerpo humanoide sencillo y sin accesorios que tapen silueta. La página declara CC0 y glTF; verificar el archivo concreto de la descarga gratuita.
- Candidato alternativo original: un personaje de [Ultimate Modular Men Pack](https://quaternius.com/packs/ultimatemodularcharacters.html), también declarado CC0, con modelos y animaciones. No hacer retargeting ni diseñar a Cortana desde cero para este corte.
- Selección realizada: [Cesium Man de Khronos](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan), CC BY 4.0, 438044 bytes, 4672 triángulos, skin y animación; pack Quaternius sin archivo utilizable en el flujo probado. Ficha y licencia: `public/models/README.md`.
- Descargar una vez, conservar licencia/origen, escoger una sola figura, reunir texturas/buffers y empaquetar como GLB si es sencillo. Si se conserva glTF multifichero, servir todas sus dependencias locales.
- Preferir ≤10 MB y ≤30 mil triángulos como presupuestos iniciales propuestos; medir el resultado, no asumir que todos los modelos del pack caben.
- Entregable: asset local real y ficha con URL/autor/licencia/formato/tamaño/triángulos/clips/hash/modificaciones.
- Aceptación: el archivo se puede abrir, tiene cabeza/tronco/brazos/piernas completos y no depende de enlaces remotos. Modelo adquirido de internet; una figura procedural de emergencia debe declararse como sustitución que no cumple esa parte de la solicitud.
- Si la descarga/conversión supera el límite, cambiar al candidato alternativo. El modelo no tiene que parecerse aún a Cortana; identidad/avatar final después.

**H-03 — Crear aplicación mínima y servicio LAN (30–45 min). Depende de H-01.**

- Crear estructura, dependencias fijadas, scripts y configuración de ejemplo. Servir frontend compilado y assets en el mismo puerto que la API futura.
- Arranque previsto `npm run demo`; documentar instalación inicial por separado. Servidor accesible por interfaz LAN, sin abrir puertos del router ni desplegar en nube.
- Manejar rutas estáticas sin permitir rutas fuera del directorio de assets. Claves/configuración privada no son archivos públicos.
- Entregable técnico: página negra accesible desde PC e interfaz LAN. Apertura desde celular físico en H-19/H-07.
- Aceptación: mismo origen, 3 recargas sin 404, URL LAN documentada; si una red aísla clientes, corregir red/firewall de forma acotada y registrar la solución, sin desactivar protecciones globalmente.

### Etapa 1 — Modelo sobre negro: primer entregable

**H-04 — Importar y encuadrar figura (30–45 min). Depende de H-02 y H-03.**

- Cargar asset local; corregir orientación, centrar según bounding box y apuntar cámara al centro del cuerpo.
- Elegir vista frontal estable; evitar cortes de cabeza/pies al cambiar aspecto. Mantener figura en aproximadamente 60–80% de la altura útil con margen inicial ≥5%.
- Pose estática válida. Si ya existe un clip de reposo, habilitarlo como mejora sin bloquear importación.
- Entregable: capturas PC y formato vertical con cuerpo completo, origen del modelo e informe de carga. Captura del celular físico corresponde a H-07/H-19.
- Aceptación técnica: figura completa en vistas horizontal/vertical verificadas en navegador PC, sin deformaciones visibles ni errores de recursos. Compatibilidad del celular en H-07. Ajustes de tamaño en H-06 no deben recortar inesperadamente el encuadre.

**H-05 — Asegurar negro puro y contraste (20–30 min). Depende de H-04.**

- Fondo de página/canvas y clear color `#000000`, alpha opaco; quitar skybox, suelo, grid, sombras de piso, labels y elementos de depuración.
- Material luminoso blanco/gris claro inicial. Texturas opacas que se vuelvan invisibles deben simplificarse. Outline/efectos opcionales solo si mejoran la silueta; no invertir el tiempo en bloom o arte final.
- Cargar sin pantallas blancas. Errores de asset se consultan en `/control`; `/hologram` conserva negro y permite volver a calibración.
- Entregable: capturas originales del viewport, incluida pantalla de carga/fallo.
- Aceptación digital: cinco puntos de fondo fuera de la figura en captura del canvas tienen RGB `(0,0,0)`, sin controles ni halos en las esquinas. Verificar negro en carga, normal y error. El resultado físico se valida aparte en H-08.

### Etapa 2 — Calibración y caja

**H-06 — Controles de calibración y guardado (30–45 min). Depende de H-05.**

- Escala configurable inicial 0.25–2.0; desplazamiento X/Y en fracciones de viewport; rotación 0/90/180/270; espejo horizontal y vertical independientes; restaurar valores.
- Implementación H-06: valores numéricos en porcentajes junto a rangos (tamaño 25–200, X/Y −45…45), giro del cuerpo en grados/pasos de 5. La ruta numérica permite calibración precisa; comprobar arrastre táctil en H-07.
- Aplicar transformaciones de presentación sin deformar el rig. Mantener conversión consistente tras rotación/resize; se permite ajustar límites después de probar la caja.
- Patrón temporal asimétrico con letra F, indicación arriba y lados; apagarlo completamente al presentar modelo.
- El SVG usa el atributo `hidden`, no una propiedad que no se refleje en SVG. Ocultar el panel conserva el patrón para ensayar reflexión sin UI; Restablecer/checkbox lo apagan. Recargar no recupera patrón activo.
- Guardar calibración local versionada; datos corruptos recuperan predeterminados. Mostrar controles solo en modo ajustes y ofrecer gesto/botón para entrar/salir; jamás dejarlos reflejados durante la demo.
- Entregable técnico: calibración recuperable y patrón asimétrico funcional. Captura del patrón en reflector real corresponde a H-08.
- Aceptación: espejo cambia lateralidad, rotación cambia orientación, escala/desplazamiento son independientes y configuración se recupera tras 3 recargas. El patrón cambia lateralidad digital; lectura mediante reflector real se valida en H-08.

**H-07 — Modo presentación móvil y estabilidad (30–45 min). Depende de H-06 y H-19.**

- Ocultar HUD, impedir scroll/selección accidental y ajustar canvas al viewport. Pantalla completa por gesto si está soportada; documentar alternativa del navegador si no.
- Gestionar resize/orientación, pérdida de contexto WebGL y regreso del segundo plano. Limitar densidad de píxel inicialmente a 1.5 y ajustarla según medición.
- Ajustar bloqueo automático de pantalla desde dispositivo; API de mantener pantalla despierta solo como mejora si resulta compatible. No prometer fullscreen ni wake lock universal.
- Entregable: ruta móvil limpia, procedimiento de presentación y métricas.
- Aceptación: 5 min sin cierre, pantalla dormida ni blanco; 3 cambios de orientación/retornos sin perder figura/calibración. Meta de mediana ≥30 FPS durante 60 s en dispositivo objetivo; si falla, registrar valor y simplificar modelo/resolución antes de efectos.

**H-08 — Validar óptica en caja física (30–60 min). Depende de H-07.**

- Colocar pantalla y reflector según caja disponible. Usar patrón para decidir espejo/rotación; apagar patrón y comprobar figura.
- Registrar posición de observador, iluminación, orientación, escala y defectos como doble imagen o reflejo del marco. Variar una condición por vez.
- Entregable: foto o video real y ficha de calibración física. Captura de navegador no prueba holograma.
- Aceptación: desde un punto de observación documentado se distinguen cabeza, tronco y extremidades dentro de la caja, figura sin cortes y sin controles/patrón reflejados. Fondo físico no distrae en la iluminación acordada. Repetir montaje 2 veces usando parámetros guardados.
- Si aún no hay caja/móvil, mantener esta tarea pendiente y cerrar únicamente visor probado en PC. No inventar éxito óptico.

**Hito A:** H-02 a H-08 verificadas; existe una demostración visual independiente de la IA. No continuar agregando shaders si aún no se logró este resultado.

### Etapa 3 — LLM por texto, sin voz todavía

**H-09 — Preparar proveedor real (30–45 min, sin contar descarga grande). Depende de H-01.**

- Ruta sin coste seleccionada: Ollama local con `phi4-mini:latest`, 3.8B Q4_K_M, ya instalado; primera llamada directa 23.75 s y respuestas nuevas medidas mediante backend. Ejecución observada en CPU, VRAM del modelo 0. Confirmar descarga y una respuesta real mediante su [API de chat](https://docs.ollama.com/api/chat).
- Ruta OpenAI: proyecto, clave de servidor y créditos/facturación verificados. Seguir `docs/API_OPENAI.md`; no tratar el plan ChatGPT/Codex como créditos API.
- Configurar un solo proveedor para primera demo; separar adaptador para poder cambiar después. Un mock puede servir para probar UI, pero no para aprobar H-09 ni la integración.
- Entregable: configuración real fuera del repo y registro de respuesta con modelo/proveedor, tiempos e identificador cuando exista, sin clave.
- Aceptación: una pregunta en español obtiene respuesta no pregrabada; registrar 3 latencias incluyendo la primera carga. Si no hay saldo/modelo, tarea `BLOCKED` con motivo y alternativa pendiente. Renderizado A continúa.

**H-10 — Endpoint backend de conversación (30–45 min). Depende de H-09 y H-03.**

- `POST /api/chat` con solicitud identificada, mensaje y contexto limitado; devolver texto, estado y proveedor/modelo sin secretos.
- URL/clave/modelo salen de configuración privada. Cliente no elige endpoints arbitrarios. Máximo propuesto 2,000 caracteres por mensaje, 6 pares recientes de diálogo y 256 tokens de salida si el proveedor lo admite.
- Un envío activo por conversación; timeout seleccionado 60 s (el límite inicial de 30 s falló en CPU), cancelación e invalidación de respuestas tardías. No reintentar automáticamente llamadas potencialmente facturadas.
- Para este corte, controlador de chat solo en PC/loopback y lectura de presentación accesible al móvil en LAN; si se necesita control desde otro dispositivo, definir emparejamiento antes de abrirlo.
- Entregable: contrato y endpoint real con validación, error legible y clave ausente de respuestas/logs.
- Aceptación: texto válido, mensaje vacío/excesivo, proveedor caído, credenciales inválidas y timeout producen resultados controlados; no rompen visor ni revelan datos privados. Origen móvil no puede hacer solicitudes de chat que generen gasto en este corte propuesto.

**H-11 — Panel de conversación PC (20–30 min). Depende de H-10.**

- Campo de texto, enviar, cancelar, estado, proveedor y respuesta. Cortana responde breve en español y sabe que el MVP solo muestra un avatar; no finge controlar el simulador.
- Separar el panel de la ruta holográfica. Deshabilitar envíos duplicados y mostrar fallos en panel sin iluminar pantalla móvil.
- Entregable: conversación real y posibilidad de reintentar tras error.
- Aceptación: completar 3 preguntas distintas y un seguimiento contextual; cancelar una petición e impedir que su respuesta tardía sobrescriba otra. Visor sigue visible durante todas.

**H-12 — Sincronizar estado básico PC/móvil (20–30 min). Depende de H-11 y H-07.**

- Estado de sesión mínimo: `idle`, `processing`, `responded`, `error`, secuencia/revisión y texto opcional solo para control. El avatar vuelve a reposo; no llamarlo `speaking` hasta tener audio real.
- Propuesta sencilla: móvil consulta `GET /api/presentation` cada 1 s; actualizar solo cambios. No implementar WebSocket complejo para este corte.
- Entrada a sesión recupera estado actual; eventos viejos no se reproducen. Corte de API de texto no detiene renderizado.
- Entregable: modelo visible durante respuesta y cambio suave de estado si se decide representarlo; el indicador diagnóstico permanece fuera de proyección.
- Aceptación: estado llega en ≤2 s en LAN, desconexión de red mantiene figura y reconexión recupera estado sin duplicar solicitudes. No mostrar texto de chat en `/hologram` por defecto.

**Hito B:** H-09 a H-12 verificadas con un proveedor real. Modelo y LLM integrados sin STT, TTS ni comandos del juego.

### Etapa 4 — Ensayo y entrega de mañana

**H-13 — Ensayo completo y recuperación (30–45 min). Depende de H-08 y H-12.**

- Abrir visor, recuperar calibración, montar caja, conversar por texto, cortar proveedor/red y recuperar.
- Realizar 2 recorridos de demo sin cambiar código. Medir 10 min de estabilidad con LLM activo; registrar FPS y latencias por separado.
- Entregable: evidencia física + capturas de control + registro de condiciones/resultados.
- Aceptación: figura sigue visible durante error LLM; no aparece UI clara en proyección; 3 consultas reales; sesión restaurable; ningún secreto en frontend/assets/URL/logs revisados.

**H-14 — README, configuración y paquete reproducible (20–30 min). Depende de H-13.**

- Instalación inicial, comando único de demo, URL móvil, red, permisos necesarios, proveedor, calibración, guion de 3 min y cómo recuperarse.
- Incluir assets y licencia local, ejemplo sin claves, lockfile y artefacto compilado para servir localmente. El paquete local depende de PC encendido; no presentarlo como app autónoma offline.
- Guardar capturas/video de respaldo; aclarar que respaldo grabado no demuestra LLM en vivo. Evitar cambios de dependencias tras ensayo final.
- Entregable: README probado siguiendo instrucciones y reporte final con limitaciones.
- Aceptación: reiniciar servidor, abrir ruta móvil y repetir montaje sin recordar pasos ocultos; otra persona, si está disponible, sigue el guion. Solo marcar aceptación del propietario tras recibirla.

### Etapa 5 — Después de la demo: voz

**H-15 — Respuesta hablada (TTS). Depende de H-14.**

- Elegir voz en español y una sola salida activa; emitir voz desde respuesta real, cancelar audio y sincronizar avatar con reproducción. No clonación ni lip-sync fino requerido.
- Éxito: 3 respuestas se oyen, pueden interrumpirse y no duplican audio. Texto sigue disponible al fallar TTS. Medir latencia hasta inicio de audio.

**H-16 — Pulsar para hablar y reconocimiento (STT). Depende de H-15.**

- Preferencia inicial: micrófono PC, transcripción editable y envío explícito. Si el micrófono debe vivir en móvil/navegador, resolver permisos/contexto seguro y compatibilidad antes de prometerlo en LAN HTTP.
- Éxito: al menos 8 de 10 frases de prueba acordadas se transcriben con sentido suficiente; errores se corrigen y nunca ejecutan acciones directamente. Captura no reconoce el TTS de la propia asistente.

**H-17 — Flujo de voz completo y gestos simples. Depende de H-16.**

- Voz→texto→LLM→TTS→avatar con cancelación, timeout y estado real de habla. Gesto de reposo/pensando/hablando según capacidades del modelo.
- Éxito: 5 conversaciones cortas, 2 interrupciones y recuperación ante proveedor caído sin perder visor/calibración. Registrar latencia por etapa.

**H-19 — Identificar dispositivo, caja y horario. Depende de H-00.**

- Registrar celular/OS/navegador, tamaño/orientación de pantalla, caja y reflector, ubicación de pantalla y hora exacta de entrega.
- Abrir la URL LAN desde ese dispositivo físico y documentar resultado. Prueba de LAN desde el propio PC no sustituye este paso.
- Aceptación: dispositivo identificado y ruta móvil real abierta. Permite verificar H-07/H-08; no bloquea la base PC.

### Ampliación solicitada: GPT, orientación y baile

Las tareas H-20…H-22 tienen prioridad por instrucción más reciente del propietario. Son independientes del dispositivo/caja pendiente y no reactivan voz ni juego. Estados/evidencia en la roadmap.

**H-20 — GPT como proveedor principal. Depende de H-03 y H-10.**

- Seleccionar modelo mediante documentación oficial: gpt-4.1-mini/Responses para chat corto, salida 256 tokens, seis pares y timeout/cancelación existentes.
- Configurar `LLM_PROVIDER=openai` por defecto. Clave exclusivamente en `.env`/entorno backend; sin credenciales de sesión, activación de pagos ni fallback automático a Ollama.
- Dar instrucciones concretas para crear clave propia y reiniciar. Error de clave ausente → 503; 401/403/429 controlados sin divulgar cuerpo privado. Visor y baile independientes.
- Entregable: adaptador/configuración real, manejo de errores, guía actualizada y evidencia de llamadas cuando exista clave.
- Aceptación técnica: pruebas del contrato Responses, contexto/abort, clave ausente y errores; bundle/rutas sin secretos. Aceptación real: tres respuestas y un seguimiento con modelo/latencias registrados. Falta de clave mantiene `BLOCKED`; fixtures no satisfacen integración real.

**H-21 — Orientación automática, vertical y horizontal. Depende de H-03 y H-04.**

- Añadir selector de montaje en calibración PC/visor. Persistir enum `auto|portrait|landscape` compatible con datos v1 anteriores.
- Adaptar cámara/imagen al aspecto actual. Si modo y postura discrepan, añadir 90° a la rotación existente; evitar giros acumulados al resize. Patrón y avatar usan el mismo ángulo; espejo sigue en ejes de pantalla.
- No depender de `screen.orientation.lock` ni prometer bloqueo físico universal. Mantener fondo negro y controles ocultables.
- Entregable: selector, transformaciones y documentación del montaje.
- Aceptación técnica: automático/vertical/horizontal a 390×844 y 844×390, cuerpo completo y sin deformación; persistencia tras tres recargas, espejos compatibles y entradas inválidas seguras. Celular físico y óptica continúan en H-07/H-08.

**H-22 — Baile libre controlable desde PC. Depende de H-03 y H-04.**

- Encontrar una recreación de un baile presente en Fortnite con origen/licencia verificables. Selección: Gangnam Style de ProgramAsWeights/avatar, MIT, con humanoide Quaternius CC0 compatible; conservar commit, avisos y hashes.
- Convertir curvas de movimiento/IK a keyframes locales mediante script reproducible; el móvil solo reproduce clips, sin instalar Blender ni el editor externo. Sin música ni archivos de Epic.
- Botones **Reposo** y **Bailar Gangnam Style** en PC. Endpoint privado `/api/animation` valida enum y añade movimiento al estado público mínimo.
- Visor nuevo recupera el baile por consulta; transición suave, no desaparece ante error GPT. Movimiento no invoca al LLM ni publica chat/clave.
- Aceptación: rig real cambia brazos/piernas, dos fases visibles, vuelve a reposo, ciclo acotado; botón y recuperación de selección comprobados; recursos funcionan localmente con licencia. No exigir sincronización exacta de frames ni considerar FPS instantáneos como benchmark móvil.

**H-18 — Mejoras posteriores. Depende de H-17. Estado DEFERRED.**

- Modelo final, materiales, labios, escucha por nombre, aplicación instalada o sin PC y más proveedores. Cada mejora necesita nueva tarjeta y objetivo medible.
- Juego de estrategia se mantiene en backlog histórico; no reactivarlo automáticamente al completar holograma.

## 6. Matriz mínima de pruebas

| Prueba | Procedimiento | Resultado requerido | Evidencia |
|---|---|---|---|
| QA-01 Negro | Captura de canvas: 5 puntos de fondo en carga/normal/error. | RGB 0/0/0; sin HUD. | Capturas y coordenadas muestreadas. |
| QA-02 Asset | Cargar desde recursos locales y comprobar dependencias. | Cuerpo completo, archivos presentes y licencia registrada. | Ficha y captura. |
| QA-03 Móvil | Abrir por LAN, recargar 3 veces, rotar y volver de segundo plano. | Figura y calibración recuperadas. | Navegador/dispositivo y observaciones. |
| QA-04 Rendimiento | 60 s de medición y 5 min de visor. | Meta mediana ≥30 FPS y cero cierres. | Medidas reales, no solo GPU nominal. |
| QA-05 Óptica | Patrón asimétrico y figura en caja, 2 montajes. | Lateralidad correcta, cuerpo identificable y UI ausente. | Foto/video de reflector real. |
| QA-06 LLM | 3 mensajes nuevos + seguimiento. | Respuesta real y contexto breve. | Proveedor/modelo/latencias. |
| QA-07 Fallos | Timeout/proveedor caído y reconexión. | Error en control, figura estable y reintento manual. | Registro de recuperación. |
| QA-08 Secretos | Revisar bundle/red/assets/respuestas/logs. | Sin clave ni configuración privada; chat restringido según diseño. | Archivos/rutas revisados, sin copiar secretos. |
| QA-09 Ensayo | Guion completo 2 veces, 10 min con IA. | A+B reproducibles y limitaciones explícitas. | Reporte final. |
| QA-10 Orientación | Tres modos, dos aspectos, 3 recargas y espejos. | Giro sin acumulación, figura íntegra y ajuste conservado. | Pruebas de geometría, DOM y capturas PC. |
| QA-11 Baile | Iniciar/detener PC, abrir visor, provocar fallo GPT. | Esqueleto real, selección recuperada y negro continuo. | Clip/GLB reales, pruebas HTTP y capturas. |
| QA-12 GPT | Clave privada, 3 mensajes + seguimiento. | Respuestas reales y latencias; errores legibles sin fallback. | Registro pendiente de credencial. |

## 7. Orden, tiempos y recortes

Orden recomendado: H-01 → H-02/H-03 → H-04 → H-05 → H-06 → H-07 → H-08 → H-09 → H-10 → H-11 → H-12 → H-13 → H-14. H-09 puede preparar credenciales/descarga mientras se hace el visor, sin desplazar la prioridad óptica. Tareas independientes pueden ejecutarse en paralelo si hay responsables y archivos separados; no es requisito usar agentes adicionales.

Estimación orientativa: 4–6 h para A, 2–3 h para B y 1 h de ensayo/paquete. No incluye esperas de descarga, fabricación de caja ni resolución de incompatibilidades. La hora real de mañana falta; reservar al menos 1 h de cierre antes de presentar.

Reglas de recorte: eliminar primero animaciones extra, shaders, audio, personalización y despliegue. Mantener modelo local, negro, calibración, prueba física y LLM por texto como los dos resultados solicitados. Si falta tiempo/proveedor, declarar demo visual parcial; no fingir integración.

Si una tarea lleva más de 1.5 veces su límite, registrar problema y escoger alternativa acotada. En la última hora, congelar dependencias y cambios de arquitectura. No introducir STT/TTS para salvar una integración de texto que aún falla.

## 8. Datos faltantes y límites de esta planificación

Faltan celular/OS/navegador, hora de entrega y medidas/materiales de caja. PC y RAM ya registrados en H-01. El propietario pidió GPT; falta clave privada Q-07 y su acceso al modelo. Guardarla en `.env`, nunca en chat. No activar facturación por cuenta del propietario.

El plan inicial se cerró antes de implementar. Ya existen app, modelos, calibración, baile y respuestas reales de Ollama históricas. Evidencia actual en reportes/roadmap; API GPT y holograma físico continúan pendientes. Describir sus pruebas no las convierte en realizadas.
