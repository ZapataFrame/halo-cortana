# H-32 — Arranque independiente y acceso del celular

Fecha: 2026-10-14. Responsable: Codex. Continuación autorizada tras H-31. Entregable de software PC; H-19/H-07/H-08/H-12 conservan aceptación física pendiente.

## Cambios

- El control publica los enlaces LAN antes de consultar el catálogo y prepara modelos/TTS/STT mediante tareas independientes. Si falla una consulta, el aviso queda en su sección y las otras continúan.
- Ayuda breve en Pantalla externa: dirección IP frente a localhost, demo encendida, red compartida y control de voz desde PC. El enlace local se identifica como «Abrir visor en este PC».
- README explica demo/desarrollo/QA, diagnóstico por capas y consulta de UFW sin cambiar reglas ni abrir el router. D-35 registra la continuación y el alcance.
- Se conservaron los cambios previos del ensayo guiado H-16 y el lockfile pnpm aportado durante la sesión.

## Verificación

- Servidor existente al comenzar: `0.0.0.0:3000`, PC `192.168.1.66`. No se detuvo ni reinició el proceso del propietario.
- `npm test`: **80/80**, con sockets locales. Build correcto; persiste advertencia de chunk >500 kB.
- Prueba de navegador real PC con recursos/voz instalados y servidor QA solo loopback 3003: `/api/providers` retenido deliberadamente. Los enlaces LAN ya estaban publicados, Cortana `ready`, Probar voz y micrófono habilitados antes de liberar el catálogo. No se capturó audio ni se llamó a ningún LLM.
- Se liberó esa solicitud con HTTP 503: aviso «Catálogo no disponible en este ensayo.» únicamente en proveedor; enlaces/voz/micrófono/modelo continuaron disponibles. Se repitió tras compilar el ajuste final.
- Ayuda abierta inspeccionada en navegador; márgenes/tipografía ajustados a la tarjeta. Evidencia: `evidence/H-32-arranque.json`, `evidence/H-32-conexion.png`. El puerto de QA no es una dirección móvil accesible; la captura no demuestra uso del teléfono ni mide FPS del dispositivo.
- `git diff --check` correcto. Servidor QA cerrado al terminar.

## Pendiente y siguiente paso

Se pidió al propietario abrir `http://192.168.1.66:3000/hologram?avatar=cortana` desde su teléfono e indicar resultado, dispositivo y navegador. Sin ese resultado no se identifica la causa del fallo móvil anterior ni se cierra H-07. Las reglas UFW siguen sin consulta privilegiada; no se modificó red/firewall.

Siguiente incremento independiente: H-33, reutilizar procesos/modelos de voz locales con cancelación, límites y mediciones. H-17 espera aceptación humana H-16 ≥8/10.
