import assert from 'node:assert/strict';
import sharp from 'sharp';
import { infinityFeature,removeInfinity,pruneInfinity,artCard,artPhoto,infinityCommands } from './infinity.js';
import { parseExtra,menu } from './features.js';
import { commands,normalizeConfig } from './managerV2.js';
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64),day=86400000,now=Date.UTC(2026,10,27);
const state={players:{[a]:{xp:0,coins:5},[b]:{xp:0,coins:7}},custom:{legacy:'old'},rules:'preserved'};
const run=(name,arg,id=a,extra={})=>infinityFeature({name,arg,state,id,now,choose:()=>0,...extra});
for(const name of infinityCommands){assert.equal(parseExtra(':'+name,true)?.name,name);}
assert.equal(parseExtra(':pign',false)?.name,'ping');assert.equal(parseExtra(':fechr',true),null);assert.equal(parseExtra(':backupinfinity salvar',false),null);assert.ok(menu('infinity').includes(':simulado'));
assert.equal((await run('explorar','1',c)).changed,false);
assert.equal((await run('explorar','1')).changed,true);assert.equal((await run('explorar','1')).changed,false);
assert.equal((await run('explorar','1',a,{now:now+day})).changed,true);
assert.equal((await run('construir','1')).changed,true);assert.equal(state.infinity.buildings[0],1);assert.equal(state.players[a].coins,5);
const map=(await run('mapainfinity','')).text;assert.equal((await sharp(map.image).metadata()).width,600);
assert.equal((await run('backupinfinity','salvar')).changed,false);
assert.equal((await run('backupinfinity','salvar',a,{owner:true})).changed,true);
state.infinity.buildings[0]=2;await run('backupinfinity','restaurar confirmar',a,{owner:true});assert.equal(state.infinity.buildings[0],1);
await run('guilda','criar Estrelas');await run('guilda','entrar Estrelas',b);assert.equal(state.infinity.guilds.estrelas.ids.length,2);
await run('oficina','profissao artesao');assert.equal((await run('oficina','produzir')).changed,true);assert.equal((await run('oficina','produzir')).changed,false);
await run('projetoinfinity','ajudar');assert.equal((await run('projetoinfinity','ajudar')).changed,false);
await run('festivalinfinity','arte',b);
for(const name of ['imobiliario','trilha','expedicao','reliquia']){
 await run(name,'novo');await run(name,'entrar',b);assert.equal((await run(name,'iniciar',b)).changed,false);await run(name,'iniciar');
 assert.equal((await run(name,'jogar 1',b)).changed,false);
 if(['expedicao','reliquia'].includes(name)){assert.equal((await run(name,'jogar 1')).changed,false);assert.equal(state.infinity.games[name].pos[0],0);for(let i=0;i<8;i++)assert.equal((await run(name,'jogar '+[2,1,3,1][i%4],i%2?b:a)).changed,true);}
 else{for(let i=0;i<11;i++)await run(name,'jogar 3',i%2?b:a);}
 assert.equal(state.infinity.games[name],undefined);
}
await run('simulado','novo ciencia');assert.equal(state.players[a].infinity.study.ids.length,4);
assert.equal((await run('simulado','responder 1',b)).changed,false);
for(let i=0;i<4;i++)await run('simulado','responder 1');
assert.equal(state.players[a].infinity.study,undefined);assert.equal(state.players[a].infinity.studyDone,4);
assert.match((await run('flashcard','ciencia revelar')).text,/—/);
await run('explorar','2');await run('explorar','3');assert.equal((await run('missaoinfinity','concluir')).changed,true);assert.equal((await run('missaoinfinity','concluir')).changed,false);
await run('trilha','novo');pruneInfinity(state,now+2*day);assert.equal(state.infinity.games.trilha,undefined);
removeInfinity(state,b);assert.equal(state.infinity.guilds.estrelas.ids.includes(b),false);assert.equal(state.infinity.festival[b],undefined);assert.equal(state.custom.legacy,'old');assert.equal(state.rules,'preserved');
const card=await artCard('Ciência & arte');assert.equal((await sharp(card.image).metadata()).width,600);
const photo=await artPhoto(await sharp({create:{width:32,height:32,channels:3,background:'#aa99ff'}}).png().toBuffer(),'pastel');assert.equal((await sharp(photo.image).metadata()).format,'png');
const catalog=Object.fromEntries(Object.values(commands).flat().map(n=>[n,false]));assert.ok(Buffer.byteLength(JSON.stringify(catalog))+2*Object.keys(catalog).length<=2048);
assert.ok(normalizeConfig({name:'Íris',prefix:':',greeting:'Olá',modules:{},commands:catalog,groups:[]}));
console.log('Iris: Infinity world, games, study, voluntary guilds, backups, privacy cleanup, media and Manager catalog tests passed');
