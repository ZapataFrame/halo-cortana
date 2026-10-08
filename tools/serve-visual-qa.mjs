// Ensayo de recursos reales, aislado en loopback. No carga .env ni llama a un LLM.
import { access, readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { createApp } from '../server/app.js';

const scenario = process.argv[2] || 'loading';
if (!['loading', 'error'].includes(scenario)) throw new Error('Usa loading o error.');
const root = resolve('dist');
await access(resolve(root, 'index.html'));
let release;
const pending = new Promise(resolve => { release = resolve; });
const server = createApp({
  root, port: 3001,
  config: { provider: 'openai', model: 'sin-configurar', key: '' },
  readAsset: async target => {
    if (basename(target) === 'dancer.glb') {
      if (scenario === 'error') throw new Error('Fallo de recurso provocado para QA.');
      console.info('GLB retenido: pulsa Enter para completar la carga real.');
      await pending;
    }
    return readFile(target);
  },
});
process.stdin.on('data', release);
server.listen(3001, '127.0.0.1', () => {
  console.info(`QA ${scenario}: http://127.0.0.1:3001/hologram · Ctrl+C para terminar.`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  release(); server.closeAllConnections(); server.close(); process.stdin.pause();
});
