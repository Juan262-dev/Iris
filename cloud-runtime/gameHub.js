import {gameStats} from './profileCard.js';
export const retiredGames=new Set(['rpg','world','mapainfinity','mapainfinty','viajarworld','aventuraworld','offline','explorar','construir','oficina','npc','aventura']);
const catalog={
 stop:['Adedonha','grupo','novo classico 3 180','entrar → iniciar → pv → responda à foto do formulário; placar, revisar, proxima'],
 uno:['UNO','grupo','novo','entrar → pv → iniciar; mao, comprar, gritar'],
 unobot:['UNO solo','solo','novo','mao, pos 1, comprar, sair'],
 domino:['Dominó','grupo','novo','entrar → pv → iniciar; 2 (peça), 2 e/d (lado), c (comprar), p (passar), m (mesa), mao'],
 xadrez:['Xadrez','ambos','novo medio','desafio → aceitar; e2e4, tabuleiro, ajuda'],
 damas:['Damas','grupo','desafio','aceitar; b3 a4, m, jogadas'],
 naval:['Batalha naval','grupo','desafio','aceitar; b4, m, pv, mao (frota privada)'],
 velha:['Jogo da velha','solo','novo','1 a 9; mesa, sair'],
 velhadupla:['Velha em dupla','grupo','desafio','aceitar; casas 1 a 9'],
 ludo:['Ludo','grupo','novo','entrar → iniciar; d (dado), 1 ou 2 (peça), m (mesa)'],
 memoria:['Memória','grupo','novo','entrar; 2 7, m (mesa)'],
 sudoku:['Sudoku','solo','novo facil','1 2 5; dica, limpar 1 2, m'],
 termo:['Termo','solo','novo','amigo; m, sair'],
 '2048':['2048','solo','novo','c (cima), b (baixo), e (esquerda), d (direita), m'],
 forca:['Forca','solo','novo','uma letra; palavra inteira, mesa, sair'],
 numero:['Adivinhe o número','solo','novo','50; status, sair'],
 ppt:['Pedra, papel e tesoura','solo','pedra','pedra, papel ou tesoura'],
 quiz:['Quiz','grupo','geral','resposta 1, 2 ou 3; ciencia, geografia'],
 quizmulti:['Quiz multiplayer','grupo','novo','entrar → iniciar; 1 (alternativa), placar'],
 batalhaconhecimento:['Batalha de conhecimentos','grupo','novo','entrar → iniciar; 1 (alternativa), placar'],
 bingoeducativo:['Bingo de conhecimentos','grupo','novo','entrar → iniciar; 1 (alternativa), placar'],
 cruzadas:['Palavras cruzadas','solo','novo','1 palavra; m'],
 tesouro:['Caça ao tesouro','solo','novo','palavra'],
 detetive:['Detetive','grupo','novo','entrar; palavra da pista'],
 coop:['Cooperativo','grupo','novo','entrar; ajudar'],
 encoded:['Palavra codificada','solo','novo','resposta palavra'],
 inverse:['Palavra invertida','solo','novo','resposta palavra'],
 imobiliario:['Banco imobiliário virtual','grupo','novo','entrar → iniciar; 1, 2 ou 3 (jogada), m'],
 trilha:['Trilha','grupo','novo','entrar → iniciar; 1, 2 ou 3 (jogada), m'],
 expedicao:['Expedição cooperativa','grupo','novo','entrar → iniciar; 1, 2 ou 3 (jogada), m'],
 reliquia:['Relíquias','grupo','novo','entrar → iniciar; 1, 2 ou 3 (jogada), m'],
 campeonato:['Campeonato','grupo','novo','entrar; ver'],
 adivinha:['Adivinhas','solo','novo','resposta palavra'],
 dado:['Dado virtual','solo','','resultado aleatório, sem apostas'],
 moeda:['Cara ou coroa','solo','','resultado aleatório, sem apostas']
};
catalog.torneiouno=['Torneio UNO','grupo','novo','entrar → iniciar'];
catalog.torneio7=['Torneio Conecta 4','grupo','novo','entrar → iniciar; ver; cancelar'];
Object.assign(catalog,{
 conecta4:['Conecta 4','ambos','novo','entrar → iniciar; 1–7; bot facil|medio|dificil; tempo 60; assistir; revanche'],
 reversi:['Reversi','ambos','novo','entrar → iniciar; d3; bot facil|medio|dificil; tempo 60; assistir; revanche'],
 pontinhos:['Jogo dos pontinhos','ambos','novo','entrar → iniciar; h11 ou v11; bot medio; tempo 60; revanche'],
 mastermind:['Mastermind','solo','novo','1234 (4 números de 1 a 6); mesa; revanche'],
 nonograma:['Nonograma','solo','novo','a1; x a1; conferir; mesa'],
 rummikub:['Rummikub solo','solo','novo','1 2 3 (três posições); desafio de trincas e sequências'],
 deslizante:['Quebra-cabeça deslizante','solo','novo','1–8 (peça vizinha ao vazio); mesa'],
 diferencas:['Jogo das diferenças','solo','novo','a1–e5; mesa'],
 quizmusical:['Quiz musical por pistas','solo','novo','1, 2 ou 3; mesa'],
 investigacao:['Investigação cooperativa','grupo','novo','entrar → iniciar; 1, 2 ou 3; turnos']
});
export const gameCatalog=Object.freeze(catalog);
export const gameCommands=new Set([...Object.keys(catalog),'resposta','revanche','historicopartidas','tema7','estatisticas7','medalhas7','torneio7','animacao7']);
export function gameGuide(k){if(!Object.hasOwn(catalog,k))return null;const [title,mode,start,how]=catalog[k];return '🎮 *'+title+'* • '+mode+'\nComeçar: :'+k+(start?' '+start:'')+'\nComo jogar: '+how+'\nCentral: :jogos';}
export function gameHub(arg='',state={},id=null){
 const v=String(arg).trim().toLowerCase(),tokens=v.split(/\s+/),k=tokens[1];
 if(!v||v==='lista'||v==='solo'||v==='grupo'){const list=Object.entries(catalog).filter(([,r])=>!['solo','grupo'].includes(v)||r[1]===v||r[1]==='ambos');return '🎮 *ÍRIS GAME CENTER* • '+list.length+' jogos\n'+list.map(([key,r])=>'• '+r[0]+' — :'+key+(r[2]?' '+r[2]:'')).join('\n')+'\n\n:jogos solo | grupo | meus | ranking stop\n:jogos stop — guia de um jogo';}
 if(v==='meus'){if(!state.players?.[id])return 'Use :perfil para registrar suas estatísticas.';const stats=gameStats(state,id);return '🏅 *Suas estatísticas*\n'+(Object.entries(stats).filter(([key])=>Object.hasOwn(catalog,key)).map(([key,x])=>catalog[key][0]+': '+x.w+' V / '+x.l+' D / '+x.d+' E / '+x.c+' concluídas'+(x.points?' • '+x.points+' pts':'')).join('\n')||'Sem partidas registradas.');}
 if(tokens[0]==='ranking'&&Object.hasOwn(catalog,k)){const rows=Object.keys(state.players||{}).map(key=>gameStats(state,key)[k]).filter(x=>x&&(x.w+x.c+x.d+x.l+x.points)>0).sort((a,b)=>b.w-a.w||b.points-a.points||b.c-a.c).slice(0,10);return '🏆 Ranking anônimo • '+catalog[k][0]+'\n'+(rows.map((x,i)=>(i+1)+'º • '+x.w+' vitórias / '+x.points+' pts / '+x.c+' concluídas').join('\n')||'Sem registros.');}
 return gameGuide(v)||'Use :jogos lista, :jogos solo, :jogos grupo, :jogos meus ou :jogos stop.';
}

const catalogSections={
 todos:Object.keys(catalog),
 solo:Object.keys(catalog).filter(k=>['solo','ambos'].includes(catalog[k][1])),
 grupo:Object.keys(catalog).filter(k=>['grupo','ambos'].includes(catalog[k][1])),
 tabuleiro:['uno','unobot','domino','xadrez','damas','naval','velha','velhadupla','ludo','imobiliario','trilha','conecta4','reversi','pontinhos','rummikub'],
 logica:['memoria','sudoku','termo','2048','forca','numero','cruzadas','encoded','inverse','adivinha','mastermind','nonograma','deslizante','diferencas'],
 estudos:['stop','quiz','quizmulti','batalhaconhecimento','bingoeducativo','detetive','tesouro','quizmusical','investigacao'],
 equipe:['coop','expedicao','reliquia','campeonato','torneiouno','torneio7'],
 rapidos:['ppt','dado','moeda']
};
export function gameHubPage(arg=''){
 const v=String(arg).trim().toLowerCase(),parts=v.split(/\s+/),mode=!v||parts[0]==='lista'?'todos':parts[0];
 if(!Object.hasOwn(catalogSections,mode)||parts.length>2)return null;
 const requested=parts[1]||'1';if(!/^[1-9]\d?$/.test(requested))return null;
 const all=catalogSections[mode],page=Number(requested),size=8,pages=Math.ceil(all.length/size);
 if(page>pages)return {error:'Página inexistente. Use :jogos '+(mode==='todos'?'lista':mode)+' 1.'};
 const prefix=':jogos '+(mode==='todos'?'lista':mode);
 const rows=all.slice((page-1)*size,page*size).map(k=>({key:k,title:catalog[k][0],mode:catalog[k][1],command:':'+k+(catalog[k][2]?' '+catalog[k][2]:'')}));
 const caption='🎮 *Íris Game Center* — '+mode+' • '+page+'/'+pages+'\n'+rows.map(r=>'• '+r.title+' — '+r.command).join('\n')+'\n\nCategorias: :jogos tabuleiro | logica | estudos | equipe | rapidos | solo | grupo\nGuia: :jogos dominó (ou :jogos domino)\n'+(page>1?'Anterior: '+prefix+' '+(page-1)+'\n':'')+(page<pages?'Próxima: '+prefix+' '+(page+1)+'\n':'')+'Estatísticas: :estatisticas7 | :medalhas7\nLista em texto: :jogos texto';
 return {mode,page,pages,total:all.length,rows,caption};
}
