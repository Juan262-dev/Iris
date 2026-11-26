import { randomInt } from 'node:crypto';
import sharp from 'sharp';
export const gameNames=['uno','naval','rpg','campeonato'];
const label=id=>'Jogador '+id.slice(0,6);
const out=(text,changed=false)=>({text,changed});
const colors=['v','a','g','b']; // vermelho, amarelo, verde, azul
const colorNames={v:'vermelho',a:'amarelo',g:'verde',b:'azul'};
const cardLabel=c=>c==='c'?'Coringa':colorNames[c[0]]+' '+({s:'pular',r:'inverter',d:'+2'}[c.slice(1)]||c.slice(1));
function shuffle(a,choose){for(let i=a.length-1;i>0;i--){const j=choose(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function deck(choose){return shuffle([...colors.flatMap(c=>[c+'0',...Array.from({length:9},(_,i)=>[c+(i+1),c+(i+1)]).flat(),c+'s',c+'s',c+'r',c+'r',c+'d',c+'d']), 'c','c','c','c'],choose);}
function take(g,choose){if(!g.deck.length&&g.discard.length>1){const last=g.discard.pop();g.deck=shuffle(g.discard,choose);g.discard=[last];}return g.deck.pop();}
function draw(g,id,n,choose){for(let i=0;i<n;i++){const c=take(g,choose);if(c)g.hands[id].push(c);}}
function next(g,n=1){g.turn=(g.turn+g.dir*n+g.ids.length*4)%g.ids.length;}
const unoBoard=g=>'🃏 UNO — mesa pública\nTopo: '+cardLabel(g.discard.at(-1))+' | Cor: '+colorNames[g.color]+'\n'+g.ids.map(id=>label(id)+': '+g.hands[id].length+' carta(s)').join('\n')+'\nVez de '+label(g.ids[g.turn])+'. Use carta v5, carta c azul, comprar carta.';
function navalGrid(){return Array.from({length:36},()=>false);}
function fleet(choose){const board=navalGrid();for(const len of [3,2,2]){const spots=[];for(let r=0;r<6;r++)for(let c=0;c<6;c++)for(const d of [0,1]){const cells=Array.from({length:len},(_,i)=>[r+(d?i:0),c+(d?0:i)]);if(cells.every(([y,x])=>y<6&&x<6&&!board[y*6+x]))spots.push(cells);}const spot=spots[choose(spots.length)];for(const [y,x] of spot)board[y*6+x]=true;}return board;}
const square=t=>/^[a-f][1-6]$/.test(t)?(Number(t[1])-1)*6+t.charCodeAt(0)-97:-1;
const escaped=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export async function navalImage(g){
    const parts=['<rect width="620" height="350" rx="18" fill="#10243b"/>'];
    for(let k=0;k<2;k++){
        const id=g.ids[k],ox=20+k*310;
        parts.push('<text x="'+(ox+140)+'" y="26" text-anchor="middle" fill="white" font-size="16">'+escaped(label(id))+' — disparos recebidos</text>');
        for(let c=0;c<6;c++){parts.push('<text x="'+(ox+35+c*44)+'" y="52" text-anchor="middle" fill="#cce7ff">'+String.fromCharCode(65+c)+'</text>');parts.push('<text x="'+(ox+2)+'" y="'+(82+c*44)+'" fill="#cce7ff">'+(c+1)+'</text>');}
        for(let i=0;i<36;i++){const x=ox+14+(i%6)*44,y=59+Math.floor(i/6)*44,v=g.shots[id][i];parts.push('<rect x="'+x+'" y="'+y+'" width="42" height="42" rx="5" fill="'+(v==='hit'?'#ef635b':v==='miss'?'#9bc8e2':'#26577b')+'"/>');if(v)parts.push('<text x="'+(x+21)+'" y="'+(y+29)+'" text-anchor="middle" font-size="24" fill="#10243b">'+(v==='hit'?'×':'•')+'</text>');}
    }
    return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="620" height="350">'+parts.join('')+'</svg>')).png().toBuffer();
}
const classes={explorador:'Explorador',artista:'Artista',estudioso:'Estudioso'};
const maps={vila:'Vila das Flores',bosque:'Bosque das Trilhas',arquivo:'Arquivo das Estrelas'};
export async function megaGame({name,arg='',state,id,now=Date.now(),choose=randomInt,activeOnly=false,owner=false}){
    if(!gameNames.includes(name))return null;
    const m=state.megaGames??={};
    if(name==='uno'){
        let g=m.uno;if(g&&g.expires<=now){delete m.uno;g=null;}
        if(activeOnly&&(!g?.started||g.ids[g.turn]!==id))return out(null);
        if(arg==='novo'){
            if(g)return out('Já existe uma mesa de UNO.');
            m.uno={ids:[id],started:false,expires:now+600000};return out('🃏 UNO criado. Amigos: !iris uno entrar. Criador: !iris uno iniciar (2–6 jogadores). Variante simplificada: mão pública sob solicitação, sem apostas.',true);
        }
        if(!g)return out(activeOnly?null:'Use !iris uno novo.');
        if(arg==='entrar'){
            if(g.started||g.ids.includes(id)||g.ids.length>=6)return out('Não é possível entrar.');
            g.ids.push(id);return out(label(id)+' entrou. '+g.ids.length+'/6.',true);
        }
        if(!g.ids.includes(id))return out(activeOnly?null:'Você não participa desta mesa.');
        if(arg==='sair'){if(g.started||g.ids[0]===id){delete m.uno;return out('Mesa encerrada.',true);}g.ids=g.ids.filter(k=>k!==id);return out('Você saiu.',true);}
        if(arg==='iniciar'){
            if(g.started||g.ids[0]!==id||g.ids.length<2)return out('Somente o criador inicia com 2 a 6 jogadores.');
            g.started=true;g.deck=deck(choose);g.hands={};g.discard=[];g.turn=0;g.dir=1;g.expires=now+86400000;
            for(const k of g.ids){g.hands[k]=[];draw(g,k,7,choose);}
            const i=g.deck.findIndex(c=>/^[vagb]\d$/.test(c));const card=g.deck.splice(i,1)[0];g.discard=[card];g.color=card[0];
            return out(unoBoard(g)+'\n!iris uno mao mostra suas cartas no grupo. Sem cartas secretas.',true);
        }
        if(!g.started)return out('Aguardando início.');
        if(arg==='mao')return out('🃏 Suas cartas (visíveis no grupo): '+g.hands[id].map(c=>c+' ('+cardLabel(c)+')').join(', '));
        if(!arg||arg==='mesa')return out(unoBoard(g));
        if(g.ids[g.turn]!==id)return out(activeOnly?null:'Aguarde sua vez.');
        if(arg==='comprar'){draw(g,id,1,choose);next(g);g.expires=now+86400000;return out(unoBoard(g),true);}
        const match=/^(?:jogar )?([vagb][0-9srd]|c)(?: (vermelho|amarelo|verde|azul))?$/.exec(arg);
        if(!match)return out('Use carta v5, carta c azul ou comprar carta.');
        const card=match[1],hand=g.hands[id],top=g.discard.at(-1);
        const chosenColor=Object.keys(colorNames).find(k=>colorNames[k]===match[2]);
        if(!hand.includes(card)||card==='c'&&!chosenColor||card!=='c'&&(card[0]!==g.color&&card.slice(1)!==top.slice(1)))return out('Carta inválida para esta jogada.');
        hand.splice(hand.indexOf(card),1);g.discard.push(card);g.color=card==='c'?chosenColor:card[0];
        if(!hand.length){delete m.uno;return out('🏆 '+label(id)+' venceu o UNO!',true);}
        const kind=card.slice(1);
        if(kind==='r'){g.dir=-g.dir;next(g,g.ids.length===2?2:1);}
        else if(kind==='s')next(g,2);
        else if(kind==='d'){next(g);draw(g,g.ids[g.turn],2,choose);next(g);}
        else next(g);
        g.expires=now+86400000;return out((hand.length===1?'🃏 UNO! '+label(id)+' tem uma carta.\n':'')+unoBoard(g),true);
    }
    if(name==='naval'){
        let g=m.naval;if(g&&g.expires<=now){delete m.naval;g=null;}
        if(activeOnly&&(!g?.boards||g.ids[g.turn]!==id))return out(null);
        if(arg==='desafio'){
            if(g)return out('Já existe uma partida.');
            m.naval={ids:[id],expires:now+600000};return out('🚢 Batalha naval: outro jogador envia !iris naval aceitar.',true);
        }
        if(!g)return out(activeOnly?null:'Use !iris naval desafio.');
        if(arg==='aceitar'){
            if(g.ids.length!==1||g.ids[0]===id)return out('Desafio indisponível.');
            g.ids.push(id);g.boards={};g.shots={};g.turn=0;g.expires=now+86400000;for(const k of g.ids){g.boards[k]=fleet(choose);g.shots[k]={};}
            return out({image:await navalImage(g),caption:'🚢 Frota de 3 navios colocada automaticamente e mantida oculta. Vez de '+label(g.ids[0])+'. Envie tiro a1 até f6.'},true);
        }
        if(!g.ids.includes(id))return out(activeOnly?null:'Você não participa.');
        if(arg==='sair'){delete m.naval;return out('Partida encerrada.',true);}
        if(!g.boards)return out('Aguardando aceite.');
        if(!arg||arg==='tabuleiro')return out({image:await navalImage(g),caption:'Vez de '+label(g.ids[g.turn])});
        if(g.ids[g.turn]!==id)return out(activeOnly?null:'Aguarde sua vez.');
        const i=square(arg);if(i<0)return out('Use tiro a1 até f6.');
        const target=g.ids[1-g.turn];if(g.shots[target][i])return out('Casa já escolhida.');
        const hit=g.boards[target][i];g.shots[target][i]=hit?'hit':'miss';
        const won=g.boards[target].every((v,j)=>!v||g.shots[target][j]==='hit');
        if(!won){g.turn=1-g.turn;g.expires=now+86400000;}else delete m.naval;
        return out({image:await navalImage(g),caption:(hit?'Acertou!':'Água!')+'\n'+(won?label(id)+' venceu!':'Vez de '+label(g.ids[g.turn]))},true);
    }
    if(name==='rpg'){
        const p=state.players[id];if(!p)return out('Crie seu perfil: !iris perfil.');
        if(arg==='mapa')return out('🗺️ '+Object.entries(maps).map(([k,v])=>k+' — '+v).join('\n'));
        if(arg.startsWith('classe ')){
            const k=arg.slice(7);if(!Object.hasOwn(classes,k))return out('Classes: '+Object.keys(classes).join(', '));
            p.rpg??={xp:0,bag:{},place:'vila'};p.rpg.class=k;return out('Classe: '+classes[k]+'. !iris rpg viajar bosque',true);
        }
        const r=p.rpg;if(!r)return out('Use !iris rpg classe explorador.');
        if(arg.startsWith('viajar ')){const k=arg.slice(7);if(!Object.hasOwn(maps,k))return out('Use !iris rpg mapa.');r.place=k;return out('Chegou a '+maps[k]+'. Envie !iris rpg explorar.',true);}
        if(arg==='explorar'){
            const day=new Date(now).toISOString().slice(0,10);if(r.day===day)return out('Exploração diária concluída.');
            r.day=day;r.xp+=5;const item={vila:'flor',bosque:'semente',arquivo:'pergaminho'}[r.place];r.bag[item]=(r.bag[item]||0)+1;p.xp+=2;p.coins=Math.min(1000000,p.coins+8);
            return out('🌟 Encontrou '+item+'! +5 XP RPG, +2 XP e +8 moedas virtuais.',true);
        }
        return out('🗺️ '+classes[r.class]+' | '+maps[r.place]+' | Nível '+(1+Math.floor(r.xp/15))+' | Inventário: '+(Object.entries(r.bag).map(([k,v])=>k+': '+v).join(', ')||'vazio'));
    }
    // Tournament registration and organizer-confirmed results, no real prizes.
    let t=m.tournament;if(t&&t.expires<=now){delete m.tournament;t=null;}
    if(arg==='novo'){
        if(!owner)return out(null);if(t)return out('Campeonato já existe.');
        m.tournament={ids:[],round:[],winners:[],started:false,expires:now+7*86400000};return out('🏆 Campeonato de xadrez: !iris campeonato entrar. Organizador inicia com 2, 4 ou 8 jogadores.',true);
    }
    if(!t)return out('Nenhum campeonato ativo.');
    if(arg==='entrar'){
        if(t.started||t.ids.includes(id)||t.ids.length>=8)return out('Inscrição indisponível.');
        t.ids.push(id);return out('Inscrito: '+label(id)+'. '+t.ids.length+'/8.',true);
    }
    if(arg==='sair'&&!t.started){t.ids=t.ids.filter(k=>k!==id);return out('Inscrição removida.',true);}
    if(arg==='iniciar'){
        if(!owner)return out(null);if(t.started||![2,4,8].includes(t.ids.length))return out('São necessários 2, 4 ou 8 inscritos.');
        t.started=true;const ids=shuffle([...t.ids],choose);for(let i=0;i<ids.length;i+=2)t.round.push([ids[i],ids[i+1]]);return out('Chaves:\n'+t.round.map((p,i)=>(i+1)+'. '+p.map(label).join(' × ')).join('\n'),true);
    }
    if(arg.startsWith('resultado ')){
        if(!owner)return out(null);
        const code=arg.slice(10);const candidates=t.round.flat().filter(k=>k.startsWith(code));
        if(!t.started||!/^[a-f0-9]{6}$/.test(code)||candidates.length!==1)return out('Informe o código do vencedor de uma partida concluída.');
        const k=candidates[0],i=t.round.findIndex(pair=>pair.includes(k));t.round.splice(i,1);t.winners.push(k);
        if(!t.round.length){if(t.winners.length===1){delete m.tournament;return out('🏆 Campeão: '+label(k)+'! Troféu simbólico.',true);}for(let j=0;j<t.winners.length;j+=2)t.round.push(t.winners.slice(j,j+2));t.winners=[];}
        return out('Resultado informado pelo organizador. Use !iris campeonato para ver as chaves.',true);
    }
    if(arg==='cancelar'&&owner){delete m.tournament;return out('Campeonato encerrado.',true);}
    return out(t.started?'🏆 Chaves restantes:\n'+t.round.map(p=>p.map(label).join(' × ')).join('\n'):'Inscritos: '+t.ids.map(label).join(', '));
}
export function megaShort(text){
    const t=String(text||'').trim().toLowerCase();
    const card=/^carta ([vagb][0-9srd]|c(?: (?:vermelho|amarelo|verde|azul)))$/.exec(t);
    if(card)return {name:'uno',arg:card[1]};
    if(t==='comprar carta')return {name:'uno',arg:'comprar'};
    const shot=/^tiro ([a-f][1-6])$/.exec(t);return shot?{name:'naval',arg:shot[1]}:null;
}
