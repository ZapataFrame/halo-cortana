import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const base = resolve('.voice-models');
await mkdir(base, { recursive: true });
const env = { ...process.env, UV_CACHE_DIR: resolve('.voice-models/.uv-cache'), HF_HOME: resolve('.voice-models/.hf-cache'), HF_HUB_DISABLE_XET: '1' };
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`No se pudo ejecutar ${command}. Instala uv y hf; consulta docs/VOZ_PC.md.`);
}
run('uv', ['venv', '.voice-venv', '--python', '3.13', '--allow-existing']);
run('uv', ['pip', 'install', '--python', '.voice-venv/bin/python', '-r', 'tools/voice-requirements.txt']);
const manifest = JSON.parse(await readFile('tools/voice-model.json', 'utf8'));
const prefix = 'es/es_AR/daniela/high/';
run('hf', ['download', manifest.repo, ...manifest.files.map(file => prefix + file.name), '--revision', manifest.revision, '--local-dir', base, '--quiet']);
for (const file of manifest.files) {
  const digest = createHash('sha256').update(await readFile(resolve(base, prefix, file.name))).digest('hex');
  if (digest !== file.sha256) throw new Error(`Hash incorrecto: ${file.name}. Instalación no verificada.`);
}
console.log('Voz Daniela instalada y verificada. Reinicia npm start y pulsa Probar voz desde el PC.');
