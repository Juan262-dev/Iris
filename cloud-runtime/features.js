import { createHmac, randomInt } from 'node:crypto';
import { localReply, makeLocalGames, shop, purchase } from './localFun.js';
import { makeExtras } from './extras.js';
import { mission, welcomeMessage } from './nextFeatures.js';
import { makePersistentChess } from './persistentChess.js';
import { groupFeature,groupCommands,groupOwnerCommands } from './community.js';
import { converterNames } from './converters.js';
import { runtimeStatus } from './runtimeStatus.js';
import { megaGame,gameNames } from './megaGames.js';
import { megaFeature,economyNames,adminNames,removeMegaProfile,scheduleAction } from './megaCommunity.js';
import { studioNames } from './studio.js';
import { game3,games3 } from './games3.js';
import { socialFeature,social3,removeSocial } from './social3.js';
import { media3Names } from './media3.js';
import { settings, seal, unseal, request } from '../lib/Initialize/cloudStorage.js';

const simple = new Set(['menu','ping','status','saldo','diario','ranking','dado','moeda','quiz','resposta','perfil','sair','grupo','abrir','fechar','figurinha','s','slonga','som','chat','ia','piada','curiosidade','ppt','numero','xadrez','meme','texto','missoes','resgatar','boasvindas','velha','forca','loja','comprar','inventario','nivel','conquistas','regras','definirregras','criar','remover','usar','comandos','diagnostico',...groupCommands,...converterNames,...gameNames,...economyNames,...adminNames,...studioNames,...games3,...social3,...media3Names]);
const needsOwner = new Set(['abrir','fechar','criar','remover','definirregras','boasvindas',...groupOwnerCommands,'advertir','advertencias','limparadvertencia','agenda','sugestoes','limparsugestoes','prefixo','backup']);
export function parseExtra(text, owner) {
    text=String(text||'').trim();
    const match = /^:([a-z]+)(?:\s+([\s\S]{1,500}))?$/i.exec(text);
    if (!match) return null;
    const name = match[1].toLowerCase()==='fig'?'s':match[1].toLowerCase();
    if (!simple.has(name) || (needsOwner.has(name) && !owner)) return null;
    return { name, arg: (match[2] || '').trim() };
}
const questions = [
    { q:'Qual é o maior planeta do Sistema Solar?', options:['Marte','Júpiter','Terra'], answer:2 },
    { q:'Quantos lados tem um hexágono?', options:['5','6','8'], answer:2 },
    { q:'Qual é a capital do Ceará?', options:['Fortaleza','Recife','Natal'], answer:1 },
    { q:'Qual é a fórmula da água?', options:['CO2','O2','H2O'], answer:3 },
    { q:'Quanto é 7 × 8?', options:['54','56','64'], answer:2 },
    { q:'Qual animal é um mamífero?', options:['Golfinho','Tubarão','Sardinha'], answer:1 },
    { q:'Qual é o satélite natural da Terra?', options:['Lua','Sol','Vênus'], answer:1 },
    { q:'Qual instrumento mede a temperatura?', options:['Bússola','Régua','Termômetro'], answer:3 },
];
const fresh = () => ({ players: {}, custom: {} });
const hash = (key, value) => createHmac('sha256', key).update(value).digest('hex');
const validName = v => /^[a-z0-9_-]{1,20}$/i.test(v);
export function menu(category='') {
    const sections = {
        geral:'📋 *GERAL*\n:ping — conexão\n:status — situação\n:grupo — participantes\n:regras — regras\n:diagnostico — estado do bot\n:versao | menuimagem | ajuda\nAtalhos: :s, :ping, :menu, :fig',
        midia:'🖼️ *MÍDIA*\n:s — legenda de imagem ou GIF enviado como documento (até 2 MB para GIF)\n:texto frase — figurinha de texto\n:s — vídeo MP4 (primeiros 10 s, até 10 MB, sem áudio)\n:slonga — primeiros 20 s do MP4, até 15 MB (experimental)\n:som — MP4 com áudio (primeiros 10 s)\n:som 20 — primeiros 20 s com áudio (experimental)\nEnvie com legenda ou responda à mídia autorizada.\n:meme topo | rodapé — legenda de foto\n:imagem — responda a figurinha\n:audio | voz — responda a vídeo ou áudio\n:filtro cinza | sepia | nitido | invertido\n:semfundo | transparente #ffffff — fundo uniforme\n:autor nome — metadados da figurinha\n:trecho 30 — até 20 s a partir de 30 s\n:gif | comprimir — MP4\n:borda #ffffff | :pdf | :montagem — imagem\n:textanim frase — texto animado',
        jogos:'🎮 *JOGOS*\n:velha | forca | quiz\n:resposta 1, 2 ou 3\n:numero — adivinhe o número\n:ppt pedra — pedra, papel ou tesoura\n:dado | moeda\n:xadrez novo medio — jogar contra o bot\n:xadrez desafio | aceitar — multiplayer\nDurante a partida: envie e2e4, e2 e4, Cf3 ou cavalo f3\n:xadrez ajuda — regras, temas e ranking\n:velhadupla desafio | aceitar — multiplayer (casa 1 a 9)\n:aventura novo — missão de exploração\n:quiz ciencia | geografia | geral\n:uno novo | entrar | pv | iniciar | mao — cartas no privado\n:naval desafio | aceitar — tiro a1\n:rpg classe explorador | mapa | explorar\n:campeonato entrar | ver\n:uno ranking | stats | gritar\n:damas desafio | aceitar — dama b3 a4\n:memoria novo | entrar — par 2 7\n:stop novo | entrar | resposta\n:detetive novo | entrar\n:coop novo | entrar | ajudar',
        diversao:'💬 *DIVERSÃO*\n:chat oi — diálogo local\n:piada | curiosidade\n:apelido nome | apagar\n:aniversario DD/MM | hoje | apagar',
        economia:'🏆 *ECONOMIA VIRTUAL*\n:perfil | saldo | diario | ranking\n:loja | comprar item | inventario\n:nivel | conquistas | sair\n:missoes | resgatar nome\n:banco | depositar 10 | sacar 10\n:transferir codigo 10\n:semanal | profissao | trabalhar | tarefadiaria\n:empresa | propriedade | evento participar\n:mercado | anunciar item preco | adquirir codigo\n:vitrine | mochila | perfilvisual\n:evoluir empresa | propriedade\n:equipe criar nome | entrar nome | sair\n:troca propor codigo item item | aceitar codigo\n:eventoespecial participar',
        admin:'🛡️ *RESPONSÁVEL*\n:on | off | abrir | fechar\n:definirregras texto\n:criar nome texto | remover nome\n:comandos | usar nome\n:boasvindas on | off\n:mensagembemvindo texto\n:avisogrupo texto\n:enquete pergunta | opção 1 | opção 2\n:votar 1 | votos | encerrarenquete\n:agenda 08:00 22:00 | off\n:advertir codigo motivo | advertencias codigo\n:prefixo\n:backup | sugestoes\nTodos: :sugestao texto'
    };
    const key=category.trim().toLowerCase();
    const header='╭─ 🌸 *ÍRIS CLOUD*\n│ Legião Z • Cloud 3.0\n│ Sem IA externa\n╰──────────────';
    if(key && Object.hasOwn(sections,key))return header+'\n\n'+sections[key];
    if(key)return 'Categorias: '+Object.keys(sections).join(', ')+'. Use :menu categoria.';
    return header+'\n\n'+Object.values(sections).join('\n\n')+'\n\nAtalho: :menu jogos (ou outra categoria).';
}
export function makeFeatures() {
    const localGames = makeLocalGames();
    const extras = makeExtras();
    const chess = makePersistentChess({readGroup,save});
    const welcomeCooldown = new Map();
    const quizzes = new Map();
    const cooldown = new Map();
    async function readGroup(jid) {
        const seed = settings('iris-feature-key');
        const s = settings('iris-features-v1-' + hash(seed.key, jid));
        const rows = await request(s, 'GET');
        if (!Array.isArray(rows) || rows.length > 1) throw Error('Invalid feature state');
        const state = rows.length ? unseal(rows[0].encrypted_payload, s) : fresh();
        if (!state || !state.players || !state.custom) throw Error('Invalid feature state');
        return { s, state };
    }
    async function save(s, state) {
        await request(s, 'POST', { session_id:s.sessionId, item_type:'auth', item_id:'snapshot',
            encrypted_payload:seal(state,s), updated_at:new Date().toISOString() });
    }
    async function handle({ command, jid, actor, sock, msg, owner, sticker, textSticker, meme, convert, studio, unoRoute, advancedMedia }) {
        const { name, arg } = command;
        if (name === 'menu') return menu(arg);
        if (name === 'ping') return '🌸 Íris — online!';
        if (name === 'status') return '🌸 Íris conectada. Grupo autorizado. Comandos e respostas de jogos ativos.';
        if (name === 'diagnostico') { const d=runtimeStatus(); return '⚙️ Íris Cloud\nWhatsApp: '+d.whatsapp+'\nBanco: '+d.storage+'\nFila de mídia: '+d.media+'\nFila de comandos: '+d.commands+'\nProcessados: '+d.processed+' | Erros: '+d.errors+' | Lentos: '+d.slow+' | Descartados por limite: '+d.dropped+'\nMemória: '+Math.round(process.memoryUsage().rss/1048576)+' MB\nTempo online: '+Math.floor(process.uptime()/60)+' min'; }
        if (name === 'chat') return localReply(arg);
        if (name === 'xadrez') return chess({jid,actor,arg});
        if (name === 'ia') return '🌸 IA externa desativada. Use :chat para diálogos locais.';
        if (['piada','curiosidade','ppt','numero'].includes(name)) return extras({name,arg,jid,actor});
        if (name === 'velha' || name === 'forca') return localGames({name,arg,jid,actor});
        if (name === 'loja') return '🛍️ Loja virtual — sem dinheiro real.\n' + Object.entries(shop).map(([k,v])=>v.name+' — '+v.price+' moedas | :comprar '+k).join('\n');
        if (name === 'dado') return '🎲 Resultado: ' + randomInt(1,7);
        if (name === 'moeda') return '🪙 ' + (randomInt(2) ? 'Cara' : 'Coroa') + ' — sem apostas.';
        if (name === 'grupo') {
            const m = await sock.groupMetadata(jid);
            return '🌸 Grupo autorizado. Participantes: ' + (m.participants?.length || 0) + '.';
        }
        if (name === 'abrir' || name === 'fechar') {
            if (!owner) return null;
            try { await sock.groupSettingUpdate(jid, name === 'abrir' ? 'not_announcement' : 'announcement'); }
            catch { return '🌸 Não foi possível alterar o grupo. Seu número precisa ser administrador.'; }
            return name === 'abrir' ? '🌸 Grupo aberto para mensagens.' : '🌸 Grupo restrito a administradores.';
        }
        if (name === 's' || name === 'figurinha' || name === 'slonga' || name === 'som' || name === 'texto' || name === 'meme' || converterNames.includes(name) || studioNames.includes(name) || media3Names.includes(name)) {
            const key = jid + ':' + actor;
            const now = Date.now();
            if (now - (cooldown.get(key) || 0) < 10000) return '🌸 Aguarde 10 segundos entre figurinhas.';
            cooldown.set(key,now);
            if (cooldown.size > 1000) cooldown.delete(cooldown.keys().next().value);
            return name==='texto' ? await textSticker(arg) : name==='meme' ? await meme(msg,arg) : converterNames.includes(name) ? await convert(msg,name) : studioNames.includes(name) ? await studio(msg,name,arg) : media3Names.includes(name) ? await advancedMedia(msg,name,arg) : await sticker(msg,name,arg);
        }
        if (name === 'quiz') {
            const old = quizzes.get(jid);
            if (old && old.expires > Date.now()) return '🌸 Já existe um quiz aberto. Use :resposta 1, 2 ou 3.';
            const category=arg.toLowerCase();
            if(category&&!['geral','ciencia','geografia'].includes(category))return 'Categorias: geral, ciencia, geografia.';
            const pool=category==='ciencia'?[questions[0],questions[3],questions[5],questions[6],questions[7]]:category==='geografia'?[questions[2],{q:'Qual é o maior oceano?',options:['Atlântico','Pacífico','Índico'],answer:2},{q:'Em qual continente está o Brasil?',options:['África','Europa','América do Sul'],answer:3}]:questions;
            const q = pool[randomInt(pool.length)];
            quizzes.set(jid,{...q,expires:Date.now()+60000});
            if (quizzes.size > 100) quizzes.delete(quizzes.keys().next().value);
            return '🧠 *Quiz Íris*\n' + q.q + '\n' + q.options.map((v,i)=>(i+1)+'. '+v).join('\n') + '\nEnvie resposta 1, 2 ou 3.';
        }
        if (!actor) return '🌸 Não foi possível identificar o participante.';
        const {s,state} = await readGroup(jid);
        const id = hash(s.key, jid + ':' + actor);
        const player = state.players[id];
        if(games3.includes(name)||social3.includes(name)){
            const out=await (games3.includes(name)?game3({name,arg,state,id}):socialFeature({name,arg,state,id}));
            if(out?.changed)await save(s,state);
            return out?.text??null;
        }
        if(gameNames.includes(name)||economyNames.includes(name)||adminNames.includes(name)){
            const out=await (gameNames.includes(name)?megaGame({name,arg,state,id,owner,route:unoRoute}):megaFeature({name,arg,state,id,owner}));
            if(out?.changed)await save(s,state);
            return out?.text??null;
        }
        if(groupCommands.includes(name)){
            const out=groupFeature({name,arg,state,id,owner});
            if(out?.changed)await save(s,state);
            return out?.text??null;
        }
        if (name === 'missoes' || name === 'resgatar') {
            if(name==='resgatar'&&!arg) return 'Use :resgatar nome.';
            const result=mission(player,name==='missoes'?'':arg);
            if(result.changed)await save(s,state);
            return result.text;
        }
        if (name === 'boasvindas') {
            if(!owner)return null;
            if(!['on','off'].includes(arg))return 'Boas-vindas: '+(state.welcome===true?'ativadas':'desativadas')+'. Use :boasvindas on ou off.';
            state.welcome=arg==='on';await save(s,state);
            return state.welcome?'🌸 Boas-vindas e despedidas ativadas. Avisos genéricos, sem nomes.':'🌸 Boas-vindas e despedidas desativadas.';
        }
        if (name === 'regras') return '📜 Regras do grupo: '+(state.rules || 'Não definidas.');
        if (name === 'definirregras') {
            if (!owner || !arg || arg.length>400) return 'Use :definirregras texto (até 400 caracteres).';
            state.rules=arg; await save(s,state); return '📜 Regras atualizadas.';
        }
        if (name === 'comprar') {
            const error=purchase(player,arg.toLowerCase());
            if(error)return '🌸 '+error;
            await save(s,state); return '🌸 Item virtual comprado!';
        }
        if (name === 'inventario') return player ? '🎒 '+(Object.keys(player.inventory||{}).filter(k=>Object.hasOwn(shop,k)).map(k=>shop[k].name).join(', ')||'Inventário vazio.') : 'Use :perfil.';
        if (name === 'nivel') return player ? '⭐ Nível '+(1+Math.floor(player.xp/10))+' | '+player.xp+' XP.' : 'Use :perfil.';
        if (name === 'conquistas') return player ? '🏅 Conquistas: '+['Primeiro perfil',...(player.xp>=10?['10 XP']:[]),...(player.xp>=50?['50 XP']:[]),...(Object.keys(player.inventory||{}).length?['Colecionador']:[])].join(', ') : 'Use :perfil.';
        if (name === 'perfil') {
            if (player) return '🌸 Perfil já ativo: Jogador ' + id.slice(0,6) + '.';
            if (Object.keys(state.players).length >= 200) return '🌸 Limite de perfis deste grupo atingido.';
            state.players[id] = { coins:0, xp:0, daily:'' };
            await save(s,state);
            return '🌸 Perfil virtual criado: Jogador ' + id.slice(0,6) + '. Somente pontos de jogo são guardados. Use :sair para apagar.';
        }
        if (name === 'sair') {
            if (player) { delete state.players[id]; removeMegaProfile(state,id); removeSocial(state,id); if(state.megaGames?.unoStats)delete state.megaGames.unoStats[id]; if(state.community?.poll?.votes)delete state.community.poll.votes[id]; await save(s,state); }
            return '🌸 Seu perfil virtual foi removido.';
        }
        if (name === 'saldo') return player ? '🌸 Saldo: ' + player.coins + ' moedas virtuais | XP: ' + player.xp : '🌸 Use :perfil para participar.';
        if (name === 'diario') {
            if (!player) return '🌸 Use :perfil para participar.';
            const day = new Date().toISOString().slice(0,10);
            if (player.daily === day) return '🌸 Recompensa diária já coletada.';
            player.daily = day; player.coins += 10; player.xp += 1;
            await save(s,state); return '🌸 +10 moedas virtuais e +1 XP!';
        }
        if (name === 'ranking') {
            const top = Object.entries(state.players).sort((a,b)=>b[1].xp-a[1].xp).slice(0,10);
            return '🏆 *Ranking virtual*\n' + (top.map(([k,p],i)=>(i+1)+'. Jogador '+k.slice(0,6)+' — '+p.xp+' XP').join('\n') || 'Nenhum perfil inscrito.');
        }
        if (name === 'resposta') {
            const q = quizzes.get(jid);
            if (!q || q.expires < Date.now()) return '🌸 Não há quiz ativo.';
            if (!/^[123]$/.test(arg)) return '🌸 Use :resposta 1, 2 ou 3.';
            if (Number(arg) !== q.answer) return '🌸 Não é essa. Tente outra opção!';
            quizzes.delete(jid);
            if (player) {player.coins += 5; player.xp += 3; await save(s,state);}
            return '🌸 Resposta correta!' + (player?' +5 moedas virtuais e +3 XP.':' Use :perfil para pontuar.');
        }
        if (name === 'comandos') return '🌸 Personalizados: ' + (Object.keys(state.custom).join(', ') || 'nenhum.');
        if (name === 'criar') {
            if (!owner) return null;
            const m = /^(\S+)\s+([\s\S]{1,250})$/.exec(arg);
            if (!m || !validName(m[1])) return '🌸 Use :criar nome texto (até 250 caracteres).';
            const k = m[1].toLowerCase();
            if (['__proto__','constructor','prototype'].includes(k)) return '🌸 Nome inválido.';
            if (!Object.hasOwn(state.custom,k) && Object.keys(state.custom).length >= 30) return '🌸 Limite de comandos atingido.';
            state.custom[k] = m[2];
            await save(s,state); return '🌸 Comando criado: :usar ' + k;
        }
        if (name === 'remover') {
            if (!owner || !validName(arg)) return null;
            delete state.custom[arg.toLowerCase()]; await save(s,state); return '🌸 Comando removido.';
        }
        if (name === 'usar') return validName(arg) && Object.hasOwn(state.custom,arg.toLowerCase()) ? '🌸 ' + state.custom[arg.toLowerCase()] : '🌸 Comando não encontrado.';
        return null;
    }
    handle.chessMove=({jid,actor,arg})=>chess({jid,actor,arg,activeOnly:true});
    handle.activity=async({jid,actor,command})=>{
        if(!actor)return null;
        if(command.name==='resposta'){
            const q=quizzes.get(jid);
            if(!q||q.expires<Date.now()||!(/^[123]$/).test(command.arg))return null;
            return handle({command,jid,actor});
        }
        const {s,state}=await readGroup(jid);
        const id=hash(s.key,jid+':'+actor);
        const out=games3.includes(command.name)?await game3({...command,state,id,activeOnly:true}):gameNames.includes(command.name)?await megaGame({...command,state,id,activeOnly:true}):groupFeature({...command,state,id,activeOnly:true});
        if(out?.changed)await save(s,state);
        return out?.text??null;
    };
    handle.schedule=async({jid,now})=>{
        const {state}=await readGroup(jid);
        return scheduleAction(state.mega?.schedule,now);
    };
    handle.welcome=async({jid,action,count})=>{
        const message=welcomeMessage(action,count);
        if(!message)return null;
        const now=Date.now();
        if(now-(welcomeCooldown.get(jid)||0)<30000)return null;
        const {state}=await readGroup(jid);
        if(state.welcome!==true)return null;
        welcomeCooldown.set(jid,now);
        if(welcomeCooldown.size>100)welcomeCooldown.delete(welcomeCooldown.keys().next().value);
        return action==='add'&&state.community?.welcomeText?'🌸 '+state.community.welcomeText:message;
    };
    return handle;
}
