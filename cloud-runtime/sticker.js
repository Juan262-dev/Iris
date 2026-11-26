import sharp from 'sharp';
sharp.cache(false);
sharp.concurrency(1);

export async function makeSticker(msg, baileys) {
    const doc = msg.message?.documentMessage;
    if (doc?.mimetype === 'image/gif') return makeAnimatedSticker(doc,baileys);
    const image = msg.message?.imageMessage;
    if (!image || !['image/jpeg','image/png','image/webp'].includes(image.mimetype)) return '🌸 Envie uma foto sua com a legenda !iris s. Imagens JPG, PNG ou WebP; GIF como documento com a mesma legenda.';
    const limit = 5 * 1024 * 1024;
    if (Number(image.fileLength || 0) > limit) return '🌸 Envie uma imagem de até 5 MB.';
    const stream = await baileys.downloadContentFromMessage(image,'image');
    const chunks=[]; let n=0;
    for await (const chunk of stream) {
        n += chunk.length;
        if (n > limit) { stream.destroy?.(); return '🌸 Imagem acima de 5 MB.'; }
        chunks.push(chunk);
    }
    const input = Buffer.concat(chunks);
    const jpg = input[0]===255 && input[1]===216 && input[2]===255;
    const png = input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = input.toString('ascii',0,4)==='RIFF' && input.toString('ascii',8,12)==='WEBP';
    if (!jpg && !png && !webp) return '🌸 Formato de imagem não aceito.';
    for (const quality of [75,50,30]) {
        const out = await sharp(input,{limitInputPixels:12000000,failOn:'warning'}).rotate().resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality}).toBuffer();
        if(out.length<=100000) return {sticker:out};
    }
    return '🌸 Não foi possível reduzir a imagem. Tente uma foto mais simples.';
}

export async function makeAnimatedSticker(doc, baileys) {
    const limit = 2 * 1024 * 1024;
    try {
        if(Number(doc.fileLength||0)>limit)return '🌸 GIF de até 2 MB.';
        const stream=await baileys.downloadContentFromMessage(doc,'document');
        const chunks=[];let n=0;
        for await(const chunk of stream){n+=chunk.length;if(n>limit){stream.destroy?.();return '🌸 GIF acima de 2 MB.';}chunks.push(chunk);}
        const input=Buffer.concat(chunks);
        if(!['GIF87a','GIF89a'].includes(input.toString('ascii',0,6)))return '🌸 Arquivo GIF inválido.';
        const meta=await sharp(input,{animated:true,limitInputPixels:8000000}).metadata();
        const pages=meta.pages||1;
        const duration=(meta.delay||[]).reduce((a,b)=>a+b,0);
        if(pages>30||duration>6000||meta.width*(meta.pageHeight||meta.height)*pages>8000000)return '🌸 Use GIF de até 6 segundos, 30 quadros e resolução moderada.';
        for(const quality of [55,35,20]){
            const out=await sharp(input,{animated:true,limitInputPixels:8000000,failOn:'warning'}).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality,effort:2,loop:0}).toBuffer();
            if(out.length<=450000)return {sticker:out};
        }
        return '🌸 GIF muito complexo para figurinha. Tente um menor.';
    }catch{return '🌸 Não foi possível converter este GIF.';}
}

export async function makeTextSticker(arg) {
    const text=String(arg||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
    if(!text||[...text].length>60)return '🌸 Use !iris texto seguido de até 60 caracteres.';
    const esc=v=>v.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[x]));
    const chars=[...text];
    const lines=[];for(let i=0;i<chars.length;i+=15)lines.push(chars.slice(i,i+15).join(''));
    const rows=lines.map((line,i)=>'<text x="256" y="'+(256+(i-(lines.length-1)/2)*58)+'" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="bold" font-size="43" fill="#ffffff">'+esc(line)+'</text>').join('');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect x="8" y="8" width="496" height="496" rx="76" fill="#3a205c"/><rect x="24" y="24" width="464" height="464" rx="60" fill="none" stroke="#d0a1ff" stroke-width="5"/>'+rows+'</svg>';
    const out=await sharp(Buffer.from(svg)).webp({quality:75}).toBuffer();
    if(out.length>100000)return '🌸 Texto muito complexo. Tente um menor.';
    return {sticker:out};
}
