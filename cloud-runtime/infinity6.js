import {randomInt} from 'node:crypto';
export const groups6={
 jogos:['imobiliario','trilha','expedicao','buscatesouro'],
 economia:['mapainfinity','explorar','oficina','empresaeco','carreira','npc','progresso','guilda','amizadeinfinity','projetoinfinity','temporadainfinity'],
 fun:['festivalinfinity','missaohoje'],
 estudos:['estudo','simulado','flashcard'],
 geral:['infinity','atalhos','backupinfinity']
};
export const commands6=Object.values(groups6).flat();
export const category6=name=>Object.keys(groups6).find(k=>groups6[k].includes(name))||null;
const out=(text,changed=false)=>({text,changed});
const date=t=>new Date(t).toISOString().slice(0,10);
const season=t=>date(t).slice(0,7);
const bounded=(n,max=100000)=>Math.min(max,Math.max(0,Number.isSafeInteger(n)?n:0));
const title=s=>String(s).slice(0,6);
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
const safeName=s=>typeof s==='string'&&/^[\p{L}\p{M}\p{N} -]{2,24}$/u.test(s)&&!['__proto__','constructor','prototype'].includes(s.toLowerCase());
const places=[
 ['Praça','folha','A praça abriga árvores nativas e uma fonte.'],
 ['Biblioteca','livro','A bibliotecária coleciona histórias.'],
 ['Jardim','semente','O jardineiro cuida das mudas.'],
 ['Observatório','cristal','A astrônoma estuda o céu.'],
 ['Ateliê','tinta','A artista prepara um mural.'],
 ['Museu','fragmento','O curador conserva fósseis.'],
 ['Feira','fruta','A feira troca alimentos e artesanato.'],
 ['Lago','concha','A água reflete a paisagem.'],
 ['Farol','mapa','O farol orienta os viajantes.']
];
const resources=places.map(v=>v[1]);
const recipes={caderno:['livro','folha'],mural:['tinta','folha'],telescopio:['cristal','fragmento'],horta:['semente','fruta']};
const careers=['cientista','artista','jardineiro','bibliotecario'];
const bank=[
 ['matematica','Quanto é 12 × 8?',['96','86','108'],0,'12 × 8 = 96.'],
 ['matematica','Qual é a área de um quadrado de lado 7 cm?',['28 cm²','49 cm²','14 cm²'],1,'Área = lado × lado.'],
 ['matematica','Qual é a fração equivalente a 0,25?',['1/2','1/3','1/4'],2,'0,25 = 25/100 = 1/4.'],
 ['matematica','Quanto vale x em 2x + 6 = 14?',['4','7','10'],0,'2x = 8; x = 4.'],
 ['matematica','Qual é o perímetro de um retângulo de lados 3 e 5?',['15','16','8'],1,'2 × (3 + 5) = 16.'],
 ['ciencias','Qual organela realiza a fotossíntese?',['Ribossomo','Cloroplasto','Núcleo'],1,'Cloroplastos contêm clorofila.'],
 ['ciencias','Qual é a fórmula da água?',['H2O','CO2','NaCl'],0,'Dois hidrogênios e um oxigênio.'],
 ['ciencias','Qual mudança é líquido para gás?',['Fusão','Solidificação','Vaporização'],2,'Vaporização é a passagem para o estado gasoso.'],
 ['ciencias','Qual partícula tem carga negativa?',['Próton','Elétron','Nêutron'],1,'O elétron tem carga negativa.'],
 ['ciencias','Que unidade mede força no SI?',['Newton','Watt','Joule'],0,'Força é medida em newtons.'],
 ['geografia','Qual oceano banha o litoral brasileiro?',['Índico','Pacífico','Atlântico'],2,'O Brasil está na costa atlântica.'],
 ['geografia','Qual é a capital do Ceará?',['Fortaleza','Teresina','Natal'],0,'Fortaleza é a capital do Ceará.'],
 ['geografia','Qual bioma predomina no sertão cearense?',['Pampa','Caatinga','Pantanal'],1,'Caatinga é característica do semiárido.'],
 ['geografia','Que linha divide a Terra em hemisférios norte e sul?',['Greenwich','Trópico de Câncer','Equador'],2,'A linha do Equador tem latitude 0°.'],
 ['geografia','Qual continente abriga o Brasil?',['América do Sul','Europa','Ásia'],0,'O Brasil faz parte da América do Sul.'],
 ['portugues','Qual classe de palavra nomeia seres e coisas?',['Verbo','Substantivo','Advérbio'],1,'Substantivos nomeiam seres, objetos e conceitos.'],
 ['portugues','Qual alternativa apresenta verbo?',['Correr','Bonito','Mesa'],0,'Correr indica ação.'],
 ['portugues','Qual sinal encerra uma pergunta direta?',['Vírgula','Ponto final','Interrogação'],2,'O ponto de interrogação encerra a pergunta.'],
 ['portugues','Qual é o plural de papel?',['Papels','Papéis','Papeles'],1,'Papel forma o plural papéis.'],
 ['portugues','Qual palavra é antônimo de claro?',['Escuro','Branco','Luz'],0,'Escuro tem sentido oposto a claro.']
];
const cards=bank.map(v=>({q:v[1],a:v[2][v[3]]+' — '+v[4]}));
const subjects=['matematica','ciencias','geografia','portugues','geral'];
const puzzles=[
 ['Tenho páginas, mas não sou árvore. O que sou?','livro','Biblioteca'],
 ['Sou visível no céu à noite e reflito a luz solar.','lua','Observatório'],
 ['Tenho raízes e folhas, mas não caminho.','planta','Jardim'],
 ['Oriento viajantes com pontos cardeais.','bussola','Farol']
];
const missions=['explorar','estudar','construir'];
const festivalTopics=['ciência','arte','livros','natureza'];
const menu='🌸 *ÍRIS INFINITY 6.0*\nJogos: :imobiliario | :trilha | :expedicao | :buscatesouro\nMundo: :mapainfinity | :explorar 1 | :npc 1 | :oficina | :empresaeco | :carreira\nEstudos: :simulado ciencias | :flashcard | :estudo\nSocial: :guilda | :amizadeinfinity | :projetoinfinity\nEventos: :festivalinfinity | :missaohoje | :temporadainfinity | :progresso\n:atalhos | :backupinfinity (responsável)\nTodos os pontos e recursos são virtuais, sem apostas ou dinheiro real.';
function root(state){return state.infinity6??={};}
function profile(state,id){const p=state.players[id];if(!p)return null;return p.infinity6??={xp:0,items:{},crafted:{},visited:[],wins:0,studied:0,friends:[],events:0};}
function award(p,x,now,task){p.xp=bounded((p.xp||0)+x,1000000);const d=date(now);if(p.daily?.day!==d)p.daily={day:d,tasks:[],claimed:false};if(task&&missions.includes(task)&&!p.daily.tasks.includes(task))p.daily.tasks.push(task);const s=season(now);if(p.season?.key!==s)p.season={key:s,xp:0};p.season.xp=bounded(p.season.xp+x,100000);}
function playerLabel(id){return 'Jogador '+title(id);}
function gameState(db,name){return db.games??={},db.games[name];}
function newGame(db,name,id,now){db.games??={};db.games[name]={creator:id,ids:[id],pos:{[id]:0},turn:0,phase:'lobby',round:0,expires:now+3600000,owned:{},points:{[id]:0}};return db.games[name];}
function endGame(g){g.phase='done';}
function nextTurn(g){g.turn=(g.turn+1)%g.ids.length;if(g.turn===0)g.round++;}
function boardGame({db,p,id,name,arg,owner,now,choose,state}){
 let g=gameState(db,name);if(g?.expires<=now)g=null;
 const a=norm(arg),isProperty=name==='imobiliario';
 if(a==='novo'){
  if(g&&g.phase!=='done')return out('Já existe partida. Use :'+name+' entrar ou ver.');
  newGame(db,name,id,now);return out('🎲 '+(isProperty?'Circuito de propriedades':'Trilha dos exploradores')+' criado. 2–4 jogadores. :'+name+' entrar | iniciar | jogar | ver | sair. Sem apostas.',true);
 }
 if(!g)return out('Use :'+name+' novo.');
 if(a==='sair'){
  if(!g.ids.includes(id))return out('Você não participa.');
  const index=g.ids.indexOf(id);g.ids.splice(index,1);delete g.pos[id];delete g.points[id];for(const [k,v] of Object.entries(g.owned))if(v===id)delete g.owned[k];
  if(!g.ids.length||g.phase==='play'&&g.ids.length<2)endGame(g);else{if(index<g.turn)g.turn--;g.turn=Math.max(0,g.turn%g.ids.length);if(g.creator===id)g.creator=g.ids[0];}
  return out('Você saiu da partida.',true);
 }
 if(a==='entrar'){if(g.phase!=='lobby'||g.ids.length>=4||g.ids.includes(id))return out('Entrada indisponível.');g.ids.push(id);g.pos[id]=0;g.points[id]=0;return out('Participante entrou: '+g.ids.length+'/4.',true);}
 if(a==='iniciar'){if(g.phase!=='lobby'||g.ids.length<2||g.creator!==id)return out('O criador inicia com 2–4 jogadores.');g.phase='play';return out('Turno de '+playerLabel(g.ids[0])+'.',true);}
 if(a==='jogar'){
  if(g.phase!=='play'||g.ids[g.turn]!==id)return out('Não é seu turno.');
  const roll=1+choose(6),limit=isProperty?12:20;g.pos[id]=Math.min(limit,g.pos[id]+roll);
  const pos=g.pos[id];let detail='';
  if(isProperty&&pos<limit){if(!Object.hasOwn(g.owned,pos)){g.owned[pos]=id;g.points[id]+=3;detail=' — propriedade virtual descoberta (+3).';}else if(g.owned[pos]===id){g.points[id]++;detail=' — manutenção (+1).';}else detail=' — visita à propriedade de outro jogador (sem cobrança).';}
  if(!isProperty&&[5,10,15].includes(pos)){g.points[id]++;detail=' — ponto de exploração.';}
  if(pos===limit||g.round>=14){
   if(!isProperty)g.points[id]+=5;
   const max=Math.max(...g.ids.map(k=>g.points[k])),winners=g.ids.filter(k=>g.points[k]===max);
   for(const k of g.ids){const q=profile(state,k);if(q){award(q,winners.includes(k)?12:4,now);if(winners.includes(k))q.wins=bounded(q.wins+1);}}
   endGame(g);return out('Dado '+roll+' | casa '+pos+detail+'\nFim! '+winners.map(playerLabel).join(', ')+' • '+max+' pontos.',true);
  }
  nextTurn(g);return out('Dado '+roll+' | casa '+pos+detail+'\nPróximo: '+playerLabel(g.ids[g.turn])+'.',true);
 }
 return out('Tabuleiro '+name+' • '+g.phase+'\n'+g.ids.map(k=>playerLabel(k)+' | casa '+g.pos[k]+' | '+g.points[k]+' pts').join('\n')+'\n: '+name+' jogar | entrar | iniciar | sair');
}
function expedition({db,state,id,arg,now,name}){
 const a=norm(arg);db.quests??={};let q=db.quests[name];if(q?.expires<=now)q=null;
 if(a==='novo'){
  if(q&&!q.done)return out('Missão ativa. Use :'+name+' entrar.');
  q=db.quests[name]={ids:[id],step:0,solved:[],done:false,expires:now+1800000};return out('🧭 Missão cooperativa iniciada. :'+name+' entrar | pista | resolver resposta | sair.',true);
 }
 if(!q)return out('Use :'+name+' novo.');
 if(a==='sair'){if(!q.ids.includes(id))return out('Você não participa.');q.ids=q.ids.filter(k=>k!==id);q.solved=q.solved.filter(k=>k!==id);if(!q.ids.length)q.done=true;return out('Você saiu.',true);}
 if(a==='entrar'){if(q.done||q.ids.includes(id)||q.ids.length>=6)return out('Entrada indisponível.');q.ids.push(id);return out('Equipe: '+q.ids.length+'/6.',true);}
 if(q.done)return out('Missão concluída. :'+name+' novo.');
 const puzzle=puzzles[(q.step+(name==='buscatesouro'?1:0))%puzzles.length];
 if(a.startsWith('resolver ')){
  if(!q.ids.includes(id))return out('Use entrar primeiro.');
  if(norm(a.slice(9))!==puzzle[1])return out('Ainda não. Pista: '+puzzle[2]+'.');
  q.step++;if(!q.solved.includes(id))q.solved.push(id);
  if(q.step===3){q.done=true;for(const k of q.solved){const p=profile(state,k);if(p){award(p,15,now,'explorar');p.wins=bounded(p.wins+1);}}return out('🏆 Missão concluída! Recompensa virtual aos participantes que resolveram pistas.',true);}
  return out('Correto! Pista '+(q.step+1)+'/3. Use :'+name+' pista.',true);
 }
 return out('Pista '+(q.step+1)+'/3: '+puzzle[0]+' Local: '+puzzle[2]+'.');
}
export function removeInfinity(state,id){
 const db=state.infinity6;if(!db)return;
 for(const g of Object.values(db.games||{})){if(!g.ids?.includes(id))continue;g.ids=g.ids.filter(k=>k!==id);delete g.pos[id];delete g.points[id];for(const [k,v] of Object.entries(g.owned||{}))if(v===id)delete g.owned[k];if(g.creator===id)g.creator=g.ids[0]||'';g.phase='done';g.turn=0;}
 for(const q of Object.values(db.quests||{})){q.ids=q.ids.filter(k=>k!==id);q.solved=q.solved.filter(k=>k!==id);if(!q.ids.length)q.done=true;}
 for(const [k,g] of Object.entries(db.guilds||{})){g.ids=g.ids.filter(x=>x!==id);if(!g.ids.length)delete db.guilds[k];else if(g.owner===id)g.owner=g.ids[0];}
 for(const p of Object.values(state.players||{})){const v=p.infinity6;if(!v)continue;v.friends=(v.friends||[]).filter(k=>k!==id);if(v.invite===id)delete v.invite;}
 if(db.project?.contributors)delete db.project.contributors[id];
}
export function pruneInfinity(state,now=Date.now()){
 const db=state.infinity6;if(!db)return;for(const [k,g] of Object.entries(db.games||{}))if(g.expires<=now)delete db.games[k];for(const [k,q] of Object.entries(db.quests||{}))if(q.expires<=now)delete db.quests[k];
 for(const p of Object.values(state.players||{})){if(p.infinity6?.quiz?.expires<=now)delete p.infinity6.quiz;if(p.infinity6?.card?.expires<=now)delete p.infinity6.card;}
}
export async function infinityFeature({name,arg='',state,id,owner=false,now=Date.now(),choose=randomInt}){
 if(name==='infinity'||name==='atalhos')return out(menu+'\nAtalhos: :estudo, :mapainfinity, :progresso. Erros de digitação recebem sugestão, sem executar outro comando.');
 const db=root(state),a=norm(arg);
 if(name==='backupinfinity'){
  if(!owner)return out('Somente o responsável.');
  if(a==='salvar'){db.backup={at:now,rules:Object.fromEntries(Object.entries(state.config5?.commands||{}).filter(([k,v])=>commands6.includes(k)&&['admin','responsavel'].includes(v)))};return out('Backup das permissões Infinity salvo. Não contém mensagens nem sessões.',true);}
  if(a==='restaurar confirmar'){if(!db.backup)return out('Nenhum backup.');state.config5??={commands:{}};state.config5.commands??={};for(const k of commands6)delete state.config5.commands[k];Object.assign(state.config5.commands,db.backup.rules);return out('Permissões Infinity restauradas. Outros dados preservados.',true);}
  return out('Backup só de permissões Infinity: :backupinfinity salvar | restaurar confirmar.');
 }
 const p=profile(state,id);if(!p)return out('Use :perfil para participar voluntariamente.');
 if(['imobiliario','trilha'].includes(name))return boardGame({db,p,id,name,arg,owner,now,choose,state});
 if(['expedicao','buscatesouro'].includes(name))return expedition({db,state,id,arg,now,name});
 if(name==='mapainfinity')return out('🗺️ *Mapa Infinity*\n'+places.map((v,i)=>(i+1)+' '+v[0]+(p.visited.includes(i)?' ✓':'')).join('\n')+'\n:explorar 1 | :npc 1');
 if(name==='npc'){const i=Number(a)-1;return Number.isInteger(i)&&places[i]?out('💬 '+places[i][2]):out('Use :npc 1 a 9. Veja :mapainfinity.');}
 if(name==='explorar'){
  const i=Number(a)-1;if(!Number.isInteger(i)||!places[i])return out('Use :explorar 1 a 9.');
  if(now-(p.lastExplore||0)<20000)return out('Aguarde 20 segundos entre explorações.');
  p.lastExplore=now;const item=places[i][1];p.items[item]=bounded((p.items[item]||0)+1,99);if(!p.visited.includes(i))p.visited.push(i);award(p,2,now,'explorar');return out('Você visitou '+places[i][0]+' e coletou '+item+'. +2 XP Infinity.',true);
 }
 if(name==='oficina'){
  if(a.startsWith('criar ')){const k=a.slice(6);if(!Object.hasOwn(recipes,k))return out('Receita inválida.');if(recipes[k].some(r=>!p.items[r]))return out('Faltam recursos: '+recipes[k].join(', '));if((p.crafted[k]||0)>=99)return out('Limite do item.');for(const r of recipes[k])p.items[r]--;p.crafted[k]=(p.crafted[k]||0)+1;award(p,5,now,'construir');return out('🛠️ '+k+' construído. +5 XP.',true);}
  return out('Oficina • '+Object.entries(recipes).map(([k,v])=>k+': '+v.join(' + ')).join('\n')+'\nRecursos: '+resources.map(k=>k+' '+(p.items[k]||0)).join(', ')+'\n:oficina criar caderno');
 }
 if(name==='carreira'){if(a.startsWith('escolher ')){const k=a.slice(9);if(!careers.includes(k))return out('Profissões: '+careers.join(', '));p.career=k;return out('Profissão virtual: '+k,true);}return out('Profissão: '+(p.career||'nenhuma')+'\n:carreira escolher '+careers.join('|'));}
 if(name==='empresaeco'){
  if(a.startsWith('criar ')){const n=arg.slice(6).trim();if(p.company||!safeName(n))return out('Nome inválido ou empresa já criada.');p.company={name:n,level:1,day:''};return out('Empresa virtual criada: '+n,true);}
  if(a==='produzir'){if(!p.company)return out('Crie sua empresa primeiro.');if(p.company.day===date(now))return out('Produção diária concluída.');p.company.day=date(now);p.company.level=Math.min(20,p.company.level+1);award(p,4,now,'construir');return out('Produção virtual concluída; nível '+p.company.level+'.',true);}
  return out('Empresa: '+(p.company?p.company.name+' • nível '+p.company.level:'nenhuma')+'\n:empresaeco criar nome | produzir');
 }
 if(name==='estudo')return out('📚 Central de estudos\n:simulado matematica|ciencias|geografia|portugues|geral\n:simulado responder 1 | sair\n:flashcard novo | revelar | sei | revisar | sair\nProgresso: :progresso.');
 if(name==='simulado'){
  if(a==='sair'){delete p.quiz;return out('Simulado encerrado.',true);}
  if(a.startsWith('responder ')){const q=p.quiz,n=Number(a.slice(10));if(!q||q.expires<=now)return out('Inicie um simulado.');if(![1,2,3].includes(n))return out('Responda 1, 2 ou 3.');const entry=bank[q.ids[q.step]];const correct=n===entry[3]+1;if(correct)q.score++;q.step++;const feedback=(correct?'✅ Correto.':'Resposta correta: '+entry[2][entry[3]]+'.')+' '+entry[4];if(q.step>=q.ids.length){const score=q.score,total=q.ids.length;delete p.quiz;p.studied=bounded(p.studied+1);if(p.studyDay!==date(now)){p.studyDay=date(now);award(p,score*2,now,'estudar');}return out(feedback+'\nResultado: '+score+'/'+total+'.',true);}const e=bank[q.ids[q.step]];return out(feedback+'\n\n'+e[1]+'\n'+e[2].map((v,i)=>(i+1)+'. '+v).join('\n'),true);}
  if(subjects.includes(a)){const ids=bank.map((v,i)=>v[0]===a||a==='geral'?i:-1).filter(i=>i>=0);for(let i=ids.length-1;i>0;i--){const j=choose(i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}p.quiz={ids:ids.slice(0,5),step:0,score:0,expires:now+1800000};const e=bank[p.quiz.ids[0]];return out('Simulado 1/5\n'+e[1]+'\n'+e[2].map((v,i)=>(i+1)+'. '+v).join('\n')+'\n:simulado responder 1',true);}
  return out('Use :simulado '+subjects.join('|'));
 }
 if(name==='flashcard'){
  if(a==='sair'){delete p.card;return out('Revisão encerrada.',true);}
  if(a==='novo'){const missed=Object.keys(p.review||{}).filter(k=>p.review[k]===false&&cards[Number(k)]);const i=missed.length?Number(missed[choose(missed.length)]):choose(cards.length);p.card={i,revealed:false,expires:now+600000};return out('🗂️ '+cards[i].q+'\n:flashcard revelar',true);}
  const c=p.card;if(!c||c.expires<=now)return out('Use :flashcard novo.');
  if(a==='revelar'){c.revealed=true;return out(cards[c.i].a+'\n:flashcard sei | revisar',true);}
  if(['sei','revisar'].includes(a)&&c.revealed){p.review??={};p.review[c.i]=a==='sei';delete p.card;return out('Revisão registrada. :flashcard novo.',true);}return out('Revele a resposta primeiro.');
 }
 if(name==='guilda'){
  db.guilds??={};const all=Object.entries(db.guilds),member=all.find(([,g])=>g.ids.includes(id));
  if(a.startsWith('criar ')){const n=arg.slice(6).trim(),k=norm(n);if(!safeName(n)||member||Object.hasOwn(db.guilds,k)||all.length>=12)return out('Nome inválido, já existe guilda ou limite atingido.');db.guilds[k]={name:n,owner:id,ids:[id]};return out('Guilda criada: '+n,true);}
  if(a.startsWith('entrar ')){const k=a.slice(7);if(member||!Object.hasOwn(db.guilds,k)||db.guilds[k].ids.length>=12)return out('Entrada indisponível.');db.guilds[k].ids.push(id);return out('Você entrou na guilda.',true);}
  if(a==='sair'){if(!member)return out('Você não faz parte de uma guilda.');const [k,g]=member;g.ids=g.ids.filter(x=>x!==id);if(!g.ids.length)delete db.guilds[k];else if(g.owner===id)g.owner=g.ids[0];return out('Você saiu da guilda.',true);}
  return out('Guildas: '+(all.map(([,g])=>g.name+' ('+g.ids.length+'/12)').join(', ')||'nenhuma')+'\n: guilda criar nome | entrar nome | sair');
 }
 if(name==='amizadeinfinity'){
  const target=Object.keys(state.players).filter(k=>k.startsWith(a.split(' ')[1]||'')&&k!==id);
  if(a==='lista')return out('Amizades virtuais: '+(p.friends.map(playerLabel).join(', ')||'nenhuma'));
  if(a==='cancelar'){delete p.invite;return out('Convite retirado.',true);}
  if(['convidar','aceitar','remover'].includes(a.split(' ')[0])&&/^[a-z]+ [a-f0-9]{6}$/.test(a)&&target.length===1){
   const k=target[0],other=profile(state,k);if(a.startsWith('remover ')){p.friends=p.friends.filter(x=>x!==k);other.friends=other.friends.filter(x=>x!==id);return out('Amizade removida.',true);}
   if(p.friends.length>=20||other.friends.length>=20)return out('Limite de amizades atingido.');
   if(a.startsWith('convidar ')){p.invite=k;return out('Convite registrado. O destinatário pode aceitar voluntariamente usando seu código '+title(id)+'.',true);}
   if(other.invite!==id)return out('Não há convite desse jogador.');delete other.invite;if(!p.friends.includes(k))p.friends.push(k);if(!other.friends.includes(id))other.friends.push(id);return out('Amizade virtual confirmada pelos dois.',true);
  }
  return out('Use :amizadeinfinity convidar codigo | aceitar codigo | remover codigo | cancelar | lista. Apenas códigos de perfil, sem telefone.');
 }
 if(name==='projetoinfinity'){
  const q=db.project??={level:1,progress:0,contributors:{}};
  if(a==='ajudar'){if(q.contributors[id]===date(now))return out('Você já ajudou hoje.');if(!p.items.folha)return out('Explore a praça para coletar uma folha.');p.items.folha--;q.contributors[id]=date(now);q.progress++;if(q.progress>=5){q.progress=0;q.level=Math.min(100,q.level+1);}award(p,4,now,'construir');return out('Projeto coletivo: nível '+q.level+' • '+q.progress+'/5.',true);}
  return out('🏙️ Cidade Infinity — projeto de biblioteca nível '+q.level+' • '+q.progress+'/5\n:projetoinfinity ajudar (1 folha virtual).');
 }
 if(name==='festivalinfinity'){
  const topic=festivalTopics[Math.floor(now/86400000)%festivalTopics.length];
  if(a==='participar'){if(p.festivalDay===date(now))return out('Você já participou hoje.');p.festivalDay=date(now);p.events=bounded(p.events+1);award(p,3,now);return out('Participação voluntária registrada: '+topic+'. +3 XP.',true);}
  return out('🎉 Festival de '+topic+'. Sugestão: invente um título para um projeto sobre o tema. :festivalinfinity participar');
 }
 if(name==='missaohoje'){const d=p.daily?.day===date(now)?p.daily:{tasks:[],claimed:false};if(a==='resgatar'){if(d.claimed||missions.some(k=>!d.tasks.includes(k)))return out('Complete as três missões primeiro.');d.claimed=true;p.daily=d;award(p,10,now);return out('Missões completas! +10 XP virtuais.',true);}return out('Missões de hoje: '+missions.map(k=>k+(d.tasks.includes(k)?' ✓':'')).join(', ')+'\n:missaohoje resgatar');}
 if(name==='temporadainfinity'){const key=season(now);return out('Temporada '+key+' • XP nesta temporada: '+(p.season?.key===key?p.season.xp:0)+'. Pontos anteriores não são apagados.');}
 if(name==='progresso'){const badges=['Explorador '+p.visited.length+'/9','Estudante '+p.studied,'Vitórias '+p.wins,'Eventos '+p.events];return out('⭐ Nível Infinity '+(1+Math.floor(p.xp/20))+' • '+p.xp+' XP\nTítulo: '+(p.xp>=100?'Guardião Infinity':p.xp>=40?'Explorador':'Aprendiz')+'\n'+badges.join('\n')+'\nColeção: '+(Object.keys(p.crafted).filter(k=>p.crafted[k]>0).join(', ')||'vazia'));}
 return null;
}
export function suggestCommand(raw,known){
 if(typeof raw!=='string'||raw.length<4||raw.length>24)return null;
 function near(a,b){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,d=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++d>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return d+(a.length-i)+(b.length-j)===1;}
 const hits=known.filter(k=>near(raw,k));return hits.length===1?hits[0]:null;
}
