import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseExtra,menu} from './features.js';
import {gameHub,gameCatalog,retiredGames,gameGuide} from './gameHub.js';
import {makeLocalGames} from './localFun.js';
import {makeExtras} from './extras.js';
import {game3} from './games3.js';
import {game4} from './games4.js';
import {game5} from './games5.js';
import {commands} from './managerV2.js';
for(const k of retiredGames){assert.deepEqual(parseExtra(':'+k,true),{name:'jogos',arg:'retirado'});assert.doesNotMatch(menu('jogos')+' '+menu('infinity'),new RegExp(':'+k+'(?:\\s|\\||$)'));assert.ok(!Object.values(commands).flat().includes(k));}
for(const k of Object.keys(gameCatalog)){assert.equal(parseExtra(':'+k,true)?.name,k,k);assert.match(gameGuide(k),/Começar:/);}
assert.ok(Object.keys(gameCatalog).length>=30);assert.match(gameHub('solo'),/Sudoku/);assert.doesNotMatch(gameHub('solo'),/Adedonha/);assert.match(gameHub('grupo'),/Adedonha/);assert.match(gameHub('stop'),/:stop novo/);
const a='a'.repeat(64),b='b'.repeat(64),state={players:{[a]:{xp:0,coins:0,cardStats:{stop:{w:2,points:50}},worldPosition:9,livingWorld:{task:'treinar'}},[b]:{xp:0,coins:0}},custom:{old:true}};
assert.match(gameHub('meus',state,a),/50 pts/);assert.match(gameHub('ranking stop',state),/50 pts/);assert.ok(!gameHub('ranking stop',state).includes(a));
const memory=new Map(),local=makeLocalGames(memory),base={jid:'g',actor:a,name:'velha'};
local({...base,arg:'novo dificil'});assert.match(local({...base,arg:'mesa'}),/sua vez/);local({...base,arg:'1'});assert.equal([...memory.values()][0].b[4],'O');
local({...base,name:'forca',arg:'novo'});const word=memory.get('g:'+a+':forca').word;assert.match(local({...base,name:'forca',arg:word}),/Você acertou/);
const guesses=new Map(),extra=makeExtras(guesses),num={jid:'g',actor:a,name:'numero'};extra({...num,arg:'novo'});const answer=guesses.get('g:'+a).answer,wrong=answer===1?2:1;extra({...num,arg:String(wrong)});assert.match(extra({...num,arg:String(wrong)}),/já tentado/);assert.equal(guesses.get('g:'+a).tries,1);
await game3({name:'memoria',arg:'novo',state,id:a,choose:()=>0});assert.equal((await game3({name:'memoria',arg:'par 1 2',state,id:a})).changed,true);
await game4({name:'cruzadas',arg:'novo',state,id:a});assert.equal((await game4({name:'cruzadas',arg:'resposta 1 sol',state,id:b})).changed,false);
await game5({name:'sudoku',arg:'novo facil',state,id:a,choose:()=>0});assert.match((await game5({name:'sudoku',arg:'dica',state,id:a})).text.caption,/candidatos/);
assert.equal(state.players[a].worldPosition,9);assert.equal(state.players[a].livingWorld.task,'treinar');assert.equal(state.custom.old,true);
const http=readFileSync(new URL('../lib/Initialize/cloudPreview.js',import.meta.url),'utf8');assert.ok(http.includes('writeHead(410'));assert.ok(!http.includes('makeWorldHttp'));
console.log('Iris: Game Center catalog, retired RPG isolation, game guides, rankings and gameplay improvements tests passed');
