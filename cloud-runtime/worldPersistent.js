import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {settings,request,seal,unseal} from '../lib/Initialize/cloudStorage.js';
import {serialGroups} from './transaction5.js';
import {validWorldAction,isWorldToken} from './world.js';
const random=()=>randomBytes(24).toString('hex');
const validSession=s=>typeof s==='string'&&/^[a-f0-9]{112}$/.test(s);
export function makeWorldStorage({config=settings,query=request}={}){
 const digest=(...parts)=>createHmac('sha256',config('iris-world-key-v2').key).update(JSON.stringify(parts)).digest('hex');
 const playerKey=({jid,actor})=>digest('player',jid,actor);
 const groupKey=jid=>'iris-world-epoch-v2-'+digest('group',jid);
 const rowKey=locator=>'iris-world-player-v2-'+locator;
 async function read(key){const s=config(key),rows=await query(s,'GET');if(!Array.isArray(rows)||rows.length>1)throw Error('world storage');return rows.length?unseal(rows[0].encrypted_payload,s):null;}
 async function write(key,value){const s=config(key);await query(s,'POST',{session_id:s.sessionId,item_type:'auth',item_id:'snapshot',encrypted_payload:seal(value,s),updated_at:new Date().toISOString()});}
 const epoch=async jid=>(await read(groupKey(jid)))?.epoch||'initial';
 return {
  async create(identity){const locator=playerKey(identity),secret=random();await write(rowKey(locator),{jid:identity.jid,actor:identity.actor,route:identity.route,epoch:await epoch(identity.jid),digest:digest('secret',locator,secret)});return locator+secret;},
  async find(session){if(!validSession(session))return null;const locator=session.slice(0,64),secret=session.slice(64),record=await read(rowKey(locator));if(!record||typeof record.jid!=='string'||typeof record.actor!=='string'||typeof record.route!=='string'||!/^[a-f0-9]{64}$/.test(record.digest||'')||playerKey(record)!==locator)return null;
   if(!timingSafeEqual(Buffer.from(record.digest,'hex'),Buffer.from(digest('secret',locator,secret),'hex'))||record.epoch!==await epoch(record.jid))return null;
   return {jid:record.jid,actor:record.actor,route:record.route};},
  async revoke(identity){await query(config(rowKey(playerKey(identity))),'DELETE');},
  async revokeGroup(jid){await write(groupKey(jid),{epoch:random()});}
 };
}
export function makePersistentWorld({verify,operate,store=makeWorldStorage(),clock=Date.now,limit=160}){
 const codes=new Map(),recent=new Map(),serial=serialGroups({totalLimit:64,perGroup:24});
 const prune=()=>{for(const [k,v] of codes)if(v.expires<=clock())codes.delete(k);for(const [k,v] of recent)if(v<=clock()-60000)recent.delete(k);};
 const clear=(jid,actor)=>{for(const [k,v] of codes)if(v.jid===jid&&(actor===undefined||v.actor===actor))codes.delete(k);};
 const issue=identity=>serial(identity.jid,async()=>{prune();clear(identity.jid,identity.actor);if(codes.size>=limit)return null;const code=random();codes.set(code,{...identity,expires:clock()+300000});return code;});
 const cancel=identity=>serial(identity.jid,async()=>clear(identity.jid,identity.actor));
 const revoke=identity=>serial(identity.jid,async()=>{clear(identity.jid,identity.actor);await store.revoke(identity);});
 const revokeGroup=jid=>serial(jid,async()=>{clear(jid);await store.revokeGroup(jid);});
 async function rpc(input){
  prune();if(!input||typeof input!=='object')return {status:400};
  if(input.op==='login'){
   if(!isWorldToken(input.code))return {status:401};const entry=codes.get(input.code);if(!entry)return {status:401};
   return serial(entry.jid,async()=>{if(codes.get(input.code)!==entry||entry.expires<=clock())return {status:401};codes.delete(input.code);
    if(!await verify(entry))return {status:403};const data=await operate(entry);if(!data)return {status:403};const session=await store.create(entry);return {status:200,session,data};});
  }
  if(!validSession(input.session))return {status:401};
  if(!['state','action','logout'].includes(input.op)||input.op==='action'&&!validWorldAction(input.name,input.arg))return {status:400};
  const entry=await store.find(input.session);if(!entry)return {status:401};
  return serial(entry.jid,async()=>{const current=await store.find(input.session);if(!current)return {status:401};
   if(input.op==='logout'){await store.revoke(current);return {status:200,data:{ok:true}};}
   const key=input.session.slice(0,64);if(recent.has(key)&&clock()-recent.get(key)<1000)return {status:429};if(recent.size>=1000)recent.delete(recent.keys().next().value);recent.set(key,clock());
   if(!await verify(current)){await store.revoke(current);return {status:403};}
   const data=await operate(current,input.op==='action'?{name:input.name,arg:input.arg}:null);if(!data){await store.revoke(current);return {status:403};}
   return {status:200,data,session:input.session};
  });
 }
 return {issue,cancel,revoke,revokeGroup,rpc};
}
export function privateWorldRecipient(participants,route,normalize){
 if(!route||!Array.isArray(participants))return null;
 const matched=participants.filter(p=>[p.id,p.lid,p.phoneNumber].map(normalize).includes(route));
 if(matched.length!==1)return null;
 const p=matched[0];return [p.phoneNumber,p.id,p.lid,route].map(normalize).find(v=>v?.endsWith('@s.whatsapp.net'))||route;
}
