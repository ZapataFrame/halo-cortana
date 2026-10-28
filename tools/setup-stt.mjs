import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadVerified } from './model-download.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const base = resolve('.stt-models/base');
await mkdir(base, { recursive: true });
const env = { ...process.env, UV_CACHE_DIR: resolve(base, '.uv-cache'),
  UV_PYTHON_INSTALL_DIR: resolve(base, '.python'), UV_HTTP_TIMEOUT: '3600' };
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('No se pudo preparar el entorno virtual. Instala uv y consulta docs/VOZ_PC.md.');
}
run('uv', ['venv', '.stt-venv', '--python', '3.13', '--allow-existing']);
run('uv', ['pip', 'install', '--python', '.stt-venv/bin/python', '-r', 'tools/stt-requirements.txt']);
const manifest = JSON.parse(await readFile('tools/stt-model.json', 'utf8'));
for (const file of manifest.files) {
  await downloadVerified({ url: `https://huggingface.co/${manifest.repo}/resolve/${manifest.revision}/${file.name}`,
    path: resolve(base, '', file.name), sha256: file.sha256, bytes: file.bytes });
}
console.log('Whisper base instalado y verificado. Reinicia el servidor para utilizarlo desde el control PC.');
