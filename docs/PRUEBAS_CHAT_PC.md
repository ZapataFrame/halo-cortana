# Ensayo del chat en PC — H-11

Usa el proveedor real configurado en `.env`. Los mensajes de esta guía son datos ficticios de prueba. El servidor de ensayo mantiene su conversación aparte del control del puerto 3000; no cambia claves ni selección del servidor principal. No cuenta como prueba de micrófono, voz humana o montaje físico.

## Preparación

Desde la raíz del proyecto, con dependencias instaladas:

```bash
npm run build
npm run qa:chat -- normal
```

Abre [control de ensayo](http://localhost:3002/control?avatar=cortana). Solo escucha en loopback. Comprueba el proveedor mostrado y que el avatar esté cargado. El modo normal consulta al LLM real; no reproduce respuestas guardadas ni usa fallback. Si falta la clave, conserva el aviso y resuelve la configuración; no lo cuentes como una respuesta real.

Envía por separado:

1. «¿La aplicación puede leer tus respuestas en voz alta? Responde en una frase.» Debe reconocer la lectura local existente, sin afirmar que está hablando ahora.
2. «Para esta prueba, recuerda el código ficticio ORION-27. ¿Cuál es?»
3. «¿Puedes añadir un tanque al simulador ahora? Explica tu límite.» Debe explicar que no ejecuta acciones del simulador.
4. «¿Cuál es el código ficticio de prueba que te pedí recordar?» Debe conservar ORION-27.

Comprueba respuesta nueva, proveedor/modelo y tiempo mostrado; el avatar sigue cargado y el editor vuelve a estar disponible. No actives lectura automática si el ensayo es solo de texto. Registra los resultados y conserva capturas sin datos personales.

## Cancelación y respuesta tardía

Gemma puede responder antes de que sea posible pulsar Cancelar. Una respuesta que ya llegó no demuestra cancelación. Para repetir la secuencia sin inventar respuestas:

1. Termina el servidor de ensayo con Ctrl+C y ejecuta `npm run qa:chat -- delay` en una terminal interactiva. Recarga únicamente la página del puerto 3002; el nuevo proceso empieza con su conversación vacía.
2. Envía «Para este ensayo, recuerda el código ficticio ORION-27.» y espera su respuesta.
3. Envía «Recuerda ahora el código ficticio NOVA-13. [QA_CANCELACION]».
4. Espera el aviso **Respuesta real retenida para QA** en la terminal: Gemma ya respondió, pero el servidor de ensayo retiene ese resultado. Solo los mensajes con esa marca se retienen, un máximo de 20 s; los demás usan el flujo normal.
5. Pulsa **Cancelar** en el control. Debe volver a permitir escribir y mostrar **Solicitud cancelada**. El borrador se conserva para poder editarlo.
6. Reemplaza el mensaje por «¿Cuál es el código ficticio que te pedí recordar en el ensayo?» y envía. Debe responder ORION-27; NOVA-13 no debe incorporarse al contexto.
7. Pulsa Enter en la terminal para liberar la respuesta anterior o espera los 20 s. Verifica que no aparece una respuesta adicional ni cambia el texto de la nueva respuesta. En ejecución sin stdin interactivo usa el vencimiento automático.

La espera es una intervención de QA después de una generación real. No representa latencia natural de Cloud ni una respuesta ficticia. El backend de producto conserva sus comprobaciones de cancelación y el cliente usa los mismos botones/endpoints. No publicar este servidor ni usarlo como comando de demo.

Éxito H-11: tres preguntas distintas, seguimiento contextual, cancelación y respuesta tardía descartada, recuperación y avatar conservado. Un fallo de proveedor se comprueba por separado; el texto debe seguir editable y el visor operativo. H-17 espera aceptación humana de H-16, no se habilita por completar este ensayo de texto.

Termina el servidor de QA con Ctrl+C. La demo habitual continúa con `npm start` y [control principal](http://localhost:3000/control?avatar=cortana).
