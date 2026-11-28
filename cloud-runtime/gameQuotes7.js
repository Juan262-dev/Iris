// Only message IDs actually sent by this bot are eligible. No quoted message contents are trusted.
const patterns={
 conecta4:/^[1-7]$/,reversi:/^[a-h][1-8]$/,pontinhos:/^[hv][1-4][1-4]$/,
 mastermind:/^[1-6]{4}$/,nonograma:/^(?:x )?[a-e][1-5]$|^conferir$/,rummikub:/^[1-9] [1-9] [1-9]$/,
 deslizante:/^[1-8]$/,diferencas:/^[a-e][1-5]$/,quizmusical:/^[123]$/,investigacao:/^[123]$/,
 domino:/^(?:[1-9]|1[0-9]|2[0-8])(?: ?[ed])?$|^[cp]$/,naval:/^[a-f][1-6]$/,
 velha:/^[1-9]$/,velhadupla:/^[1-9]$/,ludo:/^[12d]$/,memoria:/^(?:[1-9]|1[012]) (?:[1-9]|1[012])$/,
 sudoku:/^[1-9] [1-9] [1-9]$/,termo:/^[a-z]{5}$/,'2048':/^[cbed]$/,forca:/^[a-z]{1,20}$/,numero:/^\d{1,3}$/,
 quiz:/^[123]$/,quizmulti:/^[123]$/,batalhaconhecimento:/^[123]$/,bingoeducativo:/^[123]$/,
 cruzadas:/^[123] [a-z]+$/,tesouro:/^[a-z]{2,30}$/,detetive:/^[a-z]{2,30}$/,
 imobiliario:/^[123]$/,trilha:/^[123]$/,expedicao:/^[123]$/,reliquia:/^[123]$/,
 damas:/^[a-h][1-8] [a-h][1-8]$/,xadrez:/^[a-h][1-8][a-h][1-8][qrbn]?$/
};
const shared=new Set(['conecta4','reversi','pontinhos','investigacao','domino','naval','velhadupla','ludo','memoria','quiz','quizmulti','batalhaconhecimento','bingoeducativo','detetive','imobiliario','trilha','expedicao','reliquia','damas','xadrez']);
export function makeGameQuotes({clock=Date.now,limit=360,ttl=300000}={}){
 const map=new Map(),latest=new Map();
 function prune(){for(const [key,r] of map)if(r.expires<=clock()){map.delete(key);if(latest.get(r.scope)===key)latest.delete(r.scope);}while(map.size>=limit){const key=map.keys().next().value,r=map.get(key);map.delete(key);if(latest.get(r.scope)===key)latest.delete(r.scope);}}
 return {
 bind(jid,id,name,actor){if(!jid?.endsWith('@g.us')||typeof id!=='string'||!id||id.length>200||!Object.hasOwn(patterns,name)||!actor)return false;prune();const scope=jid+'|'+name+'|'+(shared.has(name)?'group':actor),key=jid+'|'+id,old=latest.get(scope);if(old)map.delete(old);map.set(key,{jid,name,actor,scope,expires:clock()+ttl});latest.set(scope,key);return true;},
 resolve(jid,message,actor){if(!jid?.endsWith('@g.us')||!actor)return null;prune();const v=message?.extendedTextMessage,id=v?.contextInfo?.stanzaId;if(typeof id!=='string'||typeof v?.text!=='string'||v.text.length>80)return null;const record=map.get(jid+'|'+id);if(!record||(!shared.has(record.name)&&record.actor!==actor))return null;const arg=v.text.trim().normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ');if(!patterns[record.name].test(arg))return null;return {name:record.name==='quiz'?'resposta':record.name,arg};},
 revoke(jid){for(const [key,r] of map)if(r.jid===jid){map.delete(key);latest.delete(r.scope);}}
 };
}
