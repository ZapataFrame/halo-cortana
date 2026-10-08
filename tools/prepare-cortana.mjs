// Conversión específica del asset aportado: diffuse/emissive/normal se conservan.
// Sus materiales tienen specularFactor=0 y glossinessFactor=0: dielectric roughness=1.
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
document.asset.extras = { ...document.asset.extras, adaptation: 'Materiales diffuse-only a PBR; texturas, alpha, rig, animación y binario conservados.',
  originalSha256: createHash('sha256').update(bytes).digest('hex') };
if (!document.images?.length || !document.textures?.length) throw new Error('Usa el GLB original con imágenes, no la variante monocromática.');
document.materials = (document.materials || []).map(material => {
  const old = material.extensions?.KHR_materials_pbrSpecularGlossiness;
  if (!old) return material;
  if (old.specularGlossinessTexture || (old.specularFactor || [1, 1, 1]).some(value => value !== 0) || old.glossinessFactor !== 0) {
    throw new Error('Esta conversión solo admite los materiales diffuse-only del Cortana aportado.');
  }
  const converted = { ...material, pbrMetallicRoughness: {
    baseColorFactor: old.diffuseFactor || [1, 1, 1, 1],
    ...(old.diffuseTexture ? { baseColorTexture: old.diffuseTexture } : {}),
    metallicFactor: 0, roughnessFactor: 1,
  } };
  const extensions = { ...material.extensions };
  delete extensions.KHR_materials_pbrSpecularGlossiness;
  if (Object.keys(extensions).length) converted.extensions = extensions;
  else delete converted.extensions;
  return converted;
});
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
