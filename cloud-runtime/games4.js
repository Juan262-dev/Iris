import { randomInt } from 'node:crypto';
import sharp from 'sharp';
import { unoPublic,unoPrivate,validUnoRoute } from './unoVisual.js';
export const games4=['domino','unobot','cruzadas','2048','quizmulti','batalhaconhecimento','tesouro','bingoeducativo'];
const out=(text,changed=false)=>({text,changed}),label=id=>'Jogador '+id.slice(0,6),day=86400000;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const shuffle=(a,choose)=>{for(let i=a.length-1;i>0;i--){const j=choose(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const questions=[
 ['Qual é o planeta vermelho?',['Marte','Vênus','Mercúrio'],0],['Quanto é 9 × 7?',['54','63','72'],1],['Qual é o maior oceano?',['Índico','Atlântico','Pacífico'],2],['Qual gás as plantas absorvem na fotossíntese?',['CO2','Hélio','Argônio'],0],['Quantos lados tem um octógono?',['6','8','10'],1],['Qual órgão bombeia sangue?',['Pulmão','Estômago','Coração'],2],['Qual é o plural de papel?',['Papéis','Papels','Papelões'],0],['Qual é a capital do Ceará?',['Natal','Fortaleza','Recife'],1]
];
const card=(q)=>q[0]+'\n'+q[1].map((x,i)=>(i+1)+'. '+x).join('\n');
const tiles=()=>Array.from({length:7},(_,i)=>Array.from({length:7-i},(_,j)=>[i,i+j])).flat();
const colorNames={v:'vermelho',a:'amarelo',g:'verde',b:'azul'};
const numbers=['v','a','g','b'].flatMap(c=>Array.from({length:10},(_,i)=>[c+i,c+i]).flat());
const bot='iris-bot';
function spawn(b,choose){const free=b.map((v,i)=>v===0?i:-1).filter(i=>i>=0);if(free.length)b[free[choose(free.length)]]=choose(10)===0?4:2;}
export function slide2048(b,dir){
    const board=b.slice();let score=0;
    for(let r=0;r<4;r++){
        const ix=Array.from({length:4},(_,j)=>dir==='esquerda'?4*r+j:dir==='direita'?4*r+3-j:dir==='cima'?r+4*j:r+4*(3-j));
        const values=ix.map(i=>b[i]).filter(Boolean),next=[];
        for(let i=0;i<values.length;i++){if(values[i]===values[i+1]){const v=2*values[i];next.push(v);score+=v;i++;}else next.push(values[i]);}
        ix.forEach((k,i)=>board[k]=next[i]||0);
    }
    return {board,score,changed:board.some((v,i)=>v!==b[i])};
}
async function picture(title,lines){
    const h=100+lines.length*45;
    const body='<rect width="620" height="'+h+'" rx="20" fill="#201831"/><text x="24" y="43" font-size="26" fill="#e4d5ff" font-weight="bold">'+esc(title)+'</text>'+lines.map((l,i)=>'<rect x="20" y="'+(62+i*45)+'" width="580" height="38" rx="8" fill="#382b55"/><text x="34" y="'+(88+i*45)+'" font-size="19" fill="#fff">'+esc(l)+'</text>').join('');
    return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="620" height="'+h+'"><g font-family="sans-serif">'+body+'</g></svg>')).png().toBuffer();
}
async function board2048(g){
    const colors=['#382b55','#705392','#8b64ab','#aa78a7','#bc8865','#c69b58','#c7ad65'];
    const body=['<rect width="460" height="540" rx="20" fill="#201831"/>','<text x="24" y="44" fill="#fff" font-size="30">2048 • '+g.score+' pts</text>'];
    g.b.forEach((v,i)=>{const x=22+(i%4)*106,y=75+Math.floor(i/4)*106;body.push('<rect x="'+x+'" y="'+y+'" width="100" height="100" rx="10" fill="'+colors[v?Math.min(6,Math.log2(v)):0]+'"/>');if(v)body.push('<text x="'+(x+50)+'" y="'+(y+62)+'" font-size="34" fill="white" text-anchor="middle">'+v+'</text>');});
    return {image:await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="460" height="540"><g font-family="sans-serif">'+body.join('')+'</g></svg>')).png().toBuffer(),caption:':2048 cima | baixo | esquerda | direita | sair'};
}
function award(state,id,key,points=1){const p=state.players[id];if(!p)return;const month=new Date().toISOString().slice(0,7);if(p.season4?.month!==month)p.season4={month,points:0};p.season4.points=Math.min(100000,p.season4.points+points);p.games4??={};p.games4[key]=Math.min(100000,(p.games4[key]||0)+1);}
function ownGame(db,name,id,now){const all=db[name]??={};for(const [k,g] of Object.entries(all))if(g.expires<=now)delete all[k];return all;}
const puzzles=[{rows:['SOL','A#U','L#A'],clues:['1H: estrela do nosso sistema (3)','1V: tempero comum (3)','2V: satélite natural (3)'],words:['sol','sal','lua']}];
export async function game4({name,arg='',state,id,now=Date.now(),choose=randomInt,route=null,owner=false}){
    if(!games4.includes(name))return null;
    arg=String(arg).trim().toLowerCase();const db=state.games4??={};
    if(name==='2048'){
        const all=ownGame(db,name,id,now);let g=all[id];
        if(arg==='sair'){delete all[id];return out('2048 encerrado.',true);}
        if(arg==='novo'){if(g)return out('Já existe uma partida. :2048 sair.');if(Object.keys(all).length>=50)return out('Limite de partidas.');g=all[id]={b:Array(16).fill(0),score:0,expires:now+day};spawn(g.b,choose);spawn(g.b,choose);return out(await board2048(g),true);}
        if(!g)return out('Use :2048 novo.');
        if(!arg||arg==='mesa')return out(await board2048(g));
        if(!['cima','baixo','esquerda','direita'].includes(arg))return out('Use :2048 cima, baixo, esquerda ou direita.');
        const m=slide2048(g.b,arg);if(!m.changed)return out('Movimento sem mudança.');
        g.b=m.board;g.score+=m.score;spawn(g.b,choose);g.expires=now+day;
        const result=await board2048(g);
        if(g.b.includes(2048)||!['cima','baixo','esquerda','direita'].some(d=>slide2048(g.b,d).changed)){if(g.b.includes(2048)){award(state,id,name,3);result.caption='Você chegou a 2048!';}else result.caption='Fim da partida. Pontos: '+g.score;delete all[id];}
        return out(result,true);
    }
    if(name==='unobot'){
        const all=ownGame(db,name,id,now);let g=all[id];
        const pack=async notice=>{const privateHands=await unoPrivate(g,id);for(const item of privateHands)item.content.caption=item.content.caption.replace(/Jogue no grupo:[^\n]*/,'Jogue no grupo: :unobot pos 1 ou :unobot comprar.');return {unoDelivery:{public:await unoPublic(g,notice+'\n:unobot pos 1 | comprar | mao | sair'),private:privateHands}};};
        if(arg==='sair'){delete all[id];return out('UNO solo encerrado; autorização privada removida.',true);}
        if(arg==='novo'){if(g)return out('Já existe uma partida.');if(Object.keys(all).length>=30)return out('Limite de partidas.');if(!validUnoRoute(route))return out('Não consegui validar seu contato.');g=all[id]={ids:[id,bot],names:{[id]:label(id),[bot]:'Íris'},routes:{[id]:route},hands:{[id]:[],[bot]:[]},deck:shuffle(numbers.slice(),choose),discard:[],dir:1,turn:0,expires:now+day};for(const k of g.ids)for(let j=0;j<7;j++)g.hands[k].push(g.deck.pop());const top=g.deck.pop();g.discard.push(top);g.color=top[0];return out(await pack('UNO solo numérico (sem cartas especiais). Sua mão será enviada somente no privado.'),true);}
        if(!g)return out('Use :unobot novo para jogar e autorizar a mão no privado.');
        if(arg==='pv'){if(!validUnoRoute(route))return out('Contato inválido.');g.routes[id]=route;return out(await pack('Mão privada atualizada.'),true);}
        if(!arg||arg==='mesa')return out(await unoPublic(g,'UNO solo • :unobot mao para receber sua mão.'));
        if(arg==='mao')return out(await pack('Mão enviada no privado.'));
        const take=()=>{if(!g.deck.length&&g.discard.length>1){const last=g.discard.pop();g.deck=shuffle(g.discard,choose);g.discard=[last];}return g.deck.pop();};
        const legal=c=>c[0]===g.color||c[1]===g.discard.at(-1)[1];
        const play=(k,c)=>{g.hands[k].splice(g.hands[k].indexOf(c),1);g.discard.push(c);g.color=c[0];};
        if(arg==='comprar'){const c=take();if(c)g.hands[id].push(c);}
        else{const m=/^(?:pos )([1-9]\d?)$/.exec(arg);const c=m?g.hands[id][Number(m[1])-1]:arg;if(!c||!g.hands[id].includes(c)||!legal(c))return out('Carta inválida. Consulte :unobot mao.');play(id,c);}
        if(!g.hands[id].length){award(state,id,name,3);const result=await unoPublic(g,'Você venceu a Íris!');delete all[id];return out(result,true);}
        const c=g.hands[bot].find(legal);if(c)play(bot,c);else{const drawn=take();if(drawn)g.hands[bot].push(drawn);}
        if(!g.hands[bot].length){const result=await unoPublic(g,'Íris venceu!');delete all[id];return out(result,true);}
        g.expires=now+day;return out(await pack(c?'Íris jogou uma carta.':'Íris comprou uma carta.'),true);
    }
    let g=db[name];if(g&&g.expires<=now){delete db[name];g=null;}
    if(arg==='sair'){if(g?.ids?.[0]===id||name==='domino'&&g?.ids?.includes(id)||owner){delete db[name];return out('Partida encerrada.',true);}return out('Somente o criador encerra.');}
    if(name==='domino'){
        if(arg==='novo'||arg==='desafio'){if(g)return out('Já existe um dominó.');db[name]={ids:[id],routes:{},expires:now+600000};return out('Dominó de dois jogadores. :domino entrar; cada um :domino pv; criador :domino iniciar.',true);}
        if(!g)return out('Use :domino novo.');
        if(arg==='entrar'){if(g.ids.length!==1||g.ids.includes(id))return out('Desafio indisponível.');g.ids.push(id);return out('Dupla pronta. Cada jogador confirma :domino pv.',true);}
        if(!g.ids.includes(id))return out('Você não participa.');
        const pack=async (ids,caption)=>({unoDelivery:{public:caption,private:ids.filter(k=>validUnoRoute(g.routes[k])).map(k=>({to:g.routes[k],content:{text:'Sua mão de dominó: '+g.hands[k].map(t=>t.join('-')).join(' | ')+'\n:domino jogar 1-2 esquerda (ou direita); :domino comprar.'}}))}});
        if(arg==='pv'){if(!validUnoRoute(route)||Object.entries(g.routes).some(([k,v])=>k!==id&&v===route))return out('Contato inválido.');g.routes[id]=route;return out(g.hands?await pack([id],'Mão privada reenviada.'):'PV confirmado.',true);}
        if(arg==='iniciar'){if(g.ids[0]!==id||g.ids.length!==2||g.hands||!g.ids.every(k=>validUnoRoute(g.routes[k])))return out('Criador inicia após os dois confirmarem PV.');g.deck=shuffle(tiles(),choose);g.hands=Object.fromEntries(g.ids.map(k=>[k,g.deck.splice(0,7)]));g.chain=[g.deck.pop()];g.turn=0;g.passes=0;g.expires=now+day;return out(await pack(g.ids,'Dominó iniciado. Mesa: '+g.chain[0].join('-')+' | Vez: '+label(g.ids[0])),true);}
        if(!g.hands)return out('Aguardando início.');
        if(arg==='mao')return out(await pack([id],'Mão privada.'));
        const table=()=> 'Mesa: '+g.chain.map(t=>t.join('-')).join(' | ')+'\n'+g.ids.map(k=>label(k)+': '+g.hands[k].length+' peças').join(' | ')+'\nVez: '+label(g.ids[g.turn]);
        if(!arg||arg==='mesa')return out(table());
        if(g.ids[g.turn]!==id)return out('Aguarde sua vez.');
        const hand=g.hands[id],left=g.chain[0][0],right=g.chain.at(-1)[1],legal=t=>t.includes(left)||t.includes(right);
        if(arg==='comprar'){if(hand.some(legal))return out('Você possui uma peça jogável.');if(g.deck.length){hand.push(g.deck.pop());return out(await pack([id],table()),true);}g.turn=1-g.turn;g.passes++;if(g.passes>=2){const sums=g.ids.map(k=>g.hands[k].flat().reduce((a,b)=>a+b,0));const w=sums[0]===sums[1]?null:g.ids[sums[0]<sums[1]?0:1];if(w)award(state,w,name,3);delete db[name];return out(w?label(w)+' venceu por menor soma.':'Empate!',true);}return out(table(),true);}
        const m=/^jogar ([0-6])-([0-6]) (esquerda|direita)$/.exec(arg);if(!m)return out('Use :domino jogar 1-2 esquerda ou direita.');
        const a=Number(m[1]),b=Number(m[2]),i=hand.findIndex(t=>t.includes(a)&&t.includes(b)&&(a!==b||t[0]===t[1])),end=m[3]==='esquerda'?left:right;
        if(i<0||![a,b].includes(end))return out('Peça não disponível ou incompatível.');
        const other=a===end?b:a;if(m[3]==='esquerda')g.chain.unshift([other,end]);else g.chain.push([end,other]);hand.splice(i,1);g.passes=0;
        if(!hand.length){award(state,id,name,3);delete db[name];return out(label(id)+' venceu o dominó!',true);}
        g.turn=1-g.turn;g.expires=now+day;return out(await pack([id],table()),true);
    }
    if(name==='cruzadas'){
        const p=puzzles[0];if(arg==='novo'){if(g)return out('Já existe uma cruzada.');g=db[name]={ids:[id],solved:[],expires:now+day};}
        if(!g)return out('Use :cruzadas novo.');
        const m=/^resposta ([123]) ([a-z]+)$/.exec(arg);if(m){const i=Number(m[1])-1;if(g.solved.includes(i))return out('Pista já resolvida.');if(p.words[i]!==m[2])return out('Tente outra palavra.');g.solved.push(i);award(state,id,name);if(g.solved.length===p.words.length){delete db[name];return out('Palavras cruzadas concluídas!',true);}}
        const lines=p.rows.map((r,y)=>Array.from(r).map((c,x)=>c==='#'?'■':(g.solved.includes(0)&&y===0||g.solved.includes(1)&&x===0||g.solved.includes(2)&&x===2)?c:'□').join('   '));
        return out({image:await picture('PALAVRAS CRUZADAS',lines.concat(p.clues)),caption:':cruzadas resposta 1 sol (responda pelo número da pista).'},arg==='novo'||!!m);
    }
    if(name==='tesouro'){
        const clues=[['Onde livros costumam morar?','biblioteca'],['O que ilumina o dia?','sol'],['O que marca as horas?','relogio']];
        if(arg==='novo'){if(g)return out('Já existe uma caça.');g=db[name]={ids:[id],index:0,expires:now+day};return out('Caça ao tesouro virtual: '+clues[0][0]+' :tesouro resposta palavra.',true);}
        if(!g)return out('Use :tesouro novo.');
        if(arg.startsWith('resposta ')&&arg.slice(9)===clues[g.index][1]){award(state,id,name);g.index++;if(g.index===clues.length){delete db[name];return out('Tesouro simbólico descoberto!',true);}return out('Próxima pista: '+clues[g.index][0],true);}
        return out(clues[g.index][0]+' — :tesouro resposta palavra.');
    }
    // Timed educational rounds; no wagers, random prizes, or real-world rewards.
    const isBingo=name==='bingoeducativo';
    if(arg==='novo'){if(g)return out('Já existe uma rodada.');g=db[name]={ids:[id],scores:{[id]:0},marks:{[id]:[]},round:0,answered:{},expires:now+600000};return out((isBingo?'Bingo de conhecimentos (marque respostas corretas, sem sorteio ou apostas).':'Quiz multiplayer')+'\n:'+name+' entrar | iniciar.',true);}
    if(!g)return out('Use :'+name+' novo.');
    if(arg==='entrar'){if(g.started||g.ids.includes(id)||g.ids.length>=12)return out('Inscrição indisponível.');g.ids.push(id);g.scores[id]=0;g.marks[id]=[];return out('Inscrição concluída.',true);}
    const score=()=>Object.entries(g.scores).sort((a,b)=>b[1]-a[1]).map(([k,v])=>label(k)+': '+v).join('\n');
    if(arg==='placar')return out(g.started&&Object.keys(g.answered).length?'Placar disponível ao fim da rodada.':score());
    if(arg==='iniciar'){if(g.ids[0]!==id||g.started)return out('Somente o criador inicia.');g.started=true;g.expires=now+day;return out(card(questions[0])+'\n:'+name+' resposta 1',true);}
    if(!g.started)return out('Aguardando início.');
    const m=/^resposta ([123])$/.exec(arg);
    if(m){if(!g.ids.includes(id)||Object.hasOwn(g.answered,id))return out('Inscrição necessária; uma resposta por rodada.');const correct=Number(m[1])-1===questions[g.round][2];g.answered[id]=true;if(correct){g.scores[id]++;g.marks[id].push(g.round);award(state,id,name);if(isBingo&&g.marks[id].length===3){const result='Bingo educativo concluído por '+label(id)+'!\n'+score();delete db[name];return out(result,true);}}if(g.ids.every(k=>g.answered[k])){g.round++;g.answered={};if(g.round===questions.length){const result='Placar final:\n'+score();delete db[name];return out(result,true);}return out('Rodada concluída.\n'+card(questions[g.round]),true);}return out('Resposta registrada. O resultado aparece no placar ao fim da rodada.',true);}
    if(arg==='proxima'&&g.ids[0]===id){g.round++;g.answered={};if(g.round===questions.length){const result=score();delete db[name];return out('Placar final:\n'+result,true);}return out(card(questions[g.round]),true);}
    return out(card(questions[g.round])+'\n:'+name+' resposta 1 | placar');
}
export function removeGames4(state,id){const db=state.games4;if(!db)return;for(const key of ['2048','unobot'])if(db[key])delete db[key][id];for(const key of games4.filter(k=>!['2048','unobot'].includes(k)))if(db[key]?.ids?.includes(id))delete db[key];}
