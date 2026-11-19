import { access, readFile } from 'node:fs/promises';
import { createServer as createHttpsServer } from 'node:https';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { createApp } from './app.js';
import { providerConfig, PROVIDERS } from './providers.js';

const root = resolve('dist');
try { await access(resolve(root, 'index.html')); }
catch { console.error('Primero ejecuta npm run build o npm run demo.'); process.exit(1); }
const port = Number(process.env.PORT || 3000);
const httpsPort = Number(process.env.HTTPS_PORT || 3443);
const host = process.env.HOST || '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido.');
if (!Number.isInteger(httpsPort) || httpsPort < 1 || httpsPort > 65535) throw new Error('HTTPS_PORT inválido.');
const certPath = resolve(process.env.HTTPS_CERT_PATH || '.certs/cert.pem');
const keyPath = resolve(process.env.HTTPS_KEY_PATH || '.certs/key.pem');
let tls;
try { tls = { cert: await readFile(certPath), key: await readFile(keyPath) }; }
catch { tls = null; }
const config = providerConfig();
const configs = Object.fromEntries(PROVIDERS.map(provider => [provider, providerConfig(process.env, provider)]));
const server = createApp({ root, port, httpsPort: tls ? httpsPort : null, config, configs });
const httpsServer = tls ? createHttpsServer(tls, server.listeners('request')[0]) : null;
server.on('error', error => { console.error(`No se pudo iniciar el servidor: ${error.code}`); process.exitCode = 1; });
httpsServer?.on('error', error => { console.error(`No se pudo iniciar HTTPS: ${error.code}`); });
server.listen(port, host, () => {
  console.log(`Control PC: http://localhost:${port}/control`);
  for (const item of Object.values(networkInterfaces()).flat()) {
    if (item && !item.internal && item.family === 'IPv4') {
      console.log(`Visor LAN: http://${item.address}:${port}/hologram`);
      if (httpsServer) console.log(`Visor LAN HTTPS (con micrófono): https://${item.address}:${httpsPort}/hologram`);
    }
  }
  if (!httpsServer) console.log('Para hablar desde otra laptop por Wi-Fi ejecuta: npm run setup:https');
  console.log(`LLM: ${config.provider} / ${config.model || 'sin configurar'}. Sin herramientas del juego.`);
});
httpsServer?.listen(httpsPort, host);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  httpsServer?.close(); httpsServer?.closeAllConnections?.();
  server.close(); server.closeAllConnections();
});
