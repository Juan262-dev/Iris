// Experimental headless connection test, not the full Iris command engine.
import * as baileys from '@whiskeysockets/baileys';
import { useCloudAuthState } from '../lib/Initialize/cloudAuth.js';

export async function startHeadlessBot() {
    if (process.env.IRIS_BOT_ENABLED !== 'true') return;
    const makeSocket = baileys.makeWASocket || baileys.default;
    if (typeof makeSocket !== 'function') throw new Error('Baileys socket export unavailable');
    const allowedChats = new Set((process.env.IRIS_ALLOWED_CHATS || '').split(',').map(x => x.trim()).filter(Boolean));
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
    sock.ev.on('creds.update', () => auth.saveCreds().catch(() => { process.exit(1); }));
    sock.ev.on('connection.update', async update => {
        if (closed) return;
        if (update.connection === 'open') console.log('Iris: WhatsApp connected');
        if (update.connection === 'close') {
            closed = true;
            // Deliberately avoid reconnect loops until this experimental runtime has been tested.
            const status = update.lastDisconnect?.error?.output?.statusCode ?? update.lastDisconnect?.error?.statusCode;
            const reason = Number.isInteger(status) && status >= 100 && status <= 999 ? String(status) : 'unknown';
            console.log('Iris: WhatsApp disconnected; status=' + reason + '; registered=' + (auth.state.creds.registered === true));
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
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (closed || type !== 'notify') return;
        for (const msg of messages || []) {
            const jid = msg.key?.remoteJid;
            const id = msg.key?.id;
            // No message history, unsolicited replies, group surveillance or external AI calls.
            if (!jid || !id || msg.key?.fromMe || !allowedChats.has(jid) || seen.has(id)) continue;
            seen.add(id);
            if (seen.size > 500) seen.delete(seen.values().next().value);
            const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();
            try {
                if (text === '!ping') await sock.sendMessage(jid, { text: 'Íris: online.' });
                if (text === '!ajuda') await sock.sendMessage(jid, { text: 'Íris — modo de teste. Comandos: !ping, !ajuda.' });
            } catch { console.error('Iris: test command delivery failed.'); }
        }
    });
}
