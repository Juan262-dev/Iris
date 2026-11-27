import {removeStop,stopTick} from './stopGame.js';
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
import { profileCommands,profileFeature,captureName,displayName,recordGame } from './profileCard.js';
import { funNames,funFeature,groupFunTargets,removeFun } from './fun.js';
import { funMediaNames,funMenu,funMenuText } from './funMedia.js';
import { games4,game4,removeGames4 } from './games4.js';
import { tournamentCommand,tournament4 } from './tournament4.js';
import { admin4,economy4,adminFeature4,economyFeature4,adminRole,categoryAllowed,strictSpamGate,groupConfig } from './community4.js';
import { media4,packCommands,interface4,premiumMenu,helpCard,packFeature4 } from './media4.js';
import { originalMedia,originalGames,originalAdmin,puzzle,makeOriginalAdmin } from './originalCompat.js';
import { games5,game5,removeGames5 } from './games5.js';
import { community5,communityFeature5,commandPermitted,progress5,museumDonation,removeCommunity5 } from './community5.js';
import { media5,collage5,collageFeature5 } from './media5.js';
import { infinityCommands,infinityGames,infinityMedia,infinityStudy,infinityMenu,infinityFeature,removeInfinity,pruneInfinity,artCard,artPhoto } from './infinity.js';
import {retiredGames,gameCommands,gameGuide,gameHub} from './gameHub.js';
import { context5,serialGroups,commandToken,alreadyApplied,markApplied,prune5 } from './transaction5.js';
import { settings, seal, unseal, request } from '../lib/Initialize/cloudStorage.js';

const simple = new Set(['menu','ping','status','saldo','diario','ranking','dado','moeda','quiz','resposta','perfil','sair','grupo','abrir','fechar','figurinha','s','slonga','som','chat','ia','piada','curiosidade','ppt','numero','xadrez','meme','texto','missoes','resgatar','boasvindas','velha','forca','loja','comprar','inventario','nivel','conquistas','regras','definirregras','criar','remover','usar','comandos','diagnostico',...groupCommands,...converterNames,...gameNames,...economyNames,...adminNames,...studioNames,...games3,...social3,...media3Names,...originalMedia,...originalGames,...originalAdmin,...profileCommands,...funNames,...funMediaNames,...games4,tournamentCommand,...admin4,...economy4,...media4,...packCommands,...interface4,...games5,...community5,...media5,collage5,'menutexto','jogos','world',...infinityCommands]);
for(const name of retiredGames)simple.delete(name);
const needsOwner = new Set(['abrir','fechar','criar','remover','definirregras','boasvindas',...groupOwnerCommands,'advertir','advertencias','limparadvertencia','agenda','sugestoes','limparsugestoes','prefixo','backup',...originalAdmin,'backupinfinity']);
export function parseExtra(text, owner) {
    text=String(text||'').trim();
    const match = /^:(2048|8ball|abraço|[a-z]+)(?:\s+([\s\S]{1,500}))?$/i.exec(text);
    if (!match) return null;
    const raw = match[1].toLowerCase();
    let name = raw==='fig'?'s':raw==='abraço'?'abraco':raw;
    // Correct only a small, safe read-only vocabulary; never auto-execute moderation or mutations.
    if(!simple.has(name)){const aliases={meun:'menu',men:'menu',pign:'ping',stauts:'status',infnity:'infinity',mapainfinty:'mapainfinity',ajudainfnity:'ajudainfinity'};if(Object.hasOwn(aliases,name))name=aliases[name];}

    if(retiredGames.has(name))return {name:'jogos',arg:'retirado'};
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
        infinity:infinityMenu,
        geral:'📋 *GERAL*\n:ping — conexão\n:status — situação\n:grupo — participantes\n:regras — regras\n:diagnostico — estado do bot\n:versao | menuimagem | ajuda\n:menupremium | menutexto | ajudacartao comando\nAtalhos: :s, :ping, :menu, :fig',
        midia:'🖼️ *MÍDIA*\n:s — legenda de imagem ou GIF enviado como documento (até 2 MB para GIF)\n:texto frase — figurinha de texto\n:s — vídeo MP4 (primeiros 10 s, até 10 MB, sem áudio)\n:slonga — primeiros 20 s do MP4, até 15 MB (experimental)\n:som — MP4 com áudio (primeiros 10 s)\n:som 20 — primeiros 20 s com áudio (experimental)\nEnvie com legenda ou responda à mídia autorizada.\n:meme topo | rodapé — legenda de foto\n:imagem — responda a figurinha\n:audio | voz — responda a vídeo ou áudio\n:filtro cinza | sepia | nitido | invertido\n:semfundo | transparente #ffffff — fundo uniforme\n:autor nome — metadados da figurinha\n:trecho 30 — até 20 s a partir de 30 s\n:gif | comprimir — MP4\n:borda #ffffff | :pdf | :montagem — imagem\n:textanim frase — texto animado\n:renomear pacote | autor — figurinha\n:tts frase — voz sintetizada local\n:play piano | :youtube astronomia — pesquisa por tema\n:nasa lua | :pesquisarimagem girassol\n:pacotefig criar nome | adicionar | pegar 1\n:figtexto frase | qrcode texto simples | efeitoanimado brilho | gifvideo\n:animtexto frase | :fundopro | :formatoimagem png\n:colagem novo | adicionar | gerar | apagar\n:videofiltro cinza | :audioefeito eco',
        jogos:'🎮 *JOGOS*\n:jogos — central completa | solo | grupo | meus | ranking stop\n:velha | forca | quiz\n:resposta 1, 2 ou 3\n:numero — adivinhe o número\n:ppt pedra — pedra, papel ou tesoura\n:dado | moeda\n:xadrez novo medio — jogar contra o bot\n:xadrez desafio | aceitar — multiplayer\nDurante a partida: envie e2e4, e2 e4, Cf3 ou cavalo f3\n:xadrez ajuda — regras, temas e ranking\n:velhadupla desafio | aceitar — multiplayer (casa 1 a 9)\n:quiz ciencia | geografia | geral\n:uno novo | entrar | pv | iniciar | mao — cartas no privado\n:naval desafio | aceitar — tiro a1\n:campeonato entrar | ver\n:uno ranking | stats | gritar\n:damas desafio | aceitar — dama b3 a4\n:memoria novo | entrar — par 2 7\n:stop novo classico 3 90 | entrar | iniciar | pv | resposta | bater | placar | ranking\n:detetive novo | entrar\n:coop novo | entrar | ajudar\n:encoded novo | :inverse novo — palavras\n:domino novo | entrar | pv | iniciar\n:unobot novo | mao | pos 1\n:torneiouno novo | entrar | iniciar\n:2048 novo | cima | direita\n:cruzadas novo | :quizmulti novo\n:ludo novo | entrar | dado | mover 1\n:sudoku novo facil|medio|dificil\n:termo novo | tentar amigo\n:revanche termo | :historicopartidas',
        diversao:'💬 *DIVERSÃO*\n:chat oi — diálogo local\n:piada | curiosidade\n:apelido nome | apagar\n:aniversario DD/MM | hoje | apagar\n:menufun — menu visual da diversão\n:fun on | off | lista — participação voluntária\n:tesouro novo | :bingoeducativo novo | :batalhaconhecimento novo\n:gincana novo | :festival desenho | :criatividade\n:historiainterativa novo | :comemoracao',
        fun:funMenuText,
        economia:'🏆 *ECONOMIA VIRTUAL*\n:perfil | saldo | diario | ranking\n:loja | comprar item | inventario\n:nivel | conquistas | sair\n:missoes | resgatar nome\n:banco | depositar 10 | sacar 10\n:transferir codigo 10\n:semanal | profissao | trabalhar | tarefadiaria\n:empresa | propriedade | evento participar\n:mercado | anunciar item preco | adquirir codigo\n:vitrine | mochila | perfilvisual\n:nomeperfil nome | whatsapp\n:perfilfoto | :perfilbanner — envie imagem com legenda\n:perfiltema | :perfilmoldura | :perfiltitulo\n:perfilpublico on | off\n:perfilstats | :perfilvisual codigo\n:evoluir empresa | propriedade\n:equipe criar nome | entrar nome | sair\n:troca propor codigo item item | aceitar codigo\n:eventoespecial participar\n:temporada | :missaosemanal | :rankequipes\n:lojatema | :comprartema oceano | :conquistavisual\n:eventotema participar\n:album | :evolucao | :classificacaovisual | :reputacao | :colecao\n:cidade | :imovel construir jardim | :museu doar estrela\n:projetocomunitario contribuir 10 | :especializacao | :missaoequipe ajudar',
        admin:'🛡️ *RESPONSÁVEL*\n:on | off | abrir | fechar\n:definirregras texto\n:criar nome texto | remover nome\n:comandos | usar nome\n:boasvindas on | off\n:mensagembemvindo texto\n:avisogrupo texto\n:enquete pergunta | opção 1 | opção 2\n:votar 1 | votos | encerrarenquete\n:agenda 08:00 22:00 | off\n:advertir codigo motivo | advertencias codigo\n:prefixo\n:backup | sugestoes\n:kick @participante | :promote @participante | :demote @participante\nConfirme a operação com o mesmo comando seguido de confirmar.\nTodos: :sugestao texto\n:configgrupo | :permissao jogos admin | :temagrupo oceano\n:avisoregistrar regras | :avisohistorico\n:salvarconfig | :restaurarconfig confirmar\n:painel | :comandopermissao comando admin | :auditoria'
    };
    const key=category.trim().toLowerCase();
    const header='╭─ 🌸 *ÍRIS CLOUD*\n│ Legião Z • Cloud 6.0\n│ Sem IA externa\n╰──────────────';
    if(key && Object.hasOwn(sections,key))return header+'\n\n'+sections[key];
    if(key)return 'Categorias: '+Object.keys(sections).join(', ')+'. Use :menu categoria.';
    return header+'\n\n'+Object.values(sections).join('\n\n')+'\n\nAtalho: :menu jogos (ou outra categoria).';
}
export function makeFeatures() {
    const groupSerial=serialGroups();
    const originalModeration=makeOriginalAdmin();
    const extras = makeExtras();
    const chess = makePersistentChess({readGroup,save});
    const welcomeCooldown = new Map();

    const cooldown = new Map();
    const strictGate=strictSpamGate();
    async function readGroupRaw(jid) {
        const seed = settings('iris-feature-key');
        const s = settings('iris-features-v1-' + hash(seed.key, jid));
        const rows = await request(s, 'GET');
        if (!Array.isArray(rows) || rows.length > 1) throw Error('Invalid feature state');
        const state = rows.length ? unseal(rows[0].encrypted_payload, s) : fresh();
        if (!state || !state.players || !state.custom) throw Error('Invalid feature state');
        return { s, state };
    }
    async function readGroup(jid){const ctx=context5.getStore();return ctx?.jid===jid?ctx.data:readGroupRaw(jid);}
    async function save(s, state) {
        const ctx=context5.getStore();
        if(ctx?.data?.s?.sessionId===s.sessionId){
            for(const [k,p] of Object.entries(state.players)){const old=ctx.before[k];if(!old||old[0]!==p.xp||old[1]!==p.coins||old[2]!==p.coop5)progress5(p);}
            markApplied(state,ctx.token);prune5(state);pruneInfinity(state);
        }
        await request(s, 'POST', { session_id:s.sessionId, item_type:'auth', item_id:'snapshot',
            encrypted_payload:seal(state,s), updated_at:new Date().toISOString() });
    }
    async function handle({ command, jid, actor, sock, msg, owner, sticker, textSticker, meme, convert, studio, unoRoute, advancedMedia, original, rawName, loadProfileAsset, funMedia, newMedia, loadPackImage, professionalMedia }) {
        const { name, arg } = command;
        if(name==='jogos'){if(arg==='retirado')return 'O RPG e o Íris World foram desativados. Use :jogos para conhecer os jogos disponíveis.';const {state,s}=await readGroup(jid);return gameHub(arg,state,actor?hash(s.key,jid+':'+actor):null);}
        if(arg==='ajuda'&&name!=='xadrez'&&gameGuide(name))return gameGuide(name);
        if (name === 'menutexto') return menu(arg);
        if(['menu','menupremium','menuimagem','ajudacartao'].includes(name)){
            const {state}=await readGroup(jid);const theme=groupConfig(state).theme;
            if(name==='ajudacartao')return helpCard(arg,theme);
            if(['fun','brincadeiras'].includes(arg.toLowerCase()))return await funMenu();
            return premiumMenu(arg,theme,arg?menu(arg):'🌸 Íris Cloud 6.0 • :infinity | :menu jogos | midia | economia | diversao | admin | geral. :menutexto para lista completa.');
        }
        if(name==='versao')return '🌸 Íris Cloud 6.0 Infinity — Game Center, jogos cooperativos, estudos e estúdio local. :infinity';
        if (name === 'ping') return '🌸 Íris — online!';
        if (name === 'status') return '🌸 Íris conectada. Grupo autorizado. Comandos e respostas de jogos ativos.';
        if (name === 'diagnostico') { const d=runtimeStatus(); return '⚙️ Íris Cloud\nWhatsApp: '+d.whatsapp+'\nBanco: '+d.storage+'\nFila de mídia: '+d.media+'\nFila de comandos: '+d.commands+'\nProcessados: '+d.processed+' | Erros: '+d.errors+' | Lentos: '+d.slow+' | Descartados por limite: '+d.dropped+'\nMemória: '+Math.round(process.memoryUsage().rss/1048576)+' MB\nHeap: '+Math.round(process.memoryUsage().heapUsed/1048576)+' MB\nTempo online: '+Math.floor(process.uptime()/60)+' min\nNode: '+process.versions.node+'\nOperações: serialização por grupo; deduplicação persistente de mutações (até 10 min).'; }
        if(originalAdmin.includes(name))return originalModeration({name,arg,jid,sock,msg,owner});
        if (name === 'chat') {const t=arg.toLowerCase().trim();if(/^(infinity|novidades|novos comandos|o que ha de novo)$/.test(t))return infinityMenu;return localReply(arg);}
        if (name === 'xadrez') return chess({jid,actor,arg});
        if (name === 'ia') return '🌸 IA externa desativada. Use :chat para diálogos locais.';
        if(['piada','curiosidade'].includes(name))return extras({name,arg,jid,actor});
        if (['ppt','numero','velha','forca'].includes(name)) {
            if(!actor)return null;const {s,state}=await readGroup(jid);const id=hash(s.key,jid+':'+actor);
            const map=new Map(Object.entries(state.legacyGames5||{}));
            const text=['velha','forca'].includes(name)?makeLocalGames(map)({name,arg,jid:'grupo',actor:id}):makeExtras(map)({name,arg,jid:'grupo',actor:id});
            const result=typeof text==='string'&&(['ppt','numero','velha','forca'].includes(name))?(/(?:Você venceu!$|Você acertou)/.test(text)?'w':/(?:Íris venceu!$|^Fim de jogo\.)/.test(text)?'l':/Empate!$/.test(text)?'d':null):null;
            state.legacyGames5=Object.fromEntries(map);if(result)recordGame(state,name,id,result);await save(s,state);
            return text;
        }
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
        if (name === 'menufun') return await funMenu();
        if(media4.includes(name)||media5.includes(name)||infinityMedia.includes(name)){
            if(!actor)return null;const {state}=await readGroup(jid);
            const role=groupConfig(state).roles?.midia&&groupConfig(state).roles.midia!=='todos'?await adminRole(sock,jid,msg,owner):owner?'responsavel':'membro';
            if(!await categoryAllowed(state,'midia',role))return 'Recurso limitado pelo responsável.';
            if(!strictGate(jid,actor,groupConfig(state).spam==='rigoroso'))return null;
            const key=jid+':'+actor,now=Date.now();if(now-(cooldown.get(key)||0)<10000)return 'Aguarde 10 segundos entre mídias.';cooldown.set(key,now);if(cooldown.size>1000)cooldown.delete(cooldown.keys().next().value);
            if(infinityMedia.includes(name)){
                try{if(name==='cartaoarte')return await artCard(arg);
                if(name==='fotoarte')return await artPhoto(await loadPackImage(),arg);
                if(name==='figurarte')return await professionalMedia(msg,'animtexto',arg);
                if(name==='videoarte')return await professionalMedia(msg,'videofiltro',arg);}
                catch{return 'Envie uma imagem própria autorizada ou use :cartaoarte texto.';}
            }
            return media5.includes(name)?professionalMedia(msg,name,arg):newMedia(msg,name,arg);
        }
        if (name === 's' || name === 'figurinha' || name === 'slonga' || name === 'som' || name === 'texto' || name === 'meme' || converterNames.includes(name) || studioNames.includes(name) || media3Names.includes(name) || originalMedia.includes(name) || funMediaNames.includes(name)) {
            const key = jid + ':' + actor;
            const now = Date.now();
            if (now - (cooldown.get(key) || 0) < 10000) return '🌸 Aguarde 10 segundos entre figurinhas.';
            cooldown.set(key,now);
            if (cooldown.size > 1000) cooldown.delete(cooldown.keys().next().value);
            return name==='texto' ? await textSticker(arg) : name==='meme' ? await meme(msg,arg) : converterNames.includes(name) ? await convert(msg,name) : studioNames.includes(name) ? await studio(msg,name,arg) : media3Names.includes(name) ? await advancedMedia(msg,name,arg) : originalMedia.includes(name) ? await original(msg,name,arg) : funMediaNames.includes(name) ? await funMedia(msg,name,arg) : await sticker(msg,name,arg);
        }
        if (name === 'quiz') {
            const {s,state}=await readGroup(jid);const old=state.quiz5;
            if (old && old.expires > Date.now()) return '🌸 Já existe um quiz aberto. Use :resposta 1, 2 ou 3.';
            const category=arg.toLowerCase();
            if(category&&!['geral','ciencia','geografia'].includes(category))return 'Categorias: geral, ciencia, geografia.';
            const pool=category==='ciencia'?[questions[0],questions[3],questions[5],questions[6],questions[7]]:category==='geografia'?[questions[2],{q:'Qual é o maior oceano?',options:['Atlântico','Pacífico','Índico'],answer:2},{q:'Em qual continente está o Brasil?',options:['África','Europa','América do Sul'],answer:3}]:questions;
            const q = pool[randomInt(pool.length)];
            state.quiz5={...q,expires:Date.now()+60000};await save(s,state);
            return '🧠 *Quiz Íris*\n' + q.q + '\n' + q.options.map((v,i)=>(i+1)+'. '+v).join('\n') + '\nEnvie resposta 1, 2 ou 3.';
        }
        if (!actor) return '🌸 Não foi possível identificar o participante.';
        const {s,state} = await readGroup(jid);
        const id = hash(s.key, jid + ':' + actor);
        const player = state.players[id];
        if(infinityCommands.includes(name)){
            const category=infinityGames.includes(name)||infinityStudy.includes(name)?'jogos':name==='backupinfinity'||name==='infinity'||name==='ajudainfinity'?null:'economia';
            const required=category&&groupConfig(state).roles?.[category];
            const role=owner?'responsavel':required&&required!=='todos'?await adminRole(sock,jid,msg,owner):'membro';
            if(category&&arg!=='sair'&&!await categoryAllowed(state,category,role))return 'Recurso limitado pelo responsável.';
            if(arg!=='sair'&&!strictGate(jid,id,groupConfig(state).spam==='rigoroso'))return null;
            const result=await infinityFeature({name,arg,state,id,owner});if(result?.changed)await save(s,state);return result?.text??null;
        }
        if(games5.includes(name)||community5.includes(name)||name===collage5){
            const category=games5.includes(name)?'jogos':name===collage5?'midia':['gincana','festival','criatividade','historiainterativa','comemoracao'].includes(name)?'fun':community5.includes(name)&&['painel','comandopermissao','auditoria'].includes(name)?null:'economia';
            const role=owner?'responsavel':category&&groupConfig(state).roles?.[category]&&groupConfig(state).roles[category]!=='todos'?await adminRole(sock,jid,msg,owner):'membro';if(category&&!await categoryAllowed(state,category,role))return 'Recurso limitado pelo responsável.';
            if(!strictGate(jid,id,groupConfig(state).spam==='rigoroso'))return null;
            const result=name==='revanche'&&['unobot','domino'].includes(arg)?await game4({name:arg,arg:'novo',state,id,owner,route:unoRoute}):name==='revanche'&&arg==='uno'?await megaGame({name:'uno',arg:'novo',state,id,owner}):games5.includes(name)?await game5({name,arg,state,id,owner}):name===collage5?await collageFeature5({state,id,arg,loadImage:loadPackImage}):name==='museu'&&arg.startsWith('doar ')?museumDonation({state,id,arg}):await communityFeature5({name,arg,state,id,owner,role,knownCommands:[...simple]});
            if(result?.changed)await save(s,state);return result?.text??null;
        }
        if(admin4.includes(name)){
            const role=await adminRole(sock,jid,msg,owner);const result=await adminFeature4({name,arg,state,id,owner,role});if(result?.changed)await save(s,state);return result?.text??null;
        }
        if(games4.includes(name)||name===tournamentCommand||economy4.includes(name)||packCommands.includes(name)){
            const category=packCommands.includes(name)?'midia':economy4.includes(name)?'economia':['tesouro','bingoeducativo','batalhaconhecimento'].includes(name)?'fun':'jogos';
            const required=groupConfig(state).roles?.[category];const role=required&&required!=='todos'?await adminRole(sock,jid,msg,owner):owner?'responsavel':'membro';
            if(!await categoryAllowed(state,category,role))return 'Recurso limitado pelo responsável.';
            if(!strictGate(jid,id,groupConfig(state).spam==='rigoroso'))return null;
            const result=games4.includes(name)?await game4({name,arg,state,id,owner,route:unoRoute}):name===tournamentCommand?tournament4({state,id,arg,owner}):economy4.includes(name)?await economyFeature4({name,arg,state,id}):await packFeature4({state,id,arg,loadImage:loadPackImage});
            if(result?.changed)await save(s,state);return result?.text??null;
        }
        if(funNames.includes(name)){
            const out=await funFeature({name,arg,state,id,rawName,targets:()=>groupFunTargets({sock,jid,msg,hashActor:a=>hash(s.key,jid+':'+a)})});
            if(out?.changed)await save(s,state);return out?.text??null;
        }
        if(profileCommands.includes(name)||name==='perfil'&&arg){
            const out=await profileFeature({name:name==='perfil'?'perfilvisual':name,arg,state,id,rawName,loadAsset:loadProfileAsset});if(out?.changed)await save(s,state);return out?.text??null;
        }
        if(originalGames.includes(name)){
            const out=puzzle({name,arg,state,id});if(out?.changed)await save(s,state);return out?.text??null;
        }
        if(name==='stop'&&arg!=='sair'){const role=owner?'responsavel':groupConfig(state).roles?.jogos&&groupConfig(state).roles.jogos!=='todos'?await adminRole(sock,jid,msg,owner):'membro';if(!await categoryAllowed(state,'jogos',role))return 'Recurso limitado pelo responsável.';if(!strictGate(jid,id,groupConfig(state).spam==='rigoroso'))return null;}
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
            if (player) {if(captureName(state,id,rawName))await save(s,state);return '🌸 Perfil já ativo: '+displayName(state,id)+' | Código '+id.slice(0,6)+'. Use :perfilvisual.';}
            if (Object.keys(state.players).length >= 200) return '🌸 Limite de perfis deste grupo atingido.';
            state.players[id] = { coins:0, xp:0, daily:'' };
            captureName(state,id,rawName);await save(s,state);
            return '🌸 Perfil virtual criado: '+displayName(state,id)+' | Código '+id.slice(0,6)+'. Nome de exibição e dados do jogo são guardados neste grupo. :nomeperfil para editar; :perfilvisual para ver; :sair para apagar.';
        }
        if (name === 'sair') {
            { delete state.players[id]; removeMegaProfile(state,id); removeSocial(state,id); removeFun(state,id); removeGames4(state,id); removeGames5(state,id); removeStop(state,id); removeCommunity5(state,id); removeInfinity(state,id); if(state.legacyGames5)for(const k of Object.keys(state.legacyGames5))if(k==='grupo:'+id||k.startsWith('grupo:'+id+':'))delete state.legacyGames5[k]; if(state.tournament4?.ids?.includes(id)){if(state.megaGames?.uno?.tournament4)delete state.megaGames.uno;delete state.tournament4;} if(state.megaGames?.unoStats)delete state.megaGames.unoStats[id]; if(state.community?.poll?.votes)delete state.community.poll.votes[id]; await save(s,state); }
            return '🌸 Seu perfil virtual foi removido.';
        }
        if (name === 'saldo') return player ? '🌸 Saldo: ' + player.coins + ' moedas virtuais | XP: ' + player.xp : '🌸 Use :perfil para participar.';
        if (name === 'diario') {
            if (!player) return '🌸 Use :perfil para participar.';
            const day = new Date().toISOString().slice(0,10);
            if (player.daily === day) return '🌸 Recompensa diária já coletada.';
            player.daily = day; player.coins = Math.min(1000000,player.coins+10); player.xp += 1;
            await save(s,state); return '🌸 +10 moedas virtuais e +1 XP!';
        }
        if (name === 'ranking') {
            const top = Object.entries(state.players).sort((a,b)=>b[1].xp-a[1].xp).slice(0,10);
            return '🏆 *Ranking virtual*\n' + (top.map(([k,p],i)=>(i+1)+'. '+(p.card?.public===true?displayName(state,k):'Jogador '+k.slice(0,6))+' ('+k.slice(0,6)+') — '+p.xp+' XP').join('\n') || 'Nenhum perfil inscrito.');
        }
        if (name === 'resposta') {
            const q = state.quiz5;
            if (!q || q.expires < Date.now()) return '🌸 Não há quiz ativo.';
            if (!/^[123]$/.test(arg)) return '🌸 Use :resposta 1, 2 ou 3.';
            if (Number(arg) !== q.answer) return '🌸 Não é essa. Tente outra opção!';
            delete state.quiz5;
            if (player) {player.coins=Math.min(1000000,player.coins+5); player.xp += 3; recordGame(state,'quiz',id,'w');}await save(s,state);
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
            const {state}=await readGroup(jid);const q=state.quiz5;
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
    const readOnlyMedia=new Set(['s','figurinha','slonga','som','texto','meme','menufun',...converterNames,...studioNames,...media3Names,...originalMedia,...funMediaNames,...media4,...media5,...infinityMedia]);
    async function execute(input,name,fn,readOnly=false){
        const {jid,actor,sock,msg,owner}=input;
        if(!jid)return null;
        const perform=async()=>{
            const data=await readGroupRaw(jid),{state,s}=data;
            const token=commandToken(s.key,jid,actor||'',msg?.key?.id);
            if(alreadyApplied(state,token))return null;
            const req=state.config5?.commands?.[name];
            const arg=input.command?.arg||input.arg||'';
            const exitAllowed=['sair','apagar','off'].includes(arg)&&(['uno','domino','unobot','ludo','sudoku','termo','xadrez','fun','perfilpublico','pacotefig','colagem','festival','imobiliario','trilha','expedicao','reliquia','guilda','simulado','desafioestudo','festivalinfinity','stop'].includes(name));
            if(req&&!exitAllowed&&!commandPermitted(state,name,await adminRole(sock,jid,msg,owner)))return input.shorthand?null:'Comando restrito pelo responsável.';
            if(gameCommands.has(name)&&!exitAllowed){const required=groupConfig(state).roles?.jogos;const role=owner?'responsavel':required&&required!=='todos'?await adminRole(sock,jid,msg,owner):'membro';if(!await categoryAllowed(state,'jogos',role))return input.shorthand?null:'Jogos limitados pelo responsável.';}
            const before=Object.fromEntries(Object.entries(state.players).map(([k,p])=>[k,[p.xp,p.coins,p.coop5]]));
            return context5.run({jid,data,token,before},fn);
        };
        return readOnly?perform():groupSerial(jid,perform);
    }
    const wrapped=input=>execute(input,input.command.name,()=>handle(input),readOnlyMedia.has(input.command.name));
    wrapped.chessMove=input=>execute({...input,shorthand:true},'xadrez',()=>handle.chessMove(input));
    wrapped.activity=input=>execute({...input,shorthand:true},input.command.name,()=>handle.activity(input));
    wrapped.world=async()=>null; // RPG retired; retain legacy data without serving it.
    wrapped.stopTick=({jid,now})=>groupSerial(jid,async()=>{const {s,state}=await readGroupRaw(jid);const result=stopTick(state,now);if(result.changed)await save(s,state);return result.text;});
    wrapped.schedule=handle.schedule;wrapped.welcome=handle.welcome;
    return wrapped;
}
