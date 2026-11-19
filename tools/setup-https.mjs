// Genera un certificado autofirmado local para habilitar micrófono en visores LAN por HTTPS.
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';

const dir = resolve('.certs');
const keyPath = resolve(dir, 'key.pem');
const certPath = resolve(dir, 'cert.pem');
const ips = Object.values(networkInterfaces()).flat()
  .filter(item => item && !item.internal && item.family === 'IPv4')
  .map(item => item.address);
const san = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map(ip => `IP:${ip}`)].join(',');

await mkdir(dir, { recursive: true });
execFileSync('openssl', [
  'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-days', '365', '-nodes',
  '-keyout', keyPath, '-out', certPath,
  '-subj', '/CN=cortana-local',
  '-addext', `subjectAltName=${san}`,
], { stdio: 'inherit' });

console.log(`Certificado HTTPS local generado en ${dir}`);
console.log(`SAN: ${san}`);
console.log('Inicia el servidor con npm run demo y abre el enlace https://... en la otra laptop (acepta la advertencia local una vez).');
