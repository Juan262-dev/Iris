import sharp from 'sharp';
import {position,travel,allRegions,expandedMapSvg} from './worldMap.js';
import {adventureFeature,removeAdventure,hasActiveEncounter} from './worldAdventure.js';
import { randomInt } from 'node:crypto';
export const infinityGames=['imobiliario','trilha','expedicao','reliquia'];
export const infinityWorld=['mapainfinity','viajarworld','aventuraworld','explorar','construir','oficina','npc','guilda','projetoinfinity','temporadainfinity','missaoinfinity','festivalinfinity','torneioestudo'];
export const infinityStudy=['estudar','simulado','flashcard','desafioestudo'];
export const infinityMedia=['cartaoarte','fotoarte','figurarte','videoarte'];
export const infinityCommands=[...infinityGames,...infinityWorld,...infinityStudy,'passaporte','infinity','ajudainfinity','backupinfinity','empresaeco','amizadeinfinity',...infinityMedia];
const out=(text,changed=false)=>({text,changed}), day=86400000;
const stamp=now=>new Date(now).toISOString().slice(0,10);
const month=now=>stamp(now).slice(0,7);
const safeLabel=s=>typeof s==='string'&&/^[\p{L}\p{M}\p{N} _-]{1,24}$/u.test(s)&&!['__proto__','prototype','constructor'].includes(s.toLowerCase());
const label=id=>'Jogador '+id.slice(0,6);
const clamp=(x,max)=>Math.min(max,Math.max(0,Number.isSafeInteger(x)?x:0));
const reward=(p,n=1)=>{p.xp=clamp(clamp(p.xp,10000000)+n,10000000);};
const places=['praça','biblioteca','jardim','observatório','oficina','museu','estação','lago','mercado'];
const items=['livro','semente','estrela','mapa','engrenagem','fóssil','bilhete','concha','tecido'];
const professions={artesao:'engrenagem',botanico:'semente',pesquisador:'estrela',bibliotecario:'livro'};
const bank=[
 ['matematica','Quanto é 12 × 8?',['86','96','108'],1,'12 × (4 + 4) = 96.'],
 ['matematica','Qual é a área de um quadrado de lado 6?',['12','24','36'],2,'Área = lado × lado.'],
 ['matematica','Qual é a raiz quadrada de 81?',['9','8','7'],0,'9 × 9 = 81.'],
 ['matematica','Quanto é 25% de 80?',['10','20','40'],1,'Um quarto de 80 = 20.'],
 ['ciencia','Qual é a unidade de corrente elétrica?',['Volt','Ampère','Ohm'],1,'A corrente é medida em ampères.'],
 ['ciencia','Qual processo produz açúcares nas plantas?',['Fotossíntese','Fusão','Evaporação'],0,'Usa luz, água e dióxido de carbono.'],
 ['ciencia','Qual é o símbolo químico do sódio?',['S','So','Na'],2,'Na deriva de natrium.'],
 ['ciencia','O pH 7 em água a 25 °C indica o quê?',['Ácido','Neutro','Básico'],1,'pH 7 é neutro nessa condição.'],
 ['geografia','Qual bioma predomina no sertão cearense?',['Caatinga','Pampa','Pantanal'],0,'A Caatinga é adaptada ao semiárido.'],
 ['geografia','Qual é o maior oceano?',['Índico','Atlântico','Pacífico'],2,'O Pacífico é o maior em área.'],
 ['geografia','Qual movimento terrestre causa dia e noite?',['Rotação','Translação','Precessão'],0,'A Terra gira em torno do seu eixo.'],
 ['geografia','Qual linha divide hemisférios norte e sul?',['Trópico de Câncer','Equador','Greenwich'],1,'O Equador corresponde à latitude zero.'],
 ['portugues','Qual palavra é um verbo?',['Correr','Bonito','Casa'],0,'Correr exprime uma ação.'],
 ['portugues','Qual é o plural de cidadão?',['Cidadões','Cidadãos','Cidadães'],1,'A forma padrão é cidadãos.'],
 ['portugues','Qual figura compara sem usar como?',['Metáfora','Hipérbole','Eufemismo'],0,'A metáfora estabelece uma relação implícita.'],
 ['portugues','Qual palavra tem acento correto?',['Lapis','Lápis','Lapís'],1,'Lápis é paroxítona terminada em is.']
];
const topics=['geral','matematica','ciencia','geografia','portugues'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const svg=(w,h,body)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" rx="22" fill="#201831"/>'+body+'</svg>');
const txt=(x,y,s,size=18,fill='#f5efff')=>'<text x="'+x+'" y="'+y+'" font-family="sans-serif" font-size="'+size+'" fill="'+fill+'" text-anchor="middle">'+esc(s)+'</text>';
async function mapImage(db,outposts){return {image:await sharp(Buffer.from(expandedMapSvg(db.buildings,outposts))).resize(600).png().toBuffer(),caption:'Aetheria e Solmar • :viajarworld 1–18 | :aventuraworld | :world para jogar no navegador'};}
function profile(p){return p.infinity??={visits:0,collection:{},studyDone:0,studyRight:0,contributions:0,completed:0,season:{month:'',score:0}};}
function credit(p,x,now,n=1){const s=x.season??={month:'',score:0};if(s.month!==month(now)){s.month=month(now);s.score=0;}s.score=clamp(s.score+n,100000);reward(p,n);}
function gameLabel(g){return g.ids.map((k,i)=>label(k)+' • casa '+g.pos[i]+' • '+g.points[i]+' pontos').join('\n');}
const expeditionScenes=[
 ['Ponte de livros: qual objeto ajuda a atravessar?',['Mapa','Ponte de madeira','Lupa'],1],
 ['Jardim: qual recurso ajuda uma muda?',['Água','Papel','Areia seca'],0],
 ['Observatório: qual objeto permite observar estrelas?',['Régua','Pincel','Telescópio'],2],
 ['Museu: como preservar um objeto antigo?',['Guardar protegido','Expor à chuva','Esfregar com areia'],0]
];
const relicScenes=[
 ['Tenho páginas, mas não sou árvore. Onde buscar?',['Lago','Biblioteca','Oficina'],1],
 ['Guardo a história em exposições. Onde buscar?',['Museu','Mercado','Praça'],0],
 ['Observo estrelas. Onde buscar?',['Jardim','Estação','Observatório'],2],
 ['Flores e sementes vivem aqui. Onde buscar?',['Jardim','Biblioteca','Museu'],0]
];
const scenes=(name,g)=>{const row=(name==='expedicao'?expeditionScenes:relicScenes)[g.stage%4];return row[0]+'\n'+row[1].map((v,i)=>(i+1)+'. '+v).join('\n');};
const question=(row,index,total)=>'📚 '+(index+1)+'/'+total+' • '+row[1]+'\n'+row[2].map((v,i)=>(i+1)+'. '+v).join('\n');
function getDb(state){return state.infinity??={buildings:{},guilds:{},games:{},festival:{},project:{count:0,ids:[]},tournament:{day:'',scores:{}}};}
export function removeInfinity(state,id){removeAdventure(state,id);const d=state.infinity;if(!d)return;for(const [key,g] of Object.entries(d.games||{}))if(g.ids?.includes(id))delete d.games[key];for(const [k,g] of Object.entries(d.guilds||{})){g.ids=g.ids.filter(x=>x!==id);if(!g.ids.length)delete d.guilds[k];}delete d.festival?.[id];delete d.tournament?.scores?.[id];if(d.project?.ids)d.project.ids=d.project.ids.filter(k=>k!==id);for(const p of Object.values(state.players||{})){if(!p.infinity)continue;p.infinity.friends=(p.infinity.friends||[]).filter(k=>k!==id);if(p.infinity.friendInvite?.to===id)delete p.infinity.friendInvite;}}
export function pruneInfinity(state,now=Date.now()){const d=state.infinity;if(!d)return;for(const [k,g] of Object.entries(d.games||{}))if(g.expires<=now)delete d.games[k];for(const p of Object.values(state.players||{})){if(p.infinity?.study?.expires<=now)delete p.infinity.study;if(p.infinity?.friendInvite?.expires<=now)delete p.infinity.friendInvite;}}
export const infinityMenu='🌸 ÍRIS CLOUD 6.0 INFINITY\nJOGOS: :imobiliario novo | :trilha novo | :expedicao novo | :reliquia novo\nMUNDO ONLINE: :world — código privado para o site | :world sair — revogar acesso\nRPG 2.0: :aventuraworld status | classe | andar | explorar | desafio | missao | fabricar | comprar | troca\nMUNDO: :mapainfinity | :viajarworld 1–18 | :explorar 1 | :construir 1 | :oficina | :npc 1\nESTUDOS: :estudar ciencia | :simulado novo matematica | :flashcard ciencia | :desafioestudo\nSOCIAL: :guilda criar nome | :amizadeinfinity | :projetoinfinity ajudar | :festivalinfinity\nEMPRESA: :empresaeco criar nome | produzir\nPROGRESSO: :passaporte | :temporadainfinity | :missaoinfinity | :torneioestudo\nESTÚDIO: :cartaoarte texto | :fotoarte pastel | :figurarte texto | :videoarte cinza\nSEGURANÇA: :backupinfinity salvar | :backupinfinity restaurar confirmar (responsável)\nTudo virtual, voluntário e local. Use :perfil para participar.';
export async function infinityFeature({name,arg='',state,id,owner=false,now=Date.now(),choose=randomInt}){
 if(name==='infinity'||name==='ajudainfinity')return out(infinityMenu);
 const d=getDb(state);pruneInfinity(state,now);
 if(name==='mapainfinity')return out(await mapImage(d,state.adventureWorld?.outposts));
 if(name==='aventuraworld')return adventureFeature({state,id,arg,now});
 if(name==='npc'){const n=Number(arg);if(!Number.isInteger(n)||n<1||n>9)return out('NPCs da cidade: '+places.map((v,i)=>(i+1)+' '+v).join(' | ')+' • :npc 1');return out('NPC '+places[n-1]+': '+['Bem-vindo! Explore a cidade.','Um livro abre novos caminhos.','Cuide das sementes.','Olhe para o céu e faça perguntas.','Crie algo com sua coleção.','Preserve a memória.','Planeje sua viagem.','Proteja a água.','Coopere e compartilhe ideias.'][n-1]);}
 if(name==='backupinfinity'){if(!owner)return out('Somente o responsável pode fazer backup de configurações Infinity.');if(arg==='salvar'){state.infinityBackup={at:now,buildings:{...d.buildings}};return out('Backup de construções salvo. Não contém perfis, mensagens ou sessões.',true);}if(arg==='restaurar confirmar'&&state.infinityBackup){const old={...d.buildings};d.buildings={...state.infinityBackup.buildings};state.infinityBackup={at:now,buildings:old};return out('Construções restauradas. Backup anterior disponível para desfazer.',true);}return out(':backupinfinity salvar | restaurar confirmar. Apenas construções coletivas; não restaura dados pessoais.');}
 const p=state.players[id];if(!p)return out('Use :perfil para participar voluntariamente.');const x=profile(p);
 if(name==='viajarworld'){const n=/^(?:[1-9]|1[0-8])$/.test(arg)?Number(arg):0;if(!n)return out('📍 Local atual: '+allRegions[position(p)-1].title+'\n:viajarworld 1–18 • :mapainfinity');if(hasActiveEncounter(p,now))return out('Finalize o desafio ou use :aventuraworld agir fugir.');const result=travel(p,n);return out(result.changed?'🧭 Viagem concluída: '+result.path.map(k=>allRegions[k-1].title).join(' → '):'Você já está em '+allRegions[n-1].title+'.',result.changed);}
 if(infinityGames.includes(name)){
  let g=d.games[name];
  if(arg==='novo'){if(g)return out('Já há uma partida.');d.games[name]={ids:[id],pos:[0],points:[0],turn:0,started:false,expires:now+day,owned:{},stage:0};return out('Partida criada! :'+name+' entrar | iniciar | sair. De 2 a 4 participantes, sem apostas, com pontos separados da economia.',true);}
  if(!g)return out('Use :'+name+' novo.');
  if(arg==='entrar'){if(g.started||g.ids.includes(id)||g.ids.length>=4)return out('Inscrição indisponível.');g.ids.push(id);g.pos.push(0);g.points.push(0);return out('Inscritos: '+g.ids.length+'/4.',true);}
  if(arg==='sair'){if(!g.ids.includes(id)&&!owner)return out('Somente participantes ou responsável encerram.');delete d.games[name];return out('Partida encerrada.',true);}
  if(arg==='iniciar'){if(g.ids[0]!==id||g.ids.length<2||g.started)return out('Criador inicia com 2–4 participantes.');g.started=true;return out('Começou! :'+name+' jogar 1|2|3'+(name==='imobiliario'?' (escolha quantas casas avançar)':'')+'. '+label(g.ids[g.turn])+(['expedicao','reliquia'].includes(name)?'\n'+scenes(name,g):''),true);}
  if(!g.started||!arg||arg==='mesa')return out(gameLabel(g)+'\nVez: '+label(g.ids[g.turn])+' • :'+name+' jogar 1|2|3'+(['expedicao','reliquia'].includes(name)?'\n'+scenes(name,g):''));
  if(g.ids[g.turn]!==id)return out('Aguarde sua vez.');
  const m=/^jogar ([123])$/.exec(arg);if(!m)return out('Use :'+name+' jogar 1|2|3.');
  const k=g.turn,n=Number(m[1]);if(!['expedicao','reliquia'].includes(name))g.pos[k]+=n;
  if(name==='imobiliario'){const tile=g.pos[k]%9;if(!Object.hasOwn(g.owned,tile)){g.owned[tile]=k;g.points[k]+=3;}else if(g.owned[tile]===k)g.points[k]++;else g.points[g.owned[tile]]++; }
  else if(name==='expedicao'||name==='reliquia'){const row=(name==='expedicao'?expeditionScenes:relicScenes)[g.stage%4];if(n-1!==row[2])return out('Essa escolha não resolve a pista. Tente outra opção, sem perder pontos.');g.points[k]+=3;g.pos[k]++;g.stage++;}
  else g.points[k]+=n===2?3:1;
  g.turn=(k+1)%g.ids.length;g.expires=now+day;
  const cooperative=['expedicao','reliquia'].includes(name);
  if(cooperative?g.stage>=g.ids.length*4:g.pos[k]>=18){const best=Math.max(...g.points);for(const member of g.ids){const q=state.players[member];if(q){const y=profile(q);y.completed=clamp(y.completed+1,100000);credit(q,y,now);}}const result=cooperative?(name==='reliquia'?'Relíquias encontradas por toda a equipe!':'Expedição concluída por toda a equipe!'):'Final: '+g.ids.filter((_,i)=>g.points[i]===best).map(label).join(', ')+' • maior pontuação '+best;delete d.games[name];return out(result+'\n'+gameLabel(g),true);}
  return out(gameLabel(g)+'\nPróximo: '+label(g.ids[g.turn])+(cooperative?' • etapa '+(g.stage+1)+'\n'+scenes(name,g):''),true);
 }
 if(name==='explorar'){if(hasActiveEncounter(p,now))return out('Finalize o desafio primeiro.');const n=Number(arg);if(!Number.isInteger(n)||n<1||n>9)return out('Use :mapainfinity e :explorar 1–9.');if(x.exploreDay!==stamp(now)){x.exploreDay=stamp(now);x.visited=[];}if(x.visited.includes(n))return out('Local já explorado hoje.');x.visited.push(n);travel(p,n);x.visits=clamp(x.visits+1,100000);const item=items[n-1];x.collection[item]=clamp((x.collection[item]||0)+1,999);credit(p,x,now);return out('Você visitou '+places[n-1]+' e encontrou '+item+'. Coleção e XP registrados.',true);}
 if(name==='construir'){const n=Number(arg);if(!Number.isInteger(n)||n<1||n>9)return out('Use :construir 1–9. Custo: 2 itens do local.');const k=n-1,level=d.buildings[k]||0,item=items[k];if(level>=5||!x.collection[item]||x.collection[item]<2)return out('Necessário 2 '+item+' e nível abaixo de 5.');x.collection[item]-=2;d.buildings[k]=level+1;x.contributions=clamp(x.contributions+1,100000);credit(p,x,now);return out(places[k]+' nível '+(level+1)+' • construção coletiva.',true);}
 if(name==='oficina'){const m=/^profissao (artesao|botanico|pesquisador|bibliotecario)$/.exec(arg);if(m){x.job=m[1];return out('Oficina: '+x.job,true);}if(arg==='produzir'){if(!Object.hasOwn(professions,x.job||''))return out('Escolha uma profissão em :oficina.');if(x.workDay===stamp(now))return out('Produção já realizada hoje.');x.workDay=stamp(now);const k=professions[x.job];x.collection[k]=clamp((x.collection[k]||0)+1,999);credit(p,x,now);return out('Produziu '+k+' em sua oficina virtual.',true);}return out('Oficina individual: '+(x.job||'sem profissão')+'\n:oficina profissao artesao|botanico|pesquisador|bibliotecario | :oficina produzir');}
 if(name==='empresaeco'){
  if(arg.startsWith('criar ')){const n=arg.slice(6).trim();if(!safeLabel(n)||x.company)return out('Nome inválido ou empresa existente.');x.company={name:n,level:1,day:''};return out('Empresa virtual criada: '+n,true);}
  if(arg==='produzir'){if(!x.company)return out('Crie a empresa primeiro.');if(x.company.day===stamp(now))return out('Produção já realizada hoje.');x.company.day=stamp(now);x.company.level=clamp(x.company.level+1,50);credit(p,x,now,2);return out('Empresa nível '+x.company.level+' • produção virtual, +2 XP.',true);}
  return out('Empresa: '+(x.company?x.company.name+' nível '+x.company.level:'nenhuma')+'\n:empresaeco criar nome | produzir. Sem dinheiro real.');
 }
 if(name==='amizadeinfinity'){
  const friends=x.friends??=[];
  if(arg==='lista')return out('Amizades virtuais: '+(friends.map(label).join(', ')||'nenhuma'));
  if(arg==='cancelar'){delete x.friendInvite;return out('Convite retirado.',true);}
  const m=/^(convidar|aceitar|remover) ([a-f0-9]{6})$/.exec(arg);
  if(m){const matches=Object.keys(state.players).filter(k=>k!==id&&k.startsWith(m[2]));if(matches.length!==1)return out('Código de perfil inexistente ou ambíguo.');const target=matches[0],other=profile(state.players[target]),list=other.friends??=[];
   if(m[1]==='remover'){x.friends=friends.filter(k=>k!==target);other.friends=list.filter(k=>k!==id);return out('Amizade removida.',true);}
   if(friends.length>=20||list.length>=20||friends.includes(target))return out('Amizade existente ou limite atingido.');
   if(m[1]==='convidar'){x.friendInvite={to:target,expires:now+86400000};return out('Convite registrado. O destinatário aceita voluntariamente com :amizadeinfinity aceitar '+id.slice(0,6)+'.',true);}
   if(other.friendInvite?.to!==id||other.friendInvite.expires<=now)return out('Não há convite ativo desse jogador.');
   delete other.friendInvite;friends.push(target);list.push(id);return out('Amizade confirmada por ambos.',true);
  }
  return out(':amizadeinfinity convidar|aceitar|remover codigo | cancelar | lista. Somente perfis voluntários; nenhum número de telefone.');
 }
 if(name==='guilda'){const m=/^(criar|entrar) (.+)$/.exec(arg),current=Object.entries(d.guilds).find(([,g])=>g.ids.includes(id));if(arg==='sair'){if(!current)return out('Você não pertence a guilda.');current[1].ids=current[1].ids.filter(k=>k!==id);if(!current[1].ids.length)delete d.guilds[current[0]];return out('Você saiu.',true);}if(m&&safeLabel(m[2])){if(current)return out('Saia da guilda atual primeiro.');const key=m[2].toLowerCase();if(m[1]==='criar'){if(Object.hasOwn(d.guilds,key)||Object.keys(d.guilds).length>=20)return out('Nome indisponível ou limite atingido.');d.guilds[key]={name:m[2],ids:[id]};}else{const g=Object.hasOwn(d.guilds,key)&&d.guilds[key];if(!g||g.ids.length>=12)return out('Guilda indisponível.');g.ids.push(id);}return out('Participação registrada.',true);}return out('Guildas voluntárias: '+(Object.values(d.guilds).map(g=>g.name+' ('+g.ids.length+')').join(', ')||'nenhuma')+'\n:guilda criar nome | entrar nome | sair');}
 if(name==='projetoinfinity'){const g=d.project;if(arg==='ajudar'){if(x.projectDay===stamp(now))return out('Contribuição já registrada hoje.');x.projectDay=stamp(now);g.count=clamp(g.count+1,100000);if(!g.ids.includes(id))g.ids.push(id);x.contributions=clamp(x.contributions+1,100000);credit(p,x,now);return out('Projeto comunitário: '+g.count+' contribuições!',true);}return out('Projeto coletivo: biblioteca de conhecimento • '+g.count+' contribuições acumuladas. :projetoinfinity ajudar');}
 if(name==='festivalinfinity'){if(arg==='sair'){delete d.festival[id];return out('Inscrição removida.',true);}if(['arte','ciencia','livros','musica'].includes(arg)){d.festival[id]=arg;return out('Inscrição voluntária: '+arg,true);}return out('Festival de criatividade: '+['arte','ciencia','livros','musica'].map(k=>k+' '+Object.values(d.festival).filter(v=>v===k).length).join(' | ')+'\n:festivalinfinity arte | ciencia | livros | musica | sair');}
 if(name==='passaporte')return out('🎖️ Passaporte Infinity\nXP: '+p.xp+' • nível '+(1+Math.floor(p.xp/10))+'\nExplorações: '+x.visits+' • partidas: '+x.completed+' • estudo: '+x.studyRight+' acertos\nColeção: '+(Object.entries(x.collection).map(([k,v])=>k+' '+v).join(' | ')||'vazia')+'\nTítulo: '+(x.studyRight>=10?'Pesquisador':x.contributions>=5?'Construtor':x.visits>=5?'Explorador':'Iniciante'));
 if(name==='temporadainfinity')return out('Temporada '+month(now)+' • seus pontos: '+(x.season?.month===month(now)?x.season.score:0)+'. XP permanente não é reiniciado.');
 if(name==='missaoinfinity'){const task=Math.floor(now/day)%3;if(arg==='concluir'){if(x.missionDay===stamp(now))return out('Missão já concluída.');const ok=task===0?x.exploreDay===stamp(now)&&x.visited?.length>=2:task===1?x.projectDay===stamp(now):x.studyDay===stamp(now);if(!ok)return out('Complete primeiro a atividade do dia.');x.missionDay=stamp(now);credit(p,x,now,2);return out('Missão concluída! +2 XP.',true);}return out('Missão de hoje: '+['explorar dois locais','contribuir para o projeto','responder corretamente a uma questão'][task]+'. :missaoinfinity concluir');}
 if(name==='torneioestudo'){const g=d.tournament;return out('Desafio educativo diário • '+(g.day===stamp(now)?Object.values(g.scores).sort((a,b)=>b-a).slice(0,10).map((v,i)=>(i+1)+'º: '+v+' acertos').join(' | ')||'sem resultados':'sem resultados')+'\nParticipe com :simulado novo geral. Ranking sem nomes.');}
 if(name==='estudar'||name==='flashcard'){const m=/^(geral|matematica|ciencia|geografia|portugues)(?: (revelar))?$/.exec(arg);if(!m)return out(': '+name+' '+topics.join(' | ')+' [revelar]');const pool=bank.filter(r=>m[1]==='geral'||r[0]===m[1]);const row=pool[Math.floor(now/day)%pool.length];return out(m[2]?row[2][row[3]]+' — '+row[4]:row[1]+'\n:'+name+' '+m[1]+' revelar');}
 if(name==='simulado'||name==='desafioestudo'){
  if(arg==='sair'){delete x.study;return out('Sessão de estudo encerrada.',true);}
  const start=/^novo (geral|matematica|ciencia|geografia|portugues)$/.exec(arg);
  if(start||name==='desafioestudo'&&!x.study){if(x.study)return out('Já existe simulado. :simulado sair');const topic=start?.[1]||'geral',pool=bank.map((r,i)=>({r,i})).filter(v=>topic==='geral'||v.r[0]===topic),ids=pool.map(v=>v.i);for(let i=ids.length-1;i>0;i--){const j=choose(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}x.study={ids:ids.slice(0,name==='desafioestudo'?1:4),at:0,right:0,expires:now+3600000};return out(question(bank[x.study.ids[0]],0,x.study.ids.length)+'\n:simulado responder 1|2|3',true);}
  const s=x.study;if(!s)return out(':simulado novo '+topics.join('|'));
  const m=/^responder ([123])$/.exec(arg);if(!m)return out(question(bank[s.ids[s.at]],s.at,s.ids.length)+'\n:simulado responder 1|2|3');
  const row=bank[s.ids[s.at]],ok=Number(m[1])-1===row[3];s.at++;x.studyDone=clamp(x.studyDone+1,100000);if(ok){s.right++;x.studyRight=clamp(x.studyRight+1,100000);if(x.studyDay!==stamp(now)){x.studyDay=stamp(now);credit(p,x,now);}}
  const explanation=(ok?'Correto! ':'Resposta: '+row[2][row[3]]+'. ')+row[4];
  if(s.at===s.ids.length){const g=d.tournament;if(g.day!==stamp(now)){g.day=stamp(now);g.scores={};}g.scores[id]=Math.max(g.scores[id]||0,s.right);delete x.study;return out(explanation+'\nResultado: '+s.right+'/'+s.ids.length,true);}return out(explanation+'\n'+question(bank[s.ids[s.at]],s.at,s.ids.length),true);
 }
 return out(null);
}
export async function artCard(arg){const text=Array.from(String(arg||'').trim());if(!text.length||text.length>72||text.some(c=>/[\p{Cc}\p{Cf}]/u.test(c)))return 'Use :cartaoarte texto de até 72 caracteres.';let body='<circle cx="500" cy="20" r="190" fill="#553e79"/><circle cx="35" cy="420" r="180" fill="#376b68"/>'+txt(300,72,'ÍRIS • ESTÚDIO INFINITY',22,'#d8bcff');for(let i=0;i<text.length;i+=24)body+=txt(300,160+Math.floor(i/24)*45,text.slice(i,i+24).join(''),28);body+=txt(300,350,'ARTE ORIGINAL • 6.0',17,'#d4dbdf');return {image:await sharp(svg(600,390,body)).png().toBuffer(),caption:'Cartão criado localmente.'};}
export async function artPhoto(input,arg){if(!['pastel','noturno','monocromatico'].includes(arg))return 'Use :fotoarte pastel|noturno|monocromatico na legenda de sua foto.';let image=sharp(input,{limitInputPixels:12000000}).rotate().resize(900,900,{fit:'inside',withoutEnlargement:true});if(arg==='pastel')image=image.modulate({saturation:.65,brightness:1.12});if(arg==='noturno')image=image.tint('#8da6da').modulate({brightness:.78});if(arg==='monocromatico')image=image.grayscale();return {image:await image.png().toBuffer(),caption:'Efeito local '+arg+'. Metadados removidos.'};}
