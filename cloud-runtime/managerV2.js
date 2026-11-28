import { settings } from '../lib/Initialize/cloudStorage.js';
export const modules=['geral','estudos','jogos','midia','economia','diversao'];
export const commands={geral:['menu','ping','ajuda','status','infinity'],estudos:['quiz','resposta','estudar','simulado','flashcard','desafioestudo','torneioestudo'],jogos:['jogos','stop','damas','naval','memoria','quizmulti','uno','unobot','domino','xadrez','sudoku','termo','ludo','2048','imobiliario','trilha','expedicao','reliquia','conecta4','reversi','mastermind','nonograma','rummikub','pontinhos','deslizante','diferencas','quizmusical','investigacao','tema7','estatisticas7','medalhas7','torneio7','animacao7'],midia:['s','figtexto','qrcode','colagem','formatoimagem','cartaoarte','fotoarte','figurarte','videoarte'],economia:['perfil','saldo','diario','loja','cidade','guilda','empresaeco','amizadeinfinity','projetoinfinity','temporadainfinity','missaoinfinity','passaporte'],diversao:['fun','verdade','adivinha','gincana','memealeatorio','festivalinfinity']};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keys=new Set(Object.values(commands).flat());
const fields='id,display_name,prefix,greeting,modules,commands,groups,desired_enabled,created_at';
const name=s=>typeof s==='string'&&/^[\p{L}\p{M}\p{N} _.-]{1,40}$/u.test(s.trim())?s.trim():null;
export function normalizeConfig(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||!name(v.name)||![':', '!', '/', '.'].includes(v.prefix)||typeof v.greeting!=='string'||Array.from(v.greeting).length>180||/[\p{Cc}\p{Cf}]/u.test(v.greeting))return null;
 if(!v.modules||typeof v.modules!=='object'||Array.isArray(v.modules)||Object.keys(v.modules).some(k=>!modules.includes(k)||typeof v.modules[k]!=='boolean'))return null;
 if(!v.commands||typeof v.commands!=='object'||Array.isArray(v.commands)||Object.keys(v.commands).some(k=>!keys.has(k)||typeof v.commands[k]!=='boolean'))return null;
 if(!Array.isArray(v.groups)||v.groups.length>20||v.groups.some(g=>typeof g!=='string'||!/^[\p{L}\p{M}\p{N} _.-]{1,40}$/u.test(g)))return null;
 return {display_name:name(v.name),prefix:v.prefix,greeting:v.greeting,modules:Object.fromEntries(modules.map(k=>[k,v.modules[k]!==false])),commands:Object.fromEntries(Object.entries(v.commands).filter(([,enabled])=>enabled===false)),groups:[...new Set(v.groups)]};
}
async function db(table,{method='GET',query={},data}={}){
 const s=settings('iris-manager-v2'),url=new URL('/rest/v1/'+table,s.endpoint);
 for(const [k,v] of Object.entries(query))url.searchParams.set(k,v);
 const headers={...s.headers,Accept:'application/json',Prefer:method==='POST'?'resolution=merge-duplicates,return=representation':'return=representation'};
 const r=await fetch(url,{method,headers,body:data===undefined?undefined:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('manager database');
 return r.status===204?[]:r.json();
}
const limitFor=async id=>(await db('iris_manager_limits',{query:{select:'bot_limit,suspended',user_id:'eq.'+id,limit:'1'}}))[0]||{bot_limit:3,suspended:false};
const result=(code,value)=>({code,value});
export async function managerV2({endpoint,post,user,admin,body,supervisor,dbCall=db,getLimit=limitFor}){
 if(endpoint==='instances'&&!post){
  const [bots,limits]=await Promise.all([dbCall('iris_manager_instances',{query:{select:fields,user_id:'eq.'+user.id,order:'created_at.asc',limit:'5'}}),getLimit(user.id)]);
  return result(200,{bots,limits,catalog:commands,official:{available:false,reason:'Integração Meta ainda não aprovada/configurada. Nenhuma instância independente envia mensagens.'}});
 }
 if(endpoint==='instance'&&post){
  const v=await body(),id=v.id,action=v.action;
  if(!['create','save','delete','enable','disable'].includes(action))return result(400,{error:'Ação inválida.'});
  const limits=await getLimit(user.id);
  if(limits.suspended&&action!=='delete'&&action!=='disable')return result(403,{error:'Configurações suspensas pelo responsável.'});
  const query={id:'eq.'+id,user_id:'eq.'+user.id};
  if(action==='create'){
   const n=name(v.name);if(!n)return result(400,{error:'Nome inválido.'});
   const existing=await dbCall('iris_manager_instances',{query:{select:'id',user_id:'eq.'+user.id,limit:'6'}});
   if(existing.length>=limits.bot_limit)return result(409,{error:'Limite de bots atingido.'});
   try{await dbCall('iris_manager_instances',{method:'POST',data:{user_id:user.id,display_name:n}});}catch{return result(409,{error:'Não foi possível criar. Confira o limite.'});}
   return result(200,{message:'Rascunho criado; ainda não conectado.'});
  }
  if(!uuid.test(id||''))return result(400,{error:'Identificador inválido.'});
  if(action==='delete'){const rows=await dbCall('iris_manager_instances',{method:'DELETE',query});return rows.length?result(200,{message:'Rascunho excluído.'}):result(404,{error:'Bot não encontrado.'});}
  if(action==='enable')return result(409,{error:'A conexão oficial ainda não está disponível. Nenhum bot foi iniciado.'});
  const data=action==='disable'?{desired_enabled:false}:normalizeConfig(v);
  if(!data)return result(400,{error:'Configuração inválida.'});
  const rows=await dbCall('iris_manager_instances',{method:'PATCH',query,data});
  return rows.length?result(200,{message:action==='disable'?'Rascunho desativado.':'Configuração salva. Aplicação no WhatsApp depende da conexão.'}):result(404,{error:'Bot não encontrado.'});
 }
 if(endpoint==='administration'){
  if(!admin)return result(403,{error:'Acesso administrativo necessário.'});
  if(!post){
   const rows=await dbCall('iris_manager_instances',{query:{select:'user_id,id',limit:'500'}});
   const limits=await dbCall('iris_manager_limits',{query:{select:'user_id,bot_limit,suspended',limit:'500'}});
   const admins=await dbCall('iris_manager_admins',{query:{select:'user_id',limit:'100'}});
   const counts=new Map();for(const r of rows)counts.set(r.user_id,(counts.get(r.user_id)||0)+1);
   for(const r of limits)if(!counts.has(r.user_id))counts.set(r.user_id,0);
   const users=[...counts].map(([id,count])=>({id,count,limit:limits.find(v=>v.user_id===id)?.bot_limit??3,suspended:limits.find(v=>v.user_id===id)?.suspended??false,administrator:admins.some(v=>v.user_id===id)}));
   return result(200,{users,instanceCount:rows.length,limited:rows.length===500||limits.length===500,legacy:supervisor.snapshot(),memory:Math.round(process.memoryUsage().rss/1048576),uptime:Math.floor(process.uptime())});
  }
  const v=await body();
  if(!uuid.test(v.id||'')||v.id===user.id||!Number.isInteger(v.limit)||v.limit<0||v.limit>5||typeof v.suspended!=='boolean')return result(400,{error:'Limite inválido ou conta protegida.'});
  const admins=await dbCall('iris_manager_admins',{query:{select:'user_id',user_id:'eq.'+v.id,limit:'1'}});
  if(admins.length)return result(403,{error:'Contas administrativas são protegidas.'});
  const exists=await dbCall('iris_manager_instances',{query:{select:'id',user_id:'eq.'+v.id,limit:'1'}});
  const old=await dbCall('iris_manager_limits',{query:{select:'user_id',user_id:'eq.'+v.id,limit:'1'}});
  if(!exists.length&&!old.length)return result(404,{error:'Conta não encontrada na plataforma.'});
  await dbCall('iris_manager_limits',{method:'POST',query:{on_conflict:'user_id'},data:{user_id:v.id,bot_limit:v.limit,suspended:v.suspended}});
  return result(200,{message:'Limites atualizados. Nenhum dado apagado.'});
 }
 return null;
}
