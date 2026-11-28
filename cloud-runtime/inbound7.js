// Accept normal notifications. Allow only fresh owner diagnostics on append,
// which may also contain history. Never replay moderation or gameplay mutations.
export function inboundMessage(msg){
 const key=msg?.key||{};let m=msg?.message;
 for(let i=0;i<3&&m;i++){
  if(m.ephemeralMessage?.message){m=m.ephemeralMessage.message;continue;}
  if(key.fromMe===true&&m.deviceSentMessage?.destinationJid===key.remoteJid&&m.deviceSentMessage?.message){m=m.deviceSentMessage.message;continue;}
  break;
 }
 return m===msg?.message?msg:{...msg,message:m};
}
export function acceptUpsert(type,msg,{enabled=false,openedAt=0,now=Date.now()}={}){
 if(type==='notify')return true;
 if(type!=='append'||!enabled||!openedAt||msg?.key?.fromMe!==true||!msg.key.remoteJid?.endsWith('@g.us')||!msg.key.id)return false;
 const ts=Number(msg.messageTimestamp||0)*1000;
 if(!Number.isFinite(ts)||ts<Math.floor(openedAt/1000)*1000||Math.abs(now-ts)>30000)return false;
 const text=msg.message?.conversation||msg.message?.extendedTextMessage?.text||'';
 return /^:(ping|menu|status|diagnostico)$/i.test(String(text).trim());
}
