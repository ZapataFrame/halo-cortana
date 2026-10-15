# H-16 — Ensayo guiado integrado, aceptación humana pendiente

Fecha: 2026-10-14. Responsable: Codex. Base `5ae408c`. **Incremento de software verificado; H-16 BLOCKED por Q-12**. No se inicia H-17.

## Objetivo y cambios

Retomar el incremento existente sin commit y dejarlo integrado, documentado y verificable. Se revisaron los cambios de captura, controlador del ensayo, panel, estilos e integración del control; se conserva su recorrido de diez frases y envío explícito fuera del ensayo. `pnpm-lock.yaml` y la captura anterior `H-16-guided-trial.png` se preservan fuera de este commit.

- Panel de entorno y diez frases en el control PC. Comenzar no pide permiso ni abre micrófono; la captura sigue siendo explícita mediante el botón existente.
- La transcripción del ensayo conserva el original y no llena el editor ni llama al chat. Pausa conversación, selector de proveedor y prueba TTS; permite terminar y recuperar el borrador.
- Cada muestra requiere valoración; los fallos no pueden marcarse útiles. Diez valoraciones son necesarias antes de comprobar ≥8/10. Las nueve comprobaciones manuales permanecen independientes y «No probado» por defecto.
- Informe JSON local sin audio, con entorno, texto/tiempos, interrupciones, valoraciones, umbral y `reviewRequired: true`. Se añadió persistencia del ID de captura en muestras e interrupciones; ID nulo para un fallo marcado sin captura.
- README, guía de voz, diseño, Q-12 y roadmap sincronizados. No cambia modelo/proveedor ni contratos públicos/backend.

## Verificación ejecutada

- `npm test`: **87/87**. Incluye cinco pruebas del informe/aceptación y una de metadatos de captura del incremento anterior, además de la base H-33. Se comprueban umbral incompleto, original inmutable, ID/tiempos, resultados tardíos, cancelación/reinicio, fallos no útiles y checks sin aprobación implícita. Fixtures de pruebas, no voz humana.
- Build correcto; aviso conocido de chunk >500 kB. `git diff --check` correcto.
- Navegador real PC: formulario vacío no inicia, exige cuatro campos; al comenzar con entorno explícitamente ficticio conserva un borrador de prueba y deshabilita envío/proveedor/prueba TTS. No se abrió micrófono ni se concedió permiso.
- Marcar una frase sin resultado deja «Conserva el sentido» deshabilitado. Valorarla no útil avanza a frase 2 con **0/10 útiles y 1 valorada**. Terminar devuelve el control y conserva el borrador; Cortana sigue ready/en reposo. Se restauró el borrador anterior y se dejó el ensayo nuevo sin resultados ficticios activos.
- Exportación real del ensayo incompleto de UI: archivo JSON descargado y comprobado, sin audio, una valoración no útil, umbral falso y revisión requerida. La espera del evento download del navegador integrado agotó su tiempo, pero el archivo sí apareció y su contenido coincidió exactamente con los campos ficticios introducidos. No se presenta el timeout de observación como fallo de la función ni se declara aceptación humana.
- Evidencia de UI: `evidence/H-16-panel-integracion-20261014.json` y `H-16-panel-integrado-20261014.png`. Copia identificada del informe ficticio exportado: `evidence/H-16-export-fixture-20261014.json`. Ninguno es un resultado humano válido de H-16.

## Pendiente y siguiente paso

Q-12: el propietario debe usar su micrófono/navegador y las condiciones reales, valorar diez frases antes de corregir y obtener ≥8/10 útiles, revisar permisos/cancelación/edición/recuperación y exportar el informe. Se solicitó participación en esta continuación. Sin esa evidencia H-16 mantiene BLOCKED y H-17 espera; no conviene añadir otra capa de pruebas automáticas para sustituirla.

El servidor actual continúa en `0.0.0.0:3000`; la IP del PC sigue `192.168.1.66`. H-19/H-07/H-08/H-12 necesitan resultado del teléfono y caja; UFW todavía requiere contraseña para consultar sus reglas. Se comprobó únicamente presencia de la clave GPT: no está configurada; no se leyó/publicó su valor ni se llamó a OpenAI. Estas dependencias no se resuelven con más implementación autónoma.
