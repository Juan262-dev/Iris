import { randomInt } from 'node:crypto';
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const lines = [
    [/^(oi|ola|e ai|opa)( |$)/,['Oi! Como vai?','Olá! Quer jogar um quiz?']],
    [/\b(bom dia|boa tarde|boa noite)\b/,['Que seu dia seja tranquilo!','Olá! Espero que esteja tudo bem.']],
    [/\b(obrigado|obrigada|valeu)\b/,['Por nada!','Disponha!']],
    [/\b(como vai|tudo bem|como voce esta)\b/,['Estou funcionando! Quer conhecer meus comandos?']],
    [/\b(quem e voce|seu nome)\b/,['Sou a Íris, um bot de comandos e jogos.']],
    [/\b(pi ada|piada)\b/,['Por que o livro de matemática ficou triste? Porque tinha muitos problemas!']],
    [/\b(tchau|ate logo)\b/,['Até mais!']],
];
export function localReply(arg) {
    if (!String(arg || '').trim()) return '🌸 Use !iris chat seguido de uma saudação ou pergunta simples. São respostas prontas, sem IA.';
    const t = normalize(arg);
    for (const [pattern, replies] of lines) if(pattern.test(t)) return '🌸 Íris (resposta local): '+replies[randomInt(replies.length)];
    return '🌸 Íris (resposta local): Ainda não tenho uma frase para isso. Experimente !iris menu.';
}
const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export const winner = b => wins.some(a=>a.every(i=>b[i]==='X'))?'X':wins.some(a=>a.every(i=>b[i]==='O'))?'O':null;
const boardText = b => [0,3,6].map(start=>b.slice(start,start+3).map((v,i)=>v==='X'?'❌':v==='O'?'⭕':String(start+i+1)).join(' │ ')).join('\n');
const words = ['PLANETA','ESCOLA','CADERNO','FLORESTA','OCEANO','JANELA','FUTEBOL','AMIZADE','MUSICA'];
export function makeLocalGames() {
    const games = new Map();
    const get = (key) => {const g=games.get(key);if(g && g.expires>Date.now())return g;games.delete(key);return null;};
    const put = (key,g) => {games.set(key,{...g,expires:Date.now()+600000});if(games.size>200)games.delete(games.keys().next().value);};
    return ({name,arg,jid,actor})=>{
        if(!actor)return '🌸 Participante não identificado.';
        const key=jid+':'+actor+':'+name;
        if(name==='velha'){
            if(!arg || arg==='novo'){const b=Array(9).fill('');put(key,{b});return '🎮 Jogo da velha — você é X.\n'+boardText(b)+'\n!iris velha 1 até 9.';}
            if(arg==='sair'){games.delete(key);return 'Jogo encerrado.';}
            const g=get(key);if(!g)return 'Use !iris velha para começar.';
            if(!/^[1-9]$/.test(arg)||g.b[Number(arg)-1])return 'Escolha uma casa livre de 1 a 9.';
            const b=g.b;b[Number(arg)-1]='X';
            if(winner(b)==='X'){games.delete(key);return boardText(b)+'\nVocê venceu!';}
            const free=b.map((v,i)=>v? -1:i).filter(i=>i>=0);
            if(!free.length){games.delete(key);return boardText(b)+'\nEmpate!';}
            b[free[randomInt(free.length)]]='O';
            if(winner(b)==='O'||b.every(Boolean)){games.delete(key);return boardText(b)+(winner(b)?'\nÍris venceu!':'\nEmpate!');}
            put(key,{b});return boardText(b)+'\nSua vez!';
        }
        if(name==='forca'){
            if(!arg || arg==='novo'){const word=words[randomInt(words.length)];put(key,{word,used:[],errors:0});return '🔤 Adivinhe a palavra: '+Array(word.length).fill('_').join(' ')+'\nUse !iris forca letra. Você tem 6 tentativas erradas.';}
            if(arg==='sair'){games.delete(key);return 'Jogo encerrado.';}
            const g=get(key);if(!g)return 'Use !iris forca para começar.';
            const letter=normalize(arg).toUpperCase();
            if(!/^[A-Z]$/.test(letter))return 'Envie apenas uma letra.';
            if(g.used.includes(letter))return 'Letra já usada.';
            g.used.push(letter);if(!g.word.includes(letter))g.errors++;
            const shown=[...g.word].map(l=>g.used.includes(l)?l:'_');
            if(!shown.includes('_')||g.errors>=6){games.delete(key);return (!shown.includes('_')?'Você acertou! ':'Fim de jogo. ')+'Palavra: '+g.word;}
            put(key,g);return shown.join(' ')+'\nErros: '+g.errors+'/6 | Letras: '+g.used.join(', ');
        }
        return null;
    };
}
export const shop = Object.freeze({estrela:{name:'⭐ Estrela',price:20},medalha:{name:'🏅 Medalha',price:40},trofeu:{name:'🏆 Troféu',price:80}});
export function purchase(player, item) {
    if(!Object.hasOwn(shop,item))return 'Item não encontrado. Use !iris loja.';
    if(!player)return 'Use !iris perfil para participar.';
    if(player.coins<shop[item].price)return 'Moedas virtuais insuficientes.';
    player.inventory ??= {};
    if(Object.hasOwn(player.inventory,item))return 'Você já possui este item.';
    player.coins-=shop[item].price;player.inventory[item]=true;return null;
}
