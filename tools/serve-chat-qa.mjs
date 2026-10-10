// Backend real para QA de interfaz, separado del chat principal y solo en loopback.
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../server/app.js';
import { providerConfig, generateReply } from '../server/providers.js';

const mode = process.argv[2] || 'normal';
if (!['normal', 'delay'].includes(mode)) throw new Error('Usa normal o delay.');
const root = resolve('dist');
await access(resolve(root, 'index.html'));
const config = providerConfig();
const configs = Object.fromEntries(['openai', 'ollama', 'ollama-cloud'].map(provider => [provider, providerConfig(process.env, provider)]));
const held = new Set();
function holdReply() {
  return new Promise(resolveReply => {
    const release = () => { clearTimeout(timer); held.delete(release); resolveReply(); };
    const timer = setTimeout(release, 20000);
    held.add(release);
    console.info('Respuesta real retenida para QA. Pulsa Enter para entregarla; máximo 20 s.');
  });
}
const server = createApp({ root, port: 3002, config, configs,
  async reply(selected, history, message, signal) {
    const generated = await generateReply(selected, history, message, signal);
    if (mode === 'delay' && message.includes('[QA_CANCELACION]')) {
      // Intencionalmente devuelve tarde incluso tras cancelar: createApp debe descartarla.
      await holdReply();
    }
    return generated;
  },
});
process.stdin.on('data', () => { for (const release of [...held]) release(); });
server.on('error', error => { console.error(`No se pudo iniciar QA: ${error.code}`); process.stdin.pause(); process.exitCode = 1; });
server.listen(3002, '127.0.0.1', () => {
  console.info(`QA ${mode}: http://localhost:3002/control?avatar=cortana`);
  console.info(`Proveedor real: ${config.provider} / ${config.model}. Conversación separada del puerto 3000.`);
  if (mode === 'delay') console.info('Solo los mensajes con [QA_CANCELACION] retienen una respuesta real; no es latencia del proveedor.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  for (const release of [...held]) release();
  server.close(); server.closeAllConnections(); process.stdin.pause();
});
