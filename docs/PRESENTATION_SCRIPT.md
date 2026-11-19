# Visita al laboratorio UNSC: detrás de Cortana

**Guion para presentar la página web en vivo · 25 minutos · 14 de noviembre de 2026**

## Cómo usar este guion

La pantalla proyectada es la propia web. Las intervenciones se escriben para decirlas mirando al público; las indicaciones de **Pantalla** y **Acción** son para quien navega y no se leen en voz alta. Los cambios de página se hacen en las frases de enlace, sin anunciar «siguiente diapositiva».

**Premisa:** el público visita el Departamento de Investigación y Desarrollo del UNSC. Los expositores interpretan a investigadores que desarrollaron esta versión de Cortana y deben mostrar tanto el resultado como la organización que lo hace posible. Es una representación académica del universo de Halo. La creación colectiva del equipo es parte de la puesta en escena; no modifica la autoría de los recursos de terceros.

**Hilo conductor:** una idea necesita dirección, personas, colaboración, un producto comprobable y una forma de responder por él. El recorrido usa una estructura de actores, tareas y relevos: cada investigador entrega al siguiente una pregunta que su página responde.

**Base revisada:** web corporativa `Arturo2430/halo-unsc-corp-web`, rama `master`, commit `4824b2d`, descargada del remoto en una copia temporal; prototipo Cortana actualizado desde `origin/main` a `3331469`. Se toma esta web como fuente porque contiene las siete secciones solicitadas. La confirmación de la URL de exhibición y del número de participantes queda **[PENDIENTE]**. No se ha modificado el proyecto corporativo vecino.

### Reparto adaptable

Los cargos siguientes son papeles de la representación, no nuevos puestos añadidos al organigrama de la web. Sustituir los nombres antes del ensayo; utilizar Dra. o Dr. según corresponda.

| Clave | Personaje | Voz y función | Intérprete |
|---|---|---|---|
| A | Dirección científica | Anfitrión/a; tiene claro para qué existe el proyecto. Abre, presenta estrategia y cierra. | [PENDIENTE] |
| B | Arquitectura de sistemas | Explica cómo se conectan las áreas y demuestra Cortana; humor seco y breve. | [PENDIENTE] |
| C | Calidad y operación | Pregunta «¿cómo lo comprobamos?». Presenta cultura y compromisos con ejemplos. | [PENDIENTE] |
| D | Enlace y experiencia | Representa a las personas usuarias, presenta atención y opera la navegación durante las otras intervenciones. | [PENDIENTE] |

Con tres personas, unir C y D; A toma el navegador mientras habla ese personaje. Con dos, unir A+C y B+D. Con cinco, asignar la operación del navegador a la quinta persona y darle las preguntas de D en Productos. No hace falta añadir discursos: se redistribuyen los existentes. Con cuatro, B opera la página durante Atención al cliente.

**Vestuario y actuación:** batas, gafetes de I+D y una libreta bastan. Actuar como colegas que conocen su laboratorio: pequeñas preguntas y réplicas, sin gritar órdenes ni imitar una alarma militar. El humor nunca debe tapar una cifra, una condición de compra o una explicación importante.

## Ruta y reloj maestro

**WEB** = dirección donde se muestre la web corporativa, **[PENDIENTE]**. Las rutas se agregan a esa dirección. **CORTANA** = `http://localhost:3000` en el PC que ejecuta el prototipo. Son aplicaciones distintas; no buscar `/control` dentro de la web corporativa.

| Tiempo acumulado | Duración | Tema | Pantalla y parada principal | Lleva la voz |
|---|---:|---|---|---|
| 00:00–02:00 | 2:00 | Página Web | WEB `/`: portada y «Nuestras Divisiones» | A y D |
| 02:00–06:00 | 4:00 | Nuestra Estrategia | WEB `/estrategia`: misión, visión, valores, FODA, objetivos y plan | A, con B y C |
| 06:00–09:30 | 3:30 | Nuestra Organización | WEB `/organizacion`: organigramas y equipo | B, con A y D |
| 09:30–12:30 | 3:00 | Nuestra Forma de Trabajar | WEB `/cultura`: cuatro capítulos | C, con B y D |
| 12:30–17:30 | 5:00 | Productos | WEB `/productos` → catálogo → ficha de Cortana; demo breve opcional | B y D, con A |
| 17:30–20:30 | 3:00 | Nuestro Compromiso | WEB `/compromiso`: estándares, metas y verificación | C, con A |
| 20:30–24:00 | 3:30 | Atención al cliente | WEB `/atencion-al-cliente`: canales, proceso y formulario | D, con B y C |
| 24:00–25:00 | 1:00 | Cierre | Volver a WEB `/productos/cortana` | A; remate de B |
| **Total** | **25:00** | **Siete temas y cierre** | **Navegación, pausas y demostraciones incluidas** | |

Los tiempos son una estimación de ensayo, no una duración ya medida. Los parlamentos contienen aproximadamente 2.200 palabras: a 120–130 palabras por minuto representan unos 17–19 minutos de voz. Los 6–8 minutos restantes se reservan para desplazamientos, observación, relevos y demostraciones; no son minutos extra sobre la tabla. Dejar respirar las acciones indicadas. Las preguntas del público se atienden después del minuto 25; dentro del recorrido solo se usa la pregunta breve prevista en Productos.

## 1. Página Web · 00:00–02:00

**Objetivo:** situar al público dentro de la visita y explicar qué comunica la página.

**Pantalla:** portada de WEB `/`. Mantener visible el titular «Defendemos el futuro de la humanidad» mientras abre A. No empezar desplazándose.

**A:**

> Bienvenidos al Departamento de Investigación y Desarrollo del UNSC. Hoy tienen autorización para entrar al laboratorio; las claves de los astilleros todavía no vienen incluidas. Somos el equipo que desarrolló nuestra versión de Cortana y vamos a enseñarles algo que normalmente queda detrás de una demostración: las decisiones y las personas que hacen posible el proyecto.
>
> Esta es nuestra interpretación académica de una organización del universo de Halo. La página será nuestro mapa de visita. Aquí presentamos una organización que combina ingeniería, investigación y tecnología con un propósito: proteger a la humanidad y ampliar sus posibilidades.

**Acción — D:** señalar el menú. Abrir **Organización** para mostrar sus cuatro destinos y cerrarlo sin salir. Señalar **Productos** y **Atención al cliente**. Pulsar **Explorar Tecnología** para llegar a `/#servicios`.

**D:**

> La entrada ofrece tres preguntas: quiénes somos, qué podemos ofrecer y cómo contactarnos. Al bajar encontramos ingeniería aeroespacial, armamento avanzado, investigación científica y defensa galáctica. Hoy venimos desde investigación; eso explica por qué nuestra visita terminará cerca de una inteligencia artificial azul.

**A — enlace:**

> Pero antes de encender a Cortana tenemos que contestar algo: ¿para qué desarrollar otra tecnología? Esa respuesta está en nuestra estrategia.

**Salida a las 02:00:** D abre **Organización → Nuestra estrategia**. Las cifras de la portada pertenecen a la ambientación corporativa ficticia; no dedicar tiempo a defenderlas como datos históricos reales.

## 2. Nuestra Estrategia · 02:00–06:00

**Objetivo:** conectar propósito, diagnóstico, metas y ejecución; no leer todos los recuadros.

### 02:00–03:00 · Propósito y dirección

**Pantalla:** `/estrategia#mission-vision`.

**A:**

> Nuestra misión explica el trabajo de hoy: desarrollar soluciones balísticas, tácticas y aeroespaciales, apoyadas por investigación científica. La visión marca hacia dónde queremos llegar: ser un soporte del progreso y la seguridad. Una orienta la actividad; la otra nos obliga a mirar más allá del siguiente experimento.
>
> En nuestro departamento eso se traduce en una pregunta práctica: ¿qué necesita una persona para entender información y tomar mejores decisiones? Cortana es el proyecto con el que vamos a recorrer esa pregunta. El avatar llama la atención, pero el propósito tiene que seguir siendo ayudar al usuario.

### 03:00–03:40 · Valores

**Acción — D:** bajar a **Nuestros valores**. Mostrar **Innovación** y **Disciplina** mediante los controles de las tarjetas; mencionar los cinco sin leer sus descripciones completas.

**A:**

> Nos guían innovación, lealtad, excelencia, cambio y disciplina. Innovación permite proponer; disciplina exige revisar lo que propusimos. La excelencia pierde sentido si nadie comprueba cómo funciona el resultado, y el cambio sirve cuando aprendemos algo y ajustamos la siguiente versión.

**B:**

> En sistemas tenemos una traducción más corta: «a mí sí me funcionó» todavía no es una prueba de laboratorio.

### 03:40–04:30 · FODA

**Acción — D:** centrar **Análisis FODA** con sus cuatro cuadrantes visibles.

**A:**

> El FODA pone límites al entusiasmo. Entre las fortalezas aparecen personal capacitado y alto nivel tecnológico. Entre las debilidades, periodos largos de desarrollo y costos elevados. El mercado civil abre una oportunidad; los recortes presupuestarios y las controversias éticas representan amenazas.
>
> Por eso no basta con proponer la idea más ambiciosa. Tenemos que elegir qué problema atender primero, qué recursos requiere y qué riesgo podemos asumir. Una buena decisión también puede ser dejar una función fuera de la primera versión.

### 04:30–06:00 · SMART, estrategia y plan

**Acción — D:** abrir **Optimización de Inteligencia Artificial** en **Objetivos y Metas**. Mostrar el 30 % y el cuarto trimestre de 2027. Después bajar a **Enfoque Táctico** y al primer bloque de **Plan de Acción**.

**A:**

> El primer objetivo propone mejorar un treinta por ciento el procesamiento y la precisión predictiva antes del cuarto trimestre de dos mil veintisiete. Es una meta del escenario corporativo, no un resultado medido de nuestra aplicación. La página permite ver qué se quiere cambiar, cuánto, para qué y en qué plazo.
>
> La estrategia asociada se llama Evolución Neuronal Cuántica. El plan la convierte en una iniciativa con recursos, responsable e indicador. Las otras líneas atienden materiales y seguridad operativa: la investigación debe convivir con el presupuesto y la continuidad del servicio.

**C:**

> Y cuando se cumpla el plazo, mi departamento pedirá evidencia. La tipografía del treinta por ciento es excelente, pero todavía necesitamos medirlo.

**A — enlace:**

> Ya tenemos dirección. Ahora falta algo que ningún objetivo hace por sí solo: asignar quién se encarga de cumplirlo.

## 3. Nuestra Organización · 06:00–09:30

**Pantalla:** abrir **Organización → Nuestra organización**, ruta `/organizacion`. Pulsar **Explorar organigramas**.

### 06:00–07:10 · Mando y fuerzas

**B:**

> Aquí se ve cómo repartimos responsabilidades. En Fuerzas operativas, el comando central conecta con UNICOM, NAVCOM y Spartan Ops. UNICOM coordina la operación terrestre; NAVCOM, la naval y espacial; Spartan Ops concentra una división especializada.
>
> La utilidad del organigrama es entender relaciones. Una necesidad de suministro no se resuelve por la misma vía que una necesidad de investigación, aunque ambas puedan aparecer durante un mismo proyecto. Si cada problema llega a cualquier escritorio, terminamos investigando quién tenía que investigarlo.

**Acción — D:** seleccionar **NAVCOM** y mostrar su ficha. Desplegar sus divisiones; señalar **NAVLOGCOM** y **ONI** sin abrir todas las unidades del árbol.

**B:**

> NAVLOGCOM aparece vinculada al abastecimiento y ONI a inteligencia e investigación clasificada. Estas funciones explican las dependencias: desarrollar tecnología exige información, recursos y coordinación con quienes la van a utilizar.

### 07:10–08:30 · Áreas operativas

**Acción — D:** cambiar a **Áreas operativas**. Seleccionar **I+D**, después **INGENIERÍA** y **AUDITORÍA**. A opera el ratón si D interviene.

**B:**

> En Áreas operativas encontramos el trabajo que sostiene a la organización: recursos humanos, medicina, ingeniería, finanzas, investigación y desarrollo, auditoría y legal. Nuestro papel de investigadores se ubica en I+D. Ingeniería convierte propuestas en soluciones técnicas; finanzas evalúa los recursos, y auditoría revisa riesgos y cumplimiento.

**D:**

> Pensemos en una persona que no logra preparar la voz de Cortana. Primero necesitamos comprender su dificultad. Después, sistemas e ingeniería revisan la configuración, e investigación valora si debemos mejorar la experiencia. Es un caso de ejemplo para seguir el recorrido, no una incidencia real que estemos reportando.

**A:**

> Lo importante es que cada área sabe qué aporta y a quién entrega el resultado. Compartir un propósito permite coordinarse sin pretender que todos hagan exactamente lo mismo.

### 08:30–09:30 · Equipo

**Acción — D:** bajar a **Líderes de división**. Mostrar Halsey; usar **Ver más líderes** para llegar a Cortana si está oculta.

**B:**

> En el equipo representado por la web, Catherine Halsey ocupa la dirección científica y Cortana aparece como asesora estratégica. Nuestra puesta en escena toma ese entorno para presentar una versión propia y acotada del asistente. El personaje del universo Halo y las capacidades del prototipo que mostraremos son cosas distintas.

**B — enlace:**

> El organigrama nos dice quién participa. Para explicar cómo consigue trabajar en conjunto, tenemos que entrar al laboratorio cotidiano.

## 4. Nuestra Forma de Trabajar · 09:30–12:30

**Pantalla:** `/cultura`. Mostrar los capítulos **Liderazgo**, **Comunicación**, **Motivación** y **Trabajo en equipo**. D se detiene en cada uno al cambiar la conversación.

### 09:30–10:20 · Liderazgo

**C:**

> Nuestra forma de trabajar combina liderazgo directivo en la estrategia y participación en los laboratorios. La dirección establece prioridades y límites; el equipo técnico propone cómo resolver el problema. Si la solución ya estuviera decidida de antemano, nos ahorraríamos el laboratorio, pero también toda posibilidad de aprender.

**B:**

> Por ejemplo, el objetivo puede ser conversar con Cortana de manera clara. Dentro del equipo discutimos cómo presentar el texto, cuándo reproducir voz y cómo permitir que una persona interrumpa una respuesta.

### 10:20–11:05 · Comunicación

**Acción — D:** ir a `#communication`.

**C:**

> La comunicación debe ser ágil, estructurada y segura. Eso incluye reportar avances y bloqueos con claridad. Para el caso de la voz, decir «no funciona» ayuda menos que explicar qué acción hicimos, qué esperábamos y qué apareció en pantalla.
>
> A partir de esa información otra persona puede reproducir el problema. El respeto profesional también consiste en darle al siguiente equipo el contexto suficiente para trabajar, en lugar de entregarle una sorpresa envuelta en un mensaje urgente.

### 11:05–11:40 · Motivación

**Acción — D:** ir a `#motivation`.

**C:**

> La página habla de acceso a tecnología, crecimiento, reconocimiento y proyectos de impacto. En la visita, lo relacionamos con algo sencillo: entender para quién hacemos el trabajo. Preparar una interacción que otra persona pueda usar también merece reconocimiento; los avances pequeños sostienen los proyectos grandes.

### 11:40–12:30 · Colaboración y relevo

**Acción — D:** ir a `#teamwork`. Dejar la ilustración de colaboración visible.

**D:**

> El usuario no recibe por separado el esfuerzo de diseño, ingeniería e investigación. Recibe una experiencia completa. Si la respuesta es correcta pero nadie entiende cómo enviarla, el trabajo colectivo sigue incompleto.

**C:**

> Por eso usamos equipos interdisciplinarios y valoramos el resultado común. La mejor idea puede venir de quien programa, de quien prueba o de quien pregunta algo que todos habíamos dado por obvio.

**C — enlace:**

> Hemos visto el propósito, el equipo y la forma de colaborar. Es momento de mostrar en qué se convierten esas decisiones.

## 5. Productos · 12:30–17:30

**Objetivo:** presentar la oferta de la web y elegir Cortana como ejemplo, sin convertir el bloque en una lista de artículos.

### 12:30–13:30 · Oferta y categorías

**Acción — D:** abrir el menú **Productos → Explora nuestros productos**, ruta `/productos`. Detenerse en el Warthog y en **Tu día, con Cortana**. Después abrir **Todo el catálogo** y mostrar las categorías.

**B:**

> El catálogo reúne líneas diferentes: protección, movilidad, aeronaves, electrónica, inteligencia artificial, robótica y suministros, además de armas y herramientas. Esa variedad responde a actividades distintas. La persona debe poder encontrar lo que necesita sin conocer nuestra estructura interna.
>
> Vean la diferencia entre un vehículo como el Warthog y una licencia de software. No comparten instalación, entrega ni condiciones. Por eso la página distingue compra directa, venta regulada, pedido especializado y licencia digital. Hoy nos concentraremos en esta última.

**Acción — D:** elegir **Inteligencia artificial** o abrir `/productos/catalogo?categoria=ai`; buscar **Cortana** y abrir su ficha `/productos/cortana`.

### 13:30–14:55 · Cortana como propuesta de producto

**D:**

> Aquí encontramos para quién se propone Cortana: una persona que quiere organizar actividades y conversar por voz o texto. La ficha presenta agenda, listas y rutinas con dispositivos compatibles. La modalidad es licencia personal, con pago único; no incluye el equipo ni un proyector.
>
> En la versión revisada del catálogo, el precio de oferta es de mil quinientos noventa pesos mexicanos y el regular es de mil novecientos noventa. Son precios del escenario académico. Al presentar hay que leer los que realmente aparezcan en la web, porque pueden cambiar.

**Acción — D:** señalar **Ficha técnica** y **Entrega y devoluciones**. Mostrar activación digital, revisión de compatibilidad y soporte tras la activación. Mantener el visor en **Imagen** si el modelo externo no carga; ese recurso no es la aplicación conversacional.

**B:**

> Como investigadores también tenemos que delimitar la demostración. La ficha describe la propuesta de producto. Nuestro prototipo de hoy demuestra conversación, voz local y avatar; todavía no ejecuta agendas, recordatorios ni control de dispositivos. Nos interesa que puedan distinguir lo que ven funcionar de lo que plantea el catálogo.

### 14:55–16:55 · Experiencia del prototipo

**Acción — D:** cambiar a la pestaña preparada de CORTANA `/control`. Mostrar avatar, editor y **Enviar mensaje**. No abrir configuraciones ni cambiar proveedor durante la exposición.

**B:**

> En esta versión la persona escribe o dicta, revisa el texto y decide enviarlo. El personaje acompaña la conversación, y la respuesta puede escucharse cuando la voz está preparada. También podemos cancelar. Queremos conservar una regla sencilla: la persona mantiene el control de la interacción.

**D — pregunta al público, máximo diez segundos:**

> Si estuvieran preparando una exposición con poco tiempo, ¿preferirían que una asistente ordenara sus ideas o que decidiera por ustedes qué decir? Pueden responder con una mano: ordenar ideas.

**B:**

> Ese es el tipo de ayuda que vamos a pedirle. La respuesta debe servirnos para trabajar mejor, manteniendo la decisión de nuestro lado.

**Acción — D:** escribir y enviar **una sola vez**: `Cortana, dame dos consejos breves para preparar una exposición sin leer la pantalla.` Mostrar la respuesta; si el audio ya está preparado, escucharla. Reservar **hasta 35 segundos** para respuesta y audio. No predeterminar lo que Cortana dirá: comentar una idea que realmente haya respondido.

**Si aparece respuesta, B dice:**

> Eso es lo que podemos examinar aquí: qué entendió, si su respuesta es útil y si la interacción se entiende. El avatar aporta presencia; la ayuda depende de la conversación.

**Si no hay respuesta en el plazo, usar solamente la alternativa del apartado «Plan de continuidad» y volver a la ficha.**

### 16:55–17:30 · De la demostración al compromiso

**Acción — D:** volver a WEB `/productos/cortana`. A toma la intervención mientras termina la navegación.

**A:**

> Lo que acabamos de mostrar conecta el recorrido: una necesidad orienta la estrategia; varias áreas convierten esa necesidad en una experiencia; la ficha explica para quién se propone y bajo qué condiciones. La responsabilidad sigue después de mostrar el producto.

**B — enlace:**

> Cortana puede responder muchas preguntas. Pero hay una que nos corresponde responder a nosotros: ¿con qué criterios vamos a decir que nuestro trabajo merece confianza?

## 6. Nuestro Compromiso · 17:30–20:30

**Pantalla:** `/compromiso`. Bajar a **Nuestros estándares**, después a **Medimos nuestros resultados** y terminar en **Seguimiento y mejora**.

### 17:30–18:20 · Estándares

**C:**

> Nuestros estándares son protección táctica, transparencia y fiabilidad. Dentro del escenario UNSC abarcan defensa, información y equipamiento. Aplicados a nuestra visita, nos hacen preguntas concretas: ¿la persona conoce los límites?, ¿entiende las condiciones?, ¿puede reconocer un fallo y pedir ayuda?
>
> Mostrar algo atractivo es una parte del trabajo. Explicar qué incluye una licencia, qué necesita una instalación y qué hace realmente la versión presentada también construye confianza. Una promesa técnica debe poder explicarse sin pedirle al usuario que adivine la letra pequeña.

### 18:20–19:15 · Indicadores con significado

**Acción — D:** señalar las tres tarjetas sin mover la página mientras C explica los alcances.

**C:**

> Aquí hay tres referencias: respuesta de despliegue de hasta doce horas en sistemas prioritarios; la meta de emitir todas las alertas críticas en menos de treinta minutos; y una tasa máxima de fallas de equipamiento del dos por ciento.
>
> La propia página aclara que son indicadores y metas por alcanzar. No son resultados obtenidos, ni describen la velocidad del chat de Cortana. Cada número tiene un alcance. Si cambiamos lo que mide para que suene mejor, dejamos de evaluar el compromiso y empezamos a decorar la pantalla.

**A:**

> Entonces, antes de preguntar «¿cumplimos?», necesitamos saber qué medimos, durante qué periodo y con qué registro vamos a sostener la respuesta.

### 19:15–20:30 · Revisar, corregir y verificar

**Acción — D:** mostrar las tarjetas de auditoría, monitoreo y control logístico; terminar en **Revisar → Corregir → Verificar**.

**C:**

> Para eso aparecen auditorías tácticas, monitoreo en red y control logístico. El ciclo termina en tres verbos: revisar, corregir y verificar. Revisar compara lo ocurrido con la meta; corregir busca la causa y asigna una acción; verificar comprueba si esa acción sirvió.
>
> En el ejemplo de una instalación de voz, no cerraríamos la revisión al escribir una instrucción nueva. Tendríamos que comprobar que la instrucción permite completar el paso que antes resultaba confuso. Cambiar algo y mejorar algo no son automáticamente lo mismo.

**C — enlace:**

> Hay una fuente de información que ningún laboratorio debería ignorar: la persona que usa el producto. Por eso la última parada es nuestro canal de atención.

## 7. Atención al cliente · 20:30–24:00

**Pantalla:** cambiar a la pestaña ya preparada de `/atencion-al-cliente`, con el formulario rellenado y todavía sin registrar. Subir a la cabecera por desplazamiento, sin recargar ni volver a abrir la ruta: así se conservan los campos. B opera el navegador; D explica. La demostración usa exclusivamente los datos ficticios de la tabla siguiente.

### 20:30–21:15 · Canales y proceso

**D:**

> Atención al cliente conecta lo que proponemos con lo que las personas necesitan. La página reúne correo, WhatsApp, Instagram y Facebook; al seleccionar un canal copiamos sus datos. Para esta visita solo mostramos el funcionamiento: no enviaremos mensajes a ninguna cuenta.
>
> El proceso se presenta en tres pasos: te escuchamos, revisamos tu solicitud y te damos respuesta. Cada paso debe acercarnos a entender el problema o la propuesta. En una organización grande, saber dónde empezar ya es una parte importante de la atención.

**Acción — B:** mostrar **Hablemos de lo que necesitas** y **Nuestro proceso de atención**. Usar **Preparar mi solicitud** para llegar al formulario.

### 21:15–22:00 · Elegir qué se necesita

**D:**

> El formulario distingue queja, reclamación y sugerencia. Una queja expresa una experiencia de atención insatisfactoria; una reclamación plantea un incumplimiento y una solución solicitada; una sugerencia propone una mejora. Elegir bien ayuda a dar contexto al área responsable.
>
> Retomemos el caso del laboratorio: una compañera pide una guía más clara para preparar la voz de Cortana. Vamos a registrarlo como sugerencia, dirigida a investigación y desarrollo. El relato debe decir qué necesita, en qué situación y qué resultado espera.

**Acción — B:** completar o revisar los datos ya preparados en el formulario, sin registrar antes de la intervención de C. Los adjuntos son opcionales y se omiten para respetar el tiempo.

| Campo | Dato de ensayo |
|---|---|
| Nombre completo | Equipo de Investigación — Ensayo |
| Correo electrónico | ensayo@example.test |
| Tu relación con UNSC | Personal del UNSC |
| Tipo de solicitud | Sugerencia |
| Área relacionada | Investigación y desarrollo |
| Tema de la solicitud | Información sobre productos y servicios |
| ¿A quién afecta? | Afecta a un equipo u organización |
| Título de la solicitud | Guía de configuración para Cortana |
| Motivo y descripción | Durante una prueba de laboratorio necesitamos una guía breve para preparar la voz de Cortana y comprobar que la configuración quedó lista. |
| ¿Qué resultado esperas? | Incluir una guía de inicio con pasos de instalación y una prueba de voz. |
| Referencia y evidencia | Dejar vacías; no inventar un pedido ni una incidencia real. |

### 22:00–23:30 · Registro visible

**C:**

> El nivel de detalle importa. Con este texto podemos identificar la mejora propuesta; con «arréglenlo» solo sabríamos que alguien está teniendo un día complicado. Revisamos la información antes de confirmar y conservamos una referencia del registro.

**Acción — B:** marcar la confirmación, pulsar **Registrar solicitud** una vez y mostrar **Solicitud registrada**. Señalar **Descargar comprobante**; si se ensayó correctamente, descargarlo. Reservar hasta 45 segundos para esta operación. No eliminar registros ajenos ni activar contactos externos.

**D:**

> En esta terminal de exhibición el registro queda guardado en el navegador y puede descargarse. Eso demuestra la captura y el comprobante; no acredita que un área externa haya recibido la solicitud ni que ya exista una solución. El proceso de atención descrito en la web es el compromiso organizacional que estamos representando.

### 23:30–24:00 · Cerrar el ciclo

**D:**

> La utilidad de recibir comentarios es convertirlos en decisiones: aclarar una instrucción, revisar un producto o mejorar una interacción. Así, la experiencia de una persona puede alimentar el trabajo del equipo que vimos en el organigrama.

**C — enlace:**

> Y regresamos a nuestra primera pregunta. La tecnología sirve cuando ayuda a alguien, y una organización demuestra su compromiso cuando también escucha lo que debe cambiar.

## 8. Cierre · 24:00–25:00

**Acción — B:** volver a WEB `/productos/cortana`. Mantener la imagen del producto; todo el equipo mira al público. No abrir otra demostración.

**A:**

> Hoy entraron por una página web y recorrieron el trabajo que sostiene una propuesta tecnológica: estrategia para elegir el rumbo, organización para repartir responsabilidades, colaboración para construir, productos para atender necesidades y compromisos para responder por ellos.
>
> Cortana representa la parte visible de nuestro laboratorio. Detrás están las personas, las decisiones y la disposición de revisar lo que hacemos. Esa es la organización que quisimos presentarles.

**B:**

> Gracias por visitar Investigación y Desarrollo. Pueden devolver sus gafetes; las buenas preguntas se quedan con nosotros.

**A:**

> Ahora sí, abrimos el espacio para sus preguntas.

## Preparación de la visita

1. **Confirmar la web que se proyectará.** Debe incluir el contenido de `master` `4824b2d`: menú **Organización**, menú **Productos**, catálogo, ficha de Cortana y formulario con **Queja / Reclamación / Sugerencia**. La copia local antigua de la rama `feat/atencion-al-cliente` no contiene todo ese recorrido. URL final: **[PENDIENTE]**.
2. Abrir las páginas en pestañas, en el orden del reloj maestro; guardar también la ficha de Cortana y el formulario. Navegar por el menú para presentar el sitio; usar las pestañas como respaldo si un desplegable demora. No inventar anclas para FODA, objetivos o plan: llegar por desplazamiento y por sus encabezados.
3. Preparar nombre de intérpretes, cronómetro visible solo para el equipo y una señal discreta de cambio de bloque. D opera casi toda la visita y B toma el ratón en Atención. No escribir ni leer el guion desde la pantalla proyectada.
4. **Cortana es una extensión opcional de Productos.** Para mostrarla, el prototipo actualizado debe estar iniciado mediante `npm run demo`, con proveedor y voz que ya funcionen en ese PC. Se puede demostrar solo texto. No instalar motores, introducir claves, cambiar proveedores ni calibrar un reflector en escena. La demostración física sigue aplazada.
5. Preparar el formulario con los datos ficticios anteriores en una pestaña de ensayo propia y sin solicitudes personales. Revisar el almacenamiento del navegador. Dejar el registro final para la exposición. Las direcciones de contacto son parte de la representación; no probarlas enviando mensajes.
6. Ensayar una vez con navegación y voz reales del expositor, no solo leyendo el Markdown. Apuntar el tiempo de cada salida y ajustar las pausas a 25 minutos. Este documento no certifica el ensayo, el funcionamiento del sitio desplegado ni una aceptación humana del prototipo.

## Plan de continuidad y ajuste de tiempo

| Situación | Qué hace quien navega | Frase o decisión del equipo |
|---|---|---|
| Una página tarda más de 10 segundos | Abrir la pestaña de esa ruta que quedó preparada. Si tampoco carga, mantener la última página visible y continuar la explicación. | «Seguimos el recorrido desde el siguiente punto del laboratorio.» No simular un clic exitoso. |
| El 3D externo de la ficha no carga | Seleccionar **Imagen** y continuar con la ficha técnica. | «La imagen nos permite revisar la presentación; las condiciones del producto siguen aquí.» |
| Cortana no responde dentro de los 35 segundos reservados | Pulsar **Cancelar respuesta** y volver a la ficha. | B: «Esta prueba no se completó. Seguimos con lo que sí podemos mostrar: la ficha, las condiciones y los criterios con los que revisaríamos el fallo.» No leer una respuesta inventada como si la hubiera generado la aplicación. |
| No se hará demo del prototipo | Permanecer en la ficha durante 14:55–16:55. Mostrar **Voz y texto**, **Agenda, listas y recordatorios**, compatibilidad y entrega. Mantener la pregunta al público. | B explica la propuesta del catálogo y los límites ya descritos. D pregunta: «¿Qué necesitarías saber antes de activar una licencia?». B responde sobre compatibilidad, dispositivo y soporte durante el tiempo restante. |
| El formulario no guarda | Mostrar los datos del ejemplo sin pulsar repetidamente. Si existe un comprobante de un ensayo previo propio, identificarlo como tal; en caso contrario, explicar los campos. | D: «El registro no se completó en esta prueba; estos son los datos que necesita la solicitud.» No afirmar que fue recibido. |
| Se acumula un minuto de retraso | Eliminar la pregunta al público, no recorrer cada categoría del catálogo y omitir la descarga del comprobante. Mantener los siete temas. | A: «Para cerrar el recorrido, vamos directamente al criterio que conecta estas dos áreas.» |
| Se llega antes al último bloque | Dejar observar organigramas, ficha o comprobante; no añadir funciones o resultados nuevos. | Reservar hasta 30 segundos para preguntar qué dato faltaría en la solicitud y relacionar la respuesta con el formulario. |

## Fuentes y alcance de revisión

El texto corporativo se verificó en código fuente de la web remota, no mediante un recorrido renderizado de su despliegue. Las siguientes rutas son referencias al repositorio y a la revisión utilizada; no son la URL del sitio en vivo.

| Bloque del guion | Fuente comprobada |
|---|---|
| Página y navegación | [Navbar.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/Navbar.astro), [HeroSection.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/HeroSection.astro), [FeaturesSection.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/FeaturesSection.astro) |
| Estrategia | [estrategia.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/pages/estrategia.astro) y sus bloques de misión/visión, valores, FODA, objetivos, estrategias y plan |
| Organización | [InteractiveOrgChart.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/InteractiveOrgChart.astro), [OrgTeamSection.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/OrgTeamSection.astro) |
| Forma de trabajar | [CultureSections.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/CultureSections.astro) |
| Productos y licencia Cortana | [products.ts](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/data/products.ts), [product-details.ts](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/data/product-details.ts), [ProductDetail.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/ProductDetail.astro) |
| Compromiso e indicadores | [CommitmentSections.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/CommitmentSections.astro) |
| Atención y alcance del registro | [customer-service.ts (datos)](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/data/customer-service.ts), [ComplaintForm.astro](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/components/blocks/ComplaintForm.astro), [customer-service.ts (persistencia local)](https://github.com/Arturo2430/halo-unsc-corp-web/blob/4824b2d/src/lib/customer-service.ts) |
| Capacidades reales de esta versión de Cortana | [Arquitectura local](ARQUITECTURA.md), [voz PC](VOZ_PC.md) y `server/providers.js` en `3331469` |

Las conversaciones entre investigadores, la visita y la solicitud de ejemplo son recursos de representación creados para esta exposición. Las metas del UNSC no se presentan como resultados reales; las rutinas y agendas propuestas en el catálogo no se atribuyen al prototipo conversacional actual.
