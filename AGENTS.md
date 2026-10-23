# Cortana

Prototipo conversacional: Vue 3 + Three.js en navegador, Node en PC, voz local Piper/Whisper y proveedores LLM intercambiables.

## Contexto vigente

- Solo Cortana. El simulador, avatares alternativos y baile se retiraron por decisión del propietario el 2026-10-23.
- Leer [README](README.md), [roadmap](ROADMAP.MD) y [arquitectura](docs/ARQUITECTURA.md) antes de cambiar contratos.
- Voz/instalación/atribución: [docs/VOZ_PC.md](docs/VOZ_PC.md). Procedencia del avatar: [public/models/README.md](public/models/README.md).
- Conexión física y ensayo humano están aplazados. No bloquear software ni solicitarlos como siguiente paso; conservar aceptación futura.

## Desarrollo

- npm es el único gestor. `npm ci`, `npm run dev`, `npm test`, `npm run build`; `npm run demo` sirve la entrega compilada.
- Vue Composition API y `<script setup>`; JavaScript ESM. Componentes en `src/components`, flujos reactivos en `src/composables`, servicios sin Vue en `src/services`, representación 3D en `src/scene`.
- Texto e interfaz en español. Fondo negro puro del visor; controles fuera de la presentación y calibración por navegador.
- Una tarea principal activa; registrar estado y responsable en la roadmap. Verificar dependencias antes de ampliar funciones.
- Claves y modelos de voz solo en PC. Dictado revisable y envío explícito; ningún LLM ejecuta acciones ni código.
- Conservar cancelación, límites, exclusión micrófono/TTS y descarte de resultados antiguos. No agregar fallback automático ni pagos.
- No reintroducir placeholders, otro avatar, nuevas capas o archivos históricos sin necesidad concreta.

## Verificación y cierre

- Ejecutar las pruebas pertinentes y build. Las APIs privadas requieren pruebas de origen, concurrencia, cancelación y recuperación.
- Revisar interfaz renderizada en escritorio y formato vertical. Build o DOM no demuestran calidad visual.
- Distinguir fixtures, motores reales, reproducción digital y aceptación humana/física.
- Actualizar roadmap y documentación vigente al cambiar alcance/contratos. Un solo informe por migración importante; no duplicar el historial.
- Revisar diff y preservar cambios ajenos. Crear commits coherentes cuando el contexto lo autorice; no publicar sin instrucción.
