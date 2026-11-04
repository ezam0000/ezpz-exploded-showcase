import fs from 'node:fs';
import assert from 'node:assert/strict';
const requirements={headphones:['headband','cushion_right','driver_right','electronics_right','shell_right'],switch:['keycap','top','stem','spring','base'],emblem:['face','core','back']};
for(const [name,parts] of Object.entries(requirements)){
 const bytes=fs.readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url));
 assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12);const json=JSON.parse(bytes.toString('utf8',20,20+length));
 for(const part of parts)assert.equal(json.nodes.filter(n=>n.name===part).length,1,`${name}: missing or ambiguous part ${part}`);
 assert(json.meshes.length>0);assert(json.materials.length>0);assert(!json.buffers.some(b=>b.uri),'GLB must be self-contained');
 assert(!json.images?.some(i=>i.uri),'no remote texture assets');
 const triangles=json.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+(json.accessors[p.indices]?.count??0)/3,0);
 console.log(`${name}: ${parts.length} selectable groups, ${triangles.toLocaleString()} triangles, ${(bytes.length/1024).toFixed(0)} KB; self-contained`);
}
