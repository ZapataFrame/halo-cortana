import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const base = resolve('.stt-models/base');
await mkdir(base, { recursive: true });
const env = { ...process.env, UV_CACHE_DIR: resolve('.stt-models/.uv-cache'), HF_HOME: resolve('.stt-models/.hf-cache'), HF_HUB_DISABLE_XET: '1' };
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`No se pudo ejecutar ${command}. Instala uv y hf; consulta docs/VOZ_PC.md.`);
}
run('uv', ['venv', '.stt-venv', '--python', '3.13', '--allow-existing']);
run('uv', ['pip', 'install', '--python', '.stt-venv/bin/python', '-r', 'tools/stt-requirements.txt']);
const manifest = JSON.parse(await readFile('tools/stt-model.json', 'utf8'));
run('hf', ['download', manifest.repo, ...manifest.files.map(file => file.name), '--revision', manifest.revision, '--local-dir', base, '--quiet']);
for (const file of manifest.files) {
  const bytes = await readFile(resolve(base, file.name));
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Hash incorrecto: ${file.name}. Instalación no verificada.`);
}
console.log('Whisper base instalado y verificado. Reinicia npm start y mantén pulsado el micrófono desde localhost en el PC.');
