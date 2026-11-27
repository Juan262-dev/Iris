import { randomInt } from 'node:crypto';
export function makeExtras(games=new Map()) {
    const jokes=['Por que a bicicleta caiu? Porque estava sem equilíbrio!','Qual é o café mais perigoso? O ex-presso!','Por que o computador foi ao médico? Estava com um vírus!','O que uma parede disse à outra? Nos encontramos na esquina!'];
    const facts=['O polvo tem três corações.','A luz do Sol leva cerca de oito minutos para chegar à Terra.','O som não se propaga no vácuo.','As abelhas podem comunicar direções por meio de danças.','O maior planeta do Sistema Solar é Júpiter.'];
    return ({name,arg,jid,actor})=>{
        if(name==='piada')return '😄 '+jokes[randomInt(jokes.length)];
        if(name==='curiosidade')return '💡 '+facts[randomInt(facts.length)];
        if(name==='ppt'){
            const choices=['pedra','papel','tesoura'];
            const a=choices.indexOf(arg.toLowerCase());
            if(a<0)return '✊ Use :ppt pedra, papel ou tesoura.';
            const b=randomInt(3);
            return 'Você: '+choices[a]+' | Íris: '+choices[b]+'\n'+(a===b?'Empate!':(a-b+3)%3===1?'Você venceu!':'Íris venceu!');
        }
        if(name==='numero'){
            if(!actor)return 'Participante não identificado.';
            const key=jid+':'+actor;
            if(!arg||arg==='novo'){
                games.set(key,{answer:randomInt(1,101),tries:0,expires:Date.now()+600000});
                if(games.size>200)games.delete(games.keys().next().value);
                return '🔢 Adivinhe um número de 1 a 100. Você tem 8 tentativas. Use :numero 50.';
            }
            if(arg==='sair'){games.delete(key);return 'Jogo encerrado.';}
            const g=games.get(key);
            if(!g||g.expires<Date.now()){games.delete(key);return 'Use :numero para começar.';}
            if(!/^\d{1,3}$/.test(arg)||Number(arg)<1||Number(arg)>100)return 'Escolha um número de 1 a 100.';
            const n=Number(arg);g.tries++;
            if(n===g.answer||g.tries>=8){games.delete(key);return n===g.answer?'🎉 Você acertou em '+g.tries+' tentativas!':'Fim de jogo. O número era '+g.answer+'.';}
            return (n<g.answer?'⬆️ Maior!':'⬇️ Menor!')+' Restam '+(8-g.tries)+' tentativas.';
        }
        return null;
    };
}
export function makeLimiter({windowMs=15000,max=6,groupMax=25,now=Date.now}={}){
    const slots=new Map();
    function get(k,t){const x=slots.get(k);return x&&t-x.start<windowMs?x:{start:t,n:0};}
    return (group,actor)=>{
        const t=now();const a='a:'+group+':'+actor;const b='g:'+group;
        const x=get(a,t),y=get(b,t);
        if(x.n>=max||y.n>=groupMax)return false;
        x.n++;y.n++;slots.set(a,x);slots.set(b,y);
        while(slots.size>2000)slots.delete(slots.keys().next().value);
        return true;
    };
}
