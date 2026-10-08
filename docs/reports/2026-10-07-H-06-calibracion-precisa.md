# H-06 — Calibración precisa y patrón visible

Fecha: 2026-10-07. Responsable: Codex. Rama: `feat/validacion-calibracion-holograma`. Dependencia H-05 cerrada en `ac4636f`.

## Objetivo y cambios

Permitir repetir valores de calibración sin depender de arrastrar un control. Se añadieron campos numéricos a tamaño, X/Y y vista del cuerpo, con etiquetas accesibles, porcentajes/grados y límites existentes. Se conserva el contrato de almacenamiento v1; rangos, campos y representación usan el mismo estado. Los valores válidos se aplican al escribir sin reescribir los dígitos en curso. Enter confirma y normaliza límites; las entradas inválidas conservan el ajuste válido anterior.

La inspección visual encontró un fallo real: asignar `.hidden` al SVG no retiraba el atributo HTML usado por CSS y el patrón quedaba invisible. Se corrigió con `toggleAttribute`/`setAttribute`. Ahora la F y el punto se ven sobre negro; cerrar el panel conserva el patrón para ajustar la reflexión sin controles visibles. Checkbox/Restablecer lo apagan; recargar siempre muestra el humanoide.

## Verificación ejecutada

Navegador de la aplicación en PC; tamaños efectivos registrados en `evidence/H-06-calibration.json`, principalmente 380×844. La emulación de viewport no sustituye un celular real.

- Entrada desde controles numéricos: tamaño 75 %, X −12 %, Y +8 %, giro del cuerpo 35°. Los rangos mostraron 0.75, −0.12, 0.08 y 35; la captura `H-06-model-adjusted.png` muestra el humanoide completo desplazado y girado.
- Tres recargas recuperaron todos los ajustes: valores anteriores, modo Horizontal, rotación 90°, ambos espejos activos y contornos desactivados. DOM de las tres recargas guardado; comprobación posterior de todos los valores aprobada.
- Entrada vacía conserva 75 %; 300 % confirmado se acota a 200 %; 75.5 % se rechaza y conserva 200 %, con diagnóstico. Restablecer vuelve a automático, 100 %, X/Y/giro 0, espejos/contornos desactivados y patrón apagado.
- Patrón sin panel: tamaño base 228 px, tamaño al 75 % 171 px. Desplazamiento medido del centro −45.600006/+67.520004 px, equivalente a −12 % de 380 y +8 % de 844. Tolerancia de comprobación 0.01 px; relación de tamaños 0.75.
- Capturas `H-06-pattern-default.png`, `H-06-pattern-offset.png`, `H-06-pattern-mirror-x.png`, `H-06-pattern-rotated.png`: patrón visible, F/punto cambian lateralidad y giro, panel oculto. `H-06-controls-portrait.png` y `H-06-control-desktop.png` documentan los controles.
- `node --test --test-reporter=spec tests/*.test.js`: **20 aprobadas, 0 fallidas**, 1.03 s. Incluye modelo/animación reales, geometría de espejos/desplazamientos, persistencia, contratos GPT y recuperación de descarga. Pruebas del adaptador no equivalen a una llamada real GPT.
- `npm run build`: correcto; JS 644.37 kB, gzip 164.52 kB, CSS 8.24 kB. Permanece el aviso de chunk >500 kB; no demuestra rendimiento móvil.
- Se retiró el margen lateral nativo de los rangos que producía una barra horizontal en el panel PC: `clientWidth=scrollWidth=687 px` verificado tras recompilar.

Se restauraron mediante UI los ajustes anteriores del navegador (tamaño 101 %, automático, resto predeterminado) y se retiró la emulación de viewport. Se dejó la aplicación en `/control`, con el servidor actualizado en 3000.

## Límites y siguiente paso

El arrastre de un rango mediante automatización no produjo cambio; se registra el intento en el JSON y no se declara probado. La ruta numérica sí cumple la calibración funcional y fue verificada en modelo/patrón. Comprobar interacción táctil y salida del campo en dispositivo real durante H-07.

H-06 queda DONE técnico. No hay prueba de caja ni medición estable de FPS en móvil; H-19 sigue pendiente para H-07/H-08. GPT continúa sin clave privada y H-20 BLOCKED. No se reintentó el chat previamente rechazado por la política del navegador. Voz y simulador no se iniciaron.
