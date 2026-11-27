import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { settings,request,seal,unseal } from '../lib/Initialize/cloudStorage.js';
const workerPath=fileURLToPath(new URL('./managerWorker.js',import.meta.url));
const config=()=>settings('iris-manager-control-v1');
export async function readDesired(){const s=config(),rows=await request(s,'GET');if(!Array.isArray(rows)||rows.length>1)throw Error('control state');if(!rows.length)return process.env.IRIS_BOT_ENABLED==='true';const v=unseal(rows[0].encrypted_payload,s);if(typeof v.enabled!=='boolean')throw Error('control state');return v.enabled;}
export async function writeDesired(enabled){const s=config();await request(s,'POST',{session_id:s.sessionId,item_type:'auth',item_id:'snapshot',encrypted_payload:seal({enabled},s),updated_at:new Date().toISOString()});}
export function makeSupervisor({spawn=()=>fork(workerPath,[],{stdio:['ignore','inherit','inherit','ipc']}),persist=writeDesired,initial=readDesired,onStatus=()=>{}}={}){
 let child=null,desired=false,status='iniciando',storage='verificando',busy=Promise.resolve(),ready=false,workerMemory=null;const incidents=[];const worldPending=new Map();let worldId=0;
 const snapshot=()=>({ready,desired,status,storage,workerMemory,incidents:incidents.slice(-20)});
 const publish=(s)=>{if(s!==status&&['desconectado','erro de inicialização'].includes(s)){incidents.push({at:new Date().toISOString(),status:s});if(incidents.length>20)incidents.shift();}status=s;onStatus(snapshot());};
 const start=()=>{if(child)return;publish('conectando');const c=spawn();child=c;
 c.on('message',m=>{if(child!==c)return;if(m?.type==='world-result'){const p=worldPending.get(m.id);if(p&&p.child===c){clearTimeout(p.timer);worldPending.delete(m.id);p.resolve(m.result||{status:503});}return;}if(m?.type!=='status')return;if(Number.isFinite(m.memory)&&m.memory>=0&&m.memory<8192)workerMemory=Math.round(m.memory);if(['iniciando','conectando','conectado','reconectando','desconectado','desativado','erro de inicialização'].includes(m.status)&&status!=='desligando')publish(m.status);if(['ok','verificando','indisponível'].includes(m.storage)&&m.storage!=='verificando')storage=m.storage;});
 c.once('error',()=>{if(child===c)publish('erro de inicialização');});
 c.once('exit',()=>{for(const [id,p] of worldPending){if(p.child===c){clearTimeout(p.timer);worldPending.delete(id);p.resolve({status:503});}}if(child===c){child=null;workerMemory=null;publish(desired?'desconectado':'desativado');}});
 };
 const stop=async()=>{const c=child;if(!c){publish('desativado');return;}publish('desligando');await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{c.removeListener('exit',ended);publish('desligando');reject(Error('worker draining'));},25000);timer.unref?.();function ended(){clearTimeout(timer);resolve();}c.once('exit',ended);try{c.send({type:'stop'});}catch{clearTimeout(timer);c.removeListener('exit',ended);reject(Error('worker unavailable'));}});};
 const serial=fn=>{const next=busy.then(fn);busy=next.catch(()=>{});return next;};
 const world=input=>new Promise(resolve=>{
 const c=child;if(!ready||!c||!c.connected||status!=='conectado'||worldPending.size>=24){resolve({status:503});return;}
 const id=++worldId;
 const fail=()=>{const p=worldPending.get(id);if(!p)return;clearTimeout(p.timer);worldPending.delete(id);resolve({status:503});};
 const timer=setTimeout(fail,20000);timer.unref?.();worldPending.set(id,{resolve,timer,child:c});
 try{c.send({type:'world',id,input},error=>{if(error)fail();});}catch{fail();}
 });
 return {snapshot,world,boot:()=>serial(async()=>{desired=await initial();ready=true;storage='ok';if(desired)start();else publish('desativado');}),action:action=>serial(async()=>{if(!ready)throw Error('not ready');if(!['start','stop','restart'].includes(action))throw Error('invalid action');if(action==='stop'){await persist(false);desired=false;await stop();}else{await persist(true);desired=true;if(action==='restart'||status==='desligando')await stop();if(!child)start();}return snapshot();}),shutdown:()=>serial(stop)};
}
