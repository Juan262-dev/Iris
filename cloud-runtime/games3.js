import {memoryBoard} from './gameVisual.js';
import {stopGame} from './stopGame.js';
import { recordGame } from './profileCard.js';
import { randomInt } from 'node:crypto';
import sharp from 'sharp';
export const games3=['memoria','stop','detetive','damas','coop'];
const out=(text,changed=false)=>({text,changed});
const label=id=>'Jogador '+id.slice(0,6);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function shuffle(a,choose){for(let i=a.length-1;i>0;i--){const j=choose(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
async function picture(title,rows,caption){
    const w=600,h=78+rows.length*50;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="'+w+'" height="'+h+'" rx="15" fill="#211a37"/><g font-family="sans-serif" fill="white"><text x="24" y="42" font-size="26">'+esc(title)+'</text>'+rows.map((r,i)=>'<text x="24" y="'+(83+i*50)+'" font-size="24">'+esc(r)+'</text>').join('')+'</g></svg>';
    return {image:await sharp(Buffer.from(svg)).png().toBuffer(),caption};
}
const cases=[{story:'O mapa da exposição desapareceu. A porta estava trancada, mas o mapa ficou entre dois livros.',answer:'biblioteca',opts:'biblioteca | jardim | cozinha'},{story:'O relógio da praça parou. A energia funciona, mas há uma engrenagem solta.',answer:'engrenagem',opts:'chuva | engrenagem | tinta'},{story:'Uma planta murchou mesmo com luz suficiente. A terra estava completamente seca.',answer:'agua',opts:'agua | pedra | vento'},{story:'O quadro desapareceu da parede, mas há uma etiqueta de restauração na sala.',answer:'atelie',opts:'atelie | jardim | porto'},{story:'A trilha termina junto à margem. Há marcas de remo no barco.',answer:'rio',opts:'rio | escola | mercado'},{story:'O bilhete tem desenhos de estrelas e coordenadas do céu.',answer:'observatorio',opts:'observatorio | cozinha | oficina'}];
const words={a:['abelha','arara','abacate','amora','azul','amarelo'],b:['baleia','borboleta','banana','bergamota','branco','bege'],c:['cachorro','cavalo','caju','coco','cinza','creme'],m:['macaco','morcego','manga','maca','marrom','magenta']};
const pieces=()=>Array.from({length:64},(_,i)=>((Math.floor(i/8)+i%8)%2===1)?(i<24?'b':i>=40?'r':''):'');
const cell=t=>/^[a-h][1-8]$/.test(t)?(Number(t[1])-1)*8+t.charCodeAt(0)-97:-1;
function moves(b,side,only=-1){
    const all=[];
    for(let i=0;i<64;i++){if(only>=0&&i!==only||b[i]?.toLowerCase()!==side)continue;
        const dirs=b[i]===side?(side==='b'?[1]:[-1]):[-1,1];
        for(const dy of dirs)for(const dx of [-1,1]){const r=Math.floor(i/8),c=i%8,y=r+dy,x=c+dx;
            if(y<0||y>7||x<0||x>7)continue;
            const j=y*8+x;if(!b[j])all.push({from:i,to:j,cap:-1});
        }
        for(const dy of [-1,1])for(const dx of [-1,1]){const r=Math.floor(i/8),c=i%8,y=r+2*dy,x=c+2*dx;if(y<0||y>7||x<0||x>7)continue;
            const j=y*8+x,k=(r+dy)*8+c+dx;if(!b[j]&&b[k]&&b[k].toLowerCase()!==side)all.push({from:i,to:j,cap:k});
        }
    }
    return all.some(m=>m.cap>=0)?all.filter(m=>m.cap>=0):all;
}
async function damasBoard(g,caption){
    const w=480,s=52,body=['<rect width="480" height="480" fill="#201a30"/>'];
    for(let i=0;i<8;i++){body.push('<text x="'+(45+i*s)+'" y="20" text-anchor="middle" fill="white">'+String.fromCharCode(97+i)+'</text>','<text x="9" y="'+(54+i*s)+'" fill="white">'+(i+1)+'</text>');}
    for(let i=0;i<64;i++){const r=Math.floor(i/8),c=i%8,x=20+c*s,y=26+r*s;
        body.push('<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" fill="'+((r+c)%2?'#8875a3':'#f5e6ca')+'"/>');
        if(g.b[i]){const p=g.b[i];body.push('<circle cx="'+(x+s/2)+'" cy="'+(y+s/2)+'" r="19" fill="'+(p.toLowerCase()==='b'?'#25384f':'#c34c5c')+'" stroke="white" stroke-width="2"/>');if(p===p.toUpperCase())body.push('<text x="'+(x+s/2)+'" y="'+(y+32)+'" text-anchor="middle" fill="white" font-size="20">D</text>');}
    }
    return {image:await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+w+'"><g font-family="sans-serif">'+body.join('')+'</g></svg>')).png().toBuffer(),caption};
}
export async function game3({name,arg='',state,id,now=Date.now(),choose=randomInt,activeOnly=false}){
    if(!games3.includes(name))return null;
    if(name==='stop')return stopGame({state,id,arg,now,choose,activeOnly});
    const db=state.games3??={};
    let g=db[name];if(g&&g.expires<=now){delete db[name];g=null;}
    if(activeOnly&&(!g||!g.ids.includes(id)))return out(null);
    if(arg==='sair'){if(g?.ids.includes(id)){delete db[name];return out('Jogo encerrado.',true);}return out('Nenhuma partida sua.');}
    if(name==='memoria'){
        if(arg==='novo'){
            if(g)return out('Já existe uma partida.');
            db[name]={ids:[id],cards:shuffle(['A','A','B','B','C','C','D','D','E','E','F','F'],choose),found:[],tries:0,expires:now+86400000};g=db[name];
        }
        if(!g)return out('Use :memoria novo.');
        if(arg==='entrar'&&!g.ids.includes(id)&&g.ids.length<6){g.ids.push(id);return out('Entrou no jogo cooperativo.',true);}
        if(!g.ids.includes(id))return out(activeOnly?null:'Use :memoria entrar.');
        const grid=show=>[0,4,8].map(start=>Array.from({length:4},(_,j)=>{const i=start+j;return g.found.includes(i)||show.includes(i)?g.cards[i]:'['+(i+1)+']';}).join('     '));
        if(arg==='novo'||!arg||arg==='mesa'||arg==='m')return out(await memoryBoard(g,[],'Envie :memoria 2 7. :memoria entrar para jogar junto.'),arg==='novo');
        const m=/^(?:par )?(\d{1,2}) (\d{1,2})$/.exec(arg);if(!m)return out('Use par 2 7.');
        const a=Number(m[1])-1,b=Number(m[2])-1;
        if(a===b||a<0||b<0||a>11||b>11||g.found.includes(a)||g.found.includes(b))return out('Escolha duas posições ocultas diferentes.');
        g.expires=now+86400000;g.tries++;const match=g.cards[a]===g.cards[b];if(match)g.found.push(a,b);
        const complete=g.found.length===12;const result=await memoryBoard(g,[a,b],complete?'Todos os pares encontrados em '+g.tries+' tentativas!':match?'Par encontrado!':'Não formou par. As posições voltam a ficar ocultas na mesa.');
        if(complete){for(const k of g.ids)recordGame(state,'memoria',k,'c');delete db[name];}return out(result,true);
    }
    if(name==='detetive'){
        if(arg==='novo'){if(g)return out('Caso já aberto.');g=db[name]={ids:[id],case:choose(cases.length),expires:now+3600000};return out('🔎 '+cases[g.case].story+'\nOpções: '+cases[g.case].opts+'\nUse :detetive resposta palavra.',true);}
        if(!g)return out('Use :detetive novo.');
        if(arg==='entrar'&&!g.ids.includes(id)&&g.ids.length<6){g.ids.push(id);return out('Você entrou na investigação.',true);}
        if(!g.ids.includes(id))return out(null);
        if(arg.startsWith('resposta ')){if(arg.slice(9).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu,'')===cases[g.case].answer){recordGame(state,'detetive',id,'w');delete db[name];return out('🔎 Mistério resolvido por '+label(id)+'!',true);}return out('Ainda não. Reveja as pistas.');}
        return out(cases[g.case].story+'\n'+cases[g.case].opts);
    }
    if(name==='coop'){
        if(arg==='novo'){if(g)return out('Missão aberta.');db[name]={ids:[id],done:[],expires:now+86400000};return out('🌿 Missão cooperativa: restaurar o jardim. :coop entrar, depois :coop ajudar. Precisa de 2 a 6 pessoas.',true);}
        if(!g)return out('Use :coop novo.');
        if(arg==='entrar'&&!g.ids.includes(id)&&g.ids.length<6){g.ids.push(id);return out('Entrou na equipe.',true);}
        if(!g.ids.includes(id))return out(null);
        if(arg==='ajudar'){if(g.done.includes(id))return out('Você já contribuiu.');g.done.push(id);if(g.done.length>=2&&g.done.length===g.ids.length){for(const k of g.ids){const p=state.players[k];if(p){p.coins=Math.min(1000000,p.coins+8);p.xp+=2;recordGame(state,'coop',k,'c');}}delete db[name];return out('🌿 Missão concluída! Perfis cadastrados receberam 8 moedas virtuais e 2 XP.',true);}return out('Contribuição registrada: '+g.done.length+'/'+g.ids.length+'.',true);}
        return out('Equipe: '+g.ids.length+' | contribuições: '+g.done.length);
    }
    if(arg==='desafio'){
        if(g)return out('Já existe uma partida.');
        db[name]={ids:[id],expires:now+600000};return out('🔴 Damas simplificadas: :damas aceitar. Captura obrigatória, dama de alcance curto.',true);
    }
    if(!g)return out('Use :damas desafio.');
    if(arg==='aceitar'){
        if(g.ids.length!==1||g.ids[0]===id)return out('Desafio indisponível.');
        g.ids.push(id);g.b=pieces();g.turn=0;g.forced=-1;g.expires=now+86400000;return out(await damasBoard(g,'Vez de '+label(g.ids[0])+'. Use dama b3 a4.'),true);
    }
    if(!g.ids.includes(id)||!g.b)return out(activeOnly?null:'Aguardando participantes.');
    if(!arg||arg==='mesa')return out(await damasBoard(g,'Vez de '+label(g.ids[g.turn])));
    if(g.ids[g.turn]!==id)return out('Aguarde sua vez.');
    if(arg==='jogadas'){const cellName=i=>String.fromCharCode(97+i%8)+(Math.floor(i/8)+1);return out('Jogadas válidas: '+moves(g.b,g.turn===0?'b':'r',g.forced).map(v=>cellName(v.from)+' '+cellName(v.to)).join(' | '));}
    const m=/^(?:dama )?([a-h][1-8]) ([a-h][1-8])$/.exec(arg);
    if(!m)return out('Use dama b3 a4.');
    const side=g.turn===0?'b':'r',from=cell(m[1]),to=cell(m[2]);
    const legal=moves(g.b,side,g.forced).find(v=>v.from===from&&v.to===to);
    if(!legal)return out('Jogada inválida. Capturas são obrigatórias.');
    g.b[to]=g.b[from];g.b[from]='';if(legal.cap>=0)g.b[legal.cap]='';
    if(side==='b'&&to>=56||side==='r'&&to<8)g.b[to]=side.toUpperCase();
    const again=legal.cap>=0&&moves(g.b,side,to).some(v=>v.cap>=0);
    if(again)g.forced=to;else{g.forced=-1;g.turn=1-g.turn;}
    const winner=!again&&!moves(g.b,g.turn===0?'b':'r').length;
    g.expires=now+86400000;
    const result=await damasBoard(g,winner?'🏆 '+label(id)+' venceu!':(again?'Continue a captura. ':'')+'Vez de '+label(g.ids[g.turn]));
    if(winner){for(const k of g.ids)recordGame(state,'damas',k,k===id?'w':'l');delete db[name];}return out(result,true);
}
export function short3(text){
    const t=String(text||'').trim().toLowerCase(),p=/^par (\d{1,2} \d{1,2})$/.exec(t),d=/^dama ([a-h][1-8] [a-h][1-8])$/.exec(t);
    return p?{name:'memoria',arg:p[1]}:d?{name:'damas',arg:d[1]}:null;
}
