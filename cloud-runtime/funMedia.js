import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const exec=promisify(execFile);
export const funMediaNames=['menufun','petpet','pixelar','cartoon','cartaz','certificado','trofeu','memealeatorio'];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const svg=(w,h,body)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><g font-family="sans-serif">'+body+'</g></svg>');
const rect=(x,y,w,h,fill,rx=12)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'"/>';
const txt=(x,y,t,size=24,fill='#fff',center=false,weight='normal')=>'<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-size="'+size+'" font-weight="'+weight+'"'+(center?' text-anchor="middle"':'')+'>'+esc(t)+'</text>';
export const funMenuText='ÍRIS FUN\nInterações: :fun on | off | lista, :abraco, :tocarasmaos, :amizade, :elogio, :dupla, :quem, :acenar, :celebrar.\nBrincadeiras: :verdade, :desafio, :eununca, :adivinha, :chance, :8ball, :escolher, :sorte, :frase.\nImagens: :petpet, :pixelar, :cartoon, :cartaz, :certificado, :trofeu, :memealeatorio.\nInterações com voluntários: :fun on. Use menção real ou código do perfil. Para efeitos em fotos, envie sua própria imagem com o comando na legenda.';
export async function funMenu(){
    const blocks=[
        ['01','INTERAÇÕES',[':abraco  :tocarasmaos  :amizade',':elogio  :dupla  :quem  :acenar  :celebrar']],
        ['02','PERGUNTAS E DESAFIOS',[':verdade  :desafio  :eununca',':adivinha  :frase  :sorte']],
        ['03','ESCOLHAS ALEATÓRIAS',[':chance  :8ball  :escolher']],
        ['04','ESTÚDIO DE BRINCADEIRAS',[':petpet  :pixelar  :cartoon',':cartaz  :certificado  :trofeu',':memealeatorio']]
    ];
    const body=[rect(0,0,680,740,'#201831',22),rect(24,24,632,100,'#4b346c',20),txt(340,69,'ÍRIS FUN',40,'#eadbff',true,'bold'),txt(340,100,'Central de entretenimento',19,'#e8d6ff',true)];
    let y=143;
    for(const [num,title,lines] of blocks){
        const h=60+lines.length*29;
        body.push(rect(24,y,632,h,'#302546',16),txt(45,y+36,num,20,'#c7a2ff',false,'bold'),txt(92,y+36,title,21,'#e4d5ff',false,'bold'));
        lines.forEach((v,i)=>body.push(txt(45,y+65+i*29,v,19)));
        y+=h+12;
    }
    body.push(txt(340,720,'Prefixo : • :fun on para participar • :fun off para sair',16,'#d7c3f4',true));
    return {image:await sharp(svg(680,740,body.join(''))).png().toBuffer(),caption:funMenuText};
}
const palettes={abraco:['#3d245b','#eec2f1'],tocarasmaos:['#17334b','#a0e8f6'],elogio:['#2c4650','#ffdf92'],acenar:['#304560','#cce6ff'],celebrar:['#4d2e64','#ffd88d']};
export async function encodeGif(frames,rate=6){
    if(!Array.isArray(frames)||frames.length<2||frames.length>12||![4,6,8].includes(rate))throw Error('frames');
    const dir=await mkdtemp(join(tmpdir(),'iris-fun-'));
    try{
        for(let i=0;i<frames.length;i++)await writeFile(join(dir,'f'+i+'.png'),frames[i]);
        const dest=join(dir,'out.gif');
        await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-threads','1','-framerate',String(rate),'-i',join(dir,'f%d.png'),'-frames:v',String(frames.length),'-loop','0','-threads','1',dest],{timeout:12000,maxBuffer:65536});
        const gif=await readFile(dest);
        if(gif.length>1800000||!/^GIF8[79]a$/.test(gif.toString('ascii',0,6)))throw Error('gif');
        return gif;
    }finally{await rm(dir,{recursive:true,force:true});}
}
const gifDocument=(gif,caption,fileName)=>({document:gif,mimetype:'image/gif',fileName,caption});
export async function friendlyGif(kind,caption){
    if(!Object.hasOwn(palettes,kind))throw Error('kind');
    const [bg,accent]=palettes[kind],frames=[];
    const title=kind==='acenar'?'OLÁ, AMIGO!':kind==='celebrar'?'VAMOS CELEBRAR!':kind==='abraco'?'ABRAÇO VIRTUAL':kind==='tocarasmaos'?'TOCA AQUI!':'PARABÉNS!';
    for(let i=0;i<8;i++){
        const d=Math.round(28*Math.sin(i*Math.PI/7)),x1=100+d,x2=220-d;
        const b=[rect(0,0,320,240,bg,0),txt(160,36,title,24,accent,true,'bold')];
        if(kind==='elogio'||kind==='celebrar'){
            for(let k=0;k<5;k++){const x=55+k*53,y=94+(k%2)*36+d/3;b.push('<path d="M '+x+' '+(y-15)+' l 5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2 Z" fill="'+accent+'"/>');}
        }else{
            for(const [x,color] of [[x1,'#c6b0ff'],[x2,'#ffdaac']]){
                b.push('<circle cx="'+x+'" cy="105" r="26" fill="'+color+'"/>','<circle cx="'+(x-8)+'" cy="102" r="2.8" fill="#302546"/>','<circle cx="'+(x+8)+'" cy="102" r="2.8" fill="#302546"/>','<path d="M '+(x-8)+' 113 Q '+x+' 121 '+(x+8)+' 113" fill="none" stroke="#302546" stroke-width="2.5" stroke-linecap="round"/>',rect(x-26,134,52,54,color,24));
            }
            if(kind==='acenar')b.push('<path d="M '+(x1-12)+' 150 L '+(x1-40)+' '+(120-d)+' M '+(x2+12)+' 150 L '+(x2+40)+' '+(120-d)+'" fill="none" stroke="'+accent+'" stroke-width="12" stroke-linecap="round"/>');
            else if(kind==='abraco')b.push('<path d="M '+(x1+15)+' 151 Q 160 178 '+(x2-15)+' 151" fill="none" stroke="'+accent+'" stroke-width="14" stroke-linecap="round"/>');
            else b.push('<path d="M '+(x1+10)+' 153 L '+(145+d/2)+' '+(125-d/2)+' M '+(x2-10)+' 153 L '+(175-d/2)+' '+(125-d/2)+'" fill="none" stroke="'+accent+'" stroke-width="11" stroke-linecap="round"/>');
        }
        b.push(txt(160,218,'ÍRIS FUN • AMIZADE',14,accent,true));
        frames.push(await sharp(svg(320,240,b.join(''))).png().toBuffer());
    }
    return gifDocument(await encodeGif(frames),caption,'iris-'+kind+'.gif');
}
async function baseImage(input){
    if(!Buffer.isBuffer(input)||input.length>5*1024*1024)throw Error('size');
    const s=sharp(input,{limitInputPixels:12000000}),meta=await s.metadata();
    if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error('format');
    return sharp(input,{limitInputPixels:12000000}).rotate().resize(512,512,{fit:'inside',withoutEnlargement:true}).flatten({background:'#eee'}).png().toBuffer();
}
export async function directFunImage(msg,b){
    // Images are submitted by the sender specifically for this command. No quoted contact photos.
    const m=msg?.message?.imageMessage;
    if(!m||m.viewOnce||m.contextInfo?.expiration||!['image/jpeg','image/png','image/webp'].includes(m.mimetype)||Number(m.fileLength||0)>5*1024*1024)throw Error('image');
    if(m.url){const u=new URL(m.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='whatsapp.net'||u.hostname.endsWith('.whatsapp.net')))throw Error('url');}
    const stream=await b.downloadContentFromMessage(m,'image'),parts=[];let n=0;
    for await(const chunk of stream){n+=chunk.length;if(n>5*1024*1024){stream.destroy?.();throw Error('size');}parts.push(chunk);}
    return baseImage(Buffer.concat(parts));
}
export async function pixelArt(input){
    const base=await baseImage(input);
    const small=await sharp(base).resize(32,32,{fit:'inside'}).png().toBuffer();
    return {image:await sharp(small).resize(512,512,{fit:'inside',kernel:'nearest'}).png().toBuffer(),caption:'Íris Fun • efeito pixel art'};
}
export async function cartoonEffect(input){
    const base=await baseImage(input);
    const {data,info}=await sharp(base).median(3).modulate({saturation:1.35}).removeAlpha().raw().toBuffer({resolveWithObject:true});
    for(let i=0;i<data.length;i++)data[i]=Math.min(255,Math.round(data[i]/48)*48);
    const image=await sharp(data,{raw:{width:info.width,height:info.height,channels:info.channels}}).png().toBuffer();
    return {image,caption:'Íris Fun • efeito de cores estilizadas (não é IA)'};
}
export async function petPet(input){
    const base=await baseImage(input),frames=[];
    for(let i=0;i<8;i++){
        const d=Math.round(18*Math.sin(i*Math.PI/7)),w=154+d,h=154-d;
        const photo=await sharp(base).resize(w,h,{fit:'contain',background:'#e4d7fa'}).png().toBuffer();
        const hand=svg(256,256,'<path d="M 125 '+(20+d)+' Q 132 '+(12+d)+' 145 '+(23+d)+' L 205 '+(62+d)+' Q 215 '+(76+d)+' 199 '+(86+d)+' L 171 '+(66+d)+' L 173 '+(87+d)+' Q 159 '+(101+d)+' 146 '+(87+d)+' L 128 '+(63+d)+' Q 113 '+(52+d)+' 125 '+(20+d)+' Z" fill="#ffd7b0" stroke="#b0836a" stroke-width="2"/>'+txt(128,242,'PET PET',14,'#483968',true,'bold'));
        const frame=await sharp({create:{width:256,height:256,channels:3,background:'#e4d7fa'}}).composite([{input:photo,left:Math.floor((256-w)/2),top:215-h},{input:hand}]).png().toBuffer();
        frames.push(frame);
    }
    return gifDocument(await encodeGif(frames),'Íris Fun • carinho animado','iris-petpet.gif');
}
const presets={amizade:['Amizade','Que venham boas partidas e risadas!'],criatividade:['Criatividade','Ideias originais merecem destaque.'],jogos:['Jogos','Diversão e respeito em cada partida.'],cooperacao:['Cooperação','Juntos, cada desafio fica melhor.']};
const memes=[['QUANDO O QUIZ COMEÇA','O cérebro abre 37 abas ao mesmo tempo.'],['O BOT DISSE: SUA VEZ','Eu tentando lembrar as regras do jogo.'],['FIM DE SEMANA','Minha missão: descanso e boas risadas.'],['JOGO DA MEMÓRIA','Lembrei de tudo, menos da carta que acabei de virar.']];
export async function funPoster(kind,arg='',choose=n=>Math.floor(Math.random()*n)){
    if(kind==='memealeatorio'){
        const [a,b]=memes[choose(memes.length)];
        const body=[rect(0,0,640,440,'#211a37',0),rect(22,22,596,80,'#5c4685',14),txt(320,71,a,27,'#fff',true,'bold'),'<circle cx="320" cy="216" r="80" fill="#e2c6f6"/>','<circle cx="292" cy="200" r="9" fill="#302546"/><circle cx="348" cy="200" r="9" fill="#302546"/><path d="M 285 240 Q 320 260 355 240" stroke="#302546" stroke-width="7" fill="none" stroke-linecap="round"/>',txt(320,337,b.length>57?b.slice(0,57):b,19,'#fff',true),txt(320,410,'MEME ORIGINAL • ÍRIS FUN',16,'#c4a5f4',true)];
        if(b.length>57)body.push(txt(320,362,b.slice(57),19,'#fff',true));
        return {image:await sharp(svg(640,440,body.join(''))).png().toBuffer(),caption:a+'\n'+b};
    }
    if(!['cartaz','certificado','trofeu'].includes(kind))throw Error('kind');
    const k=String(arg||'amizade').trim().toLowerCase();
    if(!Object.hasOwn(presets,k))return 'Temas: '+Object.keys(presets).join(', ')+'. Use :'+kind+' amizade.';
    const [a,b]=presets[k],title=kind==='cartaz'?'CARTAZ DIVERTIDO':kind==='certificado'?'CERTIFICADO SIMBÓLICO':'TROFÉU VIRTUAL';
    const body=[rect(0,0,660,460,'#231b39',0),rect(18,18,624,424,'#47345f',18),txt(330,68,title,28,'#f8e9ff',true,'bold')];
    if(kind==='trofeu')body.push('<path d="M 275 105 H 385 V 157 Q 385 210 342 225 L 342 260 H 378 V 279 H 282 V 260 H 318 V 225 Q 275 210 275 157 Z" fill="#ffd27b"/>','<path d="M 275 122 H 248 V 145 Q 248 180 279 183 M 385 122 H 412 V 145 Q 412 180 381 183" fill="none" stroke="#ffd27b" stroke-width="11"/>');
    else body.push('<circle cx="330" cy="189" r="70" fill="#bda2ff"/>','<path d="M 330 140 L 343 172 378 175 351 199 358 233 330 215 302 233 309 199 282 175 317 172 Z" fill="#fff1ad"/>');
    body.push(txt(330,320,a,40,'#fff',true,'bold'),txt(330,359,b,20,'#f0e4ff',true),txt(330,420,'ÍRIS FUN • Somente para diversão',15,'#e2c8fa',true));
    return {image:await sharp(svg(660,460,body.join(''))).png().toBuffer(),caption:title+' — '+a+'. '+b};
}
export async function runFunMedia(msg,b,name,arg=''){
    try{
        if(name==='menufun')return await funMenu();
        if(['cartaz','certificado','trofeu','memealeatorio'].includes(name))return await funPoster(name,arg);
        const input=await directFunImage(msg,b);
        return name==='petpet'?await petPet(input):name==='pixelar'?await pixelArt(input):await cartoonEffect(input);
    }catch{return '🌸 Envie sua própria imagem JPEG, PNG ou WebP de até 5 MB com o comando na legenda. Mídias temporárias ou de outras conversas não são aceitas.';}
}
