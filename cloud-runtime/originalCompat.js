import { randomInt } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { unoRoute } from './unoVisual.js';
const exec=promisify(execFile);
export const originalMedia=['play','youtube','tts','nasa','pesquisarimagem','renomear'];
export const originalGames=['encoded','inverse'];
export const originalAdmin=['kick','promote','demote'];
const topics={lua:'moon',marte:'Mars planet',jupiter:'Jupiter planet',saturno:'Saturn planet',terra:'Earth planet',galaxia:'galaxy',nebulosa:'nebula',astronomia:'astronomy',floresta:'forest',girassol:'sunflower',gato:'domestic cat',cachorro:'domestic dog',borboleta:'butterfly',montanha:'mountain landscape',oceano:'ocean landscape',xadrez:'chess board',quimica:'educational chemistry classroom',matematica:'mathematics lesson'};
const music={piano:'piano classical instrumental',violao:'classical guitar instrumental',classica:'classical instrumental music',barroca:'baroque instrumental music',flauta:'recorder flute instrumental'};
const normalize=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase();
const valid=(obj,k)=>Object.hasOwn(obj,k);
const listing=o=>Object.keys(o).join(', ');
const clip=(v,n=180)=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
async function bytes(url,fetcher,limit=1024*1024){
    const response=await fetcher(url,{signal:AbortSignal.timeout(10000),redirect:'error',headers:{Accept:'application/json, image/jpeg, image/png'}});
    if(!response.ok||Number(response.headers.get('content-length')||0)>limit)throw Error('source unavailable');
    const reader=response.body.getReader();let n=0;const chunks=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>limit)throw Error('source too large');chunks.push(Buffer.from(value));}}
    finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    return Buffer.concat(chunks);
}
const json=async(url,fetcher)=>JSON.parse((await bytes(url,fetcher)).toString('utf8'));
const uri=(base,params)=>{const u=new URL(base);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);return u;};
const space=['lua','marte','jupiter','saturno','terra','galaxia','nebulosa','astronomia'];
export async function searchOriginal(name,arg,{fetcher=fetch,key=process.env.YOUTUBE_API_KEY}={}){
    const topic=normalize(arg);
    if(name==='youtube'||name==='play'){
        const catalog=name==='play'?music:topics;
        if(!valid(catalog,topic))return 'Temas disponíveis: '+listing(catalog)+'. Exemplo: :'+name+' '+Object.keys(catalog)[0]+'.';
        const q=catalog[topic];
        if(!key)return '🎬 Pesquisa por tema no YouTube (sem lista de resultados dentro do bot):\nhttps://www.youtube.com/results?search_query='+encodeURIComponent(q)+'\nPara resultados filtrados no chat, é necessária a configuração da API oficial.';
        const data=await json(uri('https://www.googleapis.com/youtube/v3/search',{part:'snippet',type:'video',q,safeSearch:'strict',maxResults:'3',relevanceLanguage:'pt',key}),fetcher);
        const rows=(data.items||[]).filter(x=>/^[A-Za-z0-9_-]{11}$/.test(x?.id?.videoId||'')).slice(0,3);
        return '🎬 Resultados da API do YouTube (filtro restritivo):\n'+(rows.map(x=>clip(x.snippet?.title,100)+'\nhttps://www.youtube.com/watch?v='+x.id.videoId).join('\n\n')||'Nenhum resultado.');
    }
    if(name==='nasa'){
        const k=topic||'lua';
        if(!space.includes(k))return 'Temas NASA: '+space.join(', ')+'.';
        const data=await json(uri('https://images-api.nasa.gov/search',{q:topics[k],media_type:'image',page_size:'5'}),fetcher);
        const item=(data.collection?.items||[]).find(x=>/^[a-zA-Z0-9_-]{1,120}$/.test(x?.data?.[0]?.nasa_id||''));
        if(!item)return 'Nenhuma imagem encontrada na biblioteca NASA.';
        const d=item.data[0];
        const caption='🔭 NASA — '+clip(d.title,150)+'\n'+clip(d.description,550)+'\nCrédito: '+clip(d.photographer||d.secondary_creator||d.center||'NASA',120)+'\nhttps://images.nasa.gov/details/'+d.nasa_id;
        const link=item.links?.find(l=>l.rel==='preview'&&l.render==='image')?.href;
        if(link){
            try{
                const u=new URL(link);
                if(u.protocol==='https:'&&u.hostname==='images-assets.nasa.gov'&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith('/image/')&&/\.(jpe?g|png)$/i.test(u.pathname)){
                    const raw=await bytes(u,fetcher,4*1024*1024);
                    const image=await sharp(raw,{limitInputPixels:12000000}).resize(960,960,{fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer();
                    return {image,caption};
                }
            }catch{}
        }
        return caption;
    }
    if(name==='pesquisarimagem'){
        if(!valid(topics,topic))return 'Pesquisa de imagens educativas: '+listing(topics)+'.';
        const data=await json(uri('https://api.openverse.org/v1/images/',{q:topics[topic],mature:'false',page_size:'3'}),fetcher);
        const rows=(data.results||[]).filter(x=>x.mature===false&&/^[a-f0-9-]{36}$/i.test(x.id||'')).slice(0,3);
        return '🖼️ Openverse — imagens com licença aberta (filtro de conteúdo sensível ativo).\n'+(rows.map(x=>clip(x.title,100)+' | '+clip(x.license,20)+'\nhttps://openverse.org/image/'+x.id).join('\n\n')||'Nenhum resultado filtrado.');
    }
    return null;
}
export async function tts(text){
    if(typeof text!=='string'||!text.trim()||[...text].length>200||/[\u0000-\u001f]/.test(text))throw Error('text');
    const dir=await mkdtemp(join(tmpdir(),'iris-tts-'));
    try{
        const source=join(dir,'input.wav'),target=join(dir,'out.ogg');
        const helper=fileURLToPath(new URL('./ttsWorker.js',import.meta.url));
        await exec(process.execPath,[helper,Buffer.from(text,'utf8').toString('base64'),source],{timeout:20000,maxBuffer:65536});
        await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-protocol_whitelist','file','-f','wav','-i',source,'-t','30','-ac','1','-ar','48000','-c:a','libopus','-b:a','32k','-threads','1',target],{timeout:15000,maxBuffer:65536});
        const audio=await readFile(target);if(audio.length<64||audio.length>200000||audio.toString('ascii',0,4)!=='OggS')throw Error('audio');
        return {audio,mimetype:'audio/ogg; codecs=opus',ptt:true};
    }finally{await rm(dir,{recursive:true,force:true});}
}
const puzzleWords=['biblioteca','girassol','planeta','amizade','oceano','floresta','borboleta','xadrez'];
export function puzzle({name,arg='',state,id,now=Date.now(),choose=randomInt}){
    if(!originalGames.includes(name))return null;
    const games=state.originalPuzzles??={};
    let g=games[name];
    if(g&&g.expires<=now){delete games[name];g=null;}
    if(arg==='sair'){if(g?.id===id){delete games[name];return {text:'Jogo encerrado.',changed:true};}return {text:'Nenhum desafio seu.'};}
    if(arg==='novo'||!arg&&!g){
        if(g)return {text:'Já existe um desafio ativo.'};
        const word=puzzleWords[choose(puzzleWords.length)];
        const clue=name==='inverse'?[...word].reverse().join(''):[...word].map(c=>c.charCodeAt(0)-96).join(' - ');
        games[name]={id,word,clue,expires:now+600000,tries:0};
        return {text:'🧩 '+clue+'\n'+(name==='inverse'?'Leia ao contrário.':'A=1, B=2, C=3...')+'\n:'+name+' resposta palavra',changed:true};
    }
    if(!g)return {text:'Use :'+name+' novo.'};
    if(!arg||arg==='pista')return {text:'🧩 '+g.clue};
    if(!arg.startsWith('resposta '))return {text:'Use :'+name+' resposta palavra.'};
    if(normalize(arg.slice(9))===g.word){delete games[name];return {text:'✅ Palavra correta! Desafio concluído.',changed:true};}
    if(++g.tries>=12){delete games[name];return {text:'Limite de tentativas atingido. Inicie outro desafio.',changed:true};}
    return {text:'Ainda não. Tente novamente.',changed:true};
}
function ids(p){return [...new Set([p?.id,p?.lid,p?.phoneNumber].map(unoRoute).filter(Boolean))];}
export function makeOriginalAdmin({now=Date.now}={}){
    const pending=new Map();
    return async({name,arg,jid,sock,msg,owner})=>{
        if(!originalAdmin.includes(name)||!owner||!jid?.endsWith('@g.us'))return null;
        if(arg==='cancelar'){pending.delete(jid);return 'Operação cancelada.';}
        try{
            const meta=await sock.groupMetadata(jid),members=meta.participants||[];
            const selfIds=[sock.user?.id,sock.user?.lid].map(unoRoute).filter(Boolean);
            const self=members.find(p=>ids(p).some(v=>selfIds.includes(v)));
            if(!self||!['admin','superadmin'].includes(self.admin))return 'A conta vinculada precisa ser administradora do grupo.';
            const allowed=p=>p&&p!==self&&p.admin!=='superadmin'&&
                (name==='promote'?!p.admin:name==='demote'?p.admin==='admin':!p.admin);
            if(arg==='confirmar'){
                const task=pending.get(jid);pending.delete(jid);
                if(!task||task.name!==name||task.expires<=now())return 'Nenhuma operação pendente válida.';
                const target=members.find(p=>ids(p).includes(task.target));
                if(!allowed(target)||!unoRoute(target.id))return 'Participante ou permissões mudaram. Operação cancelada.';
                const result=await sock.groupParticipantsUpdate(jid,[target.id],name==='kick'?'remove':name);
                if(!Array.isArray(result)||result.length!==1||String(result[0].status)!=='200')return 'O WhatsApp não confirmou a operação.';
                return '✅ Operação administrativa confirmada pelo WhatsApp.';
            }
            const mentioned=msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid||[];
            if(mentioned.length!==1)return 'Use :'+name+' @participante (uma menção real). Depois :'+name+' confirmar em até 60 segundos.';
            const targetId=unoRoute(mentioned[0]),matches=members.filter(p=>ids(p).includes(targetId));
            const target=matches.length===1?matches[0]:null;
            if(!allowed(target)||!targetId||!unoRoute(target.id))return 'Participante não elegível. Não é permitido alterar o próprio cargo ou o criador do grupo; para remover administrador, primeiro retire o cargo.';
            if(pending.size>=100&&!pending.has(jid))pending.delete(pending.keys().next().value);
            pending.set(jid,{name,target:targetId,expires:now()+60000});
            return '⚠️ Operação solicitada: '+({kick:'remover participante',promote:'promover administrador',demote:'retirar cargo de administrador'}[name])+'. Confira a menção na sua mensagem e envie :'+name+' confirmar em até 60 segundos, ou :'+name+' cancelar.';
        }catch{return 'Não foi possível verificar ou executar a ação administrativa.';}
    };
}
