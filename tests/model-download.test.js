import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { downloadVerified } from '../tools/model-download.mjs';

const DATA = Buffer.from('modelo verificado para prueba'), sha256 = createHash('sha256').update(DATA).digest('hex');
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'cortana-download-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { url: 'https://example.test/model.pth', path: join(directory, 'model.pth'), sha256, bytes: DATA.length };
}
test('descarga por fragmentos valida hash/tamaño y reutiliza solo el archivo verificado', async t => {
  const options = await fixture(t); let calls = 0;
  const request = async () => {
    calls++;
    return new Response(new ReadableStream({ start(c) { c.enqueue(DATA.subarray(0, 4)); c.enqueue(DATA.subarray(4)); c.close(); } }));
  };
  await downloadVerified({ ...options, request }); await downloadVerified({ ...options, request });
  assert.deepEqual(await readFile(options.path), DATA); assert.equal(calls, 1);
  await assert.rejects(access(options.path + '.part'));
});
test('reanuda rangos válidos y reinicia cuando el servidor ignora Range', async t => {
  for (const resume of [true, false]) {
    const options = await fixture(t); await writeFile(options.path + '.part', DATA.subarray(0, 5));
    await downloadVerified({ ...options, request: async (_url, init) => {
      assert.equal(init.headers.Range, 'bytes=5-');
      return new Response(resume ? DATA.subarray(5) : DATA, resume ? { status: 206,
        headers: { 'Content-Range': `bytes 5-${DATA.length - 1}/${DATA.length}` } } : {});
    } });
    assert.deepEqual(await readFile(options.path), DATA);
  }
});
test('rango incompatible, exceso, hash incorrecto y HTTP fallido no publican un modelo', async t => {
  for (const mode of ['range', 'size', 'hash', 'http']) {
    const options = await fixture(t);
    if (mode === 'range') await writeFile(options.path + '.part', DATA.subarray(0, 5));
    const response = mode === 'range' ? new Response(DATA, { status: 206, headers: { 'Content-Range': `bytes 0-${DATA.length - 1}/${DATA.length}` } })
      : mode === 'size' ? new Response(Buffer.concat([DATA, DATA]))
      : mode === 'hash' ? new Response(Buffer.alloc(DATA.length)) : new Response('missing', { status: 404 });
    await assert.rejects(downloadVerified({ ...options, request: async () => response }));
    await assert.rejects(access(options.path));
  }
});
test('un archivo alterado se conserva sin confiar en él; un .part completo válido se finaliza sin red', async t => {
  const options = await fixture(t); await writeFile(options.path, 'datos previos');
  await assert.rejects(downloadVerified({ ...options, request: async () => { throw new Error('no network'); } }), /No se sobrescribe/);
  assert.equal(await readFile(options.path, 'utf8'), 'datos previos');
  const complete = await fixture(t); await writeFile(complete.path + '.part', DATA);
  await downloadVerified({ ...complete, request: async () => { throw new Error('no network'); } });
  assert.deepEqual(await readFile(complete.path), DATA);
});
