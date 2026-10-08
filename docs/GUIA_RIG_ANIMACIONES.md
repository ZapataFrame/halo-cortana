# Preparar movimientos para Cortana

Fecha: 2026-10-08. Entregable H-27. Guía de producción; no afirma que estos movimientos estén implementados.

**La Cortana actual ya tiene rig.** Se inspeccionó el GLB de Descargas: 79 joints, cuatro meshes, ocho PNG y una animación `Twerking` de 195 canales. No necesita empezar por un rig manual. La aplicación muestra sus texturas en pose estática; Gangnam funciona con el otro humanoide. Primero probar el clip nativo; después preparar un pequeño catálogo para este mismo esqueleto.

Un rig define huesos/jerarquía; los pesos asignan qué partes de la malla deforma cada hueso; un clip contiene movimientos en el tiempo. Retargeting adapta movimientos de otro esqueleto. Tener muchos clips no exige un rig por movimiento. El archivo actual no contiene morph targets faciales: lipsync necesita trabajo adicional.

## Ruta recomendada para nuestro archivo

1. Conservar el original. Trabajar sobre `public/models/cortana.glb` en una copia `.blend`; guardar archivo editable y GLB de exportación por separado.
2. Importar glTF/GLB en Blender. Comprobar textura de cara/cuerpo/cabello, armature y deformación con `Twerking`. Este clip es un diagnóstico del rig, no una selección de gesto para la demo.
3. Si el clip nativo deforma correctamente, conservar huesos y pesos. Si falla también en Blender, resolver esa deformación antes de importar otros movimientos. Un movimiento bien reproducido solo en Blender todavía requiere comprobar el GLB exportado.
4. Elegir **un solo movimiento nuevo**, por ejemplo saludo, y producir una prueba retargetada. No descargar veinte antes de validar el primer ciclo.
5. Unificar los clips en el rig de Cortana; guardar acciones separadas, exportar y revisar el GLB. Una vez aprobado el saludo, repetir con reposo y señalamiento.
6. Integrar reproducción y catálogo en la aplicación en una tarea posterior: actualmente Cortana deshabilita movimientos y el backend acepta solo `idle|gangnam`.

Blender no está instalado en el PC revisado; esta guía no sustituye una exportación real. Anotar versión utilizada al producir el primer `.blend`.

## Mixamo: la opción más sencilla para obtener movimientos

[Mixamo](https://www.mixamo.com/) utiliza Adobe ID. Para un personaje **ya riggeado**, exportar una copia FBX desde Blender y subirla con medios incrustados; Mixamo intenta mapear el rig. Aplicar un movimiento y descargar FBX. Para un personaje **sin rig**, acepta FBX/OBJ/ZIP y solicita marcadores en muñecas, codos, rodillas e ingle para el auto rig. [Procedimiento oficial de Adobe](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html).

En nuestro caso probar primero el FBX con el rig existente. Si es reconocido, descargar movimiento sin skin cuando la opción esté disponible y conservar la malla/texturas locales. Si no reconoce el rig, no borrar los pesos del original: usar una copia para la prueba o adaptar desde un personaje fuente compatible. Revisar las condiciones del recurso descargado y guardar procedencia; el modelo Cortana mantiene su atribución CC BY-NC declarada.

Subir el personaje es un paso manual del propietario; no se han enviado los archivos a servicios externos. El sitio facilita el rig corporal; correcciones de manos, hombros, cabello o rostro pueden necesitar edición.

## Compatibilidad y retargeting

Los nombres actuales tienen prefijo Mixamo **y sufijos añadidos**. Esta tabla ayuda a construir el mapa, pero no demuestra equivalencia de pose/huesos:

| Función | Nombre real en Cortana | Nombre fuente típico Mixamo |
|---|---|---|
| Cadera | `mixamorig:Hips_01` | `mixamorig:Hips` |
| Cabeza | `mixamorig:Head_06` | `mixamorig:Head` |
| Brazo izquierdo | `mixamorig:LeftArm_09` | `mixamorig:LeftArm` |
| Mano izquierda | `mixamorig:LeftHand_011` | `mixamorig:LeftHand` |
| Brazo derecho | `mixamorig:RightArm_033` | `mixamorig:RightArm` |
| Muslo izquierdo | `mixamorig:LeftUpLeg_055` | `mixamorig:LeftUpLeg` |
| Pie derecho | `mixamorig:RightFoot_062` | `mixamorig:RightFoot` |

Comparar todos los huesos deformadores, sus padres, pose base T/A, ejes locales, proporciones, unidades y trayectoria de cadera. **Renombrar canales no corrige ejes ni pose base.** Retargetar con un mapa explícito, corregir offsets y probar codos, rodillas y pies. Mantener la pose de enlace de Cortana; no aplicar transformaciones destructivas a un rig con clips sin revisar sus efectos.

Recomendación del proyecto: hornear el movimiento sobre los huesos de Cortana antes de exportar. Así el móvil recibe clips compatibles y no calcula retargeting/IK en cada frame. Como alternativa de desarrollo, Three ofrece `SkeletonUtils.retargetClip`, con mapa destino→fuente, escala, cadera y offsets; no se ha validado para este par de rigs. [API oficial](https://threejs.org/docs/pages/module-SkeletonUtils.html).

El Gangnam actual usa un esqueleto Quaternius distinto; no puede asignarse directamente a Cortana. Su adaptación necesita su propia prueba, aunque ambos personajes sean humanoides.

## Contrato propuesto de entrega a la aplicación

Este es un estándar **del proyecto**, no un esqueleto universal ni una nueva implementación aprobada.

| Elemento | Entrega requerida |
|---|---|
| Formato | GLB/glTF 2.0 autocontenido; PNG/JPEG incorporados, sin URLs externas ni decodificadores nuevos. |
| Materiales | PBR metallic/roughness, mapas difusos/emisivos/normales y alpha del cabello conservados. |
| Esqueleto | Un rig deformador compartido por los clips; guardar nombres/jerarquía y pose base junto al `.blend`. |
| Coordenadas | Unidades en metros en producción; exportador convierte a convención glTF. Mantener el giro frontal del visor fuera de cada clip. |
| Movimiento | Canales de traslación/rotación/escala de huesos, horneados a 30 muestras/s como punto de partida. Constraints/IK resueltos antes del GLB. |
| Raíz | Gestos y bailes en el sitio; conservar movimientos de pelvis, eliminar únicamente desplazamiento global que saque la figura del reflector. |
| Transiciones | Clips con nombre único; reposo estable, gestos que regresen al reposo y bucles sin salto. |
| Paquete | `.blend` editable, GLB, ficha de origen/licencia/hash, duración/rango y video de cada movimiento. |

Catálogo inicial propuesto:

| ID | Conducta | Objetivo de producción |
|---|---|---|
| `idle` | Bucle suave | 3–6 s, pies estables y figura en el sitio. |
| `wave` | Saludo una vez | 2–4 s, regresa a reposo sin brazo atrapado. |
| `point` | Señalar una vez | 2–4 s; brazo legible en reflexión frontal. |
| `dance` | Bucle | 5–10 s; cuerpo completo dentro de la envolvente de cámara. |

No activar baile por defecto ni ligar automáticamente un movimiento a cada respuesta LLM. Acordar esos comportamientos al implementar el catálogo.

## Exportación de varios clips desde Blender

Crear una acción por movimiento y asociarla al mismo armature. Guardarlas en pistas NLA separadas y elegir el modo de exportación de animaciones apropiado; comprobar los nombres del GLB resultante. Exportar skin y animaciones, incluir imágenes y muestrear las restricciones. No usar «acciones activas fusionadas» si se quieren clips separados. Reimportar el GLB para comprobar que los clips no desaparecieron.

El exportador admite transformaciones de objetos/huesos y valores de shape keys; no transporta automáticamente físicas o animación de materiales. Las opciones de acciones/NLA cambian entre versiones, especialmente desde acciones con slots de Blender 4.4; seguir el manual correspondiente a la versión instalada. [Manual glTF de Blender 5.1](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html).

## Cuándo hacer rig manual / Rigify

Reservarlo para deformaciones defectuosas, otra topología, controles faciales o edición que el rig actual no permite. Con Rigify se ajusta un metarig al cuerpo, se genera el rig y se vincula la geometría mediante pesos automáticos o pintados; conservar el metarig editable. [Guía oficial de Rigify](https://docs.blender.org/manual/en/latest/addons/rigify/basics.html).

Generar controles no garantiza buenos pesos. Revisar hombros, muñecas, cadera, rodillas y unión de cabeza/cabello. Para el visor exportar el esqueleto deformador y clips horneados, no depender de controles del editor. Cambiar de rig obliga a adaptar los clips previos y a revisar materiales; tiene más trabajo que reutilizar el existente.

## Pruebas antes de aceptar un paquete

1. Abrir el GLB sin conexión externa: cuatro materiales texturados, ojos/cabello alineados y ningún archivo faltante.
2. Enumerar clips y revisar sus duraciones/nombres; cada track apunta a un nodo real del mismo rig. No confundir un hueso animado con una malla realmente deformada.
3. Reproducir diez ciclos de cada bucle y tres ejecuciones de cada gesto: sin piezas separadas, deriva global, saltos ni pies deslizándose claramente. Guardar video.
4. Revisar reposo→gesto→reposo y cambio de clips: sin T-pose intermedia ni transformaciones acumuladas.
5. Medir envolvente de todos los clips y verificar cuerpo completo en vertical/horizontal; mantener cinco muestras de fondo RGB 0/0/0.
6. En teléfono real: cinco minutos y meta mediana ≥30 FPS. Registrar modelo/SO/navegador, tiempos de carga y fallos; no afirmar rendimiento por el nombre de la GPU del PC.
7. Probar el reflector: saludo/señalamiento reconocibles, lateralidad y márgenes correctos, panel oculto. Esa aceptación física sigue pendiente.

Para comprobar el asset actual ejecutar `node --test tests/imported-avatar.test.js`: verifica recursos incorporados, geometría, skin y movimiento del clip nativo. No valida un paquete nuevo ni render móvil automáticamente.

El siguiente incremento de animación sería **reproducción controlada del clip nativo**, con retorno a pose estática y envolvente real comprobada. Después, **un saludo retargetado**, y finalmente catálogo/transiciones. Estas tareas permanecen como propuesta; H-27 cierra la guía, no su implementación.
