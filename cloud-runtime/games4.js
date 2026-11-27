import { recordMatch5 } from './games5.js';
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
const numbers=[...['v','a','g','b'].flatMap(c=>[c+'0',...Array.from({length:9},(_,i)=>[c+(i+1),c+(i+1)]).flat(),c+'s',c+'s',c+'r',c+'r',c+'d',c+'d']),'c','c','c','c','c4','c4','c4','c4'];
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
        if(arg==='recorde')return out('Seu recorde: '+(state.players[id]?.best2048||0)+' pts. Partida: '+g.score+' pts.');
        if(!arg||arg==='mesa')return out(await board2048(g));
        if(!['cima','baixo','esquerda','direita'].includes(arg))return out('Use :2048 cima, baixo, esquerda ou direita.');
        const m=slide2048(g.b,arg);if(!m.changed)return out('Movimento sem mudança.');
        g.b=m.board;g.score+=m.score;if(state.players[id])state.players[id].best2048=Math.max(state.players[id].best2048||0,g.score);spawn(g.b,choose);g.expires=now+day;
        const result=await board2048(g);
        if(g.b.includes(2048)||!['cima','baixo','esquerda','direita'].some(d=>slide2048(g.b,d).changed)){if(g.b.includes(2048)){award(state,id,name,3);result.caption='Você chegou a 2048!';}else result.caption='Fim da partida. Pontos: '+g.score;delete all[id];}
        return out(result,true);
    }
    if(name==='unobot'){
        const all=ownGame(db,name,id,now);let g=all[id];
        const pack=async notice=>{const privateHands=await unoPrivate(g,id);for(const item of privateHands)item.content.caption=item.content.caption.replace(/Jogue no grupo:[^\n]*/,'Jogue no grupo: :unobot pos 1 azul (cor para coringas) ou :unobot comprar.');return {unoDelivery:{public:await unoPublic(g,notice+'\n:unobot pos 1 | comprar | mao | sair'),private:privateHands}};};
        if(arg==='sair'){delete all[id];return out('UNO solo encerrado; autorização privada removida.',true);}
        if(arg==='novo'){if(g)return out('Já existe uma partida.');if(Object.keys(all).length>=30)return out('Limite de partidas.');if(!validUnoRoute(route))return out('Não consegui validar seu contato.');g=all[id]={ids:[id,bot],names:{[id]:label(id),[bot]:'Íris'},routes:{[id]:route},hands:{[id]:[],[bot]:[]},deck:shuffle(numbers.slice(),choose),discard:[],dir:1,turn:0,expires:now+day};for(const k of g.ids)for(let j=0;j<7;j++)g.hands[k].push(g.deck.pop());const top=g.deck.splice(g.deck.findIndex(c=>/^[vagb]\d$/.test(c)),1)[0];g.discard.push(top);g.color=top[0];return out(await pack('UNO solo com pular, inverter, +2, coringa e +4. Sua mão será enviada somente no privado.'),true);}
        if(!g)return out('Use :unobot novo para jogar e autorizar a mão no privado.');
        if(arg==='pv'){if(!validUnoRoute(route))return out('Contato inválido.');g.routes[id]=route;return out(await pack('Mão privada atualizada.'),true);}
        if(!arg||arg==='mesa')return out(await unoPublic(g,'UNO solo • :unobot mao para receber sua mão.'));
        if(arg==='mao')return out(await pack('Mão enviada no privado.'));
        const take=()=>{if(!g.deck.length&&g.discard.length>1){const last=g.discard.pop();g.deck=shuffle(g.discard,choose);g.discard=[last];}return g.deck.pop();};
        const legal=(c,k)=>c==='c'||c==='c4'&&!g.hands[k].some(v=>v[0]===g.color)||!c.startsWith('c')&&(c[0]===g.color||!g.discard.at(-1).startsWith('c')&&c.slice(1)===g.discard.at(-1).slice(1));
        const draw=(k,n)=>{for(let i=0;i<n;i++){const c=take();if(c)g.hands[k].push(c);}};
        const play=(k,c,color)=>{g.hands[k].splice(g.hands[k].indexOf(c),1);g.discard.push(c);g.color=c.startsWith('c')?color:c[0];const other=k===id?bot:id;if(c==='c4'||c[1]==='d')draw(other,c==='c4'?4:2);return c==='c4'||['d','s','r'].includes(c[1]);};
        const done=async(k)=>{if(k===id)award(state,id,name,3);recordMatch5(state,id,name,k===id?'vitória':'derrota',now);const result=await unoPublic(g,k===id?'Você venceu a Íris!':'Íris venceu!');delete all[id];return out(result,true);};
        let again=false;
        if(arg==='gritar')return out(g.hands[id].length===1?'UNO!':'Você precisa ter uma carta.');
        if(arg==='comprar')draw(id,1);
        else{const m=/^(?:pos |posicao )?([1-9]\d?|[vagb][0-9srd]|c4?)(?: (vermelho|amarelo|verde|azul))?$/.exec(arg);const c=m&&(/^\d+$/.test(m[1])?g.hands[id][Number(m[1])-1]:m[1]);const color=m&&Object.keys(colorNames).find(k=>colorNames[k]===m[2]);if(!c||!g.hands[id].includes(c)||!legal(c,id)||c.startsWith('c')&&!color)return out('Carta inválida. Consulte :unobot mao. Coringa exige cor; +4 exige ausência de carta da cor atual.');again=play(id,c,color);if(!g.hands[id].length)return done(id);}
        let n=0,notice=again?'Sua carta especial mantém sua vez.':'';
        while(!again&&n++<30){const c=g.hands[bot].find(v=>!v.startsWith('c')&&legal(v,bot))||g.hands[bot].find(v=>legal(v,bot));if(!c){draw(bot,1);notice+=' Íris comprou.';break;}const color=Object.keys(colorNames).sort((a,b)=>g.hands[bot].filter(x=>x[0]===b).length-g.hands[bot].filter(x=>x[0]===a).length)[0];const extra=play(bot,c,color);notice+=' Íris jogou '+c+'.';if(!g.hands[bot].length)return done(bot);if(!extra)break;}
        g.expires=now+day;return out(await pack(notice||'Sua vez.'),true);
    }
    let g=db[name];if(g&&g.expires<=now){delete db[name];g=null;}
    if(arg==='sair'){if(g?.ids?.[0]===id||name==='domino'&&g?.ids?.includes(id)||owner){delete db[name];return out('Partida encerrada.',true);}return out('Somente o criador encerra.');}
    if(name==='domino'){
        const help='🁫 *DOMINÓ*\n:domino novo | entrar | pv | iniciar\n:domino 2 — jogar peça nº 2 (lado automático)\n:domino 2 e | :domino 2 d — esquerda ou direita\n:domino c — comprar | :domino p — passar\n:domino m — mesa | :domino mao — suas peças no PV\n:domino sair';
        if(arg==='ajuda')return out(help);
        arg=arg.normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ');
        arg=({c:'comprar',p:'passar',m:'mesa',h:'mao',i:'iniciar',e:'entrar'})[arg]||arg;
        if(arg==='novo'||arg==='desafio'){if(g)return out('Já existe um dominó. :domino mesa');db[name]={ids:[id],routes:{},expires:now+600000};return out('🁫 Sala de dominó • 2 a 4 jogadores\n:domino entrar → :domino pv → :domino iniciar\nTodos confirmam o privado antes do início.',true);}
        if(!g)return out(help);
        if(arg==='entrar'){if(g.hands||g.ids.length>=4||g.ids.includes(id))return out('Inscrição indisponível.');g.ids.push(id);return out('Inscrição registrada ('+g.ids.length+'/4). Confirme :domino pv.',true);}
        if(!g.ids.includes(id))return out('Você não participa.');
        // Numbers are stable for each player's hand, including after draws.
        const tileKey=t=>[...t].sort((a,b)=>a-b).join('-');
        const slots=k=>g.slots?.[k]||Object.fromEntries(g.hands[k].map((t,i)=>[tileKey(t),i+1]));
        const ensureSlots=()=>{g.slots??=Object.fromEntries(g.ids.map(k=>[k,slots(k)]));};
        const player=k=>'Jogador '+(g.ids.indexOf(k)+1);
        const ends=()=>[g.chain[0][0],g.chain.at(-1)[1]];
        const table=()=> '🁫 *Mesa do dominó*\n'+g.chain.map(t=>'['+t.join('│')+']').join(' ')+'\nPontas: E '+ends()[0]+' • D '+ends()[1]+'\n'+g.ids.map(k=>player(k)+': '+g.hands[k].length+' peças').join(' | ')+'\nVez: '+player(g.ids[g.turn])+' • Monte: '+g.deck.length+'\n:domino m | c | p | mao';
        const pack=async (ids,caption)=>({unoDelivery:{public:caption,game:'domino',private:ids.filter(k=>validUnoRoute(g.routes[k])).map(k=>{
            const [l,r]=ends();return {to:g.routes[k],content:{text:'🁫 *Suas peças*\n'+g.hands[k].map(t=>{const sides=[t.includes(l)?'E':'',t.includes(r)?'D':''].filter(Boolean).join('/');return slots(k)[tileKey(t)]+'. ['+t.join('│')+']'+(sides?' • '+sides:'');}).join('\n')+'\n\n'+(g.ids[g.turn]===k?'É sua vez!':'Aguarde sua vez.')+'\nNo grupo: :domino 2 (automático), :domino 2 e ou :domino 2 d.\n:domino c (comprar) | :domino p (passar). Os números das peças não mudam.'}};
        })}});
        if(arg==='pv'){if(!validUnoRoute(route)||Object.entries(g.routes).some(([k,v])=>k!==id&&v===route))return out('Contato inválido.');g.routes[id]=route;return out(g.hands?await pack([id],'Mão privada reenviada.'):'PV confirmado ('+g.ids.filter(k=>validUnoRoute(g.routes[k])).length+'/'+g.ids.length+').',true);}
        if(arg==='iniciar'){if(g.ids[0]!==id||g.ids.length<2||g.ids.length>4||g.hands||!g.ids.every(k=>validUnoRoute(g.routes[k])))return out('Criador inicia após 2 a 4 jogadores confirmarem PV.');g.deck=shuffle(tiles(),choose);g.hands=Object.fromEntries(g.ids.map(k=>[k,g.deck.splice(0,g.ids.length===4?6:7)]));g.chain=[g.deck.pop()];g.turn=0;g.passes=0;g.expires=now+day;ensureSlots();return out(await pack(g.ids,'Dominó iniciado!\n'+table()),true);}
        if(!g.hands)return out('Aguardando início.');
        if(arg==='mao'||arg==='opcoes')return out(await pack([id],'Mão privada enviada.'));
        if(!arg||arg==='mesa')return out(table());
        if(g.ids[g.turn]!==id)return out('Aguarde sua vez.');
        const hand=g.hands[id],[left,right]=ends(),legal=t=>t.includes(left)||t.includes(right);
        if(arg==='comprar'||arg==='passar'){
            if(hand.some(legal))return out('Você possui uma peça jogável. Consulte :domino mao.');
            if(g.deck.length){if(arg==='passar')return out('Ainda há peças no monte. Use :domino c.');ensureSlots();const drawn=g.deck.pop(),map=g.slots[id];map[tileKey(drawn)]=Math.max(0,...Object.values(map))+1;hand.push(drawn);g.expires=now+day;return out(await pack([id],table()),true);}
            g.turn=(g.turn+1)%g.ids.length;g.passes++;g.expires=now+day;
            if(g.passes>=g.ids.length){const sums=g.ids.map(k=>g.hands[k].flat().reduce((a,b)=>a+b,0));const low=Math.min(...sums), winners=g.ids.filter((_,i)=>sums[i]===low),w=winners.length===1?winners[0]:null;if(w)award(state,w,name,3);for(const k of g.ids)recordMatch5(state,k,name,w?(k===w?'vitória':'derrota'):'empate',now);delete db[name];return out(w?player(w)+' venceu por menor soma.':'Empate!',true);}
            return out(await pack([g.ids[g.turn]],table()),true);
        }
        const old=/^jogar ([0-6])-([0-6]) (esquerda|direita)$/.exec(arg),m=/^(?:jogar |pos )?([1-9]|1[0-9]|2[0-8])(?: ?(e|d|esquerda|direita))?$/.exec(arg);
        if(!old&&!m)return out(help);
        const i=old?hand.findIndex(t=>tileKey(t)===tileKey([Number(old[1]),Number(old[2])])):hand.findIndex(t=>slots(id)[tileKey(t)]===Number(m[1]));
        if(i<0)return out('Peça indisponível. Consulte :domino mao.');
        const [a,b]=hand[i],canL=hand[i].includes(left),canR=hand[i].includes(right);
        let side=old?old[3]:m[2];
        if(!canL&&!canR)return out('Essa peça não encaixa em nenhuma ponta.');
        if(!side){if(canL&&canR&&left!==right)return out('Encaixa dos dois lados! Use :domino '+m[1]+' e ou :domino '+m[1]+' d.');side=canL?'e':'d';}
        const isLeft=side==='e'||side==='esquerda',end=isLeft?left:right;
        if(!hand[i].includes(end))return out('Peça incompatível com essa ponta.');
        ensureSlots();const other=a===end?b:a;if(isLeft)g.chain.unshift([other,end]);else g.chain.push([end,other]);hand.splice(i,1);g.passes=0;
        if(!hand.length){award(state,id,name,3);for(const k of g.ids)recordMatch5(state,k,name,k===id?'vitória':'derrota',now);delete db[name];return out('🏆 '+player(id)+' venceu o dominó!',true);}
        g.turn=(g.turn+1)%g.ids.length;g.expires=now+day;return out(await pack([id,g.ids[g.turn]],table()),true);
    }
    if(name==='cruzadas'){
        const p=puzzles[0];if(arg==='novo'){if(g)return out('Já existe uma cruzada.');g=db[name]={ids:[id],solved:[],expires:now+day};}
        if(!g)return out('Use :cruzadas novo.');
        if(!g.ids.includes(id))return out('Já existe uma cruzada de outro jogador.');
        const m=/^resposta ([123]) ([a-z]+)$/.exec(arg);if(m){const i=Number(m[1])-1;if(g.solved.includes(i))return out('Pista já resolvida.');if(p.words[i]!==m[2])return out('Tente outra palavra.');g.solved.push(i);award(state,id,name);if(g.solved.length===p.words.length){delete db[name];return out('Palavras cruzadas concluídas!',true);}}
        const lines=p.rows.map((r,y)=>Array.from(r).map((c,x)=>c==='#'?'■':(g.solved.includes(0)&&y===0||g.solved.includes(1)&&x===0||g.solved.includes(2)&&x===2)?c:'□').join('   '));
        return out({image:await picture('PALAVRAS CRUZADAS',lines.concat(p.clues)),caption:':cruzadas resposta 1 sol (responda pelo número da pista).'},arg==='novo'||!!m);
    }
    if(name==='tesouro'){
        const clues=[['Onde livros costumam morar?','biblioteca'],['O que ilumina o dia?','sol'],['O que marca as horas?','relogio']];
        if(arg==='novo'){if(g)return out('Já existe uma caça.');g=db[name]={ids:[id],index:0,expires:now+day};return out('Caça ao tesouro virtual: '+clues[0][0]+' :tesouro resposta palavra.',true);}
        if(!g)return out('Use :tesouro novo.');
        if(!g.ids.includes(id))return out('Já existe uma caça de outro jogador.');
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
    return out('Rodada '+(g.round+1)+'/'+questions.length+' • '+Object.keys(g.answered).length+'/'+g.ids.length+' respostas\n'+card(questions[g.round])+'\n:'+name+' resposta 1 | placar');
}
export function removeGames4(state,id){const db=state.games4;if(!db)return;for(const key of ['2048','unobot'])if(db[key])delete db[key][id];for(const key of games4.filter(k=>!['2048','unobot'].includes(k)))if(db[key]?.ids?.includes(id))delete db[key];}
