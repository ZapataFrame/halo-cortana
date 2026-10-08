# H-20…H-22 — GPT, orientación y baile

Fecha: 2026-10-07. Responsable: Codex. Nueva petición del propietario: continuar el MVP, sustituir el proveedor local por GPT, añadir vertical/horizontal y un baile libre presente en Fortnite. Visor sigue siendo prioritario; voz/juego diferidos.

## Entregables

- H-20: OpenAI principal con `gpt-4.1-mini`/Responses, configuración `.env` privada sin clave, ejemplo/guía actualizados. Sin fallback a Ollama. Errores de configuración, credencial, acceso y cuota controlados; modelo local disponible al seleccionarlo explícitamente.
- H-21: selector automático/vertical/horizontal en PC y visor, enum persistido compatible con v1; giro por postura más rotación adicional. Espejos en ejes de pantalla y patrón coherente. El modo adapta imagen, no bloquea el SO del móvil.
- H-22: nuevo humanoide Quaternius CC0 compatible con recreación Gangnam Style MIT de ProgramAsWeights; fuentes/commit/avisos/hash conservados. Curvas descargadas convertidas a keyframes; móvil reproduce con AnimationMixer. Botones PC y endpoint validado sincronizan selección por consulta de estado.
- Visor negro independiente del chat. Baile sin música ni archivos extraídos de Fortnite. CesiumMan anterior conservado con sus licencias como histórico.

## Decisiones y entorno

PC observado: CachyOS, Node 22.22.2/npm 10.9.7, Three 0.186.1, Vite 8.3.3. Servicio en `localhost:3000`, LAN `192.168.1.66:3000`. No se seleccionó otro motor ni se añadieron dependencias para el baile.

GPT-4.1 mini se selecciona para conversación corta por su perfil de baja latencia sin fase de razonamiento, según [documentación oficial](https://developers.openai.com/api/docs/models/gpt-4.1-mini). No se ha medido aquí: **clave ausente**, cuenta/saldo sin comprobar. Solicitud de GPT autoriza integrar y probar el proveedor cuando haya credencial; no autoriza al agente a activar facturación. Prompt sin herramientas, 256 tokens de salida, seis pares, timeout 60 s.

El clip se hornea para evitar IK por frame en móvil y problemas al aplicar espejos/rotación a un rig resuelto en coordenadas globales. Fuentes MIT originales y script `tools/bake-dance.mjs` permiten regenerarlo sin Blender. El parser TypeScript experimental de Node solo se usa en esa preparación; no en el servidor ni móvil durante la demo.

Modelo: 741320 bytes, 14318 triángulos, 65 huesos, un skin, cero imágenes/URIs externas. Movimiento: 162676 bytes, reposo y ciclo de 7.272727 s/132 BPM, 220 muestras. [Ficha local](../../public/models/README.md) contiene hashes/licencias separados. No se interpreta una declaración CC0 de un archivo extraído del juego como permiso; se eligió una recreación publicada bajo MIT y un rig CC0 documentado.

## Verificación ejecutada

`npm test`: **19/19**, cero fallos. Comprueba calibración corrupta y anterior, persistencia, aspectos/giro/espejos, clip sobre GLB real, cambio de fase de brazos y retorno a reposo, contrato Responses/contexto/abort/errores, catálogo de animación, solicitudes inválidas, privacidad, cancelación tardía, idempotencia, timeout e historial. Fixtures de proveedor verifican contrato y fallos; no demuestran respuesta real de GPT.

`npm run build`: correcto. Bundle Three/visor aproximadamente 643 KB minificado y 164 KB gzip; advertencia conocida de chunk superior a 500 KB. No se presenta esa advertencia como un fallo ni como prueba de rendimiento. Fuentes del generador externas quedan fuera del bundle; recursos runtime locales.

Navegador oficial integrado, PC: botón **Bailar Gangnam Style** activó estado del servidor `gangnam`; un visor abierto después recuperó la selección. Botón **Reposo** cambió a `idle`, y reiniciar baile volvió a `gangnam`. Esqueleto visible en pose de riendas/piernas y otras fases; tiempo del clip avanzó realmente. LLM no se invoca para esos botones.

Matriz de orientación esperando dimensiones reales del render:

| Modo | Viewport PC | Giro resultante con rotación adicional 0° |
|---|---|---|
| Automática | 390×844 | 0° |
| Automática | 844×390 | 0° |
| Vertical | 390×844 | 0° |
| Vertical | 844×390 | 90° |
| Horizontal | 390×844 | 90° |
| Horizontal | 844×390 | 0° |

Modo vertical conservado después de **tres recargas reales**; calibración previa conserva escala 1.01 y restantes ajustes. Registro [H-21-orientation.json](evidence/H-21-orientation.json). La primera secuencia rápida leía dimensiones antes del ResizeObserver y no se tomó como evidencia: se añadieron dimensiones al diagnóstico DOM y se esperó el render actualizado. No se accedió a estado oculto del navegador.

Capturas inspeccionadas:

- [Baile vertical, 390×844](evidence/H-20-dance-portrait.png).
- [Modo horizontal en pantalla vertical, 390×844](evidence/H-21-horizontal-on-portrait.png).
- [Pantalla horizontal, 844×390](evidence/H-21-dance-landscape.png).
- [Control final, GPT configurado sin clave y botones de baile](evidence/H-20-control-gpt.png).

En las tres capturas del visor, cinco puntos `(1,1)`, `(w−2,1)`, `(1,h−2)`, `(w−2,h−2)`, `(w/2,20)` fueron **RGB 0/0/0**. Figura completa y controles ocultos. No son pruebas de caja ni de teléfono real. Diagnóstico instantáneo varió entre 1 FPS con navegador limitado y unos 33–36 FPS durante interacción; no es mediana de 60 s ni benchmark móvil.

Servidor real sin clave: `POST /api/chat` → **503 NOT_CONFIGURED**; `GET /api/presentation` conservó `animation: gangnam` y `phase: error`. Visor/GLB/clip → **200**, tamaños 741320/162676 correctos; `/.env` y `/server/providers.js` → **404**. Ninguna clave existe en los assets; variables privadas únicamente backend. Reset/chat y animación son independientes.

## Pendientes y siguiente paso

H-21/H-22 tienen aceptación técnica de las funciones nuevas. H-20 queda **BLOCKED** hasta que el propietario guarde `OPENAI_API_KEY` en `.env`; pregunta enviada, no hay clave en el momento de la comprobación. Después reiniciar servidor, probar tres preguntas y seguimiento real, medir latencia y retomar H-11. No declarar GPT integrado en vivo solo por adaptar su contrato.

H-19/H-07/H-08: teléfono, navegador, caja, horario, estabilidad y efecto óptico pendientes. H-05/H-06 conservan pendientes previos de carga y controles físicos/manuales; estas nuevas capturas no los cierran por completo. No se sorteó la restricción previa de automatización del seguimiento de chat.

`git status --short` y `git rev-parse --show-toplevel` no reconocen un repositorio Git funcional en este entorno; no se crearon commits ni PR. Se preservan archivos anteriores y trabajo ajeno. `.env` tiene permisos 0600. Servidor reiniciado con configuración final; navegador devuelto a `/control`, override de viewport retirado y baile activado para probarlo aun sin GPT.
