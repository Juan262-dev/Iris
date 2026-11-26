import { createHmac, randomInt } from 'node:crypto';
import { handleAI } from './ai.js';
import { settings, seal, unseal, request } from '../lib/Initialize/cloudStorage.js';

const simple = new Set(['menu','ping','status','saldo','diario','ranking','dado','moeda','quiz','resposta','perfil','sair','grupo','abrir','fechar','figurinha','s','ia','criar','remover','usar','comandos']);
const needsOwner = new Set(['abrir','fechar','criar','remover']);
export function parseExtra(text, owner) {
    const match = /^!iris\s+([a-z]+)(?:\s+([\s\S]{1,500}))?$/i.exec(String(text || '').trim());
    if (!match) return null;
    const name = match[1].toLowerCase();
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
export function menu() {
    return '🌸 *Íris — Legião Z*\n\n'
        + '📋 *Geral*\n!iris menu | ping | status | grupo\n\n'
        + '🖼️ *Figurinhas*\n!iris s — envie uma imagem com essa legenda\n\n'
        + '🎮 *Jogos*\n!iris dado | moeda | quiz\n!iris resposta 1, 2 ou 3\n\n'
        + '🏆 *Pontos virtuais*\n!iris perfil — participar\n!iris saldo | diario | ranking\n!iris sair — apagar seu perfil\n\n'
        + '⚙️ *Comandos personalizados*\n!iris comandos | usar nome\n\n'
        + '🔐 *Responsável*\n!iris on | off | abrir | fechar\n!iris criar nome texto | remover nome\n\n'
        + '🤖 IA: !iris ia | !iris ia status | !iris ia perguntar texto';
}
export function makeFeatures() {
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
    return async function handle({ command, jid, actor, sock, msg, owner, sticker }) {
        const { name, arg } = command;
        if (name === 'menu') return menu();
        if (name === 'ping') return '🌸 Íris — online!';
        if (name === 'status') return '🌸 Íris conectada. Grupo autorizado. Modo de comandos.';
        if (name === 'ia') return handleAI({arg,actor});
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
        if (name === 's' || name === 'figurinha') {
            const key = jid + ':' + actor;
            const now = Date.now();
            if (now - (cooldown.get(key) || 0) < 10000) return '🌸 Aguarde 10 segundos entre figurinhas.';
            cooldown.set(key,now);
            if (cooldown.size > 1000) cooldown.delete(cooldown.keys().next().value);
            return await sticker(msg);
        }
        if (name === 'quiz') {
            const old = quizzes.get(jid);
            if (old && old.expires > Date.now()) return '🌸 Já existe um quiz aberto. Use !iris resposta 1, 2 ou 3.';
            const q = questions[randomInt(questions.length)];
            quizzes.set(jid,{...q,expires:Date.now()+60000});
            if (quizzes.size > 100) quizzes.delete(quizzes.keys().next().value);
            return '🧠 *Quiz Íris*\n' + q.q + '\n' + q.options.map((v,i)=>(i+1)+'. '+v).join('\n') + '\nUse !iris resposta 1, 2 ou 3.';
        }
        if (!actor) return '🌸 Não foi possível identificar o participante.';
        const {s,state} = await readGroup(jid);
        const id = hash(s.key, jid + ':' + actor);
        const player = state.players[id];
        if (name === 'perfil') {
            if (player) return '🌸 Perfil já ativo: Jogador ' + id.slice(0,6) + '.';
            if (Object.keys(state.players).length >= 200) return '🌸 Limite de perfis deste grupo atingido.';
            state.players[id] = { coins:0, xp:0, daily:'' };
            await save(s,state);
            return '🌸 Perfil virtual criado: Jogador ' + id.slice(0,6) + '. Somente pontos de jogo são guardados. Use !iris sair para apagar.';
        }
        if (name === 'sair') {
            if (player) { delete state.players[id]; await save(s,state); }
            return '🌸 Seu perfil virtual foi removido.';
        }
        if (name === 'saldo') return player ? '🌸 Saldo: ' + player.coins + ' moedas virtuais | XP: ' + player.xp : '🌸 Use !iris perfil para participar.';
        if (name === 'diario') {
            if (!player) return '🌸 Use !iris perfil para participar.';
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
            if (!/^[123]$/.test(arg)) return '🌸 Use !iris resposta 1, 2 ou 3.';
            if (Number(arg) !== q.answer) return '🌸 Não é essa. Tente outra opção!';
            quizzes.delete(jid);
            if (player) {player.coins += 5; player.xp += 3; await save(s,state);}
            return '🌸 Resposta correta!' + (player?' +5 moedas virtuais e +3 XP.':' Use !iris perfil para pontuar.');
        }
        if (name === 'comandos') return '🌸 Personalizados: ' + (Object.keys(state.custom).join(', ') || 'nenhum.');
        if (name === 'criar') {
            if (!owner) return null;
            const m = /^(\S+)\s+([\s\S]{1,250})$/.exec(arg);
            if (!m || !validName(m[1])) return '🌸 Use !iris criar nome texto (até 250 caracteres).';
            const k = m[1].toLowerCase();
            if (['__proto__','constructor','prototype'].includes(k)) return '🌸 Nome inválido.';
            if (!Object.hasOwn(state.custom,k) && Object.keys(state.custom).length >= 30) return '🌸 Limite de comandos atingido.';
            state.custom[k] = m[2];
            await save(s,state); return '🌸 Comando criado: !iris usar ' + k;
        }
        if (name === 'remover') {
            if (!owner || !validName(arg)) return null;
            delete state.custom[arg.toLowerCase()]; await save(s,state); return '🌸 Comando removido.';
        }
        if (name === 'usar') return validName(arg) && Object.hasOwn(state.custom,arg.toLowerCase()) ? '🌸 ' + state.custom[arg.toLowerCase()] : '🌸 Comando não encontrado.';
        return null;
    };
}
