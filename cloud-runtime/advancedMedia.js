import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const exec=promisify(execFile);
const MB=1024*1024;
async function download(media,type,baileys,limit){
    if(Number(media.fileLength||0)>limit)throw Error('too large');
    const stream=await baileys.downloadContentFromMessage(media,type);
    const chunks=[];let bytes=0;
    for await(const chunk of stream){
        bytes+=chunk.length;
        if(bytes>limit){stream.destroy?.();throw Error('too large');}
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}
export async function videoToSticker(input){
    if(!Buffer.isBuffer(input)||input.length>5*MB||input.length<12||input.toString('ascii',4,8)!=='ftyp')throw Error('invalid MP4');
    const dir=await mkdtemp(join(tmpdir(),'iris-video-'));
    try{
        const src=join(dir,'input.mp4'),dst=join(dir,'output.webp');
        await writeFile(src,input,{mode:0o600});
        // Fixed local paths and filters, no shell, network protocols or arbitrary arguments.
        await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-protocol_whitelist','file','-f','mov','-threads','1','-max_pixels','4000000','-i',src,'-t','5','-map','0:v:0','-an','-sn','-dn','-vf','fps=6,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white','-filter_threads','1','-threads','1','-c:v','libwebp_anim','-quality','38','-compression_level','3','-loop','0','-fs','1000000',dst],{timeout:25000,maxBuffer:65536});
        const info=await stat(dst);
        if(info.size>450000||info.size===0)throw Error('output size');
        const data=await readFile(dst);
        const meta=await sharp(data,{animated:true,limitInputPixels:10000000}).metadata();
        if(meta.format!=='webp'||meta.width!==512||(meta.pageHeight||meta.height)!==512||(meta.pages||1)<2||(meta.pages||1)>30)throw Error('output invalid');
        return {sticker:data};
    }finally{await rm(dir,{recursive:true,force:true});}
}
export async function makeVideoSticker(msg,baileys){
    const media=msg.message?.videoMessage;
    if(!media||media.mimetype!=='video/mp4'||media.viewOnce)return '🌸 Envie um vídeo MP4 próprio ou autorizado com a legenda !iris s.';
    if(Number(media.seconds||0)>5)return '🌸 Use vídeo de até 5 segundos e 5 MB.';
    try{return await videoToSticker(await download(media,'video',baileys,5*MB));}
    catch(e){return e?.code==='ENOENT'?'🌸 Conversão MP4 indisponível neste servidor.':'🌸 Não consegui converter. Use MP4 de até 5 segundos, 5 MB e resolução moderada.';}
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=s=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
function lines(s){
    const a=[...s],out=[];
    while(a.length)out.push(a.splice(0,25).join(''));
    return out;
}
export async function memeImage(input,arg){
    const [top,bottom,...extra]=String(arg||'').split('|').map(clean);
    if(extra.length||(!top&&!bottom)||[...top].length>75||[...(bottom||'')].length>75)throw Error('invalid caption');
    const meta=await sharp(input,{limitInputPixels:12000000}).metadata();
    if(!['jpeg','png','webp'].includes(meta.format))throw Error('invalid image');
    const base=await sharp(input,{limitInputPixels:12000000}).rotate().resize(720,720,{fit:'contain',background:'#151923'}).flatten({background:'#151923'}).png().toBuffer();
    const block=(s,y)=>lines(s||'').map((v,i)=>'<text x="360" y="'+(y+44*i)+'" text-anchor="middle" font-family="sans-serif" font-size="38" font-weight="bold" stroke="#111111" stroke-width="5" paint-order="stroke" fill="#ffffff">'+escape(v)+'</text>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720">'+block(top,49)+block(bottom,670-(lines(bottom||'').length-1)*44)+'</svg>';
    return {image:await sharp(base).composite([{input:Buffer.from(svg)}]).jpeg({quality:85}).toBuffer(),caption:'🌸 Meme criado localmente pela Íris.'};
}
export async function makeMeme(msg,arg,baileys){
    const media=msg.message?.imageMessage;
    if(!media||media.viewOnce||!['image/jpeg','image/png','image/webp'].includes(media.mimetype))return '🌸 Envie uma imagem sua ou autorizada com legenda !iris meme texto de cima | texto de baixo.';
    try{return await memeImage(await download(media,'image',baileys,5*MB),arg);}
    catch{return '🌸 Use foto de até 5 MB e até 75 caracteres por legenda, separadas por |.';}
}
