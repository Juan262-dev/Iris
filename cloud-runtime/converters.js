import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm,stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { selectMedia } from './stickerCommands.js';
const exec=promisify(execFile);
export const converterNames=['imagem','audio','voz'];
const MB=1024*1024;
async function bytes(media,type,b,limit){
    if(Number(media.fileLength||0)>limit)throw Error('limit');
    const stream=await b.downloadContentFromMessage(media,type);
    const parts=[];let size=0;
    for await(const part of stream){
        size+=part.length;if(size>limit){stream.destroy?.();throw Error('limit');}
        parts.push(part);
    }
    return Buffer.concat(parts);
}
export async function stickerToImage(data){
    if(data.length>500000||data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WEBP')throw Error('invalid webp');
    const meta=await sharp(data,{limitInputPixels:1200000}).metadata();
    if(meta.width>512||(meta.pageHeight||meta.height)>512)throw Error('dimensions');
    return {image:await sharp(data,{limitInputPixels:1200000}).png().toBuffer(),caption:'🌸 Primeiro quadro da figurinha.'};
}
export async function toAudio(data,format,ptt=false){
    const valid=format==='mov'?data.toString('ascii',4,8)==='ftyp':format==='ogg'?data.toString('ascii',0,4)==='OggS':format==='mp3'?data.toString('ascii',0,3)==='ID3'||(data[0]===255&&(data[1]&224)===224):false;
    if(!valid||data.length>15*MB)throw Error('format');
    const dir=await mkdtemp(join(tmpdir(),'iris-audio-'));
    try{
        const src=join(dir,'input'),dst=join(dir,'output.ogg');
        await writeFile(src,data,{mode:0o600});
        await exec('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-y','-protocol_whitelist','file','-f',format,'-threads','1','-i',src,'-t','60','-map','0:a:0','-vn','-sn','-dn','-ac','1','-ar','48000','-c:a','libopus','-b:a','48k','-threads','1','-fs','600000',dst],{timeout:20000,maxBuffer:65536});
        const meta=await stat(dst);
        if(meta.size<64||meta.size>600000)throw Error('audio size');
        const audio=await readFile(dst);
        return {audio,mimetype:'audio/ogg; codecs=opus',ptt};
    }finally{await rm(dir,{recursive:true,force:true});}
}
export async function convertMedia(msg,b,name){
    const selected=selectMedia(msg);
    try{
        if(name==='imagem'){
            const s=selected?.message?.stickerMessage;
            if(!s)return '🌸 Responda a uma figurinha autorizada com :imagem.';
            return await stickerToImage(await bytes(s,'sticker',b,500000));
        }
        const v=selected?.message?.videoMessage,a=selected?.message?.audioMessage;
        if(v?.mimetype==='video/mp4')return await toAudio(await bytes(v,'video',b,15*MB),'mov',name==='voz');
        if(a&&['audio/ogg','audio/ogg; codecs=opus','audio/mpeg','audio/mp4'].includes(a.mimetype)){
            const f=a.mimetype.startsWith('audio/ogg')?'ogg':a.mimetype==='audio/mpeg'?'mp3':'mov';
            return await toAudio(await bytes(a,'audio',b,15*MB),f,name==='voz');
        }
        return '🌸 Responda a um MP4 ou áudio autorizado com :'+name+'. Até 15 MB; converte os primeiros 60 segundos.';
    }catch{return '🌸 Não consegui converter a mídia. Use um arquivo válido de até 15 MB com áudio.';}
}
