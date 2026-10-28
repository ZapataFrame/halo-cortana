import { createReadStream } from 'node:fs';
import { mkdir, stat, open, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

export async function fileHash(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function downloadVerified({ url, path, sha256, bytes, request = fetch }) {
  await mkdir(dirname(path), { recursive: true });
  const existing = await stat(path).catch(() => null);
  if (existing) {
    if ((!bytes || existing.size === bytes) && await fileHash(path) === sha256) return;
    throw new Error(`Archivo existente no verificado: ${path}. No se sobrescribe.`);
  }
  const partial = `${path}.part`, previous = (await stat(partial).catch(() => null))?.size || 0;
  if (previous && (!bytes || previous === bytes) && await fileHash(partial) === sha256) {
    await rename(partial, path); return;
  }
  const response = await request(url, { headers: previous ? { Range: `bytes=${previous}-` } : {},
    signal: AbortSignal.timeout(3_600_000) });
  if (!response.ok) throw new Error(`Descarga HTTP ${response.status}: ${new URL(url).hostname}`);
  const append = previous > 0 && response.status === 206;
  if (response.status === 206) {
    const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range') || '');
    if (!range || Number(range[1]) !== previous || bytes && Number(range[3]) !== bytes) {
      await response.body.cancel(); throw new Error('Rango de descarga inválido.');
    }
  }
  console.log(`Descargando ${new URL(url).pathname.split('/').at(-1)}`);
  const file = await open(partial, append ? 'a' : 'w');
  let total = append ? previous : 0;
  try {
    for await (const chunk of response.body) {
      total += chunk.length;
      if (bytes && total > bytes) throw new Error('La descarga excede el tamaño esperado.');
      await file.writeFile(chunk);
    }
  } finally { await file.close(); }
  if (bytes && total !== bytes || await fileHash(partial) !== sha256) throw new Error(`Hash o tamaño incorrecto: ${partial}. No se cargará.`);
  await rename(partial, path);
}
