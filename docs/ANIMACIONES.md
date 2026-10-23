# Animaciones de Cortana

Implementación del 2026-10-23. Nueve clips locales sobre el rig existente; sin instalar Blender, cambiar avatar ni pedir ajustes manuales al propietario. El GLB original permanece intacto. Son animaciones de desarrollo, no arte final aprobado.

## Qué se corrigió

El generador anterior tomaba las rotaciones iniciales del GLB como pose neutra. Aunque el visor no reproducía su clip `Twerking`, conservaba pelvis y piernas de esa pose exportada: rodillas flexionadas aproximadamente 37° y 28°. Solo recolocaba los brazos y añadía respiración mínima.

Ahora se recuperan orientaciones relativas de las matrices de bind, conservando las unidades originales del recurso. Se reconstruye una referencia T para adaptación y una base con rodillas relajadas —aproximadamente 10° de flexión—. Un cálculo IK de dos segmentos mantiene tobillos, orientación de pies y dedos del pie estables al cambiar de apoyo. También coloca los brazos en saludo, pensamiento y cintura. Las manos de reposo se relajan en lugar de conservar los puños de la fuente.

## Catálogo implementado

| Clip | Duración | Uso |
|---|---|---|
| `idle` | 6 s, bucle | Reposo con movimiento de cabeza/torso y pequeño balanceo de pelvis |
| `wave` | 3.6 s | Saludo con elevación, oscilación de mano y acompañamiento de cabeza/torso |
| `nod` | 2.4 s | Asentir con cabeza y cuello |
| `shake_head` | 2.8 s | Negar con giros de cabeza y cuello |
| `think` | 6 s, bucle | Mano próxima al mentón, inclinación de cabeza y brazo de apoyo |
| `hands_on_hips` | 6 s, bucle | Manos a la cintura, codos abiertos y movimiento sutil de cabeza |
| `listen` | 6 s, bucle | Cabeza inclinada y orientación atenta |
| `explain` | 7 s, bucle | Gesticulación de brazos/manos durante voz |
| `shift_weight` | 6 s | Cambio de apoyo sin pasos, con compensación de columna y mirada |

Las posturas mantenidas entran y salen mediante mezcla de 0.35 s. Elegidas manualmente duran 8 s; los gestos finitos usan su propia duración. **Automático** libera el gesto manual y recupera el comportamiento de conversación; no fuerza reposo mientras Cortana habla o escucha.

- `listening` confirmado → `listen`.
- `processing` durante ≥0.6 s → `think`; las esperas cortas evitan un cambio fugaz de postura.
- `speaking` por reproducción real → `explain`.
- Resto → `idle`. En `idle`/`responded`, tras 18 s de reposo aparece un cambio de apoyo y vuelve a la base.

Un gesto manual tiene prioridad hasta finalizar o expirar; después vuelve al estado vigente. Cambiar estado o gesto interrumpe las acciones anteriores sin callbacks que restauren una postura antigua. Sí/no son manuales: no se infiere aprobación o negación buscando palabras en el texto del LLM. No hay herramientas del LLM, sincronización labial ni expresiones faciales nuevas; el modelo no tiene morph targets faciales.

## Movimientos reutilizados y procedencia

Se adaptaron `Idle_Loop` e `Idle_Talking_Loop` de la **Universal Animation Library**, de Quaternius, con agradecimiento del autor a Gonzalo Furnier. Licencia [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/), declarada en la [distribución oficial](https://quaternius.itch.io/universal-animation-library). Se obtuvo la edición glTF de 2025 desde el [espejo público de J-Ponzo](https://github.com/J-Ponzo/gltf-universal-animation-library), revisión `e24c23cf2a1323488a3faa226ea7ea21f644b73e`; no se presenta como la edición actual del paquete oficial.

`tools/animation-sources/quaternius-upper-body.json` conserva solo rotaciones globales de la referencia T y de dos clips de torso/cabeza/brazos/dedos, con hashes de los archivos glTF/bin de origen. No incluye geometría, texturas ni otro avatar. La licencia completa está en `tools/animation-sources/CC0-1.0.txt`. El generador mapea los huesos y transfiere sus rotaciones respecto de esa referencia a Cortana; conserva las piernas del rig destino y corrige manos/contactos. Saludo, sí/no, pensar, cintura, escucha y cambio de apoyo combinan esa base con curvas propias e IK.

La CC0 de las curvas fuente no cambia la atribución ni las restricciones declaradas del modelo de Cortana. Véase [modelo y atribución](../public/models/README.md).

## Archivos y reproducción

- `src/services/animation-catalog.js`: catálogo cerrado compartido, duraciones y asociación con fases.
- `src/scene/motion-player.js`: un mixer, prioridades, mezcla, bucles, retorno y limpieza.
- `tools/bake-cortana-motion.mjs`: adaptación y autoría; `npm run animations:bake` regenera los nueve clips desde recursos locales, sin red.
- `public/models/cortana-motion.json`: curvas listas para la aplicación, hash del GLB, hash de la fuente extraída y envolvente muestreada.
- `tools/motion-preview.html`: herramienta de desarrollo con selección, pausa, tiempo y frente/perfil/espalda. Con `npm run dev`, abrir `/tools/motion-preview.html`; no forma parte de la entrega compilada ni usa voz/LLM.

Para reconstruir la fuente extraída desde la misma distribución: `node tools/bake-cortana-motion.mjs --import /ruta/glTF/AnimationLibrary_Godot_Standard.gltf e24c23cf2a1323488a3faa226ea7ea21f644b73e`. El uso normal del proyecto no necesita descargarla ni ejecutar esta opción.

## Verificación y límites

Verificación final: `npm test`, **90/90**; `npm run build` y `git diff --check`, correctos. Permanece la advertencia de tamaño del chunk 3D.

- Pruebas del rig real: nueve clips vinculados, cuaterniones normalizados, escala/envolvente, deformación distribuida de malla, continuidad de extremos, suelas estables, saludo visible, posturas de contacto y movimientos de cabeza.
- Pruebas del reproductor: espera breve, estados de voz, prioridad manual, interrupciones repetidas, vuelta al estado actual y cambio de apoyo periódico.
- API: catálogo cerrado, origen privado, expiración, renovación e interrupción de temporizadores, solicitudes concurrentes y conservación del último movimiento. Se conserva el contrato de cuatro campos de presentación.
- Revisión visual: primer reposo frontal con materiales reales en navegador; vistas geométricas locales de frente/perfil/espalda para reposo, saludo, pensar, cintura y explicación. Estas vistas locales usan malla deformada y sombreado simple, **no** las texturas/iluminación del navegador.

La herramienta de navegador bloqueó el acceso al visor local por su política de URLs durante la revisión. Por ello quedan pendientes la inspección completa de movimiento/transiciones con materiales reales y la interfaz final en escritorio/vertical. Las pruebas geométricas no certifican ausencia de todas las intersecciones, actuación natural ni aceptación artística. El ensayo humano y físico sigue aplazado y no bloquea software. La comprobación completa del circuito real de voz sigue en C-02.

## Skills

Se usó `find-skills` y se consultó [threejs-animation de CloudAI-X](https://skills.sh/cloudai-x/threejs-skills/threejs-animation), una skill comunitaria con unas 19.7 mil instalaciones y [repositorio](https://github.com/CloudAI-X/threejs-skills) de 3.7 mil estrellas al verificar. Su contenido se leyó desde un archivo temporal y se contrastó con Three 0.186.1 instalado. No se instaló globalmente ni se incorporó al proyecto. Instalación opcional para futuros trabajos: `npx skills add cloudai-x/threejs-skills --skill threejs-animation`.
