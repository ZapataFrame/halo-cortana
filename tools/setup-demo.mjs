import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
if (process.platform !== 'linux' || process.arch !== 'x64') {
  throw new Error('La instalación completa está verificada para Linux x86_64. Consulta docs/VOZ_PC.md para los límites de plataforma.');
}
for (const script of ['setup-cortana.mjs', 'setup-rvc-qa.mjs', 'setup-stt.mjs']) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`Falló ${script}; corrige el error y vuelve a ejecutar npm run setup:demo.`);
}
console.log('Voz Cortana y micrófono preparados en entornos virtuales. Configura tu proveedor LLM en .env y ejecuta npm run demo.');
