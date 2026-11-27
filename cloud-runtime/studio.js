import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm,stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { selectMedia } from './stickerCommands.js';
import { videoToSticker } from './advancedMedia.js';
const exec=promisify(execFile);
const MB=1024*1024;
export const studioNames=['filtro','semfundo','transparente','autor','trecho','gif','comprimir'];
async function download(media,type,b,limit){
    if(!media||Number(media.fileLength||0)>limit)throw Error('size');
    const stream=await b.downloadContentFromMessage(media,type);
    const parts=[];let n=0;
    for await(const part of stream){n+=part.length;if(n>limit){stream.destroy?.();throw Error('size');}parts.push(part);}
    return Buffer.concat(parts);
}
export async function applyFilter(data,arg){
    let s=sharp(data,{limitInputPixels:12000000}).rotate().resize(1000,1000,{fit:'inside',withoutEnlargement:true});
    const meta=await s.metadata();if(!['jpeg','png','webp'].includes(meta.format))throw Error('format');
    if(arg==='cinza')s=s.grayscale();
    else if(arg==='sepia')s=s.recomb([[.393,.769,.189],[.349,.686,.168],[.272,.534,.131]]);
    else if(arg==='nitido')s=s.sharpen();
    else if(arg==='invertido')s=s.negate({alpha:false});
    else throw Error('filter');
    return {image:await s.png().toBuffer(),caption:'🌸 Filtro '+arg+'.'};
}
// Local chroma-key: remove only connected border regions matching the selected color.
// It is not semantic segmentation, and cannot reliably remove complex backgrounds.
export async function removeBackground(data,arg='',sticker=false){
    const match=/^(?:#?([0-9a-f]{6}))?$/i.exec(arg);if(!match)throw Error('color');
    const {data:raw,info}=await sharp(data,{limitInputPixels:12000000}).rotate().resize(512,512,{fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const {width:w,height:h}=info;const rgb=match[1]?[0,2,4].map(i=>parseInt(match[1].slice(i,i+2),16)):[raw[0],raw[1],raw[2]];
    const seen=new Uint8Array(w*h),q=new Int32Array(w*h);let read=0,write=0;
    function visit(i){if(seen[i])return;seen[i]=1;const p=i*4;if(Math.max(...rgb.map((v,j)=>Math.abs(v-raw[p+j])))<=38){raw[p+3]=0;q[write++]=i;}}
    for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
    for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
    while(read<write){const i=q[read++],x=i%w,y=Math.floor(i/w);if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);}
    let s=sharp(raw,{raw:{width:w,height:h,channels:4}});
    if(sticker){
        const webp=await s.resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:70}).toBuffer();
        if(webp.length>450000)throw Error('output size');
        return {sticker:webp};
    }
    return {image:await s.png().toBuffer(),caption:'🌸 Fundo de cor uniforme removido (quando conectado às bordas).'};
}
export async function stickerAuthor(data,name,pack='Íris Cloud'){
    if(!name||name.length>40||!pack||pack.length>40||data.length>450000||data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WEBP')throw Error('invalid');
    const meta=await sharp(data,{animated:true,limitInputPixels:18000000}).metadata();
    if(meta.format!=='webp'||meta.width>512||(meta.pageHeight||meta.height)>512||(meta.pages||1)>60)throw Error('invalid sticker');
    // Keep original animation intact. Add standardized WhatsApp sticker EXIF metadata.
    const payload=Buffer.from(JSON.stringify({'sticker-pack-id':'iris-cloud-2','sticker-pack-name':pack,'sticker-pack-publisher':name,emojis:['🌸']}));
    const head=Buffer.from([0x49,0x49,0x2a,0,8,0,0,0,1,0,0x41,0x57,7,0,0,0,0,0,0x16,0,0,0]);head.writeUInt32LE(payload.length,14);
    const exif=Buffer.concat([head,payload]);
    const chunks=[];let flags=0,extended=null;
    for(let p=12;p+8<=data.length;){
        const type=data.toString('ascii',p,p+4),len=data.readUInt32LE(p+4),end=p+8+len+(len%2);
        if(end>data.length)throw Error('chunk');
        if(type==='VP8X'){if(len!==10)throw Error('vp8x');extended=Buffer.from(data.subarray(p+8,p+18));flags=extended[0];}
        else if(type!=='EXIF')chunks.push(data.subarray(p,end));
        p=end;
    }
    const chunk=(tag,body)=>{const h=Buffer.alloc(8);h.write(tag);h.writeUInt32LE(body.length,4);return Buffer.concat([h,body,Buffer.alloc(body.length%2)]);};
    if(!extended){extended=Buffer.alloc(10);if(meta.hasAlpha)flags|=16;extended.writeUIntLE(meta.width-1,4,3);extended.writeUIntLE((meta.pageHeight||meta.height)-1,7,3);}
    extended[0]=flags|8;
    const body=Buffer.concat([Buffer.from('WEBP'),chunk('VP8X',extended),...chunks,chunk('EXIF',exif)]);
    const riff=Buffer.alloc(8);riff.write('RIFF');riff.writeUInt32LE(body.length,4);
    const output=Buffer.concat([riff,body]);if(output.length>450000)throw Error('output size');
    return {sticker:output};
}
export async function videoStudio(data,name,start=0){
    if(data.length>15*MB||data.toString('ascii',4,8)!=='ftyp'||!Number.isInteger(start)||start<0||start>600)throw Error('video');
    const dir=await mkdtemp(join(tmpdir(),'iris-studio-'));
    try{
        const src=join(dir,'input.mp4'),dst=join(dir,name==='gif'?'output.gif':'output.mp4');
        await writeFile(src,data,{mode:0o600});
        const base=['-hide_banner','-loglevel','error','-nostdin','-y','-protocol_whitelist','file','-f','mov','-threads','1','-max_pixels','4000000','-ss',String(start),'-i',src];
        const args=name==='gif'?['-t','10','-an','-vf','fps=5,scale=320:320:force_original_aspect_ratio=decrease:force_divisible_by=2','-threads','1','-fs','2000000']:['-t',name==='trecho'?'20':'60','-map','0:v:0','-map','0:a:0?','-vf','scale=480:480:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-preset','ultrafast','-crf','30','-pix_fmt','yuv420p','-c:a','aac','-b:a','48k','-threads','1','-movflags','+faststart','-fs','5000000'];
        await exec('ffmpeg',[...base,...args,dst],{timeout:25000,maxBuffer:65536});
        const s=await stat(dst);if(s.size<64||s.size>(name==='gif'?2000000:5000000))throw Error('output size');
        const output=await readFile(dst);
        if(name==='trecho')return await videoToSticker(output,{seconds:20});
        if(name==='gif')return {document:output,mimetype:'image/gif',fileName:'iris.gif',caption:'🌸 GIF de até 10 segundos.'};
        return {video:output,mimetype:'video/mp4',caption:'🌸 MP4 comprimido (até 60 segundos).'};
    }finally{await rm(dir,{recursive:true,force:true});}
}
export async function studioCommand(msg,b,name,arg){
    const m=selectMedia(msg)?.message;
    try{
        if(name==='autor'||name==='renomear'){
            if(!m?.stickerMessage)return 'Responda a uma figurinha autorizada com :autor nome (até 40 caracteres).';
            const parts=arg.split('|').map(s=>s.trim());
            if(name==='renomear'&&(parts.length!==2||parts.some(s=>!s||s.length>40)))return 'Use :renomear pacote | autor (até 40 caracteres cada).';
            return await stickerAuthor(await download(m.stickerMessage,'sticker',b,450000),name==='renomear'?parts[1]:arg,name==='renomear'?parts[0]:'Íris Cloud');
        }
        if(['filtro','semfundo','transparente'].includes(name)){
            if(!m?.imageMessage||!['image/jpeg','image/png','image/webp'].includes(m.imageMessage.mimetype))return 'Responda a uma imagem autorizada.';
            const d=await download(m.imageMessage,'image',b,5*MB);
            if(name==='filtro')return await applyFilter(d,arg);
            return await removeBackground(d,arg,name==='transparente');
        }
        if(!m?.videoMessage||m.videoMessage.mimetype!=='video/mp4')return 'Responda a um MP4 autorizado de até 15 MB.';
        if(name==='trecho'&&!/^\d{1,3}$/.test(arg))return 'Use :trecho 30 para converter até 20 segundos a partir do segundo 30 (sem áudio).';
        return await videoStudio(await download(m.videoMessage,'video',b,15*MB),name,name==='trecho'?Number(arg):0);
    }catch{return '🌸 Não consegui processar. Confira os limites e o formato. Filtros: cinza, sepia, nitido, invertido. Fundo: cor uniforme, opcional #ffffff.';}
}
