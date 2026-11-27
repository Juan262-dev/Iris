import { advanceTournament } from './tournament4.js';
import { recordGame,displayName } from './profileCard.js';
import { randomInt } from 'node:crypto';
import sharp from 'sharp';
import { unoPublic,unoPrivate,unoRecipients,validUnoRoute } from './unoVisual.js';
export const gameNames=['uno','naval','rpg','campeonato'];
const label=id=>'Jogador '+id.slice(0,6);
const out=(text,changed=false)=>({text,changed});
const colors=['v','a','g','b']; // vermelho, amarelo, verde, azul
const colorNames={v:'vermelho',a:'amarelo',g:'verde',b:'azul'};
const cardLabel=c=>c==='c4'?'Coringa +4':c==='c'?'Coringa':colorNames[c[0]]+' '+({s:'pular',r:'inverter',d:'+2'}[c.slice(1)]||c.slice(1));
function shuffle(a,choose){for(let i=a.length-1;i>0;i--){const j=choose(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function deck(choose){return shuffle([...colors.flatMap(c=>[c+'0',...Array.from({length:9},(_,i)=>[c+(i+1),c+(i+1)]).flat(),c+'s',c+'s',c+'r',c+'r',c+'d',c+'d']), 'c','c','c','c','c4','c4','c4','c4'],choose);}
function take(g,choose){if(!g.deck.length&&g.discard.length>1){const last=g.discard.pop();g.deck=shuffle(g.discard,choose);g.discard=[last];}return g.deck.pop();}
function draw(g,id,n,choose){for(let i=0;i<n;i++){const c=take(g,choose);if(c)g.hands[id].push(c);}}
function next(g,n=1){g.turn=(g.turn+g.dir*n+g.ids.length*4)%g.ids.length;}
const unoBoard=g=>'🃏 UNO — mesa pública\nTopo: '+cardLabel(g.discard.at(-1))+' | Cor: '+colorNames[g.color]+'\n'+g.ids.map(id=>label(id)+': '+g.hands[id].length+' carta(s)').join('\n')+'\nVez de '+(g.names?.[g.ids[g.turn]]||label(g.ids[g.turn]))+'. Use carta v5, verde 7, pos 1, carta c4 azul, comprar carta.';
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
export async function megaGame({name,arg='',state,id,now=Date.now(),choose=randomInt,activeOnly=false,owner=false,route=null}){
    if(!gameNames.includes(name))return null;
    const m=state.megaGames??={};
    if(name==='uno'){
        arg=String(arg).trim().toLowerCase();
        const stats=m.unoStats??={};
        if(arg==='ranking')return out('🏆 Ranking UNO\n'+(Object.entries(stats).sort((a,b)=>b[1].wins-a[1].wins).slice(0,10).map(([k,v])=>(state.social3?.names?.[k]||(state.players[k]?.card?.public===true?displayName(state,k):label(k)))+': '+v.wins+' vitórias, '+v.losses+' derrotas').join('\n')||'Sem resultados.'));
        if(arg==='stats')return out('UNO: '+(stats[id]?.wins||0)+' vitórias, '+(stats[id]?.losses||0)+' derrotas.');
        if(arg==='apagarranking'){delete stats[id];return out('Suas estatísticas UNO foram removidas.',true);}
        let g=m.uno;if(g&&g.expires<=now){delete m.uno;g=null;}
        if(activeOnly&&(!g?.started||!g.ids.includes(id)))return out(null);
        if(arg==='novo'){
            if(g)return out('Já existe uma mesa de UNO.');
            m.uno={ids:[id],routes:{},started:false,expires:now+600000};
            return out('🃏 UNO visual criado! Amigos: :uno entrar. Cada jogador (inclusive o criador) confirma :uno pv para autorizar receber suas cartas no privado. Criador: :uno iniciar (2–6 jogadores). Sem apostas.',true);
        }
        if(!g)return out(activeOnly?null:'Use :uno novo.');
        if(arg==='entrar'){
            if(g.tournament4||g.started||g.ids.includes(id)||g.ids.length>=6)return out('Não é possível entrar.');
            g.ids.push(id);return out(label(id)+' entrou. '+g.ids.length+'/6. Confirme :uno pv para receber suas cartas no privado.',true);
        }
        if(!g.ids.includes(id))return out(activeOnly?null:'Você não participa desta mesa.');
        g.routes??={};
        g.names=Object.fromEntries(g.ids.map(k=>[k,state.social3?.names?.[k]||(state.players[k]?.card?.public===true?displayName(state,k):label(k))]));
        const ready=()=>g.ids.every(k=>validUnoRoute(g.routes[k]))&&new Set(g.ids.map(k=>g.routes[k])).size===g.ids.length;
        const pack=async(ids,notice='',publicBoard=true)=>{
            const privateHands=[];
            for(const k of unoRecipients(g,ids))privateHands.push(...await unoPrivate(g,k));
            return {unoDelivery:{public:publicBoard?await unoPublic(g,(notice?notice+'\n':'')+unoBoard(g)):notice||null,private:privateHands}};
        };
        if(arg==='sair'){
            if(g.tournament4)return out('Mesa de torneio. O responsável pode usar :torneiouno cancelar.');
            if(g.started||g.ids[0]===id){delete m.uno;return out('Mesa encerrada. Autorização de envio privado removida.',true);}
            g.ids=g.ids.filter(k=>k!==id);delete g.routes[id];return out('Você saiu e sua autorização foi removida.',true);
        }
        if(arg==='pv'){
            if(!validUnoRoute(route))return out('Não consegui identificar seu contato com segurança. Nenhuma carta foi enviada.');
            if(Object.entries(g.routes).some(([k,v])=>k!==id&&v===route))return out('Contato já associado a outro participante; não foi possível confirmar.');
            g.routes[id]=route;
            if(g.started)return out(await pack([id],'🃏 Sua mão será enviada apenas no privado.',false),true);
            return out('🃏 '+label(id)+' autorizou receber as cartas no privado. '+Object.keys(g.routes).length+'/'+g.ids.length+' confirmados.',true);
        }
        if(arg==='iniciar'){
            if(g.started||g.ids[0]!==id||g.ids.length<2)return out('Somente o criador inicia com 2 a 6 jogadores.');
            if(!ready())return out('Todos os jogadores precisam confirmar :uno pv antes de iniciar.');
            g.started=true;g.deck=deck(choose);g.hands={};g.discard=[];g.turn=0;g.dir=1;g.expires=now+86400000;
            for(const k of g.ids){g.hands[k]=[];draw(g,k,7,choose);}
            const i=g.deck.findIndex(c=>/^[vagb]\d$/.test(c));const card=g.deck.splice(i,1)[0];g.discard=[card];g.color=card[0];
            return out(await pack(g.ids,'Partida iniciada! Cada jogador recebe 7 cartas no privado.'),true);
        }
        if(!g.started)return out('Aguardando início. Confirme :uno pv.');
        if(arg==='gritar'){if(g.hands[id]?.length!==1)return out('Você só pode gritar UNO quando tem uma carta.');g.called??={};if(g.called[id])return out('Você já gritou UNO!');g.called[id]=true;return out('🃏 '+g.names[id]+' gritou UNO!',true);}
        if(arg==='mao'){
            if(!validUnoRoute(g.routes[id]))return out('Confirme :uno pv para receber sua mão no privado.');
            return out(await pack([id],'🃏 Sua mão será enviada apenas no privado.',false));
        }
        if(!arg||arg==='mesa')return out(await unoPublic(g,unoBoard(g)+'\nVocê: '+label(id)+' | '+(g.ids[g.turn]===id?'É sua vez.':'Aguarde sua vez.')+'\nPV confirmado: '+g.ids.filter(k=>validUnoRoute(g.routes[k])).length+'/'+g.ids.length+'.'+(ready()?'':' Todos precisam enviar :uno pv.')));
        if(!ready())return out('🃏 Partida aguardando confirmação do PV. '+g.ids.filter(k=>validUnoRoute(g.routes[k])).length+'/'+g.ids.length+' confirmados. Falta: '+g.ids.filter(k=>!validUnoRoute(g.routes[k])).map(label).join(', ')+'. Cada jogador pendente deve enviar :uno pv.');
        if(g.ids[g.turn]!==id)return out('🃏 Ainda não é sua vez. Você: '+label(id)+'. Vez de '+label(g.ids[g.turn])+'.');
        if(arg==='comprar'){draw(g,id,1,choose);next(g);g.expires=now+86400000;return out(await pack([id],'Carta comprada.'),true);}
        const position=/^(?:posicao|pos) ([1-9][0-9]?)(?: (vermelho|amarelo|verde|azul))?$/.exec(arg);
        if(position){const card=g.hands[id][Number(position[1])-1];if(!card)return out('Posição inválida. Consulte :uno mao.');arg=card+(position[2]?' '+position[2]:'');}
        const natural=/^(vermelho|amarelo|verde|azul) ([0-9]|pular|inverter|\+2)$/.exec(arg);
        if(natural)arg=Object.keys(colorNames).find(k=>colorNames[k]===natural[1])+({pular:'s',inverter:'r','+2':'d'}[natural[2]]||natural[2]);
        const match=/^(?:jogar )?([vagb][0-9srd]|c4?)(?: (vermelho|amarelo|verde|azul))?$/.exec(arg);
        if(!match)return out('Use carta v5, carta c azul ou comprar carta.');
        const card=match[1],hand=g.hands[id],top=g.discard.at(-1);
        const chosenColor=Object.keys(colorNames).find(k=>colorNames[k]===match[2]);
        if(!hand.includes(card))return out('🃏 Carta não disponível para você. Use :uno mao para consultar sua mão no privado.');
        if(card.startsWith('c')&&!chosenColor||!card.startsWith('c')&&(card[0]!==g.color&&(top.startsWith('c')||card.slice(1)!==top.slice(1))))return out('🃏 Carta incompatível com a mesa. Cor atual: '+colorNames[g.color]+'. Jogue uma carta da mesma cor, mesmo valor ou coringa.');
        if(card==='c4'&&hand.some(k=>k[0]===g.color))return out('Coringa +4 só pode ser usado sem carta da cor atual.');
        hand.splice(hand.indexOf(card),1);g.discard.push(card);g.color=card.startsWith('c')?chosenColor:card[0];
        if(hand.length!==1&&g.called)delete g.called[id];
        if(!hand.length){const result=await unoPublic(g,'🏆 '+g.names[id]+' venceu o UNO!');for(const k of g.ids){if(!Object.hasOwn(stats,k)&&Object.keys(stats).length>=200)continue;const v=stats[k]??={wins:0,losses:0};v[k===id?'wins':'losses']++;}delete m.uno;result.caption+=advanceTournament(state,g,id,now);return out(result,true);}
        const updated=[id],kind=card.slice(1);
        if(kind==='r'){g.dir=-g.dir;next(g,g.ids.length===2?2:1);}
        else if(kind==='s')next(g,2);
        else if(kind==='d'||card==='c4'){next(g);const other=g.ids[g.turn];draw(g,other,card==='c4'?4:2,choose);if(g.called)delete g.called[other];updated.push(other);next(g);}
        else next(g);
        g.expires=now+86400000;return out(await pack(updated,hand.length===1?'🃏 UNO! '+label(id)+' tem uma carta.':''),true);
    }
    if(name==='naval'){
        let g=m.naval;if(g&&g.expires<=now){delete m.naval;g=null;}
        if(activeOnly&&(!g?.boards||g.ids[g.turn]!==id))return out(null);
        if(arg==='desafio'){
            if(g)return out('Já existe uma partida.');
            m.naval={ids:[id],expires:now+600000};return out('🚢 Batalha naval: outro jogador envia :naval aceitar.',true);
        }
        if(!g)return out(activeOnly?null:'Use :naval desafio.');
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
        if(!won){g.turn=1-g.turn;g.expires=now+86400000;}else {for(const k of g.ids)recordGame(state,'naval',k,k===id?'w':'l');delete m.naval;}
        return out({image:await navalImage(g),caption:(hit?'Acertou!':'Água!')+'\n'+(won?label(id)+' venceu!':'Vez de '+label(g.ids[g.turn]))},true);
    }
    if(name==='rpg'){
        const p=state.players[id];if(!p)return out('Crie seu perfil: :perfil.');
        if(arg==='mapa')return out('🗺️ '+Object.entries(maps).map(([k,v])=>k+' — '+v).join('\n'));
        if(arg.startsWith('classe ')){
            const k=arg.slice(7);if(!Object.hasOwn(classes,k))return out('Classes: '+Object.keys(classes).join(', '));
            p.rpg??={xp:0,bag:{},place:'vila'};p.rpg.class=k;return out('Classe: '+classes[k]+'. :rpg viajar bosque',true);
        }
        const r=p.rpg;if(!r)return out('Use :rpg classe explorador.');
        if(arg.startsWith('viajar ')){const k=arg.slice(7);if(!Object.hasOwn(maps,k))return out('Use :rpg mapa.');r.place=k;return out('Chegou a '+maps[k]+'. Envie :rpg explorar.',true);}
        if(arg==='explorar'){
            const day=new Date(now).toISOString().slice(0,10);if(r.day===day)return out('Exploração diária concluída.');
            r.day=day;r.xp+=5;const item={vila:'flor',bosque:'semente',arquivo:'pergaminho'}[r.place];r.bag[item]=(r.bag[item]||0)+1;p.xp+=2;p.coins=Math.min(1000000,p.coins+8);
            recordGame(state,'rpg',id,'c');return out('🌟 Encontrou '+item+'! +5 XP RPG, +2 XP e +8 moedas virtuais.',true);
        }
        return out('🗺️ '+classes[r.class]+' | '+maps[r.place]+' | Nível '+(1+Math.floor(r.xp/15))+' | Inventário: '+(Object.entries(r.bag).map(([k,v])=>k+': '+v).join(', ')||'vazio'));
    }
    // Tournament registration and organizer-confirmed results, no real prizes.
    let t=m.tournament;if(t&&t.expires<=now){delete m.tournament;t=null;}
    if(arg==='novo'){
        if(!owner)return out(null);if(t)return out('Campeonato já existe.');
        m.tournament={ids:[],round:[],winners:[],started:false,expires:now+7*86400000};return out('🏆 Campeonato de xadrez: :campeonato entrar. Organizador inicia com 2, 4 ou 8 jogadores.',true);
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
        if(!t.round.length){if(t.winners.length===1){recordGame(state,'campeonato',k,'w');delete m.tournament;return out('🏆 Campeão: '+label(k)+'! Troféu simbólico.',true);}for(let j=0;j<t.winners.length;j+=2)t.round.push(t.winners.slice(j,j+2));t.winners=[];}
        return out('Resultado informado pelo organizador. Use :campeonato para ver as chaves.',true);
    }
    if(arg==='cancelar'&&owner){delete m.tournament;return out('Campeonato encerrado.',true);}
    return out(t.started?'🏆 Chaves restantes:\n'+t.round.map(p=>p.map(label).join(' × ')).join('\n'):'Inscritos: '+t.ids.map(label).join(', '));
}
export function megaShort(text){
    const t=String(text||'').trim().toLowerCase();
    const card=/^(?:carta\s+)?([vagb][0-9srd]|c4?(?: (?:vermelho|amarelo|verde|azul)))$/.exec(t);
    if(card)return {name:'uno',arg:card[1]};
    if(t==='comprar carta')return {name:'uno',arg:'comprar'};
    if(t==='gritar uno'||t==='uno!')return {name:'uno',arg:'gritar'};
    if(/^(?:posicao|pos) [1-9][0-9]?(?: (?:vermelho|amarelo|verde|azul))?$/.test(t)||/^(?:vermelho|amarelo|verde|azul) (?:[0-9]|pular|inverter|\+2)$/.test(t))return {name:'uno',arg:t};
    const shot=/^tiro ([a-f][1-6])$/.exec(t);return shot?{name:'naval',arg:shot[1]}:null;
}
