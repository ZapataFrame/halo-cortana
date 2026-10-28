import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadVerified } from './model-download.mjs';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const manifest = JSON.parse(await readFile('tools/cortana-voice-model.json', 'utf8'));
for (const file of manifest.files) {
  await downloadVerified({ url: `${manifest.release}/${file.name}`,
    path: resolve('.rvc-qa/voices/cortana', file.name), sha256: file.sha256, bytes: file.bytes });
}
// Crear configuración solo si no existe; jamás sustituir claves o selección ajena.
try {
  const template = await readFile('.env.example', 'utf8');
  await writeFile('.env', template, { flag: 'wx', mode: 0o600 });
  console.log('.env privado creado a partir del ejemplo.');
} catch (error) { if (error.code !== 'EEXIST') throw error; }
console.log('Modelo Cortana descargado y verificado. Usa TTS_PROVIDER=rvc y reinicia el servidor.');
