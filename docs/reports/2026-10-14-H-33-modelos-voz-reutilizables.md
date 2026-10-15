# H-33 — Reutilización de modelos locales de voz

Fecha: 2026-10-14. Responsable: Codex. Continuación autorizada tras H-31/H-32. **DONE en software PC**, sin aceptación humana H-16 ni cierre de H-17/física. Comparación contra adaptadores/workers de `45e8f1f`; H-32 se conserva en `aaab823`.

## Objetivo y decisión

Reducir la recarga de Python/modelos en cada turno. D-36 conserva un proceso local por motor, inicializado al usarlo, una petición activa y sin cola. Se termina tras 60 s sin trabajo, al cancelar procesamiento o al cerrar servidor. La siguiente petición después de terminarlo vuelve a cargar el modelo.

Se mantienen Piper 1.4.1/Daniela high, faster-whisper 1.2.1/Whisper base, CPU/int8/cuatro hilos/beam=5, límites HTTP y revisión/envío manual. No se añadieron dependencias, servicios, puertos, streaming ni modelos. Una misma implementación del transporte sirve a ambos adaptadores.

## Cambios

- `server/voice-worker.js`: proceso reutilizable, una solicitud, cabeceras y tamaños acotados, reconstrucción de marcos fragmentados, cancelación con SIGKILL, descarte de eventos de un proceso anterior y cierre por inactividad.
- `server/voice_protocol.py` y workers: entrada binaria por stdin, respuesta enmarcada WAV/JSON o error de dominio, modelo cargado una vez y audio por petición en memoria. Silencio/audio inválido no destruyen un modelo STT válido; un fallo interno obliga a recuperar el proceso.
- Adaptadores TTS/STT conservan validaciones y añaden cierre explícito; el servidor libera ambos al cerrarse. El benchmark STT existente también cierra su instancia Piper.
- Procesos con entorno reducido, recursos por rutas absolutas y directorio temporal de trabajo. No se escriben grabaciones/textos de conversación ni se pasan secretos del proveedor a los workers.
- Documentación de voz/README/diseño/especificación actualizada. Se corrigió la frase obsoleta de la guía Cloud que negaba la existencia de TTS/STT.

## Verificación ejecutada

Entorno: Linux 7.2.9-2-cachyos, Intel Core i5-1334U, 12 CPU lógicas, Node 22.22.2, Python 3.13.14, ONNX Runtime 1.30.0 y CTranslate2 4.8.2. Inferencia CPU; sin benchmark GPU.

**87/87 pruebas en el árbol de trabajo**, incluidas seis nuevas de transporte/proceso real controlado y una de cierre del servidor. El árbol contiene el incremento previo H-16 sin commit; su evidencia no se confunde con el conjunto independiente de esta entrega. Se verifican reutilización, fragmentación/UTF-8, exclusión, cancelación/reinicio, inactividad, tamaño/estado/truncamiento inválidos, caída del hijo, errores de dominio y cierre. Esos procesos controlados prueban ciclo de vida; no son voces de producto.

La primera ejecución de la nueva prueba en sandbox no pudo completar la creación de hijos; con permisos de procesos locales pasó. Suite completa con sockets/procesos locales aprobada. Build y `git diff --check` correctos; persiste advertencia de chunk >500 kB.

También se exportó el contenido preparado para commit a `/tmp/halo-h33-finalcheck`, sin los cambios previos H-16: **81/81 pruebas y build aprobados**. La diferencia de seis pruebas corresponde al ensayo guiado todavía sin commit. Esta verificación confirma que la entrega de H-33 es independiente de ese trabajo; no se incluyó ni sobrescribió.

### Comparación HTTP con motores reales

Frases públicas TTS corta/media/larga y exactamente los mismos tres WAV públicos H-15 para STT. Se recuperaron los adaptadores/workers anteriores mediante Git a archivos temporales y se compararon con los nuevos usando el mismo servidor/API local. Chat del ensayo devuelve explícitamente las frases públicas para reservarlas en TTS: **no hay generación LLM ni conversación humana**. Se conserva caché del SO y se ejecutó antes/después en orden fijo; n=3 por modo, sin percentiles representativos.

| Medición | Antes: proceso por petición | Nuevo: modelo cargado |
|---|---:|---:|
| Piper, mediana preparación WAV | 3585 ms | 2037 ms |
| Piper, rango de tres frases | 3177–5139 ms | 1336–2810 ms |
| Whisper, mediana reconocimiento | 2320 ms | 1186 ms |
| Whisper, rango de tres audios | 2275–2470 ms | 1054–1253 ms |

Primera llamada nueva: Piper 3436 ms; Whisper 1975 ms. Después de cancelar y recrear: 3695 ms y 2896 ms respectivamente. No se promete que todos los turnos duren ≤2 s, especialmente después de inactividad/cancelación o con textos más largos.

Un proceso de cada motor atendió el calentamiento y los tres turnos siguientes, comprobado por los hijos creados. Memoria residente observada con ambos cargados: TTS 341792 KiB y STT 533300 KiB, aproximadamente 855 MiB en conjunto en ese punto. Se acepta ese coste temporal; el cierre por inactividad lo libera. No son picos de memoria ni consumo total de la aplicación.

Las transcripciones no fueron idénticas byte a byte: aparecieron `45º`/`45°` y `Sire`/`Sirre`. Se guardan ambas salidas en la evidencia, con los errores previos presentes. Un comparador inicial exigía igualdad exacta y falló ante una variación de símbolo; se sustituyó por registro descriptivo de diferencias. **No se certifica mejora ni equivalencia de precisión humana** por conservar configuración.

Recuperación real por las APIs:

- Cancelación TTS y STT: HTTP 499; desde detener hasta respuesta 3 ms y 16 ms respectivamente. No es una medición del tiempo físico de apagado del micrófono.
- Siguiente petición tras ambas cancelaciones: HTTP 200, proceso nuevo y resultado válido.
- Silencio: 422; WAV de 17 s: 413. Una transcripción válida posterior reutilizó el mismo proceso STT.
- Al cerrar el servidor de ensayo finalizaron todos los hijos, incluidos los recreados.

Datos: [H-33-voz-latencia.json](evidence/H-33-voz-latencia.json). Las medidas son de preparación/inferencia y HTTP local, no de primer sonido audible.

### Demo existente y navegador PC

Se identificó el proceso que servía este checkout en 3000 y se confirmó que no había captura/generación/reproducción activa. Se avisó del reinicio y de la pérdida de contexto; se sustituyó por `npm start` con la configuración existente. La demo actualizada queda sirviendo en `0.0.0.0:3000` con Gemma Cloud seleccionado; sin nuevas llamadas al proveedor.

Visor, modelo y presentación devolvieron 200 desde loopback y desde la IP LAN del propio PC. TTS/STT devolvieron 200 en loopback y 403 por IP LAN, según contrato. No se presenta esta comprobación como acceso desde el teléfono.

En navegador real se pulsó Probar voz, se obtuvo preparación/reproducción/fin, se liberó el audio y Cortana siguió `ready` en reposo. Inicio observado de la primera prueba: 2991 ms (síntesis 2866 ms); otras pruebas: inicio 3324/1666 ms, síntesis 3273/1606 ms. Una espera por texto exacto falló porque el control añade el tiempo al mensaje; la revisión del estado final y metadatos confirmó el resultado. Evidencia: [H-33-voz-ui.json](evidence/H-33-voz-ui.json). Eventos de reproducción digital, sin valoración auditiva humana ni uso de micrófono.

## Pendientes y siguiente paso

H-19/H-07/H-08/H-12 esperan prueba del celular/caja y sus condiciones reales. Se solicitó al propietario abrir la URL LAN de Cortana y registrar dispositivo/navegador/error; todavía no se cuenta con ese resultado. UFW no fue modificado. H-16 sigue sin diez frases humanas y ≥8/10 útiles; H-17 no se inicia por aprobar este incremento.

Siguiente paso: comprobar desde el teléfono `http://192.168.1.66:3000/hologram?avatar=cortana`, después ejecutar el ensayo guiado de micrófono del control PC. Evitar otra ampliación de software antes de recoger esos resultados reales.
