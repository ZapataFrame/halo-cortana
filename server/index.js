import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { createApp } from './app.js';
import { providerConfig } from './providers.js';

const root = resolve('dist');
try { await access(resolve(root, 'index.html')); }
catch { console.error('Primero ejecuta npm run build o npm run demo.'); process.exit(1); }
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido.');
const config = providerConfig();
const configs = Object.fromEntries(['openai', 'ollama', 'ollama-cloud'].map(provider => [provider, providerConfig(process.env, provider)]));
const server = createApp({ root, port, config, configs });
server.on('error', error => { console.error(`No se pudo iniciar el servidor: ${error.code}`); process.exitCode = 1; });
server.listen(port, host, () => {
  console.log(`Control PC: http://localhost:${port}/control`);
  for (const item of Object.values(networkInterfaces()).flat()) {
    if (item && !item.internal && item.family === 'IPv4') console.log(`Visor LAN: http://${item.address}:${port}/hologram`);
  }
  console.log(`LLM: ${config.provider} / ${config.model || 'sin configurar'}. Sin herramientas del juego.`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); server.closeAllConnections(); });
