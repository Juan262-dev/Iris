import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createServer} from 'node:http';
import {Script} from 'node:vm';
import {regions,roads,position,route,travel,worldTerrain,worldMapSvg} from './worldMap.js';
import {worldView,validWorldAction} from './world.js';
import {infinityFeature} from './infinity.js';
import {parseExtra,menu} from './features.js';
import {makeWorldHttp} from './world-web.js';
assert.equal(regions.length,9);assert.equal(new Set(regions.map(r=>r.id)).size,9);
for(const a of regions)for(const b of regions){const path=route(a.id,b.id);assert.equal(path[0],a.id);assert.equal(path.at(-1),b.id);for(let i=1;i<path.length;i++)assert.ok(roads.some(([x,y])=>x===path[i-1]&&y===path[i]||y===path[i-1]&&x===path[i]));}
assert.deepEqual(route(0,9),[]);assert.deepEqual(route(1,99),[]);
const a='a'.repeat(64),b='b'.repeat(64),state={players:{[a]:{xp:0,coins:7},[b]:{xp:0,coins:9}},custom:{old:'preserved'}};
assert.equal(position(state.players[a]),1);
assert.equal(parseExtra(':viajarworld 9',false).name,'viajarworld');
assert.match(menu('infinity'),/:viajarworld/);
assert.equal(validWorldAction('viajarworld','9'),true);assert.equal(validWorldAction('viajarworld','99'),false);
const run=(name,arg,id=a)=>infinityFeature({name,arg,state,id});
assert.equal((await run('viajarworld','9')).changed,true);
assert.equal(worldView(state,a).position,9);assert.equal(worldView(state,b).position,1);assert.equal(state.players[a].xp,0);
assert.equal((await run('viajarworld','9')).changed,false);assert.equal((await run('viajarworld','99')).changed,false);
assert.equal((await run('explorar','3')).changed,true);assert.equal(worldView(state,a).position,3);
const restored=JSON.parse(JSON.stringify(state));assert.equal(worldView(restored,a).position,3);assert.equal(restored.custom.old,'preserved');
assert.equal(worldTerrain(),worldTerrain());assert.match(worldMapSvg({0:4}),/Praça • 4/);
const image=await run('mapainfinity','');assert.equal((await sharp(image.text.image).metadata()).width,600);
const http=makeWorldHttp({world:async()=>({status:200,data:{view:worldView(state,a)}})});
const server=createServer(async(req,res)=>{if(!await http(req,res)){res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{const base='http://127.0.0.1:'+server.address().port;const page=await (await fetch(base+'/world')).text();for(const id of ['map-shell','pins','avatar','route-path','travel','zoom-in','center-map','logbook'])assert.ok(page.includes('id="'+id+'"'));assert.match(page,/Reino de Aetheria/);assert.match(page,/clipPath id="island"/);const script=await (await fetch(base+'/world/app.js')).text();new Script(script);assert.match(script,/viajarworld/);assert.match(script,/moveAvatar/);}
finally{await new Promise(resolve=>server.close(resolve));}
console.log('Iris: illustrated world geography, connected roads, shared travel, player isolation, PNG and browser map tests passed');
