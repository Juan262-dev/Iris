export const tournamentCommand='torneiouno';
const out=(text,changed=false)=>({text,changed});
const label=id=>'Jogador '+id.slice(0,6);
const expires=7*86400000;
function live(state,now){const t=state.tournament4;if(t&&t.expires>now)return t;if(t){if(state.megaGames?.uno?.tournament4)delete state.megaGames.uno;delete state.tournament4;}return null;}
function lobby(state,t,now){const m=state.megaGames??={};if(m.uno)return false;const ids=t.queue[0];if(!ids)return false;m.uno={ids:ids.slice(),routes:{},started:false,expires:now+86400000,tournament4:true};return true;}
export function tournament4({state,id,arg='',owner=false,now=Date.now()}){
    let t=live(state,now);arg=arg.toLowerCase();
    if(arg==='novo'){if(!owner)return out('Somente o responsável inicia o torneio.');if(t)return out('Já existe torneio.');state.tournament4={ids:[],queue:[],winners:[],round:1,started:false,expires:now+expires};return out('Torneio UNO sem apostas. :torneiouno entrar; responsável :torneiouno iniciar (2, 4 ou 8).',true);}
    if(!t)return out('Use :torneiouno novo.');
    if(arg==='cancelar'){if(!owner)return out('Somente o responsável cancela.');if(state.megaGames?.uno?.tournament4)delete state.megaGames.uno;delete state.tournament4;return out('Torneio cancelado.',true);}
    if(arg==='entrar'){if(t.started||t.ids.includes(id)||t.ids.length>=8)return out('Inscrição indisponível.');t.ids.push(id);return out('Inscrição registrada: '+t.ids.length,true);}
    if(arg==='sair'&&!t.started){t.ids=t.ids.filter(k=>k!==id);return out('Inscrição removida.',true);}
    if(arg==='iniciar'){if(!owner||t.started||![2,4,8].includes(t.ids.length)||state.megaGames?.uno)return out('Necessários 2, 4 ou 8 inscritos, responsável e mesa UNO livre.');for(let i=0;i<t.ids.length;i+=2)t.queue.push(t.ids.slice(i,i+2));t.started=true;lobby(state,t,now);return out('Primeira partida: '+t.queue[0].map(label).join(' × ')+'. Ambos :uno pv; primeiro jogador :uno iniciar.',true);}
    if(arg==='retomar'){if(!owner||!t.started)return out('Somente o responsável retoma.');if(state.megaGames?.uno?.tournament4&&state.megaGames.uno.expires<=now)delete state.megaGames.uno;if(!lobby(state,t,now))return out('Mesa já ativa ou indisponível.');return out('Mesa retomada. Ambos confirmam :uno pv.',true);}
    return out('Torneio UNO • rodada '+t.round+'\n'+(t.started?t.queue.map(pair=>pair.map(label).join(' × ')).join('\n'):t.ids.map(label).join('\n'))+'\n:torneiouno iniciar | retomar | cancelar');
}
export function advanceTournament(state,game,winner,now){
    const t=live(state,now);if(!game.tournament4||!t?.started||!t.queue[0]?.includes(winner)||t.queue[0].join(',')!==game.ids.join(','))return '';
    t.queue.shift();t.winners.push(winner);
    if(!t.queue.length){if(t.winners.length===1){delete state.tournament4;return '\n🏆 Campeão do torneio: '+label(winner)+'!';}for(let i=0;i<t.winners.length;i+=2)t.queue.push(t.winners.slice(i,i+2));t.winners=[];t.round++;}
    lobby(state,t,now);return '\nPróxima partida: '+t.queue[0].map(label).join(' × ')+'. Confirme :uno pv; primeiro jogador :uno iniciar.';
}
