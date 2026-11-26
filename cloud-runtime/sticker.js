import sharp from 'sharp';
sharp.cache(false);
sharp.concurrency(1);

export async function makeSticker(msg, baileys) {
    const image = msg.message?.imageMessage;
    if (!image || !['image/jpeg','image/png','image/webp'].includes(image.mimetype)) return '🌸 Envie uma foto sua com a legenda !iris s. Imagens JPG, PNG ou WebP.';
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
