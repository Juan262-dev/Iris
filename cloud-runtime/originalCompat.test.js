import assert from 'node:assert/strict';
import sharp from 'sharp';
import { searchOriginal,tts,puzzle,makeOriginalAdmin,originalMedia,originalAdmin,originalGames } from './originalCompat.js';
import { parseExtra,menu } from './features.js';
import { stickerAuthor } from './studio.js';
for(const name of [...originalMedia,...originalGames])assert.equal(parseExtra(':'+name,false).name,name);
for(const name of originalAdmin){assert.equal(parseExtra(':'+name,false),null);assert.equal(parseExtra(':'+name,true).name,name);}
assert.equal(parseExtra('!play',true),null);
assert.ok(menu().includes(':renomear'));
const fake=async u=>{
    const url=new URL(u);
    if(url.hostname==='www.googleapis.com'){
        assert.equal(url.searchParams.get('safeSearch'),'strict');
        return Response.json({items:[{id:{videoId:'abcdefghijk'},snippet:{title:'Aula de astronomia'}}]});
    }
    if(url.hostname==='api.openverse.org'){
        assert.equal(url.searchParams.get('mature'),'false');
        return Response.json({results:[{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',mature:false,title:'Flor',license:'cc0'},{id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',mature:true,title:'omit'}]});
    }
    if(url.hostname==='images-api.nasa.gov')return Response.json({collection:{items:[{data:[{nasa_id:'test123',title:'Moon',description:'NASA test image'}]}]}});
    throw Error('unexpected host');
};
assert.match(await searchOriginal('play','piano',{key:'',fetcher:fake}),/youtube.com\/results/);
assert.match(await searchOriginal('youtube','astronomia',{key:'test',fetcher:fake}),/abcdefghijk/);
assert.match(await searchOriginal('youtube','unknown',{key:'test',fetcher:()=>{throw Error('no network')}}),/Temas disponíveis/);
const img=await searchOriginal('pesquisarimagem','girassol',{fetcher:fake});
assert.match(img,/aaaaaaaa-aaaa/);assert.doesNotMatch(img,/bbbbbbbb-bbbb/);
assert.match(await searchOriginal('nasa','lua',{fetcher:fake}),/images.nasa.gov\/details\/test123/);
const state={},id='test';
for(const name of originalGames){
    assert.equal(puzzle({name,arg:'novo',state,id,choose:()=>0}).changed,true);
    assert.match(puzzle({name,arg:'resposta biblioteca',state,id}).text,/correta/);
    assert.equal(state.originalPuzzles[name],undefined);
}
let time=0;const calls=[];
const owner='100001@s.whatsapp.net',target='100002@lid',creator='100003@lid',admin='100004@lid';
const sock={user:{id:owner},groupMetadata:async()=>({participants:[{id:owner,admin:'admin'},{id:target,admin:null},{id:creator,admin:'superadmin'},{id:admin,admin:'admin'}]}),groupParticipantsUpdate:async(...args)=>{calls.push(args);return [{status:200}];}};
const action=makeOriginalAdmin({now:()=>time});
const run=(name,arg='',who=target,allowed=true)=>action({name,arg,jid:'test@g.us',sock,owner:allowed,msg:{message:{extendedTextMessage:{contextInfo:{mentionedJid:[who]}}}}});
assert.equal(await run('kick','',target,false),null);
assert.match(await run('kick','confirmar'),/Nenhuma/);
assert.match(await run('kick','',creator),/não elegível/);
assert.match(await run('kick','',admin),/não elegível/);
assert.match(await run('kick','@alguem'),/solicitada/);
assert.equal(calls.length,0);
assert.match(await run('kick','confirmar'),/confirmada/);
assert.equal(calls[0][2],'remove');
assert.match(await run('promote','@alguem'),/solicitada/);
time=61000;assert.match(await run('promote','confirmar'),/Nenhuma/);
assert.match(await run('demote','@alguem',admin),/solicitada/);
assert.match(await run('demote','confirmar',admin),/confirmada/);
assert.equal(calls.at(-1)[2],'demote');
const pic=await sharp({create:{width:32,height:32,channels:3,background:'#eee'}}).webp().toBuffer();
const sticker=await stickerAuthor(pic,'Autor teste','Pacote teste');
assert.ok(sticker.sticker.includes(Buffer.from('Pacote teste')));
assert.ok(sticker.sticker.includes(Buffer.from('Autor teste')));
assert.equal((await sharp(sticker.sticker).metadata()).width,32);
console.log('Iris: original compatibility parser, filtered search mocks, puzzles, confirmed admin permissions and sticker metadata tests passed');
const speech=await tts('Olá, esta é a Íris.');
assert.equal(speech.audio.toString('ascii',0,4),'OggS');
assert.equal(speech.ptt,true);
console.log('Iris: offline Portuguese speech synthesis test passed');
