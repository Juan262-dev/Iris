import { randomInt } from 'node:crypto';
import { Chess } from 'chess.js';

const glyph={p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚',P:'♙',N:'♘',B:'♗',R:'♖',Q:'♕',K:'♔'};
export function boardText(game) {
    return game.board().map((row,i)=>(8-i)+'  '+row.map(p=>p?glyph[p.color==='w'?p.type.toUpperCase():p.type]:'·').join('  ')).join('\n')+'\n    a  b  c  d  e  f  g  h';
}
export function makeChess({choose=randomInt,now=Date.now}={}) {
    const games=new Map();
    return ({jid,actor,arg})=>{
        if(!actor)return '🌸 Participante não identificado.';
        const key=jid+':'+actor;
        const input=String(arg||'').trim().toLowerCase();
        let g=games.get(key);
        if(g&&g.expires<=now()){games.delete(key);g=undefined;}
        if(input==='sair'){games.delete(key);return '♟️ Partida encerrada.';}
        if(input==='novo'||(!input&&!g)){
            g={game:new Chess(),expires:now()+30*60000};games.set(key,g);
            if(games.size>100)games.delete(games.keys().next().value);
        }
        if(!g)return '♟️ Use !iris xadrez novo para iniciar.';
        const board=()=> '♟️ *Xadrez — você joga com as brancas*\n'+boardText(g.game);
        if(!input||input==='novo'||input==='tabuleiro')return board()+'\nUse !iris xadrez e2e4 (promoção: e7e8q).';
        if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input))return '♟️ Informe origem e destino, por exemplo !iris xadrez e2e4.';
        try{g.game.move({from:input.slice(0,2),to:input.slice(2,4),...(input.length===5?{promotion:input[4]}:{})});}
        catch{return '♟️ Jogada inválida. Consulte !iris xadrez tabuleiro.';}
        const result=()=>{
            if(!g.game.isGameOver())return null;
            games.delete(key);
            return g.game.isCheckmate()?(g.game.turn()==='b'?'Você venceu por xeque-mate!':'Íris venceu por xeque-mate!'):'Empate!';
        };
        let end=result();if(end)return board()+'\n'+end;
        const moves=g.game.moves({verbose:true});
        const chosen=moves[choose(moves.length)];
        g.game.move({from:chosen.from,to:chosen.to,...(chosen.promotion?{promotion:chosen.promotion}:{})});
        end=result();
        g.expires=now()+30*60000;
        return board()+'\nÍris jogou: '+chosen.from+chosen.to+(chosen.promotion||'')+'\n'+(end||(g.game.isCheck()?'Xeque! Sua vez.':'Sua vez.'));
    };
}

const missions=[
    {id:'primeiros',label:'Alcançar 3 XP',coins:15,ready:p=>p.xp>=3},
    {id:'aprendiz',label:'Alcançar 10 XP',coins:25,ready:p=>p.xp>=10},
    {id:'colecao',label:'Ter um item no inventário',coins:10,ready:p=>Object.keys(p.inventory||{}).length>0},
];
export function mission(player,arg='') {
    if(!player)return {text:'🌸 Use !iris perfil para participar.',changed:false};
    const claimed=player.missions||{};
    const selected=missions.find(m=>m.id===arg.toLowerCase().trim());
    if(!arg.trim())return {text:'🎯 *Missões de conquista* (uma vez cada)\n'+missions.map(m=>(claimed[m.id]?'✅':m.ready(player)?'🎁':'◻️')+' '+m.label+' — '+m.coins+' moedas virtuais\n!iris resgatar '+m.id).join('\n'),changed:false};
    if(!selected)return {text:'Missão desconhecida. Use !iris missoes.',changed:false};
    if(claimed[selected.id])return {text:'Missão já resgatada.',changed:false};
    if(!selected.ready(player))return {text:'Missão ainda não concluída.',changed:false};
    player.missions??={};player.missions[selected.id]=true;player.coins+=selected.coins;
    return {text:'🎁 Missão concluída! +'+selected.coins+' moedas virtuais.',changed:true};
}
export function welcomeMessage(action, count) {
    if(!Number.isInteger(count)||count<1)return null;
    if(action==='add')return '🌸 Boas-vindas ao grupo! Conheça os comandos com !iris menu e as regras com !iris regras.';
    if(action==='remove')return '🌸 Até mais a quem saiu do grupo!';
    return null;
}
