// Living Universe: deterministic, bounded progress; no recurring worker or browser timer needed.
import {prepareLivingAdventure} from './worldAdventure.js';
const hour=3600000, maxHours=8;
const n=(x,max=1000000)=>Math.max(0,Math.min(max,Number.isFinite(x)?Math.floor(x):0));
export const routines=Object.freeze({treinar:'Treinamento',minerar:'Mineração',cultivar:'Agricultura',explorar:'Exploração',trabalhar:'Trabalho',descansar:'Descanso',construir:'Construção',estudar:'Estudos',alquimia:'Alquimia'});
const pets=['raposa','coruja','golem'];
const defaults=()=>({task:null,started:0,claimed:0,home:0,farm:0,business:0,pet:null,knowledge:0,reputation:0,practice:{},last:''});
const get=p=>p.livingWorld??=defaults();
const suggested=p=>({artesao:'construir',botanico:'cultivar',pesquisador:'estudar',bibliotecario:'estudar'}[p.infinity?.job]||{guerreiro:'treinar',arqueiro:'explorar',mago:'estudar',alquimista:'alquimia',explorador:'explorar'}[p.adventureWorld?.class]||'explorar');
const due=(l,now)=>l.task&&Object.hasOwn(routines,l.task)?Math.max(0,Math.min(maxHours,Math.floor((now-l.started)/hour))-n(l.claimed,maxHours)):0;
const add=(a,k,q)=>{a.bag[k]=n((a.bag[k]||0)+q,999);};
const out=(text,changed=false)=>({text,changed});
export function livingView(p,now=Date.now()){
 const l=p.livingWorld||defaults(),pending=due(l,now),elapsed=l.task?Math.max(0,Math.min(maxHours,Math.floor((now-l.started)/hour))):0;
 return {task:l.task,elapsed,pending,claimed:n(l.claimed,maxHours),limit:maxHours,suggested:suggested(p),routines,home:n(l.home,5),farm:n(l.farm,5),business:n(l.business,5),pet:pets.includes(l.pet)?l.pet:null,knowledge:n(l.knowledge),reputation:n(l.reputation),specializations:Object.entries(l.practice||{}).filter(([k,v])=>Object.hasOwn(routines,k)&&v>=12).map(([k])=>routines[k]),last:l.last||''};
}
export function settleLiving(p,now=Date.now()){
 const l=p.livingWorld;if(!l?.task)return out('',false);
 const ticks=due(l,now);if(!ticks)return out('',false);
 const {a,stats:s}=prepareLivingAdventure(p,now),task=l.task,oldXp=n(p.xp),oldCoins=n(p.coins);
 const bagBefore={...a.bag},oldHome=n(l.home,5),oldHp=a.hp,oldEnergy=a.energy,oldKnowledge=n(l.knowledge);
 let xp=0,coins=0;
 for(let i=0;i<ticks;i++){
  if(task==='treinar')xp+=2;
  if(task==='minerar'){add(a,'minerio',1);if((l.claimed+i+1)%2===0)add(a,'cristal',1);xp++;}
  if(task==='cultivar'){add(a,'erva',1+Math.floor(n(l.farm,5)/3));add(a,'alimento',1);xp++;}
  if(task==='explorar'){add(a,['madeira','fibra','concha','essencia'][(l.claimed+i)%4],1);xp++;l.reputation=n(l.reputation+1);}
  if(task==='trabalhar'){coins+=3+Math.floor(n(l.business,5)/2);xp++;}
  if(task==='descansar'){a.hp=Math.min(s.hp,a.hp+15+3*n(l.home,5));a.energy=Math.min(s.energy,a.energy+10);}
  if(task==='construir'){add(a,'madeira',1);if((l.claimed+i+1)%4===0)l.home=n(l.home+1,5);xp++;}
  if(task==='estudar'){l.knowledge=n(l.knowledge+2);xp++;}
  if(task==='alquimia'){add(a,'erva',1);if((l.claimed+i+1)%2===0)add(a,'pocao',1);xp++;}
 }
 p.xp=n(oldXp+xp);p.coins=n(oldCoins+coins);
 l.practice[task]=n((l.practice[task]||0)+ticks);l.claimed=n(l.claimed+ticks,maxHours);
 const gains=Object.entries(a.bag).filter(([k,v])=>v>(bagBefore[k]||0)).map(([k,v])=>k+' +'+(v-(bagBefore[k]||0)));
 if(p.xp>oldXp)gains.push('XP +'+(p.xp-oldXp));if(p.coins>oldCoins)gains.push('moedas +'+(p.coins-oldCoins));if(l.home>oldHome)gains.push('casa nível '+l.home);if(a.hp>oldHp)gains.push('vida +'+(a.hp-oldHp));if(a.energy>oldEnergy)gains.push('energia +'+(a.energy-oldEnergy));if(l.knowledge>oldKnowledge)gains.push('conhecimento +'+(l.knowledge-oldKnowledge));
 l.last=routines[task]+' • '+ticks+'h: '+(gains.join(', ')||'limites atingidos')+'.';
 if(l.claimed>=maxHours)l.task=null;
 a.log.unshift(l.last);a.log=a.log.slice(0,6);return out(l.last,true);
}
export function validLivingArg(arg){return typeof arg==='string'&&/^(?:|status|resgatar|parar|rotina|treinar|minerar|cultivar|explorar|trabalhar|descansar|construir|estudar|alquimia|melhorar (?:casa|fazenda|empresa)|companheiro (?:raposa|coruja|golem|nenhum)|comer)$/.test(arg);}
export function livingFeature({state,id,arg='',now=Date.now()}){
 if(!validLivingArg(arg))return out('Use :offline status | rotina | treinar | minerar | cultivar | explorar | trabalhar | descansar | construir | estudar | alquimia | resgatar | parar.');
 const p=state.players[id];if(!p)return out('Use :perfil primeiro.');
 const l=get(p),settled=settleLiving(p,now),prefix=settled.changed?settled.text+'\n':'';
 const response=(t,changed=false)=>out(prefix+t,settled.changed||changed);
 if(!arg||arg==='status'||arg==='resgatar')return response(l.task?'Rotina: '+routines[l.task]+' • '+l.claimed+'/'+maxHours+'h realizadas. Sugestão: '+routines[suggested(p)]+'.':'Nenhuma rotina ativa. Sugestão: '+routines[suggested(p)]+'. '+(l.last||''));
 if(arg==='parar'){const active=!!l.task;l.task=null;return response('Rotina encerrada.',active);}
 const task=arg==='rotina'?suggested(p):arg;
 if(Object.hasOwn(routines,task)){
  const {a}=prepareLivingAdventure(p,now);
  if(a.encounter)return response('Finalize o desafio antes de iniciar uma rotina.');
  if(l.task)return response('Já há uma rotina ativa. Use :offline parar antes de trocar.');
  l.task=task;l.started=now;l.claimed=0;return response(routines[task]+' iniciada. Até 8 horas de progresso, mesmo com o site fechado. Recompensas serão aplicadas ao retornar.',true);
 }
 const {a,stats:s}=prepareLivingAdventure(p,now);
 if(arg.startsWith('companheiro ')){const pet=arg.split(' ')[1];if(pet!=='nenhum'&&n(l.reputation)<4)return response('Explore por 4 horas para desbloquear companheiros.');l.pet=pet==='nenhum'?null:pet;return response('Companheiro: '+(l.pet||'nenhum')+'.',true);}
 if(arg==='comer'){if(!a.bag.alimento||a.hp>=s.hp)return response('Sem alimento ou vida completa.');a.bag.alimento--;if(!a.bag.alimento)delete a.bag.alimento;a.hp=Math.min(s.hp,a.hp+12);return response('Alimento utilizado.',true);}
 if(arg.startsWith('melhorar ')){const k={casa:'home',fazenda:'farm',empresa:'business'}[arg.split(' ')[1]],cost=15+10*n(l[k],5);if(n(l[k],5)>=5)return response('Nível máximo.');if(n(p.coins)<cost)return response('Precisa de '+cost+' moedas virtuais.');p.coins-=cost;l[k]=n(l[k]+1,5);return response('Propriedade aprimorada para nível '+l[k]+'.',true);}
 return response('Comando indisponível.');
}
