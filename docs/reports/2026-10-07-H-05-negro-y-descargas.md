# H-05 — Negro en carga, presentación y fallo

Fecha: 2026-10-07. Responsable: Codex. Rama: `feat/validacion-calibracion-holograma`.

## Objetivo y cambios

Cerrar la comprobación digital pendiente del negro durante la carga del modelo. Se añadió `tools/serve-visual-qa.mjs`, ejecutable con `npm run qa:visual -- loading` o `error`. Usa el mismo servidor y visor compilado de la aplicación, el GLB Quaternius y los keyframes locales reales. Sirve únicamente en 127.0.0.1:3001; no carga `.env`, no contiene clave y no genera respuestas ficticias de LLM.

En `loading`, la lectura del GLB se mantiene pendiente hasta introducir Enter en la terminal. Se capturó `data-status=loading`, se liberó la lectura y después se comprobó `ready` con figura completa. En `error`, falla la lectura del GLB y se comprobó `error`; el diagnóstico queda dentro del panel oculto.

Se corrigió además el envío prematuro de HTTP 200 en archivos estáticos. Ahora se lee el archivo antes de enviar cabeceras; una lectura fallida devuelve un 404 completo, sin dejar la conexión esperando. HEAD conserva respuesta sin cuerpo ni lectura del contenido.

## Verificación ejecutada

- Navegador de la aplicación, viewport efectivo 792×954, con el panel oculto en los tres estados. Inspección de DOM y capturas originales: `evidence/H-05-loading.png`, `H-05-ready.png`, `H-05-error.png`.
- Pillow leyó cinco puntos fuera de la figura en cada captura: cuatro esquinas con margen de 10 px y centro superior. Las 15 muestras resultaron RGB `(0,0,0)`. Coordenadas/resultados en `evidence/H-05-black.json`.
- `node --test --test-reporter=dot tests/server.test.js`: nueve pruebas aprobadas, incluida una regresión de fallo de lectura, recuperación posterior y HEAD sin cuerpo.
- Los dos servidores de ensayo se detuvieron al terminar. El servidor de demo 3000 conserva sus recursos.

## Continuidad Git y límites

La carpeta `.git` estaba vacía. Por petición explícita del propietario se inicializó `main` y se guardó el trabajo previo en tres commits: `b90baa9` (documentación), `f789637` (MVP) y `6c93a8c` (evidencia). `.env`, dependencias y build permanecen ignorados. La continuación ocurre en una rama nueva; no existe publicación remota verificada.

H-05 pasa a DONE técnico. Capturas digitales no prueban óptica, rendimiento o compatibilidad del celular. Falta H-19 para dispositivo/caja/hora y falta clave privada para GPT real. El rechazo anterior al seguimiento de chat no se reintentó ni se presenta como resuelto por este ensayo visual independiente.

Siguiente tarea: H-06, controles precisos de calibración, patrón asimétrico y recuperación en tres recargas desde la interfaz.
