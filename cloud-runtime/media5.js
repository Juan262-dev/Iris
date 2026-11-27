import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm,stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { directFunImage } from './funMedia.js';
const exec=promisify(execFile),MB=1024*1024;
export const media5=['animtexto','fundopro','formatoimagem','videofiltro','audioefeito'];
export const collage5='colagem';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function workspace(fn){const d=await mkdtemp(join(tmpdir(),'iris5-'));try{return await fn(d);}finally{await rm(d,{recursive:true,force:true});}}
async function ff(args){await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y',...args],{timeout:20000,maxBuffer:65536});}
async function readBounded(path,max){const s=await stat(path);if(s.size<64||s.size>max)throw Error('size');return readFile(path);}
export async function animatedTextSticker(input,arg){
 const chars=Array.from(String(arg||'').trim());if(!chars.length||chars.length>40)throw Error('text');const lines=[];for(let i=0;i<chars.length;i+=14)lines.push(chars.slice(i,i+14).join(''));
 const base=await sharp(input,{limitInputPixels:12000000}).resize(512,512,{fit:'contain',background:'#201831'}).png().toBuffer();
 return workspace(async d=>{for(let i=0;i<8;i++){const y=512-lines.length*42-15-Math.round(8*Math.sin(i*Math.PI/7));const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect x="10" y="'+y+'" width="492" height="'+(lines.length*42+8)+'" rx="12" fill="#201831" opacity="0.9"/><g font-family="sans-serif" font-weight="bold" text-anchor="middle" font-size="32" fill="'+['#fff','#f6ceff','#c7eaff','#ffe2a4'][i%4]+'">'+lines.map((t,j)=>'<text x="256" y="'+(y+35+j*42)+'">'+esc(t)+'</text>').join('')+'</g></svg>');await writeFile(join(d,'f'+i+'.png'),await sharp(base).composite([{input:svg}]).png().toBuffer());}
 const dest=join(d,'out.webp');await ff(['-threads','1','-framerate','5','-i',join(d,'f%d.png'),'-frames:v','8','-c:v','libwebp_anim','-quality','38','-loop','0','-threads','1',dest]);return {sticker:await readBounded(dest,450000)};});
}
export async function backgroundPro(input,arg=''){
 const m=/^(?:#?([a-f0-9]{6}))?(?:\s*(20|35|50))?$/i.exec(arg);if(!m)throw Error('color');const tol=Number(m[2]||35);
 const {data,info}=await sharp(input,{limitInputPixels:12000000}).rotate().resize(768,768,{fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height;
 const colors=m[1]?[[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16))]:[0,w-1,(h-1)*w,w*h-1].map(i=>[data[i*4],data[i*4+1],data[i*4+2]]);
 const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);let start=0,end=0;
 const dist=i=>Math.min(...colors.map(rgb=>Math.max(...rgb.map((v,j)=>Math.abs(v-data[i*4+j])))));
 function visit(i){if(visited[i])return;visited[i]=1;const delta=dist(i);if(delta<=tol){data[i*4+3]=delta<=tol*.65?0:Math.round(255*(delta-tol*.65)/(tol*.35));queue[end++]=i;}}
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
 while(start<end){const i=queue[start++],x=i%w,y=Math.floor(i/w);if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);}
 return {image:await sharp(data,{raw:{width:w,height:h,channels:4}}).png().toBuffer(),caption:'Fundo por cor de borda com tolerância e transição suave. Não é segmentação por IA.'};
}
export async function convertImage(input,arg){
 if(!['png','jpg','webp'].includes(arg))return 'Use :formatoimagem png | jpg | webp.';
 const s=sharp(input,{limitInputPixels:12000000}).resize(1000,1000,{fit:'inside',withoutEnlargement:true});
 const document=await (arg==='png'?s.png():arg==='jpg'?s.flatten({background:'#fff'}).jpeg({quality:82}):s.webp({quality:75})).toBuffer();
 return {document,mimetype:'image/'+(arg==='jpg'?'jpeg':arg),fileName:'iris.'+arg,caption:'Imagem convertida localmente.'};
}
const filters={cinza:'hue=s=0',sepia:'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',invertido:'negate'};
const audioFilters={eco:'aecho=0.8:0.7:80:0.25',suave:'lowpass=f=3000',normalizar:'loudnorm=I=-18:TP=-2:LRA=11'};
async function directMedia(msg,b,type,limit){
 const m=msg?.message?.[type+'Message'];if(!m||m.viewOnce||m.contextInfo?.expiration||Number(m.fileLength||0)>limit)throw Error('media');
 if(m.url){const u=new URL(m.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='whatsapp.net'||u.hostname.endsWith('.whatsapp.net')))throw Error('url');}
 const stream=await b.downloadContentFromMessage(m,type),parts=[];let n=0;for await(const chunk of stream){n+=chunk.length;if(n>limit){stream.destroy?.();throw Error('size');}parts.push(chunk);}
 return {data:Buffer.concat(parts),mimetype:m.mimetype};
}
export async function videoEffect(input,arg){
 if(!Object.hasOwn(filters,arg)||input.length>10*MB||input.toString('ascii',4,8)!=='ftyp')throw Error('video');
 return workspace(async d=>{const src=join(d,'in.mp4'),dest=join(d,'out.mp4');await writeFile(src,input);await ff(['-protocol_whitelist','file','-f','mov','-threads','1','-max_pixels','4000000','-i',src,'-t','15','-map','0:v:0','-an','-vf',filters[arg]+',scale=480:480:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-threads','1','-fs','4000000','-movflags','+faststart',dest]);return {video:await readBounded(dest,4*MB),mimetype:'video/mp4',caption:'Efeito '+arg+' (até 15 segundos, sem áudio).'};});
}
export async function audioEffect(input,mime,arg){
 if(!Object.hasOwn(audioFilters,arg)||input.length>5*MB)throw Error('audio');
 const format=mime==='audio/mpeg'?'mp3':mime==='audio/wav'?'wav':mime?.startsWith('audio/ogg')?'ogg':null;if(!format)throw Error('format');
 return workspace(async d=>{const src=join(d,'in.'+format),dest=join(d,'out.ogg');await writeFile(src,input);await ff(['-protocol_whitelist','file','-f',format,'-threads','1','-i',src,'-t','30','-vn','-af',audioFilters[arg],'-ac','1','-ar','48000','-c:a','libopus','-b:a','48k','-threads','1',dest]);return {audio:await readBounded(dest,500000),mimetype:'audio/ogg; codecs=opus',ptt:false};});
}
export async function mediaFeature5(msg,b,name,arg){
 try{
 if(name==='videofiltro'){const m=await directMedia(msg,b,'video',10*MB);if(m.mimetype!=='video/mp4')throw Error('format');return videoEffect(m.data,arg);}
 if(name==='audioefeito'){const m=await directMedia(msg,b,'audio',5*MB);return audioEffect(m.data,m.mimetype,arg);}
 const data=await directFunImage(msg,b);return name==='animtexto'?await animatedTextSticker(data,arg):name==='fundopro'?await backgroundPro(data,arg):await convertImage(data,arg);
 }catch{return 'Envie mídia própria autorizada com o comando na legenda ou como envio direto. Imagens até 5 MB; vídeo MP4 até 10 MB (:videofiltro cinza|sepia|invertido); áudio OGG, WAV ou MP3 até 5 MB (:audioefeito eco|suave|normalizar).';}
}
export async function collageFeature5({state,id,arg='',loadImage,now=Date.now()}){
 const p=state.players[id],out=(text,changed=false)=>({text,changed});if(!p)return out('Use :perfil.');
 if(p.collage5?.expires<=now)delete p.collage5;
 if(arg==='novo'||arg==='apagar'){p.collage5={items:[],expires:now+600000};return out('Colagem iniciada. Envie 2 a 4 imagens próprias com :colagem adicionar na legenda; :colagem gerar. Expira em 10 minutos.',true);}
 const c=p.collage5;if(!c)return out('Use :colagem novo.');
 if(arg==='adicionar'){if(c.items.length>=4)return out('Máximo de 4 imagens.');let input;try{input=await loadImage();}catch{return out('Envie sua imagem com :colagem adicionar na legenda.');}
 const value=(await sharp(input,{limitInputPixels:12000000}).resize(256,256,{fit:'cover'}).jpeg({quality:40}).toBuffer()).toString('base64');const used=Object.values(state.players).reduce((a,v)=>a+(v.collage5?.items||[]).reduce((n,s)=>n+s.length,0),0);if(value.length>30000||used+value.length>300000)return out('Limite temporário de imagens atingido.');
 c.items.push(value);return out('Imagem '+c.items.length+'/4 salva.',true);}
 if(arg==='gerar'){if(c.items.length<2)return out('Adicione ao menos duas imagens.');const n=c.items.length,tiles=c.items.map((v,i)=>({input:Buffer.from(v,'base64'),left:8+i%2*264,top:8+Math.floor(i/2)*264}));const image=await sharp({create:{width:536,height:n===2?272:536,channels:3,background:'#302546'}}).composite(tiles).jpeg({quality:82}).toBuffer();delete p.collage5;return out({image,caption:'Colagem de '+n+' imagens. Imagens temporárias removidas.'},true);}
 return out('Colagem: '+c.items.length+'/4. :colagem adicionar | gerar | apagar.');
}
