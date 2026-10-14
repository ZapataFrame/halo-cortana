import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createVoiceWorker } from '../server/voice-worker.js';

// Proceso de transporte controlado; no sintetiza ni reconoce voz.
const program = `
let buffer=Buffer.alloc(0), count=0;
process.stdin.on('data',chunk=>{
 buffer=Buffer.concat([buffer,chunk]);
 while(buffer.length>=4 && buffer.length>=4+buffer.readUInt32BE(0)) {
  const length=buffer.readUInt32BE(0), text=buffer.subarray(4,4+length).toString();
  buffer=buffer.subarray(4+length); count++;
  if(text==='hold') continue;
  if(text==='crash') { process.stderr.write('ruta y texto privados'); process.exit(2); }
  const body=Buffer.from(text==='error'?'TEST_DOMAIN_ERROR':count+':'+text);
  const header=Buffer.alloc(5); header[0]=text==='error'?1:text==='statusbad'?2:0;
  header.writeUInt32BE(text==='oversized'?0xffffffff:text==='truncated'?100:body.length,1);
  if(text==='oversized'||text==='statusbad') {process.stdout.write(header);continue;}
  if(text==='truncated') {process.stdout.write(header);process.stdout.write('x');process.exit(0);}
  process.stdout.write(header.subarray(0,2));
  setImmediate(()=>{process.stdout.write(header.subarray(2));process.stdout.write(body);});
 }
});`;

function fixture(t, options = {}) {
  const children = [];
  const engine = createVoiceWorker({ command: process.execPath, args: ['-e', program],
    prefix: 'TEST', maxInput: 64, maxOutput: 1024,
    spawnProcess(...args) { const child = spawn(...args); children.push(child); return child; }, ...options });
  t.after(() => engine.close());
  const request = (text, signal = new AbortController().signal) => engine.request(Buffer.from(text), signal);
  return { engine, request, children };
}

test('un proceso atiende varios turnos y reconstruye encabezados fragmentados sin alterar UTF-8', async t => {
  const { request, children } = fixture(t);
  for (const [index, text] of ['Cortana', 'español', 'tercero'].entries()) {
    const result = await request(text);
    assert.equal(result.ok, true); assert.equal(result.bytes.toString(), `${index + 1}:${text}`);
  }
  assert.equal(children.length, 1);
});

test('cancelar una petición elimina el proceso; el siguiente turno empieza limpio y rechaza concurrencia', async t => {
  const { request, children } = fixture(t);
  await request('primero');
  const controller = new AbortController(), pending = request('hold', controller.signal);
  await assert.rejects(request('otro'), /TEST_BUSY/);
  const ended = once(children[0], 'close'); controller.abort();
  await assert.rejects(pending, /TEST_CANCELLED/); await ended;
  assert.equal((await request('nuevo')).bytes.toString(), '1:nuevo');
  assert.equal(children.length, 2);
});

test('la inactividad libera el proceso y el siguiente turno lo recrea', async t => {
  const { request, children } = fixture(t, { idleMs: 25 });
  await request('primero');
  await once(children[0], 'close', { signal: AbortSignal.timeout(2000) });
  assert.equal((await request('nuevo')).bytes.toString(), '1:nuevo');
  assert.equal(children.length, 2);
});

test('salidas inválidas y caída del motor se rechazan sin filtrar stderr y permiten recuperar', async t => {
  const { request } = fixture(t);
  for (const bad of ['oversized', 'statusbad', 'truncated', 'crash']) {
    await assert.rejects(request(bad), { message: 'TEST_UNAVAILABLE' });
    assert.equal((await request('recuperado')).bytes.toString(), '1:recuperado');
  }
});

test('errores de dominio tienen marco propio; entradas excesivas o canceladas no inician el motor', async t => {
  const { engine, request, children } = fixture(t);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(request('cancelado', controller.signal), /TEST_CANCELLED/);
  await assert.rejects(engine.request(Buffer.alloc(65), new AbortController().signal), /TEST_INVALID_INPUT/);
  assert.equal(children.length, 0);
  const error = await request('error');
  assert.equal(error.ok, false); assert.equal(error.bytes.toString(), 'TEST_DOMAIN_ERROR');
  assert.equal((await request('válido')).bytes.toString(), '2:válido');
  assert.equal(children.length, 1);
});

test('cerrar durante una petición la cancela y termina el hijo', async t => {
  const { engine, request, children } = fixture(t);
  await request('primero');
  const pending = request('hold'), ended = once(children[0], 'close');
  engine.close(); await assert.rejects(pending, /TEST_CANCELLED/); await ended;
});
