# Cortana — MVP holográfico activo

Actualizado: 2026-10-08. Visor y conversación textual implementados; propietario autorizó adelantar voz PC por D-32. Aceptación móvil/física pendiente.

La versión previa del agente del simulador se conserva en `docs/archive/Cortana-2026-10-05.md`. Alcance actual: `SPECIFICACTIONS.MD`; tareas/estados: `ROADMAP.MD`; tarjetas y pruebas: `docs/plans/2026-10-07-mvp-holograma.md`.

## 1. Qué es Cortana en esta entrega

Un humanoide sencillo adquirido de internet, visible sobre negro puro en celular/pantalla y calibrable para una caja Pepper’s Ghost. No requiere parecido exacto, lipsync, rig nuevo ni shaders complejos. Por nueva petición del propietario incluye modos vertical/horizontal y un baile libre, activable desde PC.

La prueba vigente usa Ollama Cloud con Gemma 4 31B; clave cargada y cinco respuestas reales comprobadas, con seguimiento y cancelación (H-28). GPT permanece seleccionable. El usuario escribe desde PC; el móvil mantiene el avatar. Ollama queda como alternativa explícita, seleccionable desde el panel con Qwen local (H-23). H-15 añade respuesta hablada local en PC; H-16 continúa con reconocimiento.

## 2. Flujo activo

```mermaid
flowchart LR
    PC["PC: servidor local y control"] --> A["Assets locales y calibración"]
    A --> V["Móvil: humanoide sobre negro"]
    U["Usuario escribe en control PC"] --> B["Backend: proveedor LLM"]
    B --> L["API Ollama Cloud / Gemma · GPT · Ollama local"]
    L --> R["Respuesta textual real en PC"]
    R --> T["Piper local: WAV en español"]
    T --> S["Control PC: reproducción y volumen"]
    S --> E
    B --> E["Estado de presentación"]
    E --> V
    PC --> M["Reposo / Gangnam Style"]
    M --> E
```

Visor independiente: arranca sin clave y sigue visible si falla la IA. El móvil carga un modelo local servido por PC y renderiza en su navegador. No envía secretos ni necesita estado de un campo de batalla.

## 3. Estados y presentación

- Visor: `loading`, `ready`, `error`; durante carga/error conserva negro y el diagnóstico aparece en el panel de ajustes o control, nunca como HUD automático.
- Conversación pública: `idle`, `processing`, `responded`, `error`; `speaking` durante reproducción confirmada en PC. Cancelar chat vuelve a `idle`; detener audio recupera fase anterior.
- Conectividad: separada del estado visual. Desconexión no borra el modelo ya cargado; reconexión obtiene sesión/revisión actual.
- Recuperación H-30: valida el contrato público e ignora revisiones viejas/duplicadas; nueva sesión tras reinicio acepta revisión cero. Una consulta activa, timeout 2.5 s, ciclo de 1 s en primer plano/3 s en segundo plano. Al salir se aborta; al volver se consulta estado actual. Aviso de desconexión en control/calibración, nunca HUD en el visor cerrado. Durante un corte se detiene el pulso y se conserva movimiento/figura; la reconexión no reenvía mensajes.
- No usar `listening` hasta tener STT real. `speaking` añade pulso luminoso sin labios; no proyecta botones/texto.

Ruta móvil `/hologram`: fondo #000000, una figura, controles ocultos. Ajustes: modo automático/vertical/horizontal, escala, desplazamiento, rotación y espejo horizontal/vertical. Patrón F temporal prueba orientación mediante caja real; desaparece al presentar. Guardar ajuste por dispositivo y poder restablecerlo. El modo añade 90° si la postura del viewport no coincide con el montaje; rotación adicional y espejos siguen independientes. No bloquea el SO del celular.

Movimiento público separado del diálogo: `idle` o `gangnam`. Botones **Reposo** y **Bailar Gangnam Style** en `/control`; backend valida la selección y los visores la recuperan por polling. Cambiar baile no llama a GPT. Reiniciar chat conserva movimiento; reiniciar servidor vuelve a reposo. No hay música ni sincronización exacta de frames entre pantallas.

## 4. Modelo y materiales

Avatar activo: Superhero Male de Quaternius, CC0, obtenido del repositorio ProgramAsWeights/avatar con procedencia y licencia conservadas. GLB de 741320 bytes, 14318 triángulos, 65 huesos y sin recursos externos. Baile: recreación Gangnam Style de ese proyecto, MIT, convertida a un clip local de 7.273 s y 30 FPS; 162676 bytes para reposo y baile. No usa assets oficiales de Epic ni audio. Ficha/hashes/licencias y comando de regeneración en `public/models/README.md`. CesiumMan anterior se conserva con licencia como histórico, sin cargarse en el visor activo.

Inicialmente blanco/gris luminoso para contrastar sobre negro. Silueta completa con márgenes; sin suelo, skybox ni entorno. Contornos triangulares opcionales ya disponibles; outline fino y arte final después de verificar reflejo. Reacción al procesamiento o animación de reposo son mejoras; no desplazan H-08.

### Variante Cortana aportada (2026-10-08)

Opción **Cortana importada**: `?avatar=cortana` en control/visor. Copia local del GLB proporcionado, 18,948 triángulos y rig de 79 joints, cuatro materiales con ocho imágenes originales integradas, frente corregido 180° y pose estática. Original intacto y atribución/CC BY-NC declarada conservadas en la ficha. No reproduce su clip Twerking ni reutiliza Gangnam del rig Quaternius. Cada pantalla abre su URL; selección visual no cambia proveedores ni conversación backend. La adaptación H-26 conserva color, alpha del cabello y mapas normales/emisivos; el fondo y la interfaz permanecen negros/monocromáticos. No es aún selección de avatar final ni prueba de caja. Preparación de movimientos: `docs/GUIA_RIG_ANIMACIONES.md`; aprovechar el rig existente antes de plantear uno nuevo.

## 5. Conversación y proveedor

Control PC separado del área reflejada: escribir, enviar, cancelar, leer respuesta y ver estado/proveedor. Personalidad aplicada mediante prompt del backend: «Eres Cortana, asistente de un prototipo holográfico. Responde en español de forma breve. Este MVP solo muestra tu modelo y admite conversación; no afirmes controlar un simulador ni dispositivos».

Sin herramientas de estrategia ni acciones de mundo en este corte. No anunciar «tanque creado», «escuchando» o «hablando» cuando esas funciones no existen. Historial breve y explícito; reiniciar conversación no reinicia calibración.

Selector del control PC: **GPT / OpenAI**, **Ollama Cloud / Gemma 4** o **Local / Ollama (Qwen)**. Cloud usa el modelo configurado; local usa los instalados. **Actualizar modelos** vuelve a consultar Ollama; **Cambiar modelo** inicia conversación nueva, conserva baile/calibración y aplica hasta reiniciar servidor. No hay cambio automático ante errores.

**Probar conexión** comprueba el proveedor aplicado sin generar texto ni alterar la conversación. GPT consulta su modelo autenticado; local comprueba el instalado; Cloud consulta catálogo público y avisa que la clave/cuota solo se verifican al enviar. El indicador exige comprobación, no solo una clave configurada. La prueba se deshabilita durante el envío/cambio y mientras haya selección pendiente de aplicar. Fallos de red, clave, acceso, modelo y límite se explican en el control; consulta máxima 8 s. Otro control que cambie proveedor o inicie una generación hace descartar un resultado antiguo.

GPT disponible: OpenAI Responses con `gpt-4.1-mini`, seleccionado para chat breve sin razonamiento previo. Comprobación inicial de clave rechazada (401); al último reinicio falta la clave GPT. Sin generación ni latencia/calidad de respuesta GPT comprobadas. Adaptador local disponible al elegir `LLM_PROVIDER=ollama`, sin fallback automático. Clave únicamente en backend PC; suscripción ChatGPT/Codex no equivale a créditos API. Ver `docs/API_OPENAI.md`.

Implementado: un envío activo, descarte de respuestas tardías, timeout 60 s tras un fallo real con 30 s en CPU, reintentos manuales e IDs idempotentes. Ollama local limita salida a 48 tokens; Cloud/OpenAI a 256. El contexto del servidor conserva seis pares y se reinicia desde el control. Falla de proveedor produce error en control; pantalla de proyección sigue negra con figura.

Prueba Cloud H-28: API directa, clave Ollama en backend, sin descargar Gemma localmente ni activar pagos. Autenticación y respuesta real comprobadas; cancelación no incorpora texto parcial al historial. Errores no detienen figura/negro. Configuración y límites del plan gratuito en `docs/API_OLLAMA_CLOUD.md`.

## 6. Caja y calibración

Un reflector principal, una imagen frontal. No duplicar la figura en cuatro cuadrantes. Confirmar posición de pantalla, reflexiones y ángulo con el patrón; la caja puede necesitar espejo o rotación según montaje.

Los valores numéricos permiten repetir el montaje: tamaño 25–200 %, desplazamiento X/Y −45…45 % y giro del cuerpo en pasos de 5°. Cambios válidos se aplican al escribir; Enter confirma y acota límites. Espejos y rotación de pantalla siguen independientes. Cerrar el panel conserva el patrón si está activo; para presentar al humanoide desactiva «Patrón de prueba» o pulsa Restablecer. La recarga recupera ajustes y muestra siempre el modelo.

La caja y pantalla reales determinan tamaño y contraste; no asumir OLED ni dimensiones. Un píxel RGB 0/0/0 no garantiza negro físico de la pantalla. H-08 registra luz, punto de observación, material, defectos y evidencia real. El modelo debe seguir dentro del reflector sin UI visible.

## 7. Voz PC y etapas siguientes

H-15: Piper/Daniela en español, CPU y sin clave/coste por llamada. Probar voz, lectura automática opcional, Escuchar respuesta, Volumen y Detener voz. Lee respuesta guardada sin consultar otra vez al LLM; prueba fija diferenciada de conversación. Una salida compartida, cancelación y expiración. Guía/contrato/versión/hash/atribución: `docs/VOZ_PC.md`.

H-16: pulsar para hablar en PC, transcripción editable y envío explícito. H-17: voz→LLM→TTS→avatar con pruebas de recuperación. Micrófono móvil requiere comprobar permisos/contexto seguro antes de escogerlo.

Modelo final, labios, escucha por nombre y app instalada son H-18 diferido. El baile solicitado se implementa en H-22 como animación concreta; no reactiva otros gestos ni el simulador. Herramientas tácticas y análisis de batalla permanecen en archivo histórico.

## 8. Criterios de éxito

- A visual: figura de internet completa, negro digital comprobado, calibración persistente, visor real estable y prueba óptica fotografiada/grabada.
- B LLM: 3 preguntas nuevas y seguimiento, respuesta no pregrabada, errores controlados y figura estable.
- Voz: adelantada en PC por el propietario; no sustituye aceptación física A+B.

Hay capturas y mediciones PC/LLM local en el reporte inicial; orientación y baile tienen evidencia nueva en `docs/reports/2026-10-07-H-20-22-gpt-orientacion-baile.md`. H-28 verifica respuestas Cloud; H-29 comprueba diagnóstico; H-30 verifica recuperación PC. H-15 añade voz real y su evidencia propia. D-32/Q-11 adelantan H-15→H-16 en PC. H-11 manual (recorrido completo/cancelar chat), clave GPT H-20 y datos físicos H-19 siguen pendientes. H-07/H-08 validan dispositivo/caja; no hay aprobación física ni latencia GPT medida.
