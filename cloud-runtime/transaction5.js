import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac } from 'node:crypto';
export function serialGroups({limit=1000,perGroup=128,totalLimit=256}={}){
 const active=new Map(),counts=new Map();let total=0;return async (key,fn)=>{
  const count=counts.get(key)||0;if((!active.has(key)&&active.size>=limit)||count>=perGroup||total>=totalLimit)throw Error('busy');counts.set(key,count+1);total++;
  const prior=active.get(key)||Promise.resolve();let release;
  const gate=new Promise(resolve=>release=resolve),tail=prior.catch(()=>{}).then(()=>gate);
  active.set(key,tail);
  await prior.catch(()=>{});
  try{return await fn();}finally{release();total--;const left=counts.get(key)-1;if(left)counts.set(key,left);else counts.delete(key);if(active.get(key)===tail)active.delete(key);}
 };
}
export const context5=new AsyncLocalStorage();
export function commandToken(key,jid,actor,messageId){return typeof messageId==='string'&&messageId.length<=200?createHmac('sha256',key).update(JSON.stringify([jid,actor,messageId])).digest('hex'):null;}
export function alreadyApplied(state,token,now=Date.now()){return !!token&&Array.isArray(state.applied5)&&state.applied5.some(v=>v.token===token&&now-v.at<600000);}
export function markApplied(state,token,now=Date.now()){
 if(!token)return;state.applied5=(Array.isArray(state.applied5)?state.applied5:[]).filter(v=>now-v.at<600000&&v.token!==token).slice(-299);state.applied5.push({token,at:now});
}
export function prune5(state,now=Date.now()){
 for(const p of Object.values(state.players||{}))if(p.collage5?.expires<=now)delete p.collage5;
 for(const key of ['sudoku','termo'])for(const [id,g] of Object.entries(state.games5?.[key]||{}))if(g.expires<=now)delete state.games5[key][id];
 for(const [key,g] of Object.entries(state.legacyGames5||{}))if(g.expires<=now)delete state.legacyGames5[key];
}
