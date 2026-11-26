// Experimental headless connection test, not the full Iris command engine.
import * as baileys from '@whiskeysockets/baileys';
import { useCloudAuthState } from '../lib/Initialize/cloudAuth.js';
import { decideCommand, loadChatSettings } from './chatSettings.js';
import { parseExtra, makeFeatures } from './features.js';
import { makeSticker, makeTextSticker } from './sticker.js';
import { makeLimiter } from './extras.js';

export async function startHeadlessBot(restartCount = 0) {
    if (process.env.IRIS_BOT_ENABLED !== 'true') return;
    const makeSocket = baileys.makeWASocket || baileys.default;
    if (typeof makeSocket !== 'function') throw new Error('Baileys socket export unavailable');
    const chats = await loadChatSettings();
    const features = makeFeatures();
    const pairingNumber = process.env.IRIS_PAIRING_PHONE || '';
    const auth = await useCloudAuthState('0', baileys);
    console.log('Iris: stored device registration: ' + (auth.state.creds.registered === true ? 'registered' : 'not_registered'));
    if (process.env.IRIS_DIAGNOSTIC_ONLY === 'true') return;
    if (!auth.state.creds.registered && (!/^\d{8,15}$/.test(pairingNumber) || process.env.IRIS_ALLOW_PAIRING !== 'true')) {
        console.log('Iris: initial pairing is not enabled.');
        return;
    }
    const quiet = { level: 'silent', trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){return this;} };
    const sock = makeSocket({
        auth: auth.state,
        logger: quiet,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        getMessage: async () => undefined,
    });
    let pending = false;
    let closed = false;
    const seen = new Set();
    const allowCommand = makeLimiter();
    let commandQueue = Promise.resolve();
    sock.ev.on('creds.update', () => auth.saveCreds().catch(() => { process.exit(1); }));
    sock.ev.on('connection.update', async update => {
        if (closed) return;
        if (update.connection === 'open') {
            restartCount = 0;
            console.log('Iris: WhatsApp connected');
        }
        if (update.connection === 'close') {
            closed = true;
            // Reconnect only for the expected registration restart, not for account restrictions.
            const status = update.lastDisconnect?.error?.output?.statusCode ?? update.lastDisconnect?.error?.statusCode;
            const reason = Number.isInteger(status) && status >= 100 && status <= 999 ? String(status) : 'unknown';
            console.log('Iris: WhatsApp disconnected; status=' + reason + '; registered=' + (auth.state.creds.registered === true));
            // WhatsApp requests a fresh socket after successful device registration.
            // Persist the registered state before starting a single bounded restart.
            if (status === (baileys.DisconnectReason?.restartRequired ?? 515) && auth.state.creds.registered === true && restartCount < 1) {
                try {
                    await auth.saveCreds();
                    console.log('Iris: restarting registered socket after status 515');
                    await startHeadlessBot(restartCount + 1);
                } catch {
                    console.error('Iris: registered socket restart failed.');
                }
                return;
            }
            console.log('Iris: check linked-device status before restarting.');
            return;
        }
        if (update.qr && !auth.state.creds.registered && !pending && process.env.IRIS_ALLOW_PAIRING === 'true') {
            pending = true;
            try {
                const code = await sock.requestPairingCode(pairingNumber);
                // Short-lived authorization code, available only in the owner's private Render logs.
                console.log('Iris: private device pairing code: ' + code);
            } catch {
                console.error('Iris: pairing request failed; check the official linked-device screen.');
            }
        }
    });
    sock.ev.on('group-participants.update', event => {
        if(closed||!event?.id?.endsWith('@g.us')||!chats.has(event.id)||!['add','remove'].includes(event.action))return;
        const jid=event.id, action=event.action, count=event.participants?.length||0;
        commandQueue=commandQueue.then(async()=>{
            if(closed||!chats.has(jid))return;
            const message=await features.welcome({jid,action,count});
            if(message&&!closed&&chats.has(jid))await sock.sendMessage(jid,{text:message});
        }).catch(()=>console.error('Iris: welcome notification failed'));
    });
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (closed || type !== 'notify') return;
        commandQueue = commandQueue.then(async () => {
            for (const msg of messages || []) {
                if (closed) return;
                const jid = msg.key?.remoteJid;
                const id = msg.key?.id;
                if (!jid || !id || seen.has(jid + ':' + id)) continue;
                // Only fresh, explicitly addressed text commands; never store chat contents.
                const ts = Number(msg.messageTimestamp || 0);
                if (!Number.isFinite(ts) || ts < Date.now() / 1000 - 120 || ts > Date.now() / 1000 + 120) continue;
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.documentMessage?.caption || '';
                const action = decideCommand({ jid, fromMe: msg.key?.fromMe === true, text, enabled: chats.has(jid) });
                const owner = msg.key?.fromMe === true;
                const extra = chats.has(jid) && jid.endsWith('@g.us') ? parseExtra(text, owner) : null;
                if (!action && !extra) continue;
                seen.add(jid + ':' + id);
                if (seen.size > 500) seen.delete(seen.values().next().value);
                const actor = owner ? (sock.user?.id || 'owner').split(':')[0] + '@self' : msg.key?.participant;
                if (action !== 'off' && action !== 'on' && (!actor || !allowCommand(jid,actor))) continue;
                let response;
                if (action === 'on') {
                    await chats.set(jid, true);
                    response = '🌸 Íris — bot ativado neste grupo. Respondo apenas aos comandos !iris. Use somente com a autorização dos participantes. O responsável pode desativar com !iris off.';
                } else if (action === 'off') {
                    await chats.set(jid, false);
                    response = '🌸 Íris — desativada neste grupo.';
                } else if (extra) {
                    try { response = await features({ command:extra, jid, actor, sock, msg, owner, sticker:m=>makeSticker(m,baileys),textSticker:makeTextSticker }); }
                    catch { response = '🌸 Não foi possível executar este comando. Tente novamente.'; console.error('Iris: individual command failed'); }
                }
                if (!closed && response) await sock.sendMessage(jid, typeof response === 'string' ? { text:response } : response, { quoted: msg });
            }
        }).catch(() => console.error('Iris: command processing failed; check storage and connection.'));
    });
}
