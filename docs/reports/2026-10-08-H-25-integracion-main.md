# H-25 — Integración de main y calibración

Responsable: Codex. Fecha: 2026-10-08. Autorización: el propietario pidió integrar la rama pendiente y continuar sobre el trabajo del compañero.

`git fetch origin` confirmó main en `5524e19`; calibración en `9c5614c`. Base común `6c93a8c`. No había cambios locales ajenos. Se integraron ambos historiales con merge, conservando selector GPT/Qwen, catálogo local, Cortana opcional y sus recursos/licencias, controles numéricos, patrón y respuesta completa ante fallo de lectura.

Conflictos resueltos en `server/app.js` (configuraciones múltiples + lector de assets), `src/viewer.js` (avatar opcional + calibración), README y especificación (conservar ambas ampliaciones). Se detectó D-25 duplicado: el ID del selector permanece D-25; calibración pasa a D-27 con explicación histórica.

Verificación: 25 pruebas aprobadas, cero fallidas; `npm run build` correcto, JS 648.21 kB. Marcadores de conflicto ausentes. Permanece aviso de bundle >500 kB. No se reinterpreta esta integración como prueba física o nueva llamada GPT. Siguiente: restaurar texturas de Cortana (H-26), guía de rig (H-27) y Gemma 4 en Ollama Cloud (H-28).
