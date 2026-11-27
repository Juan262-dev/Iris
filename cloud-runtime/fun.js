import { randomInt } from 'node:crypto';
import { captureName,displayName } from './profileCard.js';
import { unoRoute } from './unoVisual.js';
import { friendlyGif,funMenu } from './funMedia.js';
export const funNames=['fun','abraco','tocarasmaos','amizade','elogio','dupla','quem','verdade','desafio','eununca','chance','8ball','escolher','sorte','frase','adivinha'];
const out=(text,changed=false)=>({text,changed});
const truths=['Qual jogo você recomendaria para os amigos?','Qual seria o nome de um planeta inventado por você?','Qual personagem de desenho você acha engraçado?','Qual habilidade artística gostaria de aprender?','Qual foi a parte mais divertida de um jogo que você jogou?'];
const challenges=['Invente um nome criativo para uma equipe de exploradores.','Descreva um animal usando três emojis.','Crie uma rima com a palavra planeta.','Desenhe uma estrela no papel, se quiser.','Tente criar uma charada sobre um objeto comum.','Escreva uma história de exatamente cinco palavras.'];
const never=['Eu nunca esqueci o nome de um personagem em um jogo.','Eu nunca ri de uma piada que demorei a entender.','Eu nunca inventei uma palavra engraçada.','Eu nunca comecei um desenho e mudei de ideia no meio.','Eu nunca confundi os dias da semana.'];
const luck=['Hoje pode ser um bom dia para experimentar um jogo novo.','Um toque de criatividade combina com sua próxima rodada.','Que tal uma pausa para fazer algo de que você gosta?','A carta imaginária do dia é Cooperação.'];
const sayings=['Até o melhor jogador já começou aprendendo as regras.','Uma boa risada não precisa de um alvo.','Criatividade transforma um simples lápis em mil histórias.','Jogar junto vale mais que vencer sozinho.'];
const compliments=['Seu espírito de equipe faz a diferença.','Obrigado por compartilhar bons momentos no grupo.','Que suas próximas ideias sejam cheias de criatividade.','É muito bom ter colegas que jogam com respeito.'];
const riddles=[
    {q:'O que tem dentes, mas não morde?',a:['pente']},
    {q:'O que quanto mais se tira, maior fica?',a:['buraco']},
    {q:'O que tem folhas, mas não é árvore?',a:['livro','caderno']},
    {q:'O que tem ponteiros, mas não costura?',a:['relogio']},
    {q:'O que tem cabeça e dentes, mas não é gente?',a:['alho']}
];
const normalized=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').trim().toLowerCase();
const pick=(items,choose)=>items[choose(items.length)];
const enabled=(state,k)=>state.players?.[k]&&state.fun?.volunteers?.[k]===true;
const validCode=v=>/^[a-f0-9]{6}$/.test(v);
const label=(state,k)=>displayName(state,k)+' ('+k.slice(0,6)+')';
function removePending(db,id){
    for(const [k,v] of Object.entries(db.requests||{}))if(v.from===id||v.to===id)delete db.requests[k];
}
export function removeFun(state,id){
    const db=state.fun;if(!db)return;
    if(db.volunteers)delete db.volunteers[id];
    removePending(db,id);
    if(db.riddle?.creator===id)delete db.riddle;
}
// No raw WhatsApp IDs stored: the integration hashes only actual group-member identifiers.
export async function groupFunTargets({sock,jid,msg,hashActor}){
    if(!jid?.endsWith('@g.us')||typeof hashActor!=='function')return {members:new Set(),mentioned:null};
    const metadata=await sock.groupMetadata(jid),members=new Set();
    const self=[sock.user?.id,sock.user?.lid].map(unoRoute).filter(Boolean);
    const owner=(sock.user?.id||'owner').split(':')[0]+'@self';
    const participants=(metadata.participants||[]).map(p=>{
        const variants=[p.id,p.lid,p.phoneNumber].filter(x=>typeof x==='string'&&unoRoute(x));
        const normal=[...new Set(variants.map(unoRoute))];
        const own=normal.some(v=>self.includes(v));
        const hashes=new Set(own?[hashActor(owner)]:[...variants,...normal].map(hashActor));
        for(const h of hashes)members.add(h);
        return {normal,hashes};
    });
    const mention=msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    let mentioned=null;
    if(Array.isArray(mention)&&mention.length===1){
        const v=unoRoute(mention[0]);
        const match=v?participants.filter(p=>p.normal.includes(v)):[];
        if(match.length===1)mentioned=match[0].hashes;
    }
    return {members,mentioned};
}
export async function funFeature({name,arg='',state,id,rawName,targets,now=Date.now(),choose=randomInt,animate=friendlyGif}){
    const db=state.fun??={volunteers:{},requests:{}};
    db.volunteers??={};db.requests??={};
    arg=String(arg||'').trim();
    const text=normalized(arg);
    const active=enabled(state,id);
    if(name==='fun'){
        if(text==='on'){
            if(!state.players[id])return out('Use :perfil primeiro. A participação nas brincadeiras é voluntária.');
            if(!active&&Object.keys(db.volunteers).length>=100)return out('Limite de voluntários atingido.');
            db.volunteers[id]=true;captureName(state,id,rawName);
            return out('🎉 Você entrou na Íris Fun. Seu nome de perfil pode aparecer nas brincadeiras do grupo. Use :fun off para sair a qualquer momento.',true);
        }
        if(text==='off'){removeFun(state,id);return out('Participação removida. Você não será sorteado nem receberá novas interações da Íris Fun.',true);}
        if(text==='lista'){
            const scope=await targets();
            const people=Object.keys(db.volunteers).filter(k=>enabled(state,k)&&scope.members.has(k));
            return out('🎉 Voluntários neste grupo:\n'+(people.map(k=>label(state,k)).join('\n')||'Nenhum. Use :fun on.'));
        }
        return out(await funMenu());
    }
    if(name==='verdade')return out('💬 Verdade (opcional): '+pick(truths,choose));
    if(name==='desafio')return out('🎨 Desafio opcional e seguro: '+pick(challenges,choose));
    if(name==='eununca')return out('🎉 '+pick(never,choose)+'\nResponda se quiser; sem obrigação de revelar nada pessoal.');
    if(name==='sorte')return out('🍀 Sorte fictícia do dia: '+pick(luck,choose));
    if(name==='frase')return out('✨ '+pick(sayings,choose));
    if(name==='chance'||name==='8ball'){
        const safe=['ganhar no jogo','ganhar uma partida','resolver o quiz','acertar a charada','encontrar um par','chuva de confete','tirar seis no dado','jogar hoje','ganhar no uno','ganhar no xadrez'];
        if(!safe.includes(text))return out('🔮 Palpites apenas sobre temas de brincadeira. Ex.: :'+name+' ganhar no jogo. Temas: '+safe.join(', ')+'.');
        if(name==='chance')return out('🎲 Resultado aleatório de brincadeira: '+choose(101)+'%. Não é uma previsão real.');
        return out('🎱 '+pick(['A bola sugere um talvez.','A bola está otimista para a brincadeira.','A bola está em modo mistério.','A resposta fica para a próxima rodada.'],choose)+' Resultado fictício.');
    }
    if(name==='escolher'){
        const options=arg.split('|').map(s=>s.trim());
        if(options.length<2||options.length>6||options.some(s=>!s||Array.from(s).length>50))return out('Use :escolher opção1 | opção2 (até seis opções curtas).');
        // Return a position rather than echoing arbitrary user-provided text.
        return out('🎲 Escolha aleatória: opção '+(choose(options.length)+1)+' de '+options.length+'. Não use para decisões importantes ou arriscadas.');
    }
    if(name==='adivinha'){
        let g=db.riddle;if(g&&g.expires<=now){delete db.riddle;g=null;}
        if(text==='sair'&&g?.creator===id){delete db.riddle;return out('Charada encerrada.',true);}
        if(text==='novo'||!text&&!g){
            if(g)return out('Já existe uma charada ativa. Use :adivinha resposta palavra.');
            const index=choose(riddles.length);db.riddle={creator:id,index,expires:now+600000,tries:0};
            return out('🧩 '+riddles[index].q+'\n:adivinha resposta palavra',true);
        }
        if(!g)return out('Use :adivinha novo.');
        if(!text||text==='pista')return out('🧩 '+riddles[g.index].q);
        if(!text.startsWith('resposta '))return out('Use :adivinha resposta palavra.');
        if(riddles[g.index].a.includes(text.slice(9))){delete db.riddle;return out('🎉 Resposta correta! Você resolveu a charada.',true);}
        if(++g.tries>=20){delete db.riddle;return out('Fim da rodada. A resposta era '+riddles[g.index].a[0]+'.',true);}
        return out('Ainda não! Tente novamente.',true);
    }
    if(!['abraco','tocarasmaos','amizade','elogio','dupla','quem'].includes(name))return null;
    if(!active)return out('Use :perfil e depois :fun on para participar voluntariamente das interações.');
    const scope=await targets();
    const pool=Object.keys(db.volunteers).filter(k=>enabled(state,k)&&scope.members.has(k));
    if(!pool.includes(id))return out('Não consegui verificar sua participação no grupo. Tente novamente.');
    if(name==='quem'||name==='dupla'){
        if(pool.length<(name==='quem'?1:2))return out('São necessários mais voluntários. Use :fun on.');
        const a=pool.splice(choose(pool.length),1)[0];
        if(name==='quem')return out('🎉 Participante sorteado: '+label(state,a)+'.');
        const b=pick(pool,choose);
        return out('🤝 Dupla sorteada: '+label(state,a)+' e '+label(state,b)+'. Apenas uma dupla de jogo, sem significado romântico.');
    }
    for(const [k,v] of Object.entries(db.requests))if(v.expires<=now)delete db.requests[k];
    if(name==='amizade'){
        if(text==='cancelar'){removePending(db,id);return out('Convites de amizade cancelados.',true);}
        const accept=/^aceitar ([a-f0-9]{6})$/.exec(text);
        if(accept){
            const pending=Object.entries(db.requests).filter(([,v])=>v.to===id&&v.from.startsWith(accept[1])&&pool.includes(v.from));
            if(pending.length!==1)return out('Nenhum convite válido para você.');
            const [key,v]=pending[0];delete db.requests[key];
            return out('🤝 '+label(state,v.from)+' + '+label(state,id)+'\nMedidor fictício de amizade: '+(80+choose(21))+'%. É apenas uma brincadeira, não uma avaliação de pessoas.',true);
        }
    }
    const matches=pool.filter(k=>k!==id&&(scope.mentioned?.has(k)||validCode(text)&&k.startsWith(text)));
    if(matches.length!==1)return out('Mencione um único participante voluntário ou use o código dele em :'+name+'. Veja :fun lista.');
    const to=matches[0],fromName=label(state,id),toName=label(state,to);
    if(name==='amizade'){
        if(Object.values(db.requests).some(v=>v.from===id)||Object.keys(db.requests).length>=30)return out('Já existe um convite pendente ou o limite foi atingido. Use :amizade cancelar.');
        const key=id+'-'+to;db.requests[key]={from:id,to,expires:now+300000};
        return out('🤝 '+fromName+' convidou '+toName+' para o medidor fictício. Somente o convidado pode aceitar com :amizade aceitar '+id.slice(0,6)+' em até 5 minutos.',true);
    }
    const caption=name==='abraco'?fromName+' enviou um abraço virtual amigável para '+toName+'.':name==='tocarasmaos'?fromName+' e '+toName+' receberam um toque de mãos virtual!':fromName+' para '+toName+': '+pick(compliments,choose);
    // Both have opted in; no actual physical or romantic interaction is implied.
    return out(await animate(name,caption));
}
