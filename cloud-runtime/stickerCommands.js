import { createHash } from 'node:crypto';
import { makeSticker } from './sticker.js';
import { makeVideoSticker } from './advancedMedia.js';

// Only ordinary media explicitly sent or quoted in the same opted-in group.
export function selectMedia(msg){
    const m=msg.message||{};
    const eligible=v=>{
        if(!v||v.viewOnce||v.contextInfo?.expiration)return false;
        if(v.url){
            try{const u=new URL(v.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='whatsapp.net'||u.hostname.endsWith('.whatsapp.net')))return false;}
            catch{return false;}
        }
        return true;
    };
    const select=body=>{
        if(!body||body.viewOnceMessage||body.viewOnceMessageV2||body.viewOnceMessageV2Extension||body.ephemeralMessage)return null;
        for(const type of ['videoMessage','imageMessage','documentMessage','stickerMessage','audioMessage']){
            const media=body[type];
            if(eligible(media))return {key:msg.key,message:{[type]:media}};
        }
        return null;
    };
    const direct=select(m);
    if(direct)return direct;
    const ctx=m.extendedTextMessage?.contextInfo;
    if(!ctx?.quotedMessage||!ctx.stanzaId||ctx.expiration||!msg.key?.remoteJid?.endsWith('@g.us')||(ctx.remoteJid&&ctx.remoteJid!==msg.key.remoteJid))return null;
    return select(ctx.quotedMessage);
}
export async function stickerCommand(msg,baileys,name,arg=''){
    const selected=selectMedia(msg);
    if(!selected)return '🌸 Envie ou responda a uma imagem, GIF ou vídeo autorizado. Mídia temporária e de visualização única não é aceita.';
    if(name==='som'||name==='slonga'){
        if(!selected.message.videoMessage)return '🌸 Responda a um vídeo MP4 ou envie-o com esse comando na legenda.';
        if(name==='som'&&arg&&!['20','10'].includes(arg))return 'Use :som ou :som 20.';
        return makeVideoSticker(selected,baileys,{long:name==='slonga'||arg==='20',sound:name==='som'});
    }
    return selected.message.videoMessage?makeVideoSticker(selected,baileys):makeSticker(selected,baileys);
}

// Protocol field 26 carries a complete uploaded AudioMessage. The stock rc14
// schema does not yet expose it. Scope the encoder override to this one hash
// and restore it even if the send fails. No changes to authentication.
export async function withStickerAudio(proto,hash,audio,fn){
    const codec=proto.Message.StickerMessage;
    const original=codec.encode;
    const bytes=proto.Message.AudioMessage.encode(audio).finish();
    let applied=false;
    codec.encode=function(message,writer){
        const encoded=original.call(this,message,writer);
        if(message?.fileSha256&&Buffer.from(message.fileSha256).equals(hash)){
            encoded.uint32(210).bytes(bytes);
            applied=true;
        }
        return encoded;
    };
    try{const result=await fn();if(!applied)throw Error('audio field was not encoded');return result;}
    finally{codec.encode=original;}
}
export async function sendSoundSticker(sock,baileys,jid,payload,quoted){
    if(!jid.endsWith('@g.us')||typeof baileys.prepareWAMessageMedia!=='function'||typeof sock.waUploadToServer!=='function')throw Error('unsupported sound sticker runtime');
    const {sticker,audio,seconds}=payload;
    const uploaded=await baileys.prepareWAMessageMedia({audio,mimetype:'audio/ogg; codecs=opus',ptt:false,seconds},{upload:sock.waUploadToServer});
    if(!uploaded.audioMessage?.mediaKey||!uploaded.audioMessage?.directPath)throw Error('audio upload unavailable');
    const hash=createHash('sha256').update(sticker).digest();
    return withStickerAudio(baileys.proto,hash,uploaded.audioMessage,()=>sock.sendMessage(jid,{sticker,isAnimated:true},{quoted}));
}
