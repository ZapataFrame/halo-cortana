# H-31 — Evaluación del holograma, voz y próximos entregables

Fecha: 2026-10-14. Responsable: Codex. Rama revisada: `codex/reconocimiento-voz-pc`, HEAD `45e8f1f`, con cambios previos de H-16 sin commit. Estado de esta evaluación: **DONE**. Las mejoras descritas son propuestas; no cambian contratos ni constituyen implementaciones aprobadas o terminadas.

## Conclusión

El proyecto tiene una base de software funcional para visor/calibración, chat y voz PC. La brecha principal está en demostrar el recorrido real PC → celular → reflector y en hacer cómoda la conversación hablada. Conviene priorizar conectividad y aceptación física, optimizar los motores existentes con mediciones y después cerrar el flujo integrado. Mantener diferidos simulador, labios, escucha continua y nuevos sistemas de animación.

El orden documental se ha respetado con ampliaciones autorizadas por el propietario, incluida D-32 para adelantar voz PC. La cantidad de tareas técnicas terminadas no implica que el holograma esté entregado: H-07/H-08/H-12/H-13/H-14 siguen sin aceptación física. Implementar más ayudas automáticas no resuelve por sí solo esos pendientes.

## Alcance revisado y estado real

Se revisaron `AGENTS.md`, `README.md`, `ROADMAP.MD`, `SPECIFICACTIONS.MD`, `Cortana.md`, el plan del MVP, `docs/VOZ_PC.md`, las guías Cloud/chat/animaciones y los reportes de TTS/STT. Se contrastaron con scripts de arranque, servidor, workers de voz, controles, renderizador y sincronización.

| Área | Evidencia disponible | Pendiente |
|---|---|---|
| Visor y calibración | Modelo local, fondo negro, texturas, orientación y persistencia implementados; evidencia digital histórica. | Celular real, estabilidad/FPS, orientación táctil y óptica en caja. Cortana importada continúa estática. |
| Chat | Integración Cloud real registrada en H-28/H-11; límites, cancelación y contexto implementados. | No se volvió a llamar al proveedor en esta evaluación. GPT conserva aceptación propia pendiente en documentación; no se inspeccionó su credencial actual. |
| TTS H-15 | Piper/Daniela CPU; WAV y reproducción digital registrados. Experimento actual confirma coste de recargar modelo. | Audición/calidad humana, latencia con frases variadas y optimización integrada. |
| STT H-16 | Whisper base CPU/int8, dictado editable y envío explícito. Incremento previo de ensayo guiado presente en el árbol de trabajo. | Diez frases humanas con ≥8/10 útiles antes de corregir; permisos, micrófono y entorno reales. H-17 espera esa aceptación. |
| Recuperación | H-30 y pruebas actuales de sesión/revisión/cancelación. | H-12 requiere dos dispositivos y medición real de sincronización/reconexión. |

Verificación actual: **80/80 pruebas** mediante `npm test`, build correcto con Node 22.22.2 y `git diff --check` correcto. Bundle JS: 676.70 kB / 174.95 kB gzip, con advertencia >500 kB. No se realizó revisión visual nueva ni prueba humana/física; los tests y el build no las sustituyen. Los cambios previos de H-16 se conservaron.

## Conexión al celular: hallazgos y diagnóstico pendiente

1. **`localhost` siempre corresponde al dispositivo donde se abre.** En el celular no identifica al PC. El control PC usa `http://localhost:3000/control?avatar=cortana`; el visor del celular debe usar la IP LAN del PC, actualmente `http://192.168.1.66:3000/hologram?avatar=cortana`. La IP se verificó hoy y puede cambiar.
2. **Al iniciar la evaluación no había servidor del proyecto escuchando en TCP 3000.** La configuración existente sí establece `HOST=0.0.0.0` y `PORT=3000`. Esto explica la indisponibilidad en ese momento, pero no demuestra la causa de intentos anteriores.
3. **`npm run dev` escucha explícitamente en `127.0.0.1`.** Los servidores de QA de los puertos 3001/3002 también son solo PC. Además Vite no monta por sí mismo las APIs de `server/app.js`; cambiar únicamente `--host` no produce una demo completa. El recorrido integrado existente es `npm run demo`, o `npm start` después de compilar. [Configuración oficial de escucha Vite](https://vite.dev/config/server-options.html#server-host).
4. Se inició temporalmente el servidor real, sin generar chat: visor, HEAD del GLB y estado público respondieron **200** tanto por loopback como por IP LAN desde el PC. `/api/tts` respondió 200 por loopback y **403 por IP LAN**, conforme al contrato de control privado. El proceso temporal se cerró y se restauró el estado inicial sin servidor.
5. El servicio **UFW figura activo**, pero sus reglas y el filtrado efectivo no se pudieron verificar: `sudo -n ufw status verbose` requiere contraseña de administrador. No se modificó firewall, router ni configuración. Tampoco se verificaron aislamiento Wi-Fi o tráfico desde el celular. Un GET desde el PC hacia su propia IP no prueba ese trayecto.

El siguiente diagnóstico debe reproducir la URL y el error exactos con el servidor de demo activo. Si el visor no carga, revisar TCP 3000, IP/subred y aislamiento entre clientes. Si carga HTML pero no el avatar, revisar GLB, consola y WebGL del dispositivo. Si únicamente falla el control/chat por LAN, distinguir el 403 deliberado del fallo de transporte. **Probar conexión** en el panel diagnostica al proveedor LLM; no prueba acceso del teléfono al PC.

El visor actual puede funcionar por HTTP LAN. El micrófono se usa en PC/localhost; si se pidiera trasladarlo al móvil habría que resolver contexto seguro y el contrato de acceso. No hace falta ampliar ese alcance para presentar la figura. [Requisitos de getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Voz: mediciones actuales y optimización propuesta

Entorno verificado: Linux 7.2.9-2-cachyos, Intel Core i5-1334U, 12 CPU lógicas; Python 3.13.14, Piper 1.4.1/ONNX Runtime 1.30.0, faster-whisper 1.2.1/CTranslate2 4.8.2. Inferencia CPU. Experimentos secuenciales, sin descargas ni API LLM. Datos completos: [H-31-evaluacion.json](evidence/H-31-evaluacion.json).

`server/tts.js` y `server/stt.js` crean un proceso Python por petición. `piper_worker.py` y `whisper_worker.py` cargan el modelo en cada proceso. Esto facilita aislamiento y cancelación, pero repite inicialización durante cada turno. Además TTS devuelve el WAV completo y el navegador espera `response.blob()` antes de reproducirlo; no hay streaming.

Se compararon tres procesos originales nuevos con tres llamadas en un intérprete que conserva el mismo modelo. Para TTS se repitió la frase pública «Hola, soy Cortana. Esta es una prueba de voz en español.»; para STT se reutilizó el WAV público H-15 de esa frase. Cachés del SO conservadas, orden fijo de modos. No se guardaron grabaciones ni nuevos audios.

| Experimento | Mediana de 3 procesos nuevos | Mediana de 3 llamadas con modelo residente |
|---|---:|---:|
| Piper, misma voz y texto | 2998 ms | 1684 ms |
| Whisper base, CPU int8, beam=5 | 2087 ms | 1259 ms |

Estas mediciones indican una oportunidad real de reducir espera, **sin certificar latencia final**: el modo residente del experimento no implementa IPC, HTTP, navegador, cancelación ni recuperación. No son percentiles representativos. Los picos RSS del proceso experimental fueron aproximadamente 235 MiB TTS y 585 MiB STT; no se midió consumo simultáneo de ambos workers con el resto de la aplicación.

También se exploraron ajustes pequeños antes de proponer otra arquitectura:

- Piper con `intra_op_num_threads` 1/2/4: medianas de síntesis residente 1812/1511/1733 ms, y carga 1030/1223/1731 ms. Dos hilos es candidato a comparar con más frases; la muestra y la variabilidad no permiten fijarlo como óptimo. Se usaron sesiones nuevas en el mismo intérprete. La API instalada `PiperVoice.load` no expone directamente ese ajuste; cualquier integración debe conservar configuración y recursos de la voz. [Opciones oficiales de hilos ONNX Runtime](https://onnxruntime.ai/docs/performance/tune-performance/threading.html).
- Whisper residente con `beam_size=1`: mediana 1143 ms frente a 1259 ms con beam=5. El resultado de ambos conservó el error «prueba» → «privada». Reducir beam puede ayudar al tiempo, pero esta única frase no demuestra precisión equivalente. [Comparación de parámetros y rendimiento faster-whisper](https://github.com/SYSTRAN/faster-whisper#comparing-performance-against-other-implementations).
- El reporte previo de H-16 muestra que `small` tardó más del doble que `base` y mantuvo errores. No conviene cambiar a un modelo mayor sin comparar exactamente los mismos audios humanos y el coste temporal.

Orden recomendado para mejorar voz:

1. Medir por separado soltar botón → texto editable, envío confirmado → respuesta LLM y respuesta → primer audio. El tiempo humano de revisar el texto se registra aparte; no es tiempo del motor. Las latencias Cloud de 0.48–0.83 s son históricas, no mediciones nuevas; históricamente TTS fue el tramo más lento, con inicio de audio de 5.2–6.7 s.
2. Comparar ajustes de hilos y carga con varias frases públicas cortas/largas. Si el coste repetido continúa siendo significativo, conservar **un proceso local por motor**, una petición activa y modelo cargado. Reutilizar entornos, modelos y adaptadores; no añadir un servicio distribuido ni otro framework. El objeto reutilizable de voz está documentado en la [API de Piper](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_PYTHON.md).
3. Mantener cancelación, exclusión TTS/captura y descarte de resultados antiguos. Un worker residente cancelado puede terminarse y recrearse; debe medirse también la primera petición tras recuperación. Conservar memoria de modelo implica gestionar su ciclo de vida, no solamente quitar `spawn`.
4. Ensayo humano H-16 con diez frases, intención y datos correctos ≥8/10 antes de editar. Si no alcanza esa meta, revisar primero micrófono, ruido, captura y errores concretos. Comparar después beam/modelo usando exactamente el mismo conjunto de audio cuando el propietario autorice conservarlo temporalmente fuera de Git.
5. Evaluar síntesis por fragmentos solo si la espera continúa siendo insuficiente. Piper ofrece streaming, pero el contrato WAV/blob actual y el reproductor necesitarían cambios y pruebas de interrupción/orden. No implementarlo junto con la primera optimización. GPU, modelos nuevos y servicios de pago quedan como alternativas futuras sujetas a medición, no requisitos.

Como objetivos **propuestos**, contrastar medianas ≤2 s de STT tras soltar una frase de 3–6 s y ≤2 s desde respuesta textual hasta inicio TTS para respuestas cortas. Primero obtener una línea base con varias frases y navegador real; no son cifras ya alcanzadas ni nuevos criterios aprobados.

## Complejidad: qué mantener y dónde reducir esfuerzo

La base es relativamente pequeña: JavaScript sin framework, Node, Three y dos motores Python. No se justifica una reescritura general. Los tres proveedores, variantes del avatar y baile proceden de solicitudes explícitas; no deben borrarse por considerarlos accesorios.

Mantener adaptadores de IA/voz, límites de entrada, control privado PC, envío explícito, cancelación, sesión/revisión y separación entre visor/control. Resuelven fallos reales y deben sobrevivir a cualquier optimización. Los entornos Python separados no constituyen por sí solos un problema de rendimiento.

Hay oportunidades más útiles y acotadas:

- **Recorrido principal demasiado cargado:** proveedor, modelo, diagnóstico, voz, volumen, micrófono, ensayo, avatar, baile y calibración compiten en el control. Proponer un recorrido principal hablar/revisar/enviar/detener; conservar configuración y ensayo en secciones avanzadas. Requiere revisión visual posterior.
- **Dependencia innecesaria al iniciar:** `src/main.js` espera `refreshModels()` antes de consultar TTS/STT y publicar enlaces LAN. `/api/providers` consulta Ollama local incluso usando Cloud; puede esperar su timeout de 3 s. Los enlaces del visor y los servicios de voz deberían prepararse de forma independiente del catálogo de otro proveedor. Es un acoplamiento concreto, no la causa demostrada del fallo del celular.
- **Prioridades documentales poco discriminantes:** muchas ampliaciones históricas figuran P0 mientras sigue abierto el producto físico. Conviene una lista corta de entregables actuales y conservar las tablas de evidencia como historial.
- **Documentación vigente con frases antiguas:** README aún registra 74 pruebas; el árbol actual pasa 80 e incluye ensayo guiado sin commit. La guía Cloud dice «Todavía no hay reconocimiento ni síntesis de voz», ya superado por H-15/H-16. Q-12/plan describen H-16 BLOCKED mientras la roadmap refleja IN_PROGRESS por un incremento técnico: explicar ambos planos sin confundir avance con aceptación. No reescribir reportes históricos como si fueran resultados actuales.
- **Optimización visual posterior a medir:** Cortana pesa 4,867,260 bytes y el bundle genera advertencia. Medir carga/FPS en el celular antes de introducir compresores, decodificadores o migrar arquitectura. Recorrer materiales en cada frame puede simplificarse si el perfil lo justifica; no hay benchmark móvil que lo convierta hoy en la prioridad principal.

## Próximos entregables propuestos

| Orden / prioridad | Entregable y relación con roadmap | Criterio de salida | Archivos o trabajo previstos |
|---|---|---|---|
| 1 / P0 | Conexión PC → celular reproducible. Parte de H-19/H-07 y diagnóstico de H-03. | Modelo cargado desde IP LAN en el teléfono identificado, tres recargas y retorno de segundo plano; registrar URL/comando/error y solución. Control PC permanece privado. | Arranque/guía `README.md`, `package.json`, `server/index.js`; `src/main.js` solo si se corrige publicación de enlaces/diagnóstico. Reglas del sistema solo si se confirma su bloqueo. |
| 2 / P0 | Holograma real y recuperación: H-07 → H-08 y H-12. | Cinco minutos estable; medir FPS 60 s con meta mediana ≥30; dos montajes con figura/negro/encuadre verificables; estado ≤2 s en primer plano y reconexión sin duplicar chat. | Prueba en celular/caja, calibración y evidencia. Corregir `viewer.js`/`presentation-sync.js` únicamente ante fallo medido. |
| 3 / P1 | Voz PC cómoda: optimización incremental H-15 + aceptación H-16. | Comparación con varias frases frías/calientes, latencias y memoria registradas; ≥8/10 frases humanas útiles, texto corregible, cero envíos automáticos y cancelación/recuperación intactas. | `server/tts.js`, `piper_worker.py`, `server/stt.js`, `whisper_worker.py`; reproductor/captura solo cuando el contrato lo requiera. Guía `VOZ_PC.md` y evidencia. |
| 4 / P1 | Demostración repetible: H-17 tras aceptar H-16; H-13/H-14 tras H-08/H-12. | Cinco conversaciones y dos interrupciones; dos recorridos, diez minutos integrados y reinicio siguiendo README. Registrar límites y aceptación humana por separado. | Ensayo de usuario y documentación; simplificación pequeña de controles si se demuestra necesaria. |

Si falta temporalmente celular/caja, avanzar la medición/optimización PC del entregable 3, manteniendo abiertos los criterios físicos. No esperar material del reflector ni una hora de presentación para diagnosticar la conexión LAN: H-19 agrupa esos datos, pero solo dispositivo/red son necesarios para la primera comprobación.

H-20/GPT puede continuar cuando haya recurso válido, pero no es el primer problema a resolver si se dispone del proveedor ya integrado. No ampliar ahora proveedores, retargeting, wake word, escucha móvil, labios ni simulador. Propuesta de siguiente acción concreta: **reproducir la conexión con `npm run demo`, la URL LAN de Cortana y el teléfono del propietario; cerrar ese diagnóstico antes de ampliar funciones.**

## Cambios y límites de esta evaluación

Se añade este reporte, evidencia JSON y referencia/seguimiento H-31 en la roadmap. No se cambió código de producto, configuración privada, dependencias, permisos de micrófono ni red. La especificación mantiene sus requisitos y decisiones: las prioridades y objetivos nuevos de este reporte son recomendaciones. No se certifican conectividad de un celular, óptica, voz humana, generación API actual ni mejora de rendimiento ya integrada.
