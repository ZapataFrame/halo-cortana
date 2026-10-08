// Adaptación monocromática: no traduce materiales especulares antiguos a PBR.
// Conserva geometría, rig, animación, binario y atribución; elimina referencias a texturas.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = process.argv[2];
if (!source) throw new Error('Uso: node tools/prepare-cortana.mjs ruta/al/modelo.glb [salida.glb]');
const bytes = await readFile(source);
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB 2 inválido.');
const chunks = [];
for (let offset = 12; offset < bytes.length;) {
  const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
  chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) });
  offset += 8 + length;
}
const document = JSON.parse(chunks[0].bytes.toString());
if (document.buffers?.some(buffer => buffer.uri) || document.images?.some(image => image.uri)) throw new Error('Se requiere un GLB autocontenido.');
document.asset.extras = { ...document.asset.extras, adaptation: 'Materiales monocromáticos para visor local; geometría/rig/animación sin modificar.',
  originalSha256: createHash('sha256').update(bytes).digest('hex') };
document.materials = (document.materials || []).map(material => ({ name: material.name, doubleSided: true,
  pbrMetallicRoughness: { baseColorFactor: [0.74, 0.74, 0.74, 1], metallicFactor: 0.1, roughnessFactor: 0.7 } }));
delete document.textures; delete document.images; delete document.samplers;
for (const key of ['extensionsRequired', 'extensionsUsed']) {
  if (document[key]) document[key] = document[key].filter(value => value !== 'KHR_materials_pbrSpecularGlossiness');
  if (!document[key]?.length) delete document[key];
}
const json = Buffer.from(JSON.stringify(document));
chunks[0].bytes = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const size = 12 + chunks.reduce((total, chunk) => total + 8 + chunk.bytes.length, 0);
const output = Buffer.alloc(size);
output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(size, 8);
let offset = 12;
for (const chunk of chunks) {
  output.writeUInt32LE(chunk.bytes.length, offset); output.writeUInt32LE(chunk.type, offset + 4);
  chunk.bytes.copy(output, offset + 8); offset += 8 + chunk.bytes.length;
}
const target = process.argv[3] || 'public/models/cortana.glb';
await writeFile(target, output);
console.log(JSON.stringify({ target, bytes: size, sha256: createHash('sha256').update(output).digest('hex') }));
