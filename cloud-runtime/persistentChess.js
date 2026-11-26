import { createHmac, randomInt } from 'node:crypto';
import { Chess } from 'chess.js';
import { renderBoard } from './chessBoard.js';
import { boardText } from './nextFeatures.js';

const values={p:100,n:320,b:330,r:500,q:900,k:0};
const themes=['classico','madeira','escuro'];
const levels=['facil','medio','dificil'];
const moveArg=m=>({from:m.from,to:m.to,...(m.promotion?{promotion:m.promotion}:{})});
const notation=m=>m.from+m.to+(m.promotion||'');
function material(game) {
    if(game.isCheckmate())return game.turn()==='w'?100000:-100000;
    if(game.isDraw())return 0;
    return game.board().flat().reduce((n,p)=>n+(p?(p.color==='b'?1:-1)*values[p.type]:0),0);
}
export function pickMove(game,level,choose=randomInt) {
    const moves=game.moves({verbose:true});
    if(!moves.length)return null;
    if(level==='facil')return moves[choose(moves.length)];
    let best=-Infinity,choices=[];
    // Bounded two-ply material search on difficult; no external AI.
    for(const m of moves){
        game.move(moveArg(m));
        let score=material(game);
        if(level==='dificil'&&!game.isGameOver()){
            let worst=Infinity;
            for(const reply of game.moves({verbose:true})){
                game.move(moveArg(reply));worst=Math.min(worst,material(game));game.undo();
            }
            if(Number.isFinite(worst))score=worst;
        }
        game.undo();
        if(score>best){best=score;choices=[m];}
        else if(score===best)choices.push(m);
    }
    return choices[choose(choices.length)];
}
const reconstruct=record=>{
    const game=new Chess();
    for(const s of record.moves)game.move({from:s.slice(0,2),to:s.slice(2,4),...(s.length===5?{promotion:s[4]}:{})});
    return game;
};
export function makePersistentChess({readGroup,save,choose=randomInt,now=Date.now}){
    return async ({jid,actor,arg})=>{
        if(!actor)return '🌸 Participante não identificado.';
        const {s,state}=await readGroup(jid);
        const id=createHmac('sha256',s.key).update(jid+':'+actor).digest('hex');
        const db=state.chess??={solo:{},duel:null,stats:{},prefs:{}};
        const raw=String(arg||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
        const input=raw.replace(/^([a-h][1-8])\s+([a-h][1-8][qrbn]?)$/,'$1$2');
        const persist=()=>save(s,state);
        const label=k=>'Jogador '+k.slice(0,6);
        const pref=db.prefs[id]||{theme:'classico',level:'facil'};
        const activeDuel=()=>db.duel&&(db.duel.white===id||db.duel.black===id);
        if(db.duel&&db.duel.expires<now()){db.duel=null;await persist();}
        if(db.solo[id]&&db.solo[id].expires<now()){delete db.solo[id];await persist();}
        if(input==='ajuda')return '♟️ !iris xadrez novo | novo medio | novo dificil | tema madeira | desafio | aceitar | ranking | stats | apagar | tabuleiro | sair | e2e4. Partidas e resultados de quem joga são salvos com identificador pseudônimo por grupo; apagar remove seus dados.';
        if(input==='ranking'){
            const rows=Object.entries(db.stats).sort((a,b)=>b[1].w-a[1].w||a[1].l-b[1].l).slice(0,10);
            return '🏆 *Ranking de xadrez*\n'+(rows.map(([k,v],i)=>(i+1)+'. '+label(k)+' — V '+v.w+' | D '+v.l+' | E '+v.d).join('\n')||'Nenhuma partida concluída.');
        }
        if(input==='stats'){const p=db.stats[id]||{w:0,l:0,d:0};return '♟️ '+label(id)+' — Vitórias: '+p.w+' | Derrotas: '+p.l+' | Empates: '+p.d;}
        if(input==='apagar'){
            delete db.solo[id];delete db.stats[id];delete db.prefs[id];
            if(activeDuel())db.duel=null;
            await persist();return '♟️ Seus dados de xadrez e partidas ativas foram removidos.';
        }
        if(input.startsWith('tema ')){
            const theme=input.slice(5);
            if(!themes.includes(theme))return 'Temas: classico, madeira, escuro.';
            if(!db.prefs[id]&&Object.keys(db.prefs).length>=200)return 'Limite de perfis de xadrez.';
            db.prefs[id]={...pref,theme};await persist();return '🎨 Tema '+theme+' selecionado. Use !iris xadrez tabuleiro.';
        }
        if(input==='desafio'){
            if(db.duel)return 'Já existe um desafio ou partida multiplayer neste grupo.';
            if(db.solo[id])return 'Encerre sua partida solo com !iris xadrez sair primeiro.';
            db.duel={white:id,black:null,moves:[],expires:now()+10*60000};
            await persist();return '♟️ Desafio aberto por '+label(id)+'. Outro participante pode enviar !iris xadrez aceitar em até 10 minutos. Resultados são registrados no ranking pseudônimo; !iris xadrez apagar remove seus dados.';
        }
        if(input==='aceitar'){
            if(!db.duel||db.duel.black)return 'Nenhum desafio aberto.';
            if(db.duel.white===id)return 'Aguarde outro participante aceitar.';
            if(db.solo[id])return 'Encerre sua partida solo primeiro.';
            db.duel.black=id;db.duel.expires=now()+7*86400000;await persist();
        }
        const newGame=input==='novo'||input.startsWith('novo ')||(!input&&!activeDuel()&&!db.solo[id]);
        if(newGame){
            if(activeDuel())return 'Encerre sua partida multiplayer antes de iniciar outra.';
            if(db.solo[id]&&input)return 'Você já tem uma partida salva. Use tabuleiro ou sair.';
            const level=input.startsWith('novo ')?input.slice(5):pref.level;
            if(!levels.includes(level))return 'Dificuldades: facil, medio, dificil.';
            if(!db.solo[id]&&Object.keys(db.solo).length>=100)return 'Limite de partidas do grupo.';
            db.solo[id]={moves:[],level,expires:now()+7*86400000};await persist();
        }
        const duel=activeDuel();
        const rec=duel?db.duel:db.solo[id];
        if(!rec)return '♟️ Use !iris xadrez novo ou desafio.';
        if(duel&&!rec.black){
            if(input==='sair'){db.duel=null;await persist();return 'Desafio cancelado.';}
            return 'Aguardando outro participante usar !iris xadrez aceitar.';
        }
        const game=reconstruct(rec);
        const white=duel?rec.white:id;
        const black=duel?rec.black:null;
        const color=white===id?'w':'b';
        const turn=()=>game.turn()==='w'?'Brancas':'Pretas';
        const caption=()=>duel?'♟️ *Xadrez multiplayer*\nBrancas: '+label(white)+' | Pretas: '+label(black):'♟️ *Xadrez contra Íris — '+rec.level+'*\nVocê joga com as brancas.';
        const board=async status=>{
            const cap=caption()+'\n'+status;
            try{return {image:await renderBoard(game,game.history({verbose:true}).at(-1),pref.theme),caption:cap};}
            catch{return cap+'\n'+boardText(game);}
        };
        const finish=winner=>{
            const ids=[[white,'w'],[black,'b']].filter(([k])=>k);
            for(const [k,col] of ids){
                if(!db.stats[k]&&Object.keys(db.stats).length>=200)continue;
                const p=db.stats[k]??={w:0,l:0,d:0};
                p[winner===null?'d':winner===col?'w':'l']++;
            }
            if(duel)db.duel=null;else delete db.solo[id];
        };
        if(input==='sair'){finish(color==='w'?'b':'w');await persist();return '♟️ Partida encerrada por desistência. Resultado registrado.';}
        if(input==='tabuleiro'||input==='aceitar'||newGame||!input)return board('Vez: '+turn()+'. Use !iris xadrez e2e4. Partida salva por até 7 dias de inatividade. Use apagar para excluir seus dados.');
        if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input))return 'Use !iris xadrez ajuda.';
        if(game.turn()!==color)return 'Aguarde a vez das suas peças.';
        try{const m=game.move({from:input.slice(0,2),to:input.slice(2,4),...(input.length===5?{promotion:input[4]}:{})});rec.moves.push(notation(m));}
        catch{return '♟️ Jogada inválida. Use !iris xadrez tabuleiro.';}
        let status='Jogada: '+input;
        if(!duel&&!game.isGameOver()){
            const m=pickMove(game,rec.level,choose);
            game.move(moveArg(m));rec.moves.push(notation(m));status+='\nÍris jogou: '+notation(m);
        }
        if(game.isGameOver()||rec.moves.length>=600){
            const winner=game.isCheckmate()?(game.turn()==='w'?'b':'w'):null;
            finish(winner);status+='\n'+(winner?'Xeque-mate! '+(winner==='w'?'Brancas':'Pretas')+' venceram.':'Empate!')+' Resultado registrado.';
        }else{
            rec.expires=now()+7*86400000;status+='\n'+(game.isCheck()?'Xeque! ':'')+'Vez: '+turn()+'.';
        }
        await persist();return board(status);
    };
}
