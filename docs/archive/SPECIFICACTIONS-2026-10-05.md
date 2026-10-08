# Halo Strategy Lab — Especificación

Actualizado: 2026-10-05. Estado: requisitos consolidados tras 30 respuestas; diseño técnico y propuestas de corte pendientes de validar.

## 1. Visión y prioridad

Aplicación de escritorio para un usuario que combina una asistente Cortana conversacional por voz con un editor y simulador táctico 3D de temática Halo. El modelo visual de Cortana también se reproduce en un dispositivo móvil externo.

Orden confirmado por el propietario: **Cortana por voz → Cortana con comandos → definición de interfaz y elementos → editor y simulación → mejora visual y ampliaciones**. Las comprobaciones internas por texto pueden preceder a la voz, pero la primera entrega útil será la asistente por voz, sin exigir que el editor esté terminado.

Diseño detallado de la asistente: `Cortana.md`, actualizado a este alcance. Describe interacción, estados, contextos, comandos y presentación PC/móvil; sus propuestas técnicas no constituyen selección de stack. `docs/reports/2026-10-05-T-01-requisitos.md` conserva la trazabilidad de las 30 respuestas.

## 2. Condiciones confirmadas

| ID | Requisito o condición |
|---|---|
| C-01 | Escenarios e interacción 3D con temática Halo. |
| C-02 | Soldados, tanques, vehículos ligeros y naves como objetivo del catálogo; el propietario delega la selección inicial. |
| C-03 | Terreno editable: elevar, bajar y aplanar; agua bloquea unidades terrestres. |
| C-04 | Cortana visual, voz en español, LLM e interpretación de instrucciones. |
| C-05 | Colocación absoluta y relativa, eliminación y control de simulación. |
| C-06 | Agentes deben seguir tareas, mantener documentos y registrar avances verificables. |
| C-07 | Escritorio Linux como plataforma principal y Windows como segunda plataforma deseada. |
| C-08 | Un PC y un dispositivo móvil para reproducir el modelo de Cortana. |
| C-09 | MVP funcional, modelos sencillos al principio y mejoras iterativas. |
| C-10 | Entrada de voz desde el simulador mediante botón o tecla; presentación integrada sencilla. |
| C-11 | Plazo inferior a dos meses desde esta definición; fecha exacta pendiente. |
| C-12 | Sin presupuesto; poca experiencia técnica y conocimientos mínimos de Blender. Uso de agentes de IA para desarrollar. |
| C-13 | Laptop con RTX 3050 como referencia; CPU, RAM y VRAM pendientes. No se ha validado rendimiento. |
| C-14 | Un usuario, sin cuentas ni multijugador en la entrega inicial. |
| C-15 | Mapas pequeños predeterminados; cargar y exportar composiciones, sin guardar batallas en ejecución. |
| C-16 | Propiedades por unidad editables: vida, velocidad, daño y alcance. Control de velocidad de simulación. |
| C-17 | Varios bandos en el diseño, priorizando dos en la primera versión. |
| C-18 | Rutas definidas por el usuario, detección visual y coordinación/combate al encontrar enemigos; mecanismo de órdenes pendiente de aclarar. |
| C-19 | Terreno bloquea visibilidad y disparos además de afectar movimiento. Obstáculos construidos se incorporarán después. |
| C-20 | Primer objetivo: eliminar un bando. Captura la bandera después. Resultado con estadísticas; timeline aún como posibilidad. |
| C-21 | Acciones reversibles con deshacer; el propietario delega la resolución de posiciones relativas. |
| C-22 | Elegir entre proveedores LLM; funcionamiento exclusivamente offline no exigido. |
| C-23 | Cortana conversa, interpreta comandos y analiza con contextos distintos. |
| C-24 | Aplicación monocromática blanco/negro y modelos representados principalmente mediante contornos, con aspecto de simulación futurista. |

## 3. Entregas y corte de alcance propuesto

Las etapas siguientes traducen las prioridades a entregables; los tamaños y límites indicados son propuestas, no mediciones ni aceptación final del propietario.

### M0 — Cortana conversacional por voz

Panel de escritorio con texto, pulsar para hablar, transcripción editable, LLM configurable, respuesta hablada, cancelación y estados visuales. Representación provisional sencilla. Conversación independiente del simulador. El análisis táctico no se anuncia como disponible hasta disponer de estado real del escenario.

### M1 — Cortana agente e interfaz definida

Catálogo cerrado, esquema validado y ejecutor sobre un pequeño estado real de pruebas. Agregar/eliminar/consultar entidades y deshacer, incluso sin escena completa. Mostrar resultados verificables. Las acciones sin implementación aparecen deshabilitadas; una simulación de respuesta del modelo no cuenta como ejecución.

Después, definir y revisar navegación, distribución de paneles, estados, herramientas, propiedades y estilo monocromático antes de construir el editor completo.

### M2 — Editor y composición

Mapa predeterminado pequeño, terreno editable, unidades de dos bandos, propiedades por instancia, rutas, agua no transitable y exportación/carga. Control manual y Cortana usan el mismo ejecutor. Validación con geometrías simples y contornos.

### M3 — Simulación y demostración PC/móvil

Unidades siguen rutas legales, detectan según alcance y línea de visión, combaten bajo reglas simples y terminan al eliminar un bando. Pausa, reinicio, velocidad y estadísticas. Cortana consulta el estado real y ofrece análisis descriptivo básico. Móvil reproduce el avatar y sus estados, sin mantener una segunda simulación.

### Límites propuestos para la entrega inicial

- Mapa de 200 × 200 metros; probar 20 unidades y ampliar a 50 solo si las mediciones lo permiten.
- Catálogo funcional terrestre: Marine, Spartan, Scorpion y Warthog con modelos provisionales. Una plantilla aérea sencilla tipo Banshee solo tras validar movimiento y reglas; si queda fuera del corte, debe declararse como requisito global pendiente, no como cumplido.
- Plantillas basadas en datos y propiedades por instancia, sin editor visual avanzado de equipamiento ni producción masiva de modelos.
- Agua bloquea paso terrestre. Barcos, submarinos, embarque/desembarque y transporte son una ampliación separada.
- Eliminación de un bando. Captura la bandera diferida y sistema de objetivos extensible.
- Registro cronológico simple de eventos; timeline navegable, repetición visual y controles de reproducción diferidos.
- Sin proyectiles con físicas, destrucción de terreno, aprendizaje automático de unidades, estrategia autónoma compleja, multijugador ni generación de código por el LLM.

## 4. Interfaz y dirección visual

Dirección confirmada: blanco y negro, modelos por contornos, presentación técnica y futurista. No introducir diferenciación principal por colores de bando.

Propuesta de distribución:

| Zona | Contenido |
|---|---|
| Barra superior | Modo edición/simulación, archivo, deshacer/rehacer, inicio/pausa/reinicio y velocidad. |
| Panel izquierdo | Mapas predeterminados, catálogo y herramientas de terreno/rutas. |
| Vista central | Escenario 3D, cámara, cuadrícula, rutas y selección. |
| Inspector derecho | ID, plantilla, bando, propiedades por unidad y ruta asignada. |
| Panel Cortana | Conversación, transcripción, micrófono, cancelar, contexto y estado. |
| Panel inferior plegable | Resultados, estadísticas, eventos y errores de validación. |

Dos bandos distinguibles por símbolos, etiquetas y estilos de línea. La selección usa brillo o grosor. Contornos de modelos no deben revelar enemigos a través de terreno en el modo de información limitada. Vista omnisciente para editar y depurar; cualquier vista táctica limitada debe identificar qué bando observa.

Contorno no implica mostrar todas las aristas internas del modelo. Probar siluetas y líneas estructurales para evitar ruido. Terreno con curvas de nivel o cuadrícula; agua con patrón monocromático distinto. Los recursos finales respetarán esta dirección, aunque el avatar móvil pueda tener una presentación propia por definir.

## 5. Requisitos verificables

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-01 | Cámara y selección 3D | Desplazar/orbitar/zoom, seleccionar y mostrar ID inequívoco sin editar accidentalmente. |
| RF-02 | Catálogo por plantillas | Crear tipos desde datos; validar propiedades y evitar que editar una instancia altere otras. |
| RF-03 | Agregar, mover, rotar y eliminar | Mismo ejecutor desde interfaz y asistente; rechazar posición ilegal sin mutación parcial. |
| RF-04 | Propiedades por instancia | Editar vida, velocidad, daño, alcance y alcance visual con límites publicados. |
| RF-05 | Terreno | Elevar/bajar/aplanar, actualizar superficie y detectar unidades/rutas invalidadas. |
| RF-06 | Agua | Bloquear colocación y movimiento terrestres; no permitir atajos que atraviesen agua. |
| RF-07 | Bandos extensibles | Dos iniciales; identidad de bando separada de tipo de unidad, sin condicionar reglas a índices fijos. |
| RF-08 | Mapas y composición | Cargar mapa predeterminado, exportar composición y recuperar unidades, terreno, propiedades, rutas y objetivo. |
| RF-09 | Historial | Deshacer/rehacer cambios de unidades y pinceladas completas en edición. |
| RF-10 | Rutas | Definir puntos por unidad/grupo y visualizar trayecto; rechazar o señalar segmentos imposibles. |
| RF-11 | Visibilidad y tiro | Relieve bloquea visión y disparo; una unidad no ataca a través de una montaña. |
| RF-12 | Detección y combate | Implementar política aclarada con el propietario; separar avistamiento de posibilidad real de disparar. |
| RF-13 | Reloj y estados | Iniciar/pausar/continuar/reiniciar; velocidad no altera las reglas por depender de FPS. |
| RF-14 | Objetivo y estadísticas | Terminar por eliminación; mostrar objetivo cumplido, bajas/supervivientes por bando, duración y daño. |
| RF-15 | Voz PC | Pulsar para hablar, revisar transcripción, cancelar y volver a usar tras un fallo de micrófono. |
| RF-16 | Conversación y TTS | Respuesta textual y hablada; interrupción por botón y recuperación ante fallo de LLM/TTS. |
| RF-17 | Proveedores configurables | Perfil con URL/modelo/autenticación y adaptador; informar capacidades incompatibles. |
| RF-18 | Comandos LLM | Esquema, catálogo y validación; rechazar referencias ambiguas, argumentos inválidos y acciones no disponibles. |
| RF-19 | Contextos Cortana | Conversación, edición y análisis separados; consultas usan datos reales e identifican información faltante. |
| RF-20 | Avatar móvil | Conexión local, reproducción de estado/habla, calibración y reconexión sin duplicar comandos ni reiniciar el PC. |
| RF-21 | Estilo monocromático | Identificar bandos, selección, rutas y agua sin color; verificar ausencia de contornos ocultos indebidos. |
| RF-22 | Eventos | Registro cronológico con tiempo simulado y tipo de evento; no equivale a un timeline de reproducción. |

## 6. Reglas de edición y simulación

### Estado y persistencia

Estados: `EDITING → RUNNING ↔ PAUSED → FINISHED`. Reiniciar restaura la composición inicial y vuelve a edición. En el corte propuesto solo se cambian unidades, atributos y terreno en edición; pausa no habilita modificaciones automáticamente. Órdenes tácticas durante ejecución siguen pendientes de precisar.

Archivo versionado de composición: metadatos, referencia/versión de mapa base y datos suficientes para reconstruirlo, dimensiones, terreno, agua, plantillas necesarias, entidades con ID/bando/posición/orientación/atributos, rutas, objetivo, reglas y semilla. Validar rutas y referencias al cargar. No guardar batallas activas, credenciales, audio ni conversación. Indicar cambios sin guardar y no sustituir el escenario abierto si la carga falla.

### Coordenadas y terreno

- Metros; X/Z en el plano, Y como altura. Origen visible.
- El sistema calcula altura de unidades terrestres. Para unidades aéreas se requiere una regla explícita de altura válida.
- Superficie de alturas sin cuevas/voladizos en el MVP propuesto.
- Pendientes máximas y superficies permitidas por tipo; límites de pincel y altura por validar.
- Tras una edición, reajustar unidades terrestres y recalcular transitabilidad. Bloquear inicio si hay unidades/rutas ilegales o navegación aún pendiente.

### Movimiento, detección y combate

El usuario define rutas. No implementar búsqueda autónoma de enemigos por todo el mapa como comportamiento inicial. Propuesta pendiente de aclaración: al detectar un enemigo, compartir su posición con el bando y atacar si está en alcance y hay línea de tiro; si no, continuar ruta o esperar según política que se acuerde. No introducir persecución ni replanificación táctica compleja por defecto.

Modelo propuesto: vida, velocidad de desplazamiento, alcance visual, alcance de arma, daño y cadencia. Atributos configurables por instancia, con validación. Visibilidad depende de distancia y terreno. Compartir un avistamiento no permite disparar a través de obstáculos ni concede conocimiento permanente de todos los enemigos; la caducidad de avistamientos se definirá en el diseño de combate.

Resolución simple por eventos de daño, sin balística física. Desempate estable por ID cuando existan objetivos equivalentes. Paso lógico fijo, semilla para aleatoriedad y velocidad de reproducción propuesta `0.5× / 1× / 2× / 4×`; limitar multiplicadores si afectan el presupuesto medido. Comparar resultados al variar FPS y velocidad.

Primer objetivo: eliminación de un bando. Propuesta: límite de tiempo configurable para impedir ejecuciones sin fin; informar objetivo no cumplido o empate cuando corresponda. El resultado reconoce cumplimiento del objetivo y costes por bando, no solo una pantalla de victoria. Captura la bandera requiere reglas propias antes de añadirse.

## 7. Cortana: voz, contextos y contrato

Flujo: pulsar para hablar → STT → transcripción visible → contexto/LLM → intención estructurada → resolución → validación → ejecución → resultado → texto/TTS/avatar.

Contextos:

- Conversación: personalidad y conversación general/Halo. No habilita mutaciones sin intención explícita y herramientas disponibles.
- Editor: selección, punto marcado, entidades relevantes, catálogo y herramientas disponibles.
- Análisis: resumen del escenario, tiempo, objetivo, estadísticas y conocimiento del observador cuando exista información limitada. Cortana distingue hechos, sugerencias e incertidumbre. No altera reglas ni ordena unidades por iniciativa propia.

El catálogo habilitado corresponde al estado y funciones realmente implementadas. Contextos seleccionables y visible modo actual; transición inferida por lenguaje solo tras verificar que no active acciones accidentalmente.

| Acción | Argumentos principales | Disponibilidad |
|---|---|---|
| `add_unit` | plantilla, bando, colocación absoluta/relativa | Edición, posición legal. |
| `move_unit` / `rotate_unit` | ID y destino/orientación | Edición. |
| `remove_unit` / `select_unit` | ID | Entidad existente; borrar solo en edición. |
| `set_unit_attributes` | ID y atributos permitidos | Edición, valores acotados. |
| `set_route` | IDs y puntos | Edición; ruta válida. |
| `edit_terrain` / `paint_water` | herramienta/centro/radio/intensidad | Edición. |
| `start_simulation` / `pause_simulation` / `resume_simulation` | ninguno | Estado y mapa compatibles. |
| `reset_simulation` | ninguno | Restaurar composición inicial. |
| `set_simulation_speed` | multiplicador permitido | Simulación; no cambia velocidad física de unidades. |
| `undo` / `redo` | ninguno | Edición, historial disponible. |
| `describe_selection` / `get_scenario_summary` | ninguno | Consulta sin mutación. |

Ejemplo ilustrativo, no esquema implementado:

```json
{
  "schema_version": 1,
  "request_id": "req-001",
  "scenario_revision": 12,
  "status": "action_proposal",
  "actions": [{
    "name": "add_unit",
    "args": {
      "type_id": "scorpion",
      "team_id": "team-a",
      "placement": {
        "kind": "relative",
        "anchor_id": "unit-017",
        "relation": "near",
        "distance_m": 8
      }
    }
  }]
}
```

El sistema asigna/verifica solicitud y revisión; no confía en valores inventados por el LLM. Formalizar variantes excluyentes de conversación, aclaración y acción antes de implementarlas.

Reglas:

- Resolución relativa delegada al ingeniero: selección explícita, puntos nombrados o ID. No elegir entre homónimos. «Junto a» propone una separación visible y busca una posición legal; «derecha» requiere referencia del mapa/cámara/unidad definida.
- Una acción mutante por solicitud en el corte inicial; lotes solo con transacciones verificadas.
- Validar esquema, números finitos, límites, referencias, estado y revisión antes de mutar. Reintentos son idempotentes.
- Ejecutar acciones reversibles directamente con deshacer. Propuesta: confirmar reemplazo de composición o pérdida de ejecución; no confirmar cada colocación.
- Respuesta de éxito basada en resultado real, nunca en una frase anticipada del modelo.
- Timeout, STT incorrecto, JSON inválido o desconexión no bloquean controles manuales ni dejan mutaciones parciales.
- Configurar varios proveedores requiere adaptadores y capacidades: cambiar URL/modelo basta solo entre APIs compatibles. Voz, herramientas y formatos estructurados no tienen compatibilidad garantizada por compartir una URL configurable.
- Sin presupuesto: recorrido base debe tener una opción gratuita/local; APIs de pago son optativas y solo se usan con credenciales del usuario. No se presupone una cuota gratuita permanente.

## 8. Presentación móvil

Confirmado: PC controla la aplicación y móvil reproduce el modelo de Cortana. Propuesta de corte: audio de entrada y STT/LLM/TTS en PC; móvil muestra avatar y estados. Elegir una sola salida de voz activa para evitar doble audio; ubicación de salida por confirmar.

Mensajes versionados de sesión/estado/habla con secuencia y sincronización básica. Reconexión recupera estado actual, descarta mensajes viejos y no reejecuta acciones. El móvil no necesita el mapa ni el catálogo completo. Autorización local de dispositivo y acceso restringido a la sesión; no abrir herramientas del editor al cliente de presentación.

Modelo simple, reposo y reacción al habla al principio. Lip-sync fino y gestos extensos después. Si se usa reflector holográfico, fondo negro, espejo, escala y posición calibrables y prueba óptica separada. SO/modelo del móvil y uso de reflector pendientes; no asumir Android ni que un navegador esté descartado para este cliente de presentación.

## 9. Arquitectura y calidad

Módulos: asistente/voz, adaptadores de proveedor, comandos, dominio de escenario, editor 3D, simulación, persistencia y cliente móvil. Conversación debe arrancar sin cargar un escenario. Dominio y ejecutor pueden probarse antes del renderizado. Mismos comandos para entrada manual/LLM. PC es autoridad única.

Motor y stack todavía no seleccionados. T-02 debe comparar opciones gratuitas compatibles con Linux/Windows y móvil, contrastar documentación oficial y registrar decisión. `Cortana.md` detalla comportamiento y arquitectura funcional sin fijar motor o proveedores.

- RNF-01: edición manual y consulta de resultados disponibles aunque fallen IA/voz.
- RNF-02: invalidaciones y errores no corrompen composición; carga/exportación verificadas por ida y vuelta.
- RNF-03: perfiles de proveedor fuera de mapas; secretos sin versionar y logs sin claves/audio privado.
- RNF-04: meta propuesta de 30 FPS en escena de referencia; medir también con LLM/voz activos. No afirmar que la RTX 3050 garantiza la carga.
- RNF-05: medir latencias STT/LLM/ejecución/TTS y publicar objetivos tras el prototipo; no inventar tiempos garantizados.
- RNF-06: texto y controles en español; bandos y estados comprensibles sin color/audio.
- RNF-07: Linux es validación principal; Windows requiere ejecución real o declarar explícitamente qué exportación no se probó.
- RNF-08: controles de tamaño/atributos/mapa/configuración publicados, recursos provisionales con origen registrado y dependencias gratuitas para el recorrido base.

## 10. Decisiones y pendientes

| ID | Estado | Fecha | Decisión |
|---|---|---|---|
| D-01 | CONFIRMADA | 2026-10-05 | PC Linux principal, Windows deseado; modelo de Cortana en móvil. |
| D-02 | PROPUESTA | 2026-10-05 | Rutas y combate simple por encuentros; aclarar ejecución de órdenes antes de implementarlo. |
| D-03 | DESCARTADA | 2026-10-05 | Editor completo antes de IA; reemplazada por voz primero y dominio mínimo de comandos. |
| D-04 | DESCARTADA | 2026-10-05 | Primera entrega de producto por texto; texto queda como verificación interna previa a voz. |
| D-05 | PROPUESTA | 2026-10-05 | Terreno de alturas y máscara de agua para satisfacer elevar/bajar/aplanar y bloqueo. |
| D-06 | PROPUESTA | 2026-10-05 | Una acción mutante por solicitud; modelos sencillos y pulsar para hablar sí confirmados. |
| D-07 | CONFIRMADA | 2026-10-05 | MVP funcional y mejora iterativa visual/funcional. |
| D-08 | CONFIRMADA | 2026-10-05 | Voz → agente → diseño de interfaz → editor/simulación. |
| D-09 | CONFIRMADA | 2026-10-05 | Estética blanco/negro con modelos de contornos. |
| D-10 | PROPUESTA | 2026-10-05 | 200 × 200 m, 20 unidades iniciales y catálogo terrestre de cuatro plantillas. |
| D-11 | PROPUESTA | 2026-10-05 | Móvil como presentación y voz procesada en PC. |
| D-12 | PROPUESTA | 2026-10-05 | Barcos/transporte, captura la bandera y timeline navegable después del corte inicial. |

| ID | Pendiente | Impacto |
|---|---|---|
| Q-01 | Distribución Linux, CPU/RAM/VRAM y modelo/SO del móvil. | Stack, proveedores y empaquetado; no bloquea diseño documental. |
| Q-02 | Confirmar si el combate al detectar es automático o espera orden manual; conducta sin alcance y alcance de comunicación de bando. | T-14 y órdenes durante ejecución. |
| Q-03 | Fecha exacta y número/disponibilidad de integrantes. | Compromiso de calendario. |
| Q-04 | Confirmar límites y corte propuestos, inclusión de naves y etapa del móvil. | T-11, T-27 y aceptación final. |
| Q-05 | Reflector holográfico y ubicación de micrófono/salida de audio. | Calibración y sincronización PC/móvil. |

Preguntas Q-01 y parte de Q-02 enviadas al propietario. Resto puede resolverse con propuestas concretas durante T-02 y diseño, sin repetir el cuestionario completo.

## 11. Aceptación

M0: conversación por voz real, interrupción y recuperación tras fallo, sin editor requerido.
M1: comando ejecutado sobre estado real, resultado consultable y deshacer; herramientas no implementadas deshabilitadas.
M2: composición editable y recuperable, controles manuales y de asistente consistentes.
M3: rutas/visibilidad/combate/objetivo/estadísticas verificables, Cortana con datos reales y reproducción móvil según alcance acordado.

La entrega completa requiere revisar esos recorridos con el propietario. Tener documentación o pruebas técnicas no equivale a aceptación visual ni a una simulación implementada.
