import { readFile, writeFile, mkdtemp, copyFile, stat, rm, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadVerified, fileHash } from './model-download.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
if (args.some(arg => !['--authenticated', '--without-index'].includes(arg))) throw new Error('Uso: npm run setup:cortana -- [--authenticated] [--without-index]');
const authenticated = args.includes('--authenticated'), withoutIndex = args.includes('--without-index');
const manifest = JSON.parse(await readFile('tools/cortana-voice-model.json', 'utf8'));
for (const file of manifest.files.filter(file => !withoutIndex || file.name !== 'model.index')) {
  const target = resolve('.rvc-qa/voices/cortana', file.name);
  if (!authenticated || await stat(target).catch(() => null)) {
    try { await downloadVerified({ url: `${manifest.release}/${file.name}`, path: target, sha256: file.sha256, bytes: file.bytes }); }
    catch (error) { throw new Error(`${error.message} La Release debe estar publicada y contener ${file.name}. Si eres propietario y está en borrador, usa --authenticated. --without-index descarga solo el modelo y requiere RVC_INDEX_RATE=0 explícito.`); }
  } else {
    const directory = await mkdtemp(resolve(tmpdir(), 'cortana-model-'));
    try {
      const result = spawnSync('gh', ['release', 'download', 'cortana-voice-v1', '--repo', 'ZapataFrame/halo-cortana', '--pattern', file.name, '--dir', directory], { stdio: 'inherit' });
      if (result.error || result.status !== 0) throw new Error(`No se pudo descargar ${file.name}; comprueba el acceso de gh y los archivos de la Release.`);
      const source = resolve(directory, file.name);
      if ((await stat(source)).size !== file.bytes || await fileHash(source) !== file.sha256) throw new Error('El modelo descargado no coincide con el hash esperado.');
      await mkdir(resolve('.rvc-qa/voices/cortana'), { recursive: true });
      await copyFile(source, target, constants.COPYFILE_EXCL);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}
// Crear configuración solo si no existe; jamás sustituir claves o selección ajena.
try {
  const template = await readFile('.env.example', 'utf8');
  await writeFile('.env', template, { flag: 'wx', mode: 0o600 });
  console.log('.env privado creado a partir del ejemplo.');
} catch (error) { if (error.code !== 'EEXIST') throw error; }
console.log(withoutIndex ? 'Pesos Cortana verificados; no se descargó el índice. Configura explícitamente TTS_PROVIDER=rvc y RVC_INDEX_RATE=0 y reinicia.' : 'Modelo e índice Cortana verificados. Usa TTS_PROVIDER=rvc y reinicia el servidor.');
