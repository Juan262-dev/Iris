import { randomInt } from 'node:crypto';
import sharp from 'sharp';
export const games5=['ludo','sudoku','termo','revanche','historicopartidas'];
const out=(text,changed=false)=>({text,changed}),day=86400000,label=k=>'Jogador '+k.slice(0,6);
const words=['amigo','vento','verde','nuvem','livro','pedra','flores','prato','plano','piano','campo','folha','ponte','trigo','areia','noite','chuva','canto','claro','brisa','grato','sorte','trevo','mundo','linha','festa','barco','fruta','coisa','carta','porta','pluma','farol','astro','palma','trama','tarde','letra','conto','metro','norte','ponto','jogos','dados','casas','cores','mares','horta','aroma','vapor','solar','lunar','frota','flora','fauna','manga','morro','gruta','praia','lagoa'].filter(w=>w.length===5);
const normalize=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=(a,choose)=>{for(let i=a.length-1;i>0;i--){const j=choose(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
export function recordMatch5(state,id,game,result,now=Date.now()){
 const p=state.players[id];if(!p)return;
 p.matchHistory5??=[];p.matchHistory5.push({game,result,at:now});p.matchHistory5=p.matchHistory5.slice(-30);
 p.stats5??={};const s=p.stats5[game]??={wins:0,losses:0,draws:0,completed:0};const k=result==='vitória'?'wins':result==='derrota'?'losses':result==='empate'?'draws':'completed';s[k]=Math.min(100000,(s[k]||0)+1);
}
export function scoreWord(guess,answer){const a=[...answer],r=Array(5).fill(0);for(let i=0;i<5;i++)if(guess[i]===a[i]){r[i]=2;a[i]=null;}for(let i=0;i<5;i++)if(r[i]!==2){const j=a.indexOf(guess[i]);if(j>=0){r[i]=1;a[j]=null;}}return r;}
function render(w,h,body){return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="'+w+'" height="'+h+'" rx="20" fill="#201831"/><g font-family="sans-serif">'+body+'</g></svg>')).png().toBuffer();}
const text=(x,y,s,size=20,color='#fff')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" text-anchor="middle">'+esc(s)+'</text>';
function sudokuValid(b,i,v){const r=Math.floor(i/9),c=i%9;for(let j=0;j<81;j++)if(j!==i&&b[j]===v&&(Math.floor(j/9)===r||j%9===c||Math.floor(Math.floor(j/9)/3)===Math.floor(r/3)&&Math.floor((j%9)/3)===Math.floor(c/3)))return false;return true;}
export function countSolutions(board,limit=2){const b=board.slice();let count=0,nodes=0;function solve(){if(count>=limit||++nodes>30000)return;let index=-1,opts=null;for(let i=0;i<81;i++)if(!b[i]){const a=[1,2,3,4,5,6,7,8,9].filter(v=>sudokuValid(b,i,v));if(!a.length)return;if(!opts||a.length<opts.length){index=i;opts=a;if(a.length===1)break;}}if(index<0){count++;return;}for(const v of opts){b[index]=v;solve();b[index]=0;if(count>=limit)return;}}solve();return nodes>30000?limit:count;}
export function makeSudoku(level,choose=randomInt){const digits=shuffle([1,2,3,4,5,6,7,8,9],choose),rows=shuffle([0,1,2],choose).flatMap(k=>shuffle([0,1,2],choose).map(v=>k*3+v)),cols=shuffle([0,1,2],choose).flatMap(k=>shuffle([0,1,2],choose).map(v=>k*3+v));const solution=rows.flatMap(r=>cols.map(c=>digits[(r*3+Math.floor(r/3)+c)%9])),b=solution.slice();const target={facil:35,medio:45,dificil:51}[level];let removed=0;for(const i of shuffle(Array.from({length:81},(_,i)=>i),choose)){if(removed>=target)break;const v=b[i];b[i]=0;if(countSolutions(b)===1)removed++;else b[i]=v;}return {b,initial:b.slice(),solution,level};}
async function sudokuImage(g){let body=text(270,38,'SUDOKU • '+g.level.toUpperCase(),27,'#d8b4fe');for(let i=0;i<81;i++){const x=33+i%9*52,y=58+Math.floor(i/9)*52;body+='<rect x="'+x+'" y="'+y+'" width="51" height="51" rx="4" fill="'+(g.initial[i]?'#44325e':'#302546')+'"/>';if(g.b[i])body+=text(x+25,y+35,g.b[i],24,g.initial[i]?'#e6d4ff':'#91e6d1');}for(let i=0;i<=9;i+=3){body+='<path d="M '+(32+i*52)+' 57 V 527 M 32 '+(57+i*52)+' H 502" stroke="#b69ad8" stroke-width="3"/>';}return {image:await render(540,560,body),caption:':sudoku jogar linha coluna número (ex.: :sudoku jogar 1 2 5). :sudoku limpar 1 2 | sair'};}
async function wordImage(g){const palette=['#544765','#b28939','#388060'];let body=text(225,37,'TERMO',30,'#e4d5ff');for(let r=0;r<6;r++)for(let i=0;i<5;i++){const x=28+i*80,y=58+r*66,entry=g.guesses[r];body+='<rect x="'+x+'" y="'+y+'" width="74" height="60" rx="8" fill="'+(entry?palette[entry.score[i]]:'#302546')+'"/>';if(entry)body+=text(x+37,y+42,entry.word[i].toUpperCase(),31);}return {image:await render(450,476,body),caption:'Adivinhe a palavra de 5 letras. Verde = posição certa; amarelo = letra em outra posição. :termo tentar palavra'};}
const colors=['#da5266','#eab94f','#4db98a','#6696e1'];
const ludoLabel=(g,k)=>label(k)+' ('+['vermelho','amarelo','verde','azul'][g.ids.indexOf(k)]+')';
async function ludoBoard(g){let body=text(340,40,'LUDO • CORRIDA DE PEÇAS',28,'#e3d5ff');const pts=[];for(let i=0;i<40;i++){const a=2*Math.PI*i/40-Math.PI/2;pts.push([340+230*Math.cos(a),300+230*Math.sin(a)]);}pts.forEach(([x,y],i)=>{body+='<circle cx="'+x+'" cy="'+y+'" r="15" fill="'+(i%10===0?colors[i/10]:'#49375d')+'"/>';body+=text(x,y+5,i+1,11);});g.ids.forEach((id,i)=>g.pieces[id].forEach((p,j)=>{let x,y;if(p<0){x=260+i%2*145+j*24;y=228+Math.floor(i/2)*120;}else if(p>=40){x=260+i%2*145+j*24;y=265+Math.floor(i/2)*120;}else{[x,y]=pts[(p+i*10)%40];x+=(j-1)*6;y+=(i-1)*5;}body+='<circle cx="'+x+'" cy="'+y+'" r="11" stroke="#fff" stroke-width="2" fill="'+colors[i]+'"/>'+text(x,y+4,j+1,11); }));return {image:await render(680,570,body),caption:'Ludo simplificado • '+ludoLabel(g,g.ids[g.turn])+' • '+(g.roll?'dado '+g.roll+'; :ludo mover 1/2':' :ludo dado')+'\nCada jogador tem 2 peças, entrada com 6, chegada exata e captura fora das casas iniciais.'};}
export async function game5({name,arg='',state,id,now=Date.now(),choose=randomInt,owner=false}){
 if(!games5.includes(name))return null;arg=normalize(arg);const db=state.games5??={};
 if(name==='historicopartidas'){const p=state.players[id];if(!p)return out('Use :perfil.');if(arg==='apagar'){delete p.matchHistory5;return out('Histórico de partidas removido.',true);}return out('Últimas partidas registradas após a atualização:\n'+(p.matchHistory5||[]).slice(-12).reverse().map(v=>new Date(v.at).toISOString().slice(0,10)+' • '+v.game+' — '+v.result).join('\n')+'\n:historicopartidas apagar');}
 if(name==='revanche'){const m=/^(ludo|sudoku|termo)$/.exec(arg);if(!m)return out('Use :revanche ludo|sudoku|termo após encerrar sua partida. Para UNO: :unobot novo; dominó: :domino novo.');return game5({name:m[1],arg:'novo',state,id,now,choose,owner});}
 if(name==='sudoku'||name==='termo'){
 const all=db[name]??={};for(const [k,v] of Object.entries(all))if(v.expires<=now)delete all[k];let g=all[id];if(arg==='sair'){delete all[id];return out('Partida encerrada.',true);}
 if(arg==='novo'||name==='sudoku'&&/^novo (facil|medio|dificil)$/.test(arg)){
 if(g)return out('Já existe uma partida. Encerre com :'+name+' sair.');if(Object.keys(all).length>=40)return out('Limite de partidas simultâneas.');
 g=all[id]=name==='sudoku'?{...makeSudoku(arg.split(' ')[1]||'facil',choose),expires:now+day}:{answer:words[choose(words.length)],guesses:[],expires:now+day};return out(name==='sudoku'?await sudokuImage(g):await wordImage(g),true);
 }
 if(!g)return out('Use :'+name+' novo'+(name==='sudoku'?' facil | medio | dificil':'')+'.');
 if(!arg||arg==='mesa')return out(name==='sudoku'?await sudokuImage(g):await wordImage(g));
 if(name==='sudoku'){const m=/^(jogar|limpar) ([1-9]) ([1-9])(?: ([1-9]))?$/.exec(arg);if(!m||m[1]==='jogar'&&!m[4])return out('Use :sudoku jogar 1 2 5.');const i=(Number(m[2])-1)*9+Number(m[3])-1;if(g.initial[i])return out('Casa fixa.');const v=m[1]==='limpar'?0:Number(m[4]);if(v&&!sudokuValid(g.b,i,v))return out('Número repetido na linha, coluna ou bloco.');g.b[i]=v;const result=await sudokuImage(g);if(g.b.every(Boolean)){recordMatch5(state,id,name,'concluído',now);delete all[id];result.caption='Sudoku concluído!';}return out(result,true);}
 const m=/^tentar ([a-z]{5})$/.exec(arg);if(!m||!words.includes(m[1]))return out('Use uma palavra do dicionário local de cinco letras. Ex.: :termo tentar amigo.');if(g.guesses.some(v=>v.word===m[1]))return out('Palavra já tentada.');g.guesses.push({word:m[1],score:scoreWord(m[1],g.answer)});const result=await wordImage(g);if(m[1]===g.answer||g.guesses.length===6){recordMatch5(state,id,name,m[1]===g.answer?'vitória':'derrota',now);result.caption=m[1]===g.answer?'Você acertou!':'Fim de jogo. Palavra: '+g.answer;delete all[id];}return out(result,true);
 }
 let g=db.ludo;if(g&&g.expires<=now){delete db.ludo;g=null;}
 if(arg==='novo'){if(g)return out('Já existe Ludo.');db.ludo={ids:[id],expires:now+day};return out('Ludo simplificado: 2 a 4 jogadores. :ludo entrar; criador :ludo iniciar. Sem apostas.',true);}
 if(!g)return out('Use :ludo novo.');
 if(arg==='entrar'){if(g.pieces||g.ids.includes(id)||g.ids.length>=4)return out('Inscrição indisponível.');g.ids.push(id);return out('Inscrição: '+g.ids.length+'/4',true);}
 if(arg==='sair'){if(!g.ids.includes(id)&&!owner)return out('Somente participantes encerram.');delete db.ludo;return out('Ludo encerrado.',true);}
 if(arg==='iniciar'){if(g.ids[0]!==id||g.ids.length<2||g.pieces)return out('Criador inicia com 2 a 4 inscritos.');g.pieces=Object.fromEntries(g.ids.map(k=>[k,[-1,-1]]));g.turn=0;g.roll=0;return out(await ludoBoard(g),true);}
 if(!g.pieces)return out('Aguardando início.');
 if(!arg||arg==='mesa')return out(await ludoBoard(g));
 if(g.ids[g.turn]!==id)return out('Aguarde sua vez.');
 const next=()=>{g.turn=(g.turn+1)%g.ids.length;g.roll=0;};
 const possible=(p,d)=>p<0?d===6:p<40&&p+d<=40;
 if(arg==='dado'){if(g.roll)return out('Já lançou o dado. Mova uma peça.');g.roll=choose(6)+1;const d=g.roll;if(!g.pieces[id].some(p=>possible(p,d))){next();const r=await ludoBoard(g);r.caption='Dado: '+d+' • nenhum movimento válido.\n'+r.caption;return out(r,true);}return out(await ludoBoard(g),true);}
 const m=/^mover ([12])$/.exec(arg);if(!m||!g.roll)return out('Use :ludo dado, depois :ludo mover 1 ou 2.');
 const i=Number(m[1])-1,p=g.pieces[id][i],d=g.roll;if(!possible(p,d))return out('Movimento inválido. Escolha outra peça.');
 const dest=p<0?0:p+d;g.pieces[id][i]=dest;if(dest<40){const abs=(dest+g.turn*10)%40;if(abs%10!==0)g.ids.forEach((k,j)=>{if(k!==id)g.pieces[k]=g.pieces[k].map(v=>v>=0&&v<40&&(v+j*10)%40===abs?-1:v);});}
 if(g.pieces[id].every(v=>v===40)){for(const k of g.ids)recordMatch5(state,k,'ludo',k===id?'vitória':'derrota',now);const result=await ludoBoard(g);result.caption=label(id)+' venceu!';delete db.ludo;return out(result,true);}
 if(d===6)g.roll=0;else next();g.expires=now+day;return out(await ludoBoard(g),true);
}
export function removeGames5(state,id){const db=state.games5;if(!db)return;for(const k of ['sudoku','termo'])if(db[k])delete db[k][id];if(db.ludo?.ids?.includes(id))delete db.ludo;}
