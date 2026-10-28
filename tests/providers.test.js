import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReply, providerConfig, providerHealth, checkProviderConnection } from '../server/providers.js';

test('GPT es principal; clave ausente no llama a la API ni usa Ollama', async () => {
  const config = providerConfig({});
  assert.equal(config.provider, 'openai'); assert.equal(config.model, 'gpt-4.1-mini');
  assert.equal((await providerHealth(config)).ready, false);
  let calls = 0;
  await assert.rejects(generateReply(config, [], 'hola', undefined, async () => { calls++; }), /NOT_CONFIGURED/);
  assert.equal(calls, 0);
  assert.equal(providerConfig({ LLM_PROVIDER: 'ollama' }).provider, 'ollama');
});

test('adaptador Responses transmite contexto, limita respuesta y mantiene clave en cabecera', async () => {
  const config = providerConfig({ OPENAI_API_KEY: ' test-private-key ' });
  const history = [{ role: 'user', content: 'Me llamo Diego' }, { role: 'assistant', content: 'Hola Diego' }];
  const snapshot = structuredClone(history), controller = new AbortController();
  const result = await generateReply(config, history, '¿Cómo me llamo?', controller.signal, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer test-private-key');
    assert.equal(options.signal, controller.signal);
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.max_output_tokens, 256);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.deepEqual(body.input, [...snapshot, { role: 'user', content: '¿Cómo me llamo?' }]);
    assert.ok(!options.body.includes('test-private-key'));
    return { ok: true, json: async () => ({ status: 'completed', output: [
      { type: 'reasoning', content: [{ type: 'output_text', text: 'privado' }] },
      { type: 'message', content: [{ type: 'output_text', text: 'Te llamas Diego.' }] },
    ] }) };
  });
  assert.deepEqual(history, snapshot);
  assert.deepEqual(result, { text: 'Te llamas Diego.', truncated: false });
});

test('fallos HTTP no leen datos privados y las respuestas vacías son errores', async () => {
  const config = providerConfig({ OPENAI_API_KEY: 'test-only' });
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: false, status,
      json() { throw new Error('No debe leerse el cuerpo privado'); },
    })), new RegExp(`PROVIDER_HTTP_${status}`));
  }
  await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: true, json: async () => ({ output: [] }) })), /EMPTY_RESPONSE/);
});

test('Ollama envía el modelo Qwen elegido, historial y cancelación sin clave OpenAI', async () => {
  const config = providerConfig({ LLM_PROVIDER: 'ollama', OLLAMA_MODEL: 'qwen2.5:32b' });
  const controller = new AbortController();
  const history = [{ role: 'user', content: 'Me llamo Ana' }, { role: 'assistant', content: 'Hola Ana' }];
  const result = await generateReply(config, history, '¿Mi nombre?', controller.signal, async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(options.headers.Authorization, undefined); assert.equal(options.signal, controller.signal);
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'qwen2.5:32b'); assert.equal(body.stream, false);
    assert.deepEqual(body.messages.slice(1), [...history, { role: 'user', content: '¿Mi nombre?' }]);
    return { ok: true, json: async () => ({ message: { content: 'Ana.' }, done_reason: 'length' }) };
  });
  assert.deepEqual(result, { text: 'Ana.', truncated: true });
  for (const url of ['https://example.com', 'http://192.168.1.1:11434', 'file:///tmp/test']) {
    assert.throws(() => providerConfig({ LLM_PROVIDER: 'ollama', OLLAMA_URL: url }));
  }
});

test('Cloud usa destino fijo y exige su propia clave sin llamar a otro proveedor', async () => {
  const config = providerConfig({ LLM_PROVIDER: 'ollama-cloud', OLLAMA_URL: 'https://unrelated.example', OPENAI_API_KEY: 'gpt-test-only' });
  assert.equal(config.url, 'https://ollama.com'); assert.equal(config.model, 'gemma4:31b');
  assert.equal(config.key, '');
  const health = await providerHealth(config);
  assert.equal(health.ready, false); assert.equal(health.verified, false);
  assert.match(health.detail, /OLLAMA_API_KEY/);
  let calls = 0;
  await assert.rejects(generateReply(config, [], 'hola', undefined, async () => { calls++; }), /NOT_CONFIGURED/);
  assert.equal(calls, 0);
});

test('Gemma Cloud envía contexto/abort, protege clave y devuelve solo contenido final', async () => {
  const config = providerConfig({ LLM_PROVIDER: 'ollama-cloud', OLLAMA_API_KEY: ' cloud-private-test ' });
  const history = [{ role: 'user', content: 'Me llamo Ana' }, { role: 'assistant', content: 'Hola Ana' }];
  const snapshot = structuredClone(history), controller = new AbortController();
  const result = await generateReply(config, history, '¿Mi nombre?', controller.signal, async (url, options) => {
    assert.equal(url, 'https://ollama.com/api/chat');
    assert.equal(options.headers.Authorization, 'Bearer cloud-private-test');
    assert.equal(options.signal, controller.signal); assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gemma4:31b'); assert.equal(body.stream, false); assert.equal(body.think, false);
    assert.equal(body.options.num_predict, 256);
    assert.deepEqual(body.messages.slice(1), [...history, { role: 'user', content: '¿Mi nombre?' }]);
    assert.ok(!options.body.includes('cloud-private-test')); assert.equal(body.tools, undefined);
    return { ok: true, json: async () => ({ message: { content: 'Ana.', thinking: 'no mostrar' }, done_reason: 'stop' }) };
  });
  assert.deepEqual(result, { text: 'Ana.', truncated: false }); assert.deepEqual(history, snapshot);
  for (const status of [401, 402, 403, 404, 429, 500]) {
    await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: false, status,
      json() { throw new Error('No leer cuerpo privado'); },
    })), new RegExp(`PROVIDER_HTTP_${status}`));
  }
  await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: true,
    json: async () => ({ message: { thinking: 'solo pensamiento' } }),
  })), /EMPTY_RESPONSE/);
});

test('diagnóstico no solicita generación y una clave ausente no inicia tráfico', async () => {
  let calls = 0;
  for (const provider of ['openai', 'ollama-cloud', 'gemini']) {
    const result = await checkProviderConnection(providerConfig({}, provider), undefined, async () => { calls++; });
    assert.equal(result.code, 'NOT_CONFIGURED'); assert.equal(result.verified, false);
  }
  assert.equal(calls, 0);
  const config = providerConfig({ OPENAI_API_KEY: 'diagnostic-private-test', OPENAI_MODEL: 'gpt/model?query=1' });
  const controller = new AbortController();
  const result = await checkProviderConnection(config, controller.signal, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/models/gpt%2Fmodel%3Fquery%3D1');
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, 'Bearer diagnostic-private-test');
    assert.equal(options.signal, controller.signal); assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => ({ id: config.model, privateMetadata: 'no-publicar' }) };
  });
  assert.equal(result.ready, true); assert.equal(result.verified, true);
  assert.match(result.detail, /cuota.*al enviar/);
  assert.ok(!JSON.stringify(result).includes('diagnostic-private-test'));
  assert.ok(!JSON.stringify(result).includes('no-publicar'));
});

test('Gemini usa clave propia y destino fijo; configuración ausente, modelo inválido o aborto no generan tráfico', async () => {
  const empty = providerConfig({ LLM_PROVIDER: 'gemini', OPENAI_API_KEY: 'another-provider' });
  assert.equal(empty.model, 'gemini-3.5-flash-lite'); assert.equal(empty.key, '');
  assert.equal((await providerHealth(empty)).ready, false);
  let calls = 0;
  await assert.rejects(generateReply(empty, [], 'hola', undefined, async () => { calls++; }), /NOT_CONFIGURED/);
  const config = providerConfig({ LLM_PROVIDER: 'gemini', GEMINI_API_KEY: ' gemini-private-test ', GEMINI_URL: 'https://unrelated.example' });
  assert.equal(config.url, 'https://generativelanguage.googleapis.com/v1beta/models');
  assert.equal(config.key, 'gemini-private-test'); assert.equal((await providerHealth(config)).verified, false);
  for (const model of ['../private', 'models/gemini-test', 'https://other.example', 'gemini-a?key=x', 'gemini-a/b']) {
    assert.throws(() => providerConfig({ LLM_PROVIDER: 'gemini', GEMINI_MODEL: model }), /GEMINI_MODEL/);
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generateReply(config, [], 'hola', controller.signal, async () => { calls++; }));
  assert.equal(calls, 0);
});

test('Gemini REST convierte historial, conserva cancelación y solo devuelve texto final de un candidato', async () => {
  const config = providerConfig({ LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'gemini-private-test' });
  const controller = new AbortController();
  const history = [{ role: 'user', content: 'Me llamo Ana' }, { role: 'assistant', content: 'Hola Ana.' }];
  const snapshot = structuredClone(history);
  const result = await generateReply({ ...config, url: 'https://unrelated.example' }, history, '¿Mi nombre?', controller.signal, async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'gemini-private-test'); assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.signal, controller.signal); assert.equal(options.redirect, 'error');
    assert.ok(!url.includes('gemini-private-test')); assert.ok(!options.body.includes('gemini-private-test'));
    const body = JSON.parse(options.body);
    assert.deepEqual(body.contents, [
      { role: 'user', parts: [{ text: 'Me llamo Ana' }] }, { role: 'model', parts: [{ text: 'Hola Ana.' }] },
      { role: 'user', parts: [{ text: '¿Mi nombre?' }] },
    ]);
    assert.match(body.systemInstruction.parts[0].text, /español/);
    assert.equal(body.tools, undefined); assert.equal(body.generationConfig.candidateCount, 1);
    assert.equal(body.generationConfig.maxOutputTokens, 1024); assert.equal(body.generationConfig.thinkingConfig.includeThoughts, false);
    return { ok: true, json: async () => ({ candidates: [
      { content: { parts: [{ thought: true, text: 'No mostrar pensamiento' }, { text: 'Te llamas ' }, { text: 'Ana.' }] }, finishReason: 'MAX_TOKENS' },
      { content: { parts: [{ text: 'No mezclar candidatos' }] }, finishReason: 'STOP' },
    ] }) };
  });
  assert.deepEqual(history, snapshot); assert.deepEqual(result, { text: 'Te llamas Ana.', truncated: true });
});

test('Gemini rechaza bloqueo, falta de texto y HTTP fallido sin leer errores privados', async () => {
  const config = providerConfig({ LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-only' });
  for (const status of [400, 401, 403, 404, 429, 500]) {
    await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: false, status,
      json() { throw new Error('No leer error privado de Google'); },
    })), new RegExp(`PROVIDER_HTTP_${status}`));
  }
  for (const data of [{}, { candidates: [] }, { candidates: [{ content: { parts: [{ thought: true, text: 'Solo pensamiento' }] }, finishReason: 'STOP' }] }]) {
    await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: true, json: async () => data })), /EMPTY_RESPONSE/);
  }
  for (const data of [{ promptFeedback: { blockReason: 'SAFETY' } }, { candidates: [{ content: { parts: [{ text: 'Parcial' }] }, finishReason: 'SAFETY' }] }]) {
    await assert.rejects(generateReply(config, [], 'hola', undefined, async () => ({ ok: true, json: async () => data })), /BLOCKED_RESPONSE/);
  }
});

test('diagnóstico Gemini autentica models.get sin generar y valida el método, modelo, cuota y acceso', async () => {
  const config = providerConfig({ LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'gemini-private-test' });
  const result = await checkProviderConnection(config, undefined, async (url, options) => {
    assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${config.model}`);
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined); assert.equal(options.redirect, 'error');
    assert.equal(options.headers['x-goog-api-key'], 'gemini-private-test');
    return { ok: true, json: async () => ({ name: `models/${config.model}`, supportedGenerationMethods: ['generateContent'], privateMetadata: 'hidden-test-only' }) };
  });
  assert.equal(result.verified, true); assert.equal(result.code, 'MODEL_AVAILABLE'); assert.match(result.detail, /cuota.*al enviar/);
  assert.ok(!JSON.stringify(result).includes('hidden-test-only')); assert.ok(!JSON.stringify(result).includes('gemini-private-test'));
  for (const data of [{}, { name: 'models/other', supportedGenerationMethods: ['generateContent'] }, { name: `models/${config.model}`, supportedGenerationMethods: ['embedContent'] }]) {
    const checked = await checkProviderConnection(config, undefined, async () => ({ ok: true, json: async () => data }));
    assert.equal(checked.code, 'MODEL_UNAVAILABLE'); assert.equal(checked.verified, false);
  }
  for (const [status, code] of [[400, 'AUTH_ERROR'], [401, 'AUTH_ERROR'], [403, 'ACCESS_ERROR'], [404, 'MODEL_UNAVAILABLE'], [429, 'RATE_LIMIT'], [500, 'UNAVAILABLE']]) {
    const checked = await checkProviderConnection(config, undefined, async () => ({ ok: false, status,
      json() { throw new Error('No leer error privado'); },
    }));
    assert.equal(checked.code, code); assert.equal(checked.verified, false);
  }
});

test('diagnóstico distingue autenticación/acceso/modelo/límite sin leer cuerpos privados', async () => {
  const config = providerConfig({ OPENAI_API_KEY: 'test-only' });
  for (const [status, code] of [[401, 'AUTH_ERROR'], [403, 'ACCESS_ERROR'], [404, 'MODEL_UNAVAILABLE'], [429, 'RATE_LIMIT'], [500, 'UNAVAILABLE']]) {
    const result = await checkProviderConnection(config, undefined, async () => ({ ok: false, status,
      json() { throw new Error('No debe leer el error privado'); },
    }));
    assert.equal(result.code, code); assert.equal(result.ready, false); assert.equal(result.verified, false);
    assert.ok(!JSON.stringify(result).includes('privado'));
  }
  const wrongModel = await checkProviderConnection(config, undefined, async () => ({ ok: true, json: async () => ({ id: 'otro-modelo' }) }));
  assert.equal(wrongModel.code, 'INVALID_RESPONSE'); assert.equal(wrongModel.verified, false);
});

test('catálogo público Cloud no recibe clave ni prueba acceso; local verifica el modelo instalado', async () => {
  const cloud = providerConfig({ OLLAMA_API_KEY: 'invalid-cloud-test-key' }, 'ollama-cloud');
  const result = await checkProviderConnection(cloud, undefined, async (url, options) => {
    assert.equal(url, 'https://ollama.com/api/tags'); assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, undefined); assert.equal(options.body, undefined);
    return { ok: true, json: async () => ({ models: [{ name: 'gemma4:31b' }] }) };
  });
  assert.equal(result.code, 'ACCESS_UNVERIFIED'); assert.equal(result.verified, false);
  assert.match(result.detail, /público/);
  for (const provider of ['ollama', 'ollama-cloud']) {
    const config = provider === 'ollama' ? providerConfig({ OLLAMA_MODEL: 'local-test' }, provider) : cloud;
    const unavailable = await checkProviderConnection(config, undefined, async () => ({ ok: true, json: async () => ({ models: [{ name: 'other' }] }) }));
    assert.equal(unavailable.code, 'MODEL_UNAVAILABLE'); assert.equal(unavailable.ready, false);
    const invalid = await checkProviderConnection(config, undefined, async () => ({ ok: true, json: async () => ({ privateError: 'no-publicar' }) }));
    assert.equal(invalid.verified, false); assert.ok(!JSON.stringify(invalid).includes('no-publicar'));
  }
  const local = providerConfig({ OLLAMA_MODEL: 'local-test' }, 'ollama');
  const installed = await checkProviderConnection(local, undefined, async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/tags'); assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, json: async () => ({ models: [{ name: 'local-test' }] }) };
  });
  assert.equal(installed.ready, true); assert.equal(installed.verified, true);
});

test('diagnóstico permite recuperar red fallida y respeta aborto sin filtrar detalles', async () => {
  const config = providerConfig({ OPENAI_API_KEY: 'test-only' });
  const result = await checkProviderConnection(config, undefined, async () => { throw new Error('url-y-clave-privadas'); });
  assert.equal(result.code, 'UNAVAILABLE'); assert.ok(!JSON.stringify(result).includes('privadas'));
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const cancelled = await checkProviderConnection(config, controller.signal, async () => { calls++; });
  assert.equal(cancelled.code, 'TIMEOUT'); assert.equal(calls, 0);
  const recovered = await checkProviderConnection(config, undefined, async () => ({ ok: true, json: async () => ({ id: config.model }) }));
  assert.equal(recovered.verified, true);
});
