import sharp from 'sharp';
import QRCode from 'qrcode';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { directFunImage,encodeGif } from './funMedia.js';
import { stickerAuthor } from './studio.js';
import { groupThemes } from './community4.js';
const exec=promisify(execFile);
export const media4=['figtexto','qrcode','efeitoanimado','gifvideo'];
export const packCommands=['pacotefig'];
export const interface4=['menupremium','ajudacartao'];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clean=s=>Array.from(String(s||'').replace(/[\p{Cc}\p{Cf}]/gu,'').trim()).slice(0,40).join('');
const svg=(w,h,body)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><g font-family="sans-serif">'+body+'</g></svg>');
const txt=(x,y,s,size=24,color='#fff',center=false)=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'"'+(center?' text-anchor="middle"':'')+'>'+esc(s)+'</text>';
const r=(x,y,w,h,fill)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="'+fill+'"/>';
const sections={
 geral:[':ping • :status • :diagnostico',':menutexto • :versao • :ajuda',':ajudacartao comando'],
 jogos:[':domino novo • entrar • pv • iniciar',':unobot novo • pos 1 • mao',':torneiouno novo • entrar • iniciar',':2048 novo • cima • direita',':ludo • :sudoku • :termo • :historicopartidas',':cruzadas novo • :quizmulti novo',':uno • :xadrez • :damas • :naval',':memoria • :stop • :forca • :quiz'],
 economia:[':temporada • :rankequipes',':missaosemanal participar • resgatar',':lojatema • :comprartema oceano',':empresa • :evoluir empresa',':perfil • :perfilvisual • :conquistavisual',':banco • :saldo • :diario • :loja',':cidade • :imovel • :museu • :missaoequipe',':album • :reputacao • :evolucao • :colecao'],
 midia:[':pacotefig criar nome','Imagem na legenda: :figtexto frase',':qrcode texto simples • :efeitoanimado','GIF como documento: :gifvideo',':s • :fig • :som • :pdf • :tts',':animtexto • :fundopro • :colagem',':formatoimagem • :videofiltro • :audioefeito'],
 diversao:[':menufun • :fun on • :fun off',':tesouro novo • :bingoeducativo novo',':batalhaconhecimento novo',':eventotema participar',':abraco • :elogio • :dupla • :adivinha',':gincana • :festival • :historiainterativa'],
 admin:[':configgrupo • :temagrupo oceano',':permissao jogos admin',':avisoregistrar regras • :avisohistorico',':salvarconfig • :restaurarconfig confirmar',':regras • :backup • :agenda',':painel • :comandopermissao • :auditoria']
};
const helps={
 domino:'Dominó de 2 a 4 jogadores. Cada um confirma :domino pv. O criador inicia. :domino jogar 1-2 esquerda ou direita. :domino comprar quando não há peça válida.',
 unobot:'UNO contra a Íris com cartas especiais. :unobot novo autoriza o envio da mão no privado. :unobot pos 1, comprar, mao ou sair.',
 torneiouno:'Torneio UNO com 2, 4 ou 8 inscritos. Responsável inicia; cada dupla confirma :uno pv. Avança pelo resultado real.',
 '2048':'Use :2048 novo, depois cima, baixo, esquerda ou direita. Junte números iguais até chegar a 2048.',
 pacotefig:'Crie com :pacotefig criar nome. Envie imagem própria com :pacotefig adicionar na legenda. :pacotefig pegar 1, listar, apagar.',
 quizmulti:'Crie com :quizmulti novo, amigos entram, criador inicia. :quizmulti resposta 1. :quizmulti placar.',
 perfil:'Use :perfil, :perfilvisual, :nomeperfil nome, :perfilfoto na legenda de sua foto.',
 temagrupo:'Responsável usa :temagrupo iris, oceano, floresta ou dourado para os menus 4.0.'
};
export async function premiumMenu(category='',theme='iris',fallback=''){
    category=String(category||'').toLowerCase();if(category==='fun'||category==='brincadeiras')category='diversao';
    const [bg,panel,accent]=groupThemes[theme]||groupThemes.iris;
    const title=category?'ÍRIS • '+category.toUpperCase():'ÍRIS CLOUD 6.0';
    const lines=category==='infinity'?['Mapa • :mapainfinity','Jogos • :imobiliario novo | :trilha novo','Cooperação • :expedicao novo | :reliquia novo','Estudos • :simulado novo ciencia','Guildas • :guilda | :projetoinfinity','Estúdio • :cartaoarte texto']:category?((Object.hasOwn(sections,category)?sections[category]:null)||['Categorias: '+Object.keys(sections).join(', ')]):[['INFINITY',' :infinity'],['GERAL',' :menu geral'],['JOGOS',' :menu jogos'],['ECONOMIA',' :menu economia'],['ESTÚDIO',' :menu midia'],['ÍRIS FUN',' :menu diversao'],['ADMINISTRAÇÃO',' :menu admin']].map(x=>x.join(' — '));
    const h=145+lines.length*60;
    const body=[r(0,0,700,h,bg),r(18,18,664,76,panel),txt(350,65,title,32,accent,true)];
    lines.forEach((line,i)=>{const y=110+60*i;body.push(r(20,y,660,50,panel),txt(36,y+33,line,20));});
    body.push(txt(350,h-14,'Prefixo : • :menutexto para a lista completa',15,accent,true));
    return {image:await sharp(svg(700,h,body.join(''))).png().toBuffer(),caption:fallback||'Íris Cloud 6.0 • '+(category||'menu principal')+'\n:menutexto para todos os comandos.'};
}
export async function helpCard(arg,theme){
    const key=String(arg).replace(/^:/,'').toLowerCase(),help=Object.hasOwn(helps,key)?helps[key]:null;if(!help)return 'Cartões disponíveis: '+Object.keys(helps).join(', ')+'. Use :ajuda para os demais comandos.';
    const words=help.split(' '),lines=[''];for(const w of words){if((lines.at(-1)+' '+w).length>52)lines.push(w);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+w;}
    const [bg,panel,accent]=groupThemes[theme]||groupThemes.iris;const h=120+35*lines.length;
    const body=[r(0,0,700,h,bg),r(20,20,660,60,panel),txt(350,60,':'+key,30,accent,true),...lines.map((l,i)=>txt(28,110+i*35,l,20))];
    return {image:await sharp(svg(700,h,body.join(''))).png().toBuffer(),caption:help};
}
export async function overlaySticker(input,arg){
    const text=clean(arg);if(!text)throw Error('text');
    const parts=Array.from(text),lines=[];for(let i=0;i<parts.length;i+=16)lines.push(parts.slice(i,i+16).join(''));
    const overlay=svg(512,512,r(10,512-48*lines.length-18,492,48*lines.length+10,'#201831')+lines.map((l,i)=>txt(256,512-48*(lines.length-i)+19,l,35,'#fff',true)).join(''));
    const sticker=await sharp(input,{limitInputPixels:12000000}).resize(512,512,{fit:'contain',background:'#201831'}).composite([{input:overlay}]).webp({quality:60}).toBuffer();
    if(sticker.length>450000)throw Error('size');return {sticker};
}
export async function qrText(arg){
    const s=String(arg||'').trim();if(!/^[\p{L}\p{M}\p{N} .,!?\-_]{1,100}$/u.test(s)||/(?:www\.|\bhttps?\b|\.com\b|\.net\b|\.org\b|\.br\b|\d{5,})/i.test(s))return 'Use texto simples de até 100 caracteres, sem links ou números pessoais. Ex.: :qrcode Ola amigos.';
    return {image:await QRCode.toBuffer(s,{type:'png',width:400,margin:4,errorCorrectionLevel:'M'}),caption:'QR Code de texto simples.'};
}
export async function animatedEffect(input,arg=''){
    if(arg&&!['brilho','ondas'].includes(arg))return 'Efeitos: brilho ou ondas.';
    const frames=[];for(let i=0;i<8;i++){
        const delta=Math.round(12*Math.sin(i*Math.PI/7)),size=230+delta;
        const pic=await sharp(input,{limitInputPixels:12000000}).resize(size,size,{fit:'contain',background:'#201831'}).modulate({brightness:arg==='brilho'?1+i*.035:1}).png().toBuffer();
        const overlay=svg(256,256,Array.from({length:6},(_,k)=>'<circle cx="'+(18+k*43)+'" cy="'+(18+((k*43+i*13)%218))+'" r="'+(3+i%3)+'" fill="#edddff"/>').join(''));
        frames.push(await sharp({create:{width:256,height:256,channels:3,background:'#201831'}}).composite([{input:pic,left:Math.floor((256-size)/2),top:Math.floor((256-size)/2)},{input:overlay}]).png().toBuffer());
    }return {document:await encodeGif(frames),mimetype:'image/gif',fileName:'iris-efeito.gif',caption:'Íris • efeito animado'};
}
async function getGif(msg,b){
    const m=msg?.message?.documentMessage;if(!m||m.mimetype!=='image/gif'||m.viewOnce||m.contextInfo?.expiration||Number(m.fileLength||0)>2*1024*1024)throw Error('gif');
    if(m.url){const u=new URL(m.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='whatsapp.net'||u.hostname.endsWith('.whatsapp.net')))throw Error('url');}
    const stream=await b.downloadContentFromMessage(m,'document'),parts=[];let n=0;for await(const c of stream){n+=c.length;if(n>2*1024*1024){stream.destroy?.();throw Error('size');}parts.push(c);}return Buffer.concat(parts);
}
export async function gifVideo(input){
    if(!Buffer.isBuffer(input)||input.length>2*1024*1024||!/^GIF8[79]a$/.test(input.toString('ascii',0,6)))throw Error('gif');
    const m=await sharp(input,{animated:true,limitInputPixels:12000000}).metadata();if(m.format!=='gif'||(m.pages||1)>120||m.width*(m.pageHeight||m.height)>1000000)throw Error('size');
    const dir=await mkdtemp(join(tmpdir(),'iris-gifvideo-'));try{
        const src=join(dir,'in.gif'),dest=join(dir,'out.mp4');await writeFile(src,input);
        await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','1','-ignore_loop','1','-f','gif','-i',src,'-t','10','-vf','scale=480:480:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-pix_fmt','yuv420p','-an','-movflags','+faststart','-threads','1',dest],{timeout:15000,maxBuffer:65536});
        const video=await readFile(dest);if(video.length>5000000)throw Error('size');return {video,caption:'GIF convertido em MP4 (até 10 segundos).'};
    }finally{await rm(dir,{recursive:true,force:true});}
}
export async function mediaFeature4(msg,b,name,arg){
    try{if(name==='qrcode')return await qrText(arg);if(name==='gifvideo')return await gifVideo(await getGif(msg,b));const input=await directFunImage(msg,b);return name==='figtexto'?await overlaySticker(input,arg):await animatedEffect(input,arg);}catch{return 'Envie sua própria imagem JPEG/PNG/WebP (até 5 MB) na legenda do comando; para :gifvideo, GIF como documento (até 2 MB).';}
}
export async function packFeature4({state,id,arg='',loadImage}){
    const p=state.players[id],out=(text,changed=false)=>({text,changed});if(!p)return out('Use :perfil primeiro.');
    const pack=p.stickerPack4;
    if(arg.startsWith('criar ')){const name=clean(arg.slice(6));if(!/^[\p{L}\p{N} _-]{1,32}$/u.test(name))return out('Nome de pacote inválido.');if(pack)return out('Já possui pacote; use :pacotefig renomear nome.');p.stickerPack4={name,items:[]};return out('Pacote '+name+' criado.',true);}
    if(!pack)return out('Use :pacotefig criar nome.');
    if(arg==='apagar'){delete p.stickerPack4;return out('Pacote excluído.',true);}
    if(arg.startsWith('renomear ')){const name=clean(arg.slice(9));if(!/^[\p{L}\p{N} _-]{1,32}$/u.test(name))return out('Nome inválido.');pack.name=name;return out('Pacote renomeado.',true);}
    if(arg==='adicionar'){if(pack.items.length>=5)return out('Máximo de 5 figurinhas no pacote.');let data;try{data=await loadImage();}catch{return out('Envie sua própria imagem com :pacotefig adicionar na legenda.');}let sticker=await sharp(data,{limitInputPixels:12000000}).resize(512,512,{fit:'contain',background:'#fff'}).webp({quality:35}).toBuffer();if(sticker.length>45000)sticker=await sharp(data,{limitInputPixels:12000000}).resize(384,384,{fit:'contain',background:'#fff'}).webp({quality:20}).toBuffer();const value=sticker.toString('base64');const used=Object.values(state.players).reduce((sum,v)=>sum+(v.stickerPack4?.items||[]).reduce((a,x)=>a+x.length,0),0);if(value.length>60000||used+value.length>600000)return out('Limite de armazenamento do pacote ou grupo.');pack.items.push(value);return out('Figurinha '+pack.items.length+' salva. :pacotefig pegar '+pack.items.length,true);}
    const m=/^(pegar|remover) ([1-5])$/.exec(arg);if(m){const i=Number(m[2])-1;if(!pack.items[i])return out('Figurinha inexistente.');if(m[1]==='remover'){pack.items.splice(i,1);return out('Figurinha removida.',true);}return out(await stickerAuthor(Buffer.from(pack.items[i],'base64'),'Íris Cloud',pack.name));}
    return out('Pacote '+pack.name+' • '+pack.items.length+'/5 figurinhas.\n:pacotefig adicionar | pegar 1 | remover 1 | renomear nome | apagar.');
}
