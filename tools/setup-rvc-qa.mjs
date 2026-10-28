// Experimento aislado: no instala paquetes en el Python global ni cambia el backend.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadVerified } from './model-download.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const base = resolve('.rvc-qa');
await mkdir(base, { recursive: true });
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--model-dir')) {
  throw new Error('Uso: node tools/setup-rvc-qa.mjs [--model-dir "carpeta de la voz"]');
}
const voiceDirectory = args.length ? resolve(args[1]) : null;
if (voiceDirectory) {
  for (const name of ['model.pth', 'model.index']) {
    if (!(await stat(resolve(voiceDirectory, name))).isFile()) throw new Error(`Falta ${name}`);
  }
}
const env = { ...process.env, UV_CACHE_DIR: resolve(base, 'cache/uv'),
  UV_PYTHON_INSTALL_DIR: resolve(base, 'python'), PIP_CACHE_DIR: resolve(base, 'cache/pip'),
  XDG_CACHE_HOME: resolve(base, 'cache'), PYTHONDONTWRITEBYTECODE: '1',
  PIP_REQUIRE_VIRTUALENV: 'true', PIP_DISABLE_PIP_VERSION_CHECK: '1',
  UV_HTTP_TIMEOUT: '3600', PIP_DEFAULT_TIMEOUT: '900', PIP_RETRIES: '10' };
function run(command, args) {
  console.log(`\nPreparando entorno: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('Preparación interrumpida; vuelve a ejecutar el mismo comando.');
}
async function download(url, path, expected, bytes) {
  await downloadVerified({ url, path, sha256: expected, bytes });
}

// RVC usa dependencias antiguas; Piper conserva su entorno moderno independiente.
run('uv', ['venv', '.rvc-qa/venv', '--python', '3.10', '--allow-existing']);
const python = resolve(base, 'venv/bin/python');
run('uv', ['pip', 'install', '--python', python, 'pip==24.0', 'setuptools==69.5.1',
  'wheel==0.43.0', 'Cython==0.29.37', 'numpy==1.23.5']);
run(python, ['-m', 'pip', 'install', 'torch==2.5.1+cpu', 'torchaudio==2.5.1+cpu',
  '--index-url', 'https://download.pytorch.org/whl/cpu']);
// El sdist de fairseq en PyPI omite clib/libbase; usar la revisión oficial completa.
run(python, ['-m', 'pip', 'install', '--no-build-isolation',
  'https://github.com/facebookresearch/fairseq/archive/4a388e64cd646ed7d7ad8de8fae55df2b8eea91d.tar.gz']);
run(python, ['-m', 'pip', 'install', '--no-build-isolation', 'rvc-python==0.1.5',
  'librosa==0.9.2', 'numba==0.57.1', 'scipy==1.10.1', 'torchcrepe==0.0.23', 'pyworld==0.3.4']);
run('uv', ['venv', '.rvc-qa/piper-venv', '--python', '3.13', '--allow-existing']);
run('uv', ['pip', 'install', '--python', '.rvc-qa/piper-venv/bin/python', '-r', 'tools/voice-requirements.txt']);

const voice = JSON.parse(await readFile('tools/voice-model.json', 'utf8'));
for (const file of voice.files) {
  await download(`https://huggingface.co/${voice.repo}/resolve/${voice.revision}/es/es_AR/daniela/high/${file.name}`,
    resolve(base, 'piper-model', file.name), file.sha256, file.bytes);
}
const auxiliary = JSON.parse(await readFile('tools/rvc-qa-models.json', 'utf8'));
for (const file of auxiliary.files) {
  await download(`https://huggingface.co/${auxiliary.repo}/resolve/${auxiliary.revision}/${file.name}`,
    resolve(base, 'base-models', file.name), file.sha256, file.bytes);
}
// Copias locales en el paquete: RVC no deberá descargar archivos al convertir.
const location = spawnSync(python, ['-c', 'import importlib.util; print(importlib.util.find_spec("rvc_python").submodule_search_locations[0])'],
  { env, encoding: 'utf8' });
if (location.status !== 0) throw new Error('No se encontró el paquete RVC instalado.');
const packageModels = resolve(location.stdout.trim(), 'base_model');
await mkdir(packageModels, { recursive: true });
for (const file of auxiliary.files) {
  const source = resolve(base, 'base-models', file.name);
  // Enlace duro dentro del mismo sistema de archivos; no duplica cientos de MB.
  const { link } = await import('node:fs/promises');
  await link(source, resolve(packageModels, file.name)).catch(error => { if (error.code !== 'EEXIST') throw error; });
}
const freeze = spawnSync(python, ['-m', 'pip', 'freeze'], { env, encoding: 'utf8' });
if (freeze.status !== 0) throw new Error('No se pudo registrar el entorno.');
await writeFile(resolve(base, 'requirements-installed.txt'), freeze.stdout);
console.log('\nPreparación terminada. Consulta docs/PRUEBA_RVC.md para generar y comparar los audios.');
if (voiceDirectory) {
  run(resolve(base, 'piper-venv/bin/python'), ['tools/compare-rvc.py', 'base']);
  run(python, ['tools/compare-rvc.py', 'convert', '--model', resolve(voiceDirectory, 'model.pth'),
    '--index', resolve(voiceDirectory, 'model.index')]);
  console.log('Comparación generada en .rvc-qa/output/. Falta evaluar el resultado al escucharlo.');
}
