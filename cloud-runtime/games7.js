import {randomInt,randomBytes} from 'node:crypto';
import {recordGame,gameStats} from './profileCard.js';
import {game7Visual} from './gameVisual.js';
export const games7=['conecta4','reversi','mastermind','nonograma','rummikub','pontinhos','deslizante','diferencas','quizmusical','investigacao'];
export const controls7=['tema7','estatisticas7','medalhas7'];
const dual=new Set(['conecta4','reversi','pontinhos']),shared=new Set([...dual,'investigacao']);
const titles={conecta4:'CONECTA 4',reversi:'REVERSI',mastermind:'MASTERMIND',nonograma:'NONOGRAMA',rummikub:'RUMMIKUB • DESAFIO SOLO',pontinhos:'JOGO DOS PONTINHOS',deslizante:'QUEBRA-CABEÇA',diferencas:'JOGO DAS DIFERENÇAS',quizmusical:'QUIZ MUSICAL',investigacao:'INVESTIGAÇÃO COOPERATIVA'};
const themes=['iris','neon','madeira','oceano','amoled'];
const out=(text,changed=false)=>({text,changed}),day=86400000,bot='iris-bot';
const normalize=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase().replace(/\s+/g,' ');
const shuffle=(a,choose)=>{for(let i=a.length-1;i>0;i--){const j=choose(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const bounded=(n,a,b)=>Math.max(a,Math.min(b,n));
const base=state=>state.game7??={matches:{},history:{},theme:'iris',rematches:{}};
const tag=(g,k)=>k===bot?'Íris':'Jogador '+(g.ids.indexOf(k)+1);
const rowcol=(s,n)=>{const m=/^([a-h])([1-8])$/.exec(s);if(!m)return -1;const c=m[1].charCodeAt(0)-97,r=Number(m[2])-1;return c<n&&r<n?r*n+c:-1;};
const coord=(i,n)=>String.fromCharCode(97+i%n)+(Math.floor(i/n)+1);
function c4win(b,side){for(let r=0;r<6;r++)for(let c=0;c<7;c++)if(b[r*7+c]===side)for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){if(Array.from({length:4},(_,j)=>[r+dr*j,c+dc*j]).every(([y,x])=>y>=0&&y<6&&x>=0&&x<7&&b[y*7+x]===side))return true;}return false;}
const c4drop=(b,c)=>{for(let r=5;r>=0;r--)if(!b[r*7+c])return r*7+c;return -1;};
export function reversiFlips(b,i,side){if(i<0||i>=64||b[i])return [];const r=Math.floor(i/8),c=i%8,all=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;let y=r+dr,x=c+dc,run=[];while(y>=0&&y<8&&x>=0&&x<8&&b[y*8+x]===3-side){run.push(y*8+x);y+=dr;x+=dc;}if(run.length&&y>=0&&y<8&&x>=0&&x<8&&b[y*8+x]===side)all.push(...run);}return all;}
const rMoves=(b,s)=>b.map((_,i)=>i).filter(i=>reversiFlips(b,i,s).length);
const dotEdges=Array.from({length:12},(_,i)=>'h'+(Math.floor(i/3)+1)+(i%3+1)).concat(Array.from({length:12},(_,i)=>'v'+(Math.floor(i/4)+1)+(i%4+1)));
const boxEdges=i=>{const r=Math.floor(i/3)+1,c=i%3+1;return ['h'+r+c,'h'+(r+1)+c,'v'+r+c,'v'+r+(c+1)];};
const nonos=['00100|01110|11111|00100|00100','10001|01010|00100|01010|10001','01110|10001|10101|10001|01110','11011|11111|01110|00100|00000'];
const runs=a=>{let n=0,out=[];for(const v of a){if(v)n++;else if(n){out.push(n);n=0;}}if(n)out.push(n);return out.join(' ')||'0';};
const music=[
 ['Gênero brasileiro conhecido pela sanfona e festas juninas.',['Forró','Jazz','Reggae'],1],
 ['Instrumento de cordas com seis cordas na versão mais comum.',['Flauta','Violão','Piano'],2],
 ['Estilo musical associado ao Nordeste e ao rei do baião.',['Baião','Samba','Rock'],1],
 ['Instrumento que marca o ritmo com duas peles e baquetas ou mãos.',['Violino','Tambor','Saxofone'],2],
 ['Gênero brasileiro que costuma utilizar pandeiro e cavaquinho.',['Samba','Ópera','Country'],1],
 ['Qual instrumento possui teclas brancas e pretas?',['Trompete','Piano','Triângulo'],2]
];
const cases=[
 ['O troféu da feira cultural desapareceu. O registro indica que foi guardado antes da chuva.',['Consulte o registro da biblioteca','Procure no jardim','Ignore a pista'],1],
 ['A bibliotecária diz que o objeto foi entregue a quem organizava a exposição.',['Volte ao jardim','Consulte o inventário da exposição','Encerre o caso'],2],
 ['O inventário informa que o troféu está numa caixa azul na sala de exposições.',['Abra a caixa azul','Procure na cantina','Verifique a quadra'],1],
 ['A etiqueta identifica o troféu. Qual conclusão é sustentada pelas pistas?',['Foi destruído','Foi guardado para proteção','Foi levado para outra cidade'],2]
];
function init(name,g,choose){
 g.stage=0;g.moves=0;g.turn=0;g.started=true;g.scores=[0,0];g.guesses=[];
 if(name==='conecta4')g.b=Array(42).fill(0);
 if(name==='reversi'){g.b=Array(64).fill(0);g.b[27]=g.b[36]=2;g.b[28]=g.b[35]=1;}
 if(name==='pontinhos'){g.edges={};g.boxes=Array(9).fill(0);}
 if(name==='mastermind')g.secret=Array.from({length:4},()=>choose(6)+1);
 if(name==='nonograma'){g.secret=nonos[choose(nonos.length)].split('|').join('').split('').map(Number);g.b=Array(25).fill(0);}
 if(name==='deslizante'){g.b=[1,2,3,4,5,6,7,8,0];let prev=-1;for(let t=0;t<35;t++){const z=g.b.indexOf(0),opts=g.b.map((_,i)=>i).filter(i=>i!==prev&&Math.abs(i%3-z%3)+Math.abs(Math.floor(i/3)-Math.floor(z/3))===1);const i=opts[choose(opts.length)];[g.b[z],g.b[i]]=[g.b[i],g.b[z]];prev=z;}if(g.b.every((v,i)=>v===(i+1)%9))[g.b[7],g.b[8]]=[g.b[8],g.b[7]];}
 if(name==='diferencas'){g.b=Array.from({length:25},()=>choose(6)+1);g.other=g.b.slice();g.diff=shuffle(Array.from({length:25},(_,i)=>i),choose).slice(0,5);for(const i of g.diff)g.other[i]=g.other[i]%6+1;g.found=[];}
 if(name==='rummikub'){// A solitaire meld puzzle, not the full competitive rules.
 const start=choose(7)+1,num=choose(10)+1;g.tiles=shuffle([{c:0,n:start},{c:0,n:start+1},{c:0,n:start+2},{c:1,n:num},{c:2,n:num},{c:3,n:num},{c:2,n:10},{c:2,n:11},{c:2,n:12}],choose);g.used=[];g.melds=[];
 }
}
function publicView(name,g){
 let view={title:titles[name],sub:g.done?'Partida concluída':g.started?(dual.has(name)?'Vez: '+tag(g,g.ids[g.turn]):'Jogadas: '+g.moves):'Sala de espera',command:':'+name,lines:[]};
 if(!g.started){view.lines=['Participantes: '+g.ids.length+'/2','Outro jogador: :'+name+' entrar','Criador: :'+name+' iniciar',...(dual.has(name)?['Solo: :'+name+' bot medio','Tempo: :'+name+' tempo 60']:[])];return view;}
 if(g.deadline&&!g.done)view.lines.push('Prazo do turno: '+g.seconds+' s • até '+new Date(g.deadline).toISOString().slice(11,19)+' UTC');
 if(name==='conecta4'){view.grid={cols:7,rows:6,values:g.b.map(v=>v?String(v):''),kind:'discs'};view.lines.push('Escolha uma coluna de 1 a 7.');}
 if(name==='reversi'){view.grid={cols:8,rows:8,values:g.b.map(v=>v?String(v):''),kind:'discs',marks:rMoves(g.b,g.turn+1),coords:true};view.lines.push('Peças: '+g.b.filter(v=>v===1).length+' × '+g.b.filter(v=>v===2).length,'Escolha uma casa marcada, ex.: d3.');}
 if(name==='pontinhos'){view.dots={edges:g.edges,boxes:g.boxes};view.lines.push('Caixas: '+g.scores.join(' × '),'h11 = horizontal, v11 = vertical.');}
 if(name==='mastermind'){view.lines.push('Código de 4 números de 1 a 6. Até 10 tentativas.','Exemplo: 1234','Certos = posição certa; fora = posição diferente.');view.guesses=g.guesses.map(v=>({word:v.word,mark:v.exact+' certos • '+v.near+' fora'}));}
 if(name==='nonograma'){view.grid={cols:5,rows:5,values:g.b.map(v=>v===1?'■':v===2?'×':''),coords:true,kind:'cells'};view.lines.push('Linhas: '+Array.from({length:5},(_,i)=>runs(g.secret.slice(i*5,i*5+5))).join(' / '),'Colunas: '+Array.from({length:5},(_,i)=>runs(g.secret.filter((_,j)=>j%5===i))).join(' / '),'a1 alterna preenchida/vazia; x a1 marca vazio; conferir.');}
 if(name==='deslizante'){view.grid={cols:3,rows:3,values:g.b.map(v=>v?String(v):''),kind:'cells'};view.lines.push('Mova um número vizinho ao espaço vazio.');}
 if(name==='diferencas'){view.grid={cols:5,rows:5,values:g.b.map(String),kind:'symbols',coords:true,marks:g.found};view.second={cols:5,rows:5,values:g.other.map(String),kind:'symbols',coords:true,marks:g.found};view.lines.push('Encontre as 5 diferenças: a1 até e5.','Encontradas: '+g.found.length+'/5');}
 if(name==='rummikub'){view.tiles=g.tiles.map((t,i)=>({num:t.n,color:t.c,slot:i+1,used:g.used.includes(i)}));view.lines.push('Monte trincas ou sequências de 3 peças.','Ex.: :rummikub 1 2 3','Desafio solo, sem compra nem reorganização da mesa.','Combinações: '+g.melds.length+'/3');}
 if(name==='quizmusical'||name==='investigacao'){const pool=name==='quizmusical'?music:cases;const q=pool[g.stage];if(q){view.lines.push('Etapa '+(g.stage+1)+'/'+pool.length,q[0],...q[1].map((v,i)=>(i+1)+'. '+v));}else view.lines.push('Todas as etapas concluídas.');}
 return view;
}
async function image(name,g,theme,notice=''){const view=publicView(name,g);if(notice)view.lines.unshift(notice);return game7Visual(view,theme);}
const duration=(g,now)=>{g.deadline=g.seconds?now+g.seconds*1000:0;g.expires=now+day;};
function finish(db,state,key,name,g,winner,now,notice){g.done=true;g.deadline=0;g.expires=now+3600000;g.result=notice;db.rematches[key]={ids:g.ids.slice(),difficulty:g.difficulty,seconds:g.seconds,expires:now+3600000,yes:[]};
 for(const id of g.ids.filter(k=>k!==bot&&state.players?.[k])){const h=db.history[id]??=[];h.push({game:name,result:name==='investigacao'?'concluído':winner===null?'empate':winner===id?'vitória':'derrota',at:now});if(h.length>40)h.splice(0,h.length-40);recordGame(state,name,id,name==='investigacao'?'c':winner===null?'d':winner===id?'w':'l');}
}
function aiMove(name,g,choose){
 const side=g.turn+1;
 if(name==='conecta4'){const opts=Array.from({length:7},(_,i)=>i).filter(c=>c4drop(g.b,c)>=0),rank=(c,s)=>{let b=g.b.slice();b[c4drop(b,c)]=s;return c4win(b,s);};let pick=opts[choose(opts.length)];if(g.difficulty!=='facil'){pick=opts.find(c=>rank(c,side))??opts.find(c=>rank(c,3-side))??(g.difficulty==='dificil'&&opts.includes(3)?3:pick);}return String(pick+1);}

 if(name==='reversi'){const opts=rMoves(g.b,side);if(!opts.length)return 'passar';const i=g.difficulty==='facil'?opts[choose(opts.length)]:opts.slice().sort((a,b)=>(g.difficulty==='dificil'&&[0,7,56,63].includes(b)?100:0)+reversiFlips(g.b,b,side).length-(g.difficulty==='dificil'&&[0,7,56,63].includes(a)?100:0)-reversiFlips(g.b,a,side).length)[0];return coord(i,8);}
 const opts=dotEdges.filter(e=>!g.edges[e]);if(g.difficulty!=='facil'){const close=opts.find(e=>g.boxes.some((v,i)=>!v&&boxEdges(i).includes(e)&&boxEdges(i).every(k=>k===e||g.edges[k])));if(close)return close;}return opts[choose(opts.length)];
}
function dualMove(name,g,arg){const s=g.turn+1;let win,again=false;
 if(name==='conecta4'){if(!/^[1-7]$/.test(arg))return {error:'Escolha coluna 1 a 7.'};const i=c4drop(g.b,Number(arg)-1);if(i<0)return {error:'Coluna cheia.'};g.b[i]=s;if(c4win(g.b,s))win=g.ids[g.turn];else if(g.b.every(Boolean))win=null;}
 if(name==='reversi'){const i=rowcol(arg,8),flips=reversiFlips(g.b,i,s);if(!flips.length)return {error:'Escolha uma casa legal marcada.'};g.b[i]=s;for(const k of flips)g.b[k]=s;const next=rMoves(g.b,3-s),own=rMoves(g.b,s);if(!next.length&&!own.length){const a=g.b.filter(v=>v===1).length,b=g.b.filter(v=>v===2).length;win=a===b?null:g.ids[a>b?0:1];}else again=!next.length;}
 if(name==='pontinhos'){if(!dotEdges.includes(arg)||g.edges[arg])return {error:'Escolha uma aresta livre: h11 ou v11.'};g.edges[arg]=s;for(let i=0;i<9;i++)if(!g.boxes[i]&&boxEdges(i).every(k=>g.edges[k])){g.boxes[i]=s;g.scores[s-1]++;again=true;}if(g.boxes.every(Boolean))win=g.scores[0]===g.scores[1]?null:g.ids[g.scores[0]>g.scores[1]?0:1];}
 g.moves++;if(win===undefined&&!again)g.turn=1-g.turn;return {win};
}
export function removeGames7(state,id){const d=state.game7;if(!d)return;delete d.history?.[id];for(const [k,g] of Object.entries(d.matches||{}))if(g.ids.includes(id))delete d.matches[k];for(const [k,g] of Object.entries(d.rematches||{}))if(g.ids.includes(id))delete d.rematches[k];}
export async function game7({name,arg='',state,id,owner=false,now=Date.now(),choose=randomInt}){
 if(!games7.includes(name)&&!controls7.includes(name))return null;
 const d=base(state);arg=normalize(arg);
 for(const [k,g] of Object.entries(d.matches))if(g.expires<=now)delete d.matches[k];
 for(const [k,g] of Object.entries(d.rematches))if(g.expires<=now)delete d.rematches[k];
 if(name==='tema7'){if(!arg)return out('Tema dos novos jogos: '+d.theme+'. Opções: '+themes.join(', '));if(!owner)return out('Somente o responsável altera o tema do grupo.');if(!themes.includes(arg))return out('Temas: '+themes.join(', '));d.theme=arg;return out('Tema dos novos jogos: '+arg,true);}
 if(name==='estatisticas7'||name==='medalhas7'){const stats=gameStats(state,id),rows=Object.values(stats),w=rows.reduce((n,x)=>n+x.w,0),l=rows.reduce((n,x)=>n+x.l,0),draw=rows.reduce((n,x)=>n+x.d,0),completed=rows.reduce((n,x)=>n+x.c,0),history=d.history[id]||[];
 return out(name==='medalhas7'?'Medalhas virtuais: '+([w>=1?'Primeira vitória':null,w>=5?'Competidor':null,completed>=3?'Persistente':null,history.length>=10?'Veterano 7.0':null].filter(Boolean).join(' • ')||'Nenhuma ainda'):'Vitórias: '+w+' | Derrotas: '+l+' | Empates: '+draw+' | Concluídas: '+completed+'\nAproveitamento: '+(w+l+draw?Math.round(w*100/(w+l+draw)):0)+'%\nÚltimas partidas 7.0:\n'+history.slice(-8).reverse().map(x=>x.game+' • '+x.result).join('\n'));}
 const key=shared.has(name)?name:name+':'+id;let g=d.matches[key];
 const render=(notice='',changed=false)=>image(name,g,d.theme,notice).then(v=>out(v,changed));
 const create=(ids,difficulty='medio',seconds=90,start=true)=>{if(Object.keys(d.matches).length>=60)return false;g=d.matches[key]={ids,started:false,difficulty,seconds,expires:now+day,turn:0,match:randomBytes(8).toString('hex')};if(start){init(name,g,choose);duration(g,now);}return true;};
 if(arg==='novo'||/^bot(?: (facil|medio|dificil))?$/.test(arg)){
 if(g&&!g.done)return out('Partida ativa. Use :'+name+' mesa ou sair.');
 if(arg.startsWith('bot')&&!dual.has(name))return out('Modo bot disponível em Conecta 4, Reversi e Pontinhos.');
 const solo=!shared.has(name)||arg.startsWith('bot');if(!create(solo&&dual.has(name)?[id,bot]:[id],arg.split(' ')[1]||'medio',dual.has(name)?90:0,solo))return out('Limite de partidas atingido.');delete d.rematches[key];return render('',true);}
 if(arg==='revanche'){const r=d.rematches[key];if(!r||!r.ids.includes(id)||g&&!g.done)return out('Revanche indisponível.');if(!r.yes.includes(id))r.yes.push(id);if(r.ids.filter(k=>k!==bot).every(k=>r.yes.includes(k))){if(!create(r.ids,r.difficulty,r.seconds,true))return out('Limite atingido.');delete d.rematches[key];return render('Revanche iniciada!',true);}return out('Revanche solicitada. Outro jogador: :'+name+' revanche.',true);}
 if(!g)return out('Use :'+name+' novo.');
 if(['mesa','m','assistir',''].includes(arg))return render(g.result||'');
 if(!g.ids.includes(id)&&arg!=='entrar')return out('Você é espectador. Use :'+name+' assistir.');
 if(arg==='sair'){if(!g.ids.includes(id))return out('Você não participa.');delete d.matches[key];delete d.rematches[key];return out('Partida encerrada.',true);}
 if(arg==='entrar'){if(!shared.has(name)||g.started||g.ids.includes(id)||g.ids.length>=2)return out('Inscrição indisponível.');g.ids.push(id);return render('Participante inscrito.',true);}
 if(/^tempo (0|30|60|90|120|180)$/.test(arg)){if(!dual.has(name)||g.ids[0]!==id||g.started)return out('O criador configura o tempo antes de iniciar.');g.seconds=Number(arg.split(' ')[1]);return render('Tempo: '+(g.seconds||'sem limite'),true);}
 if(arg==='iniciar'){if(g.started||g.ids[0]!==id||g.ids.length<2)return out('O criador inicia com dois participantes.');init(name,g,choose);duration(g,now);return render('Partida iniciada!',true);}
 if(!g.started||g.done)return out(g.done?'Partida concluída. Use revanche ou novo.':'Aguardando início.');
 if(dual.has(name)){
 if(g.deadline&&now>=g.deadline){const winner=g.ids[1-g.turn];finish(d,state,key,name,g,winner,now,tag(g,winner)+' venceu por tempo.');return render(g.result,true);}
 if(g.ids[g.turn]!==id)return out('Aguarde sua vez.');
 const result=dualMove(name,g,arg);if(result.error)return out(result.error);let win=result.win;
 for(let n=0;n<24&&win===undefined&&g.ids[g.turn]===bot;n++){const a=aiMove(name,g,choose),r=dualMove(name,g,a);if(r.error)break;win=r.win;}
 if(win!==undefined){finish(d,state,key,name,g,win,now,win===null?'Empate!':tag(g,win)+' venceu!');return render(g.result,true);}
 duration(g,now);return render('',true);}
 let won=false,loss=false,notice='';
 if(name==='mastermind'){if(!/^[1-6]{4}$/.test(arg))return out('Digite 4 números de 1 a 6, ex.: 1234.');const guess=[...arg].map(Number),secret=g.secret.slice(),rest=[];let exact=0,near=0;guess.forEach((v,i)=>{if(v===secret[i]){exact++;secret[i]=0;}else rest.push(v);});for(const v of rest){const i=secret.indexOf(v);if(i>=0){near++;secret[i]=0;}}g.guesses.push({word:arg,exact,near});won=exact===4;loss=!won&&g.guesses.length>=10;if(loss)notice='Código: '+g.secret.join('');}
 if(name==='nonograma'){if(arg==='conferir'){won=g.secret.every((v,i)=>v===(g.b[i]===1?1:0));if(!won)return out('Ainda há casas incorretas.');}else {const i=rowcol(arg.replace(/^x /,''),5);if(i<0)return out('Use a1, x a1 ou conferir.');g.b[i]=arg.startsWith('x ')?2:g.b[i]===1?0:1;won=g.secret.every((v,i)=>v===(g.b[i]===1?1:0));}}
 if(name==='deslizante'){if(!/^[1-8]$/.test(arg))return out('Escolha uma peça de 1 a 8.');const i=g.b.indexOf(Number(arg)),z=g.b.indexOf(0);if(Math.abs(i%3-z%3)+Math.abs(Math.floor(i/3)-Math.floor(z/3))!==1)return out('A peça precisa estar ao lado do espaço vazio.');[g.b[z],g.b[i]]=[g.b[i],g.b[z]];won=g.b.every((v,i)=>v===(i+1)%9);}
 if(name==='diferencas'){const i=rowcol(arg,5);if(i<0||g.found.includes(i))return out('Escolha uma coordenada ainda não marcada.');if(!g.diff.includes(i))notice='Essa casa é igual.';else g.found.push(i);won=g.found.length===5;}
 if(name==='rummikub'){const m=/^([1-9]) ([1-9]) ([1-9])$/.exec(arg);if(!m)return out('Escolha três posições, ex.: 1 2 3.');const ix=m.slice(1).map(x=>Number(x)-1);if(new Set(ix).size!==3||ix.some(i=>g.used.includes(i)))return out('Escolha três peças livres distintas.');const ts=ix.map(i=>g.tiles[i]),nums=ts.map(t=>t.n).sort((a,b)=>a-b);const set=nums.every(n=>n===nums[0])&&new Set(ts.map(t=>t.c)).size===3,run=ts.every(t=>t.c===ts[0].c)&&nums[1]===nums[0]+1&&nums[2]===nums[1]+1;if(!set&&!run)return out('Combinação inválida.');g.used.push(...ix);g.melds.push(ix);won=g.used.length===9;}
 if(name==='quizmusical'||name==='investigacao'){if(!/^[123]$/.test(arg))return out('Escolha 1, 2 ou 3.');const pool=name==='quizmusical'?music:cases;if(Number(arg)!==pool[g.stage][2])return out('Reveja a pista. Tente outra alternativa.');if(name==='investigacao'&&g.ids[g.turn]!==id)return out('Aguarde a vez do outro investigador.');g.stage++;if(name==='investigacao')g.turn=(g.turn+1)%g.ids.length;won=g.stage===pool.length;}
 g.moves++;duration(g,now);if(won||loss){finish(d,state,key,name,g,won?id:bot,now,won?'Desafio concluído!':'Fim de jogo. '+notice);return render(g.result,true);}return render(notice,true);
}

export async function game7Tick(state,now=Date.now()){
 const d=state.game7;if(!d)return {changed:false,notices:[]};
 const notices=[];let changed=false;
 for(const [k,g] of Object.entries(d.matches||{})){
 if(g.expires<=now){delete d.matches[k];changed=true;continue;}
 if(!dual.has(k)||!g.started||g.done||!g.deadline||g.deadline>now)continue;
 const winner=g.ids[1-g.turn];finish(d,state,k,k,g,winner,now,tag(g,winner)+' venceu por tempo.');notices.push({name:k,content:await image(k,g,d.theme,g.result)});changed=true;
 }
 for(const [k,r] of Object.entries(d.rematches||{}))if(r.expires<=now){delete d.rematches[k];changed=true;}
 return {changed,notices};
}
