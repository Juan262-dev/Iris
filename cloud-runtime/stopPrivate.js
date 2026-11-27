import {randomBytes} from 'node:crypto';
export function makeStopTickets({clock=Date.now,limit=180}={}){
 const tickets=new Map();
 const prune=()=>{for(const [k,v] of tickets)if(v.expires<=clock())tickets.delete(k);};
 return {
  issue(data){prune();for(const [k,v] of tickets)if(v.jid===data.jid&&v.actor===data.actor)tickets.delete(k);if(tickets.size>=limit)return null;const code=randomBytes(16).toString('hex');tickets.set(code,{...data,expires:clock()+180000});return code;},
  bind(code,messageId){prune();const t=tickets.get(code);if(!t||typeof messageId!=='string'||!messageId||messageId.length>200)return false;t.messageId=messageId;return true;},
  quoted(messageId){prune();if(typeof messageId!=='string'||!messageId||messageId.length>200)return null;const hits=[...tickets.entries()].filter(([,v])=>v.messageId===messageId);return hits.length===1?{code:hits[0][0],ticket:hits[0][1]}:null;},
  find(code){prune();return /^[a-f0-9]{32}$/.test(code)?tickets.get(code)||null:null;},
  remove(code){tickets.delete(code);},
  revokeGroup(jid){for(const [k,v] of tickets)if(v.jid===jid)tickets.delete(k);}
 };
}
export function parseStopPrivate(text){if(typeof text!=='string'||text.length>600)return null;const m=/^:stop responder ([a-f0-9]{32}) ([\s\S]{1,500})$/i.exec(text.trim());return m?{code:m[1].toLowerCase(),answer:m[2]}:null;}

export function parseStopQuote(message){
 const v=message?.extendedTextMessage,context=v?.contextInfo;
 if(typeof v?.text!=='string'||v.text.length>600||typeof context?.stanzaId!=='string'||!context.stanzaId||context.stanzaId.length>200)return null;
 return {messageId:context.stanzaId,answer:v.text.trim()};
}
export function formatStopAnswers(raw,categories){
 if(typeof raw!=='string'||!Array.isArray(categories)||raw.length>600||categories.length<1||categories.length>11)return null;
 const clean=s=>s.trim().normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const rows=raw.includes('|')?raw.split('|'):raw.split(/\r?\n/);
 const fields=rows.map((row,i)=>{
  let v=row.trim();
  const m=/^(\d{1,2})[.):\-]\s*(.*)$/.exec(v);if(m){if(Number(m[1])!==i+1)return null;v=m[2].trim();}
  const j=v.indexOf(':');if(j>=0){if(clean(v.slice(0,j))!==clean(categories[i]))return null;v=v.slice(j+1).trim();}
  return v||'-';
 });
 if(fields.length!==categories.length||fields.some(v=>v===null||v.length>40))return null;
 return fields.join(' | ');
}
export function stopPrompt(info){
 return '📝 *STOP • Rodada '+info.round+'*\nLetra: *'+info.letter.toUpperCase()+'*\n\n'+info.categories.map((c,i)=>(i+1)+'. '+c+':').join('\n')+'\n\nResponda a ESTA mensagem (arraste para o lado). Escreva uma resposta por linha, na ordem acima. Use - se não souber. Não precisa digitar comando nem código.';
}
