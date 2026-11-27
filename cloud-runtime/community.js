import { randomInt } from 'node:crypto';
import { winner } from './localFun.js';

export const groupCommands=['velhadupla','enquete','votar','votos','encerrarenquete','avisogrupo','mensagembemvindo','banco','depositar','sacar','transferir','semanal','profissao','trabalhar','aventura','tarefadiaria'];
export const groupOwnerCommands=['enquete','encerrarenquete','avisogrupo','mensagembemvindo'];
const label=id=>'Jogador '+id.slice(0,6);
const day=t=>new Date(t).toISOString().slice(0,10);
const week=t=>Math.floor((t-4*86400000)/(7*86400000));
const roles={artista:'🎨 Artista',cientista:'🔬 Cientista',jardineiro:'🌱 Jardineiro',bibliotecario:'📚 Bibliotecário'};
const scenes=[['Uma biblioteca precisa organizar seus livros.','Organizar livros'],['O jardim comunitário precisa de cuidados.','Cultivar plantas'],['A vila está preparando uma feira cultural.','Preparar exposição']];
const result=(text,changed=false)=>({text,changed});
const limit=1000000;
const amount=s=>/^[1-9]\d{0,3}$/.test(s)?Number(s):0;
const grid=b=>[0,3,6].map(i=>b.slice(i,i+3).map((v,j)=>v==='X'?'❌':v==='O'?'⭕':String(i+j+1)).join(' │ ')).join('\n');

export function groupFeature({name,arg='',state,id,owner=false,now=Date.now(),choose=randomInt,activeOnly=false}){
    if(!groupCommands.includes(name))return null;
    if(groupOwnerCommands.includes(name)&&!owner)return result(null);
    const p=state.players[id];
    const x=state.community??={};
    if(name==='velhadupla'){
        let g=x.velha;
        if(g&&g.expires<=now){delete x.velha;g=null;}
        if(activeOnly&&(!g?.o||![g.x,g.o].includes(id)||g.turn!==id))return result(null);
        if(arg==='desafio'){
            if(g)return result('Já existe um desafio ou partida.');
            x.velha={x:id,o:null,b:Array(9).fill(''),turn:id,expires:now+600000};
            return result('❌ Desafio de '+label(id)+'. Outro jogador: :velhadupla aceitar.',true);
        }
        if(arg==='aceitar'){
            if(!g||g.o||g.x===id)return result('Nenhum desafio disponível para você.');
            g.o=id;g.expires=now+86400000;
            return result(grid(g.b)+'\nX: '+label(g.x)+' | O: '+label(g.o)+'\nX começa. Envie casa 1 até casa 9.',true);
        }
        if(!g||![g.x,g.o].includes(id))return result(activeOnly?null:'Use :velhadupla desafio ou aceitar.');
        if(arg==='sair'){delete x.velha;return result('Partida encerrada.',true);}
        if(!g.o)return result('Aguardando outro jogador.');
        if(!arg||arg==='tabuleiro')return result(grid(g.b)+'\nVez de '+label(g.turn));
        if(g.turn!==id)return result(activeOnly?null:'Aguarde sua vez.');
        if(!/^[1-9]$/.test(arg)||g.b[Number(arg)-1])return result('Escolha uma casa livre de 1 a 9.');
        g.b[Number(arg)-1]=g.x===id?'X':'O';
        const w=winner(g.b),board=grid(g.b);
        if(w||g.b.every(Boolean)){delete x.velha;return result(board+'\n'+(w?label(id)+' venceu!':'Empate!'),true);}
        g.turn=g.x===id?g.o:g.x;g.expires=now+86400000;
        return result(board+'\nVez de '+label(g.turn)+'. Envie casa 1 até casa 9.',true);
    }
    if(name==='enquete'){
        if(x.poll&&x.poll.expires>now)return result('Já existe uma enquete. Encerre com :encerrarenquete.');
        const parts=arg.split('|').map(s=>s.trim());
        if(parts.length<3||parts.length>6||parts.some(s=>!s||s.length>100)||new Set(parts.slice(1)).size!==parts.length-1)return result('Use :enquete pergunta | opção 1 | opção 2 (até 5 opções).');
        x.poll={question:parts[0],options:parts.slice(1),votes:{},expires:now+86400000};
        return result('📊 '+parts[0]+'\n'+parts.slice(1).map((s,i)=>(i+1)+'. '+s).join('\n')+'\nEnvie :votar 1 ou voto 1. Votos são pseudônimos e podem ser alterados; encerra em 24h.',true);
    }
    if(['votar','votos','encerrarenquete'].includes(name)){
        const poll=x.poll;
        if(!poll)return result(activeOnly?null:'Nenhuma enquete.');
        const summary=()=> '📊 '+poll.question+'\n'+poll.options.map((s,i)=>(i+1)+'. '+s+' — '+Object.values(poll.votes).filter(v=>v===i+1).length+' voto(s)').join('\n');
        if(name==='votos')return result(summary()+(poll.expires<=now?'\nEncerrada por prazo.':''));
        if(name==='encerrarenquete'){const text=summary()+'\nEnquete encerrada.';delete x.poll;return result(text,true);}
        if(poll.expires<=now)return result(activeOnly?null:'Enquete encerrada por prazo.');
        if(!/^[1-5]$/.test(arg)||Number(arg)>poll.options.length)return result('Escolha uma opção válida.');
        if(!Object.hasOwn(poll.votes,id)&&Object.keys(poll.votes).length>=200)return result('Limite de votos atingido.');
        poll.votes[id]=Number(arg);return result('🗳️ Voto registrado. Use :votos para ver o total.',true);
    }
    if(name==='avisogrupo'){
        if(!arg||arg.length>300)return result('Use :avisogrupo texto (até 300 caracteres).');
        return result('📢 *Aviso do responsável pelo grupo*\n'+arg);
    }
    if(name==='mensagembemvindo'){
        if(!arg||arg.length>250)return result('Use :mensagembemvindo texto ou padrao. Ative :boasvindas on.');
        if(arg==='padrao')delete x.welcomeText;else x.welcomeText=arg;
        return result('Mensagem de boas-vindas atualizada.',true);
    }
    if(!p)return result('Use :perfil para participar da economia virtual.');
    if(name==='banco')return result('🏦 Carteira: '+p.coins+' | Banco: '+(p.bank||0)+' moedas virtuais. Use :depositar 10 ou :sacar 10.');
    if(name==='depositar'||name==='sacar'){
        const n=amount(arg);const bank=p.bank||0;
        if(!n)return result('Informe de 1 a 9999 moedas virtuais.');
        if(name==='depositar'&&(p.coins<n||bank+n>limit)||name==='sacar'&&(bank<n||p.coins+n>limit))return result('Saldo insuficiente ou limite atingido.');
        const delta=name==='depositar'?n:-n;p.coins-=delta;p.bank=bank+delta;
        return result('🏦 Carteira: '+p.coins+' | Banco: '+p.bank,true);
    }
    if(name==='transferir'){
        const match=/^([a-f0-9]{6})\s+([1-9]\d{0,3})$/i.exec(arg);
        if(!match)return result('Use :transferir codigo 10. O código é o identificador do perfil no ranking.');
        const keys=Object.keys(state.players).filter(k=>k.startsWith(match[1].toLowerCase()));
        const n=Number(match[2]),to=keys.length===1?keys[0]:null;
        if(!to||to===id)return result('Destinatário inválido ou ambíguo.');
        if(p.coins<n||state.players[to].coins+n>limit)return result('Saldo insuficiente ou limite atingido.');
        p.coins-=n;state.players[to].coins+=n;return result('Transferência de '+n+' moedas virtuais para '+label(to)+'.',true);
    }
    if(name==='semanal'){
        const w=week(now);if(p.weekly===w)return result('Recompensa semanal já coletada.');
        p.weekly=w;p.coins=Math.min(limit,p.coins+35);p.xp+=3;return result('🎁 +35 moedas virtuais e +3 XP.',true);
    }
    if(name==='profissao'){
        if(!arg)return result('Profissão: '+(roles[p.role]||'nenhuma')+'\nEscolha: '+Object.keys(roles).join(', '));
        if(!Object.hasOwn(roles,arg))return result('Profissão inválida.');
        if(p.role===arg)return result('Você já escolheu essa profissão.');
        p.role=arg;return result('Profissão virtual: '+roles[arg]+'. Use :trabalhar.',true);
    }
    if(name==='trabalhar'){
        if(!Object.hasOwn(roles,p.role||''))return result('Escolha :profissao.');
        if(p.workDay===day(now))return result('Atividade diária já concluída.');
        p.workDay=day(now);p.coins=Math.min(limit,p.coins+12);p.xp+=2;return result(roles[p.role]+' — atividade concluída: +12 moedas e +2 XP.',true);
    }
    if(name==='tarefadiaria'){
        if(p.dailyTask===day(now))return result('Missão diária concluída!');
        if(p.workDay!==day(now))return result('🎯 Missão: complete :trabalhar hoje.');
        p.dailyTask=day(now);p.coins=Math.min(limit,p.coins+8);p.xp+=2;return result('🎯 Missão concluída! +8 moedas e +2 XP.',true);
    }
    if(name==='aventura'){
        if(arg==='sair'){delete p.adventure;return result('Aventura encerrada.',true);}
        if(arg==='novo'||!p.adventure){
            if(p.adventureDay===day(now))return result('Você já completou uma aventura hoje.');
            p.adventure={scene:choose(scenes.length)};return result('🗺️ '+scenes[p.adventure.scene][0]+'\n:aventura ajudar | explorar | sair',true);
        }
        if(!arg)return result(scenes[p.adventure.scene][0]+'\n:aventura ajudar ou explorar');
        if(!['ajudar','explorar'].includes(arg))return result('Escolha ajudar, explorar ou sair.');
        const action=scenes[p.adventure.scene][1];delete p.adventure;p.adventureDay=day(now);p.coins=Math.min(limit,p.coins+10);p.xp+=3;
        return result('🌟 '+action+' — missão concluída! +10 moedas e +3 XP.',true);
    }
    return null;
}
export function shortActivity(text){
    const m=/^(casa|voto|resposta)\s+([1-9])$/i.exec(String(text||'').trim());
    return m?{name:m[1].toLowerCase()==='casa'?'velhadupla':m[1].toLowerCase()==='resposta'?'resposta':'votar',arg:m[2]}:null;
}
