import { randomBytes } from 'node:crypto';
import {position,allRegions,allRoads} from './worldMap.js';
import {adventureView,validAdventureArg} from './worldAdventure.js';
const token=()=>randomBytes(24).toString('hex');
export const isWorldToken=v=>typeof v==='string'&&/^[a-f0-9]{48}$/.test(v);
export const worldPlaces=['Praça','Biblioteca','Jardim','Observatório','Oficina','Museu','Estação','Lago','Mercado'];
const items=['livro','semente','estrela','mapa','engrenagem','fóssil','bilhete','concha','tecido'];
export const worldActions={viajarworld:/^(?:[1-9]|1[0-8])$/,explorar:/^[1-9]$/,construir:/^[1-9]$/,npc:/^[1-9]$/,oficina:/^(produzir|profissao (artesao|botanico|pesquisador|bibliotecario))$/,empresaeco:/^produzir$/,projetoinfinity:/^ajudar$/,missaoinfinity:/^(|concluir)$/};
export function validWorldAction(name,arg){return name==='aventuraworld'?validAdventureArg(arg):typeof name==='string'&&Object.hasOwn(worldActions,name)&&typeof arg==='string'&&worldActions[name].test(arg);}
const num=v=>Number.isSafeInteger(v)&&v>=0?v:0;
export function worldView(state,id,now=Date.now()){
 const p=state.players?.[id];if(!p)return null;
 const x=p.infinity||{},d=state.infinity||{},today=new Date(now).toISOString().slice(0,10);
 const adventure=adventureView(state,id,now);
 return {adventure,position:position(p),roads:allRoads,regions:allRegions,xp:num(p.xp),coins:num(p.coins),level:1+Math.floor(num(p.xp)/10),visits:num(x.visits),job:['artesao','botanico','pesquisador','bibliotecario'].includes(x.job)?x.job:null,places:worldPlaces.map((name,i)=>({id:i+1,name,item:items[i],level:Math.min(5,num(d.buildings?.[i])),owned:num(x.collection?.[items[i]]),visited:x.exploreDay===today&&Array.isArray(x.visited)&&x.visited.includes(i+1)})).concat(allRegions.slice(9).map(r=>({id:r.id,name:r.name,item:'materiais',level:num(adventure.outposts[r.id]),owned:0,visited:adventure.areaVisited.some(v=>v.startsWith(r.id+'-'))}))),contributions:num(x.contributions),project:num(d.project?.count),companyLevel:num(x.company?.level)};
}
export function makeWorldSessions({verify,operate,clock=Date.now,limit=160}){
 const codes=new Map(),sessions=new Map(),claims=new Map();
 const prune=()=>{const n=clock();for(const map of [codes,sessions,claims])for(const [k,v] of map)if(v.expires<=n)map.delete(k);};
 const revoke=({jid,actor})=>{for(const map of [codes,sessions,claims])for(const [k,v] of map)if(v.jid===jid&&v.actor===actor)map.delete(k);};
 const revokeGroup=jid=>{for(const map of [codes,sessions,claims])for(const [k,v] of map)if(v.jid===jid)map.delete(k);};
 const issue=identity=>{prune();revoke(identity);if(codes.size+sessions.size+claims.size>=limit)return null;const code=token();codes.set(code,{...identity,expires:clock()+300000});return code;};
 async function rpc(input){
  prune();if(!input||typeof input!=='object')return {status:400};
  if(input.op==='login'){
   if(!isWorldToken(input.code))return {status:401};
   const entry=codes.get(input.code);if(!entry)return {status:401};
   codes.delete(input.code);claims.set(input.code,entry);
   try{
    if(!await verify(entry)||claims.get(input.code)!==entry||entry.expires<=clock())return {status:403};
    const data=await operate(entry);if(!data||claims.get(input.code)!==entry||entry.expires<=clock())return {status:403};
    const session=token();sessions.set(session,{...entry,expires:clock()+3600000,last:clock(),busy:false});
    return {status:200,session,data};
   }finally{claims.delete(input.code);}
  }
  if(!isWorldToken(input.session))return {status:401};
  const entry=sessions.get(input.session);if(!entry)return {status:401};
  if(input.op==='logout'){sessions.delete(input.session);return {status:200,data:{ok:true}};}
  if(input.op!=='state'&&input.op!=='action')return {status:400};
  if(input.op==='action'&&!validWorldAction(input.name,input.arg))return {status:400};
  if(entry.busy||clock()-entry.last<1000)return {status:429};
  entry.busy=true;entry.last=clock();
  try{if(!await verify(entry)||sessions.get(input.session)!==entry){sessions.delete(input.session);return {status:403};}
   const data=await operate(entry,input.op==='action'?{name:input.name,arg:input.arg}:null);
   if(!data){sessions.delete(input.session);return {status:403};}
   return {status:200,data};
  }finally{entry.busy=false;}
 }
 return {issue,revoke,revokeGroup,rpc};
}
