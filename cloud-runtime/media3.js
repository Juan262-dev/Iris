import sharp from 'sharp';
import { selectMedia } from './stickerCommands.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const exec=promisify(execFile);
export const media3Names=['borda','textanim','pdf','montagem'];
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function get(msg,b){
    const m=selectMedia(msg)?.message?.imageMessage;
    if(!m||!['image/jpeg','image/png','image/webp'].includes(m.mimetype)||Number(m.fileLength||0)>5*1024*1024)throw Error('format');
    const stream=await b.downloadContentFromMessage(m,'image'),parts=[];let n=0;
    for await(const chunk of stream){n+=chunk.length;if(n>5*1024*1024){stream.destroy?.();throw Error('size');}parts.push(chunk);}
    return Buffer.concat(parts);
}
export async function borderSticker(input,arg=''){
    const m=/^(?:#?([a-f0-9]{6}))?$/i.exec(arg);
    if(!m)throw Error('color');
    const color='#'+(m[1]||'ffffff');
    const image=await sharp(input,{limitInputPixels:12000000}).rotate().resize(472,472,{fit:'contain',background:color}).extend({top:20,bottom:20,left:20,right:20,background:color}).webp({quality:65}).toBuffer();
    if(image.length>450000)throw Error('size');
    return {sticker:image};
}
export async function textAnimation(arg){
    const chars=Array.from(String(arg||'').trim());
    if(!chars.length||chars.length>40)throw Error('length');
    const lines=[];for(let i=0;i<chars.length;i+=12)lines.push(chars.slice(i,i+12).join(''));
    const dir=await mkdtemp(join(tmpdir(),'iris-textanim-'));
    try{
        for(let i=0;i<8;i++){
            const bg=['#342655','#4f3373','#674082','#4b326e'][i%4],scale=1+0.055*Math.sin(i*Math.PI/4);
            const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="45" fill="'+bg+'"/><g transform="translate(256 256) scale('+scale+') translate(-256 -256)" font-family="sans-serif" font-weight="bold" text-anchor="middle" fill="#fff" font-size="36">'+lines.map((s,j)=>'<text x="256" y="'+(256+(j-(lines.length-1)/2)*48)+'">'+esc(s)+'</text>').join('')+'</g></svg>';
            await writeFile(join(dir,'f'+i+'.png'),await sharp(Buffer.from(svg)).png().toBuffer());
        }
        await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','4','-i',join(dir,'f%d.png'),'-frames:v','8','-c:v','libwebp_anim','-quality','55','-loop','0','-threads','1',join(dir,'out.webp')],{timeout:15000,maxBuffer:65536});
        const data=await readFile(join(dir,'out.webp'));if(data.length>450000)throw Error('size');return {sticker:data};
    }finally{await rm(dir,{recursive:true,force:true});}
}
// One image, no external document libraries or remote uploads.
export async function imagePdf(input){
    const {data,info}=await sharp(input,{limitInputPixels:12000000}).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:82}).toBuffer({resolveWithObject:true});
    const scale=Math.min(555/info.width,802/info.height),w=info.width*scale,h=info.height*scale;
    const command=Buffer.from('q '+w.toFixed(3)+' 0 0 '+h.toFixed(3)+' '+((595-w)/2).toFixed(3)+' '+((842-h)/2).toFixed(3)+' cm /Im0 Do Q\n');
    const stream=(dict,bytes)=>Buffer.concat([Buffer.from('<< '+dict+' /Length '+bytes.length+' >>\nstream\n'),bytes,Buffer.from('\nendstream')]);
    const objs=[Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'),stream('/Type /XObject /Subtype /Image /Width '+info.width+' /Height '+info.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',data),stream('',command)];
    const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=chunks[0].length;
    objs.forEach((o,i)=>{offsets.push(size);const part=Buffer.concat([Buffer.from((i+1)+' 0 obj\n'),o,Buffer.from('\nendobj\n')]);chunks.push(part);size+=part.length;});
    chunks.push(Buffer.from('xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+size+'\n%%EOF\n'));
    return {document:Buffer.concat(chunks),mimetype:'application/pdf',fileName:'iris-imagem.pdf',caption:'🌸 Imagem convertida em PDF.'};
}
export async function montage(input){
    const tiles=await Promise.all([0,1,2,3].map(i=>{let s=sharp(input,{limitInputPixels:12000000}).rotate().resize(280,280,{fit:'cover'});if(i===1)s=s.grayscale();if(i===2)s=s.tint('#9169b6');if(i===3)s=s.modulate({saturation:1.6});return s.png().toBuffer();}));
    return {image:await sharp({create:{width:584,height:584,channels:3,background:'#211a37'}}).composite(tiles.map((input,i)=>({input,left:8+(i%2)*288,top:8+Math.floor(i/2)*288}))).jpeg({quality:85}).toBuffer(),caption:'🌸 Montagem com quatro efeitos da mesma foto.'};
}
export async function media3(msg,b,name,arg){
    try{
        if(name==='textanim')return await textAnimation(arg);
        const data=await get(msg,b);
        return name==='borda'?await borderSticker(data,arg):name==='pdf'?await imagePdf(data):await montage(data);
    }catch{return '🌸 Use imagem autorizada de até 5 MB. :borda #ffffff, :pdf, :montagem ou :textanim frase (até 40 caracteres).';}
}
