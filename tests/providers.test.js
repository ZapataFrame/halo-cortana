import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReply, providerConfig, providerHealth } from '../server/providers.js';

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
