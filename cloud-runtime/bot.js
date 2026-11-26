// Experimental headless connection test, not the full Iris command engine.
import * as baileys from '@whiskeysockets/baileys';
import { useCloudAuthState } from '../lib/Initialize/cloudAuth.js';
import { decideCommand, loadChatSettings } from './chatSettings.js';
import { parseExtra, makeFeatures } from './features.js';
import { makeTextSticker } from './sticker.js';
import { stickerCommand, sendSoundSticker } from './stickerCommands.js';
import { makeMeme } from './advancedMedia.js';
import { makeLimiter } from './extras.js';
import { isChessMove } from './persistentChess.js';
import { shortActivity } from './community.js';
import { megaShort } from './megaGames.js';
import { studioCommand,studioNames } from './studio.js';
import { convertMedia,converterNames } from './converters.js';
import { setRuntime,makeJobQueue,reconnectDelay } from './runtimeStatus.js';

export async function startHeadlessBot(restartCount = 0) {
    if (process.env.IRIS_BOT_ENABLED !== 'true') return;
    const makeSocket = baileys.makeWASocket || baileys.default;
    if (typeof makeSocket !== 'function') throw new Error('Baileys socket export unavailable');
    const chats = await loadChatSettings();
    const features = makeFeatures();
    setRuntime('whatsapp','conectando');
    const mediaQueue=makeJobQueue({onChange:n=>setRuntime('media',n)});
    const mediaNames=new Set(['s','figurinha','slonga','som','texto','meme',...converterNames,...studioNames]);
    let openedAt=0;
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
    let scheduleTimer=null;
    let scheduleMinute='';
    const scheduleTick=()=>{
        const stamp=new Date().toISOString().slice(0,16);
        if(closed||stamp===scheduleMinute)return;
        scheduleMinute=stamp;
        commandQueue=commandQueue.then(async()=>{
            for(const jid of chats.list()){
                if(closed||!chats.has(jid))continue;
                try{const action=await features.schedule({jid,now:Date.parse(stamp+':00Z')});
                    if(action&&!closed&&chats.has(jid))await sock.groupSettingUpdate(jid,action);
                }catch{console.error('Iris: scheduled group update failed');}
            }
        }).catch(()=>console.error('Iris: schedule tick failed'));
    };
    sock.ev.on('creds.update', () => auth.saveCreds().catch(() => { process.exit(1); }));
    sock.ev.on('connection.update', async update => {
        if (closed) return;
        if (update.connection === 'open') {
            openedAt=Date.now();
            setRuntime('whatsapp','conectado');
            if(!scheduleTimer){scheduleTimer=setInterval(scheduleTick,30000);scheduleTimer.unref?.();}
            console.log('Iris: WhatsApp connected');
        }
        if (update.connection === 'close') {
            closed = true;
            if(scheduleTimer){clearInterval(scheduleTimer);scheduleTimer=null;}
            // Reconnect only for the expected registration restart, not for account restrictions.
            const status = update.lastDisconnect?.error?.output?.statusCode ?? update.lastDisconnect?.error?.statusCode;
            const reason = Number.isInteger(status) && status >= 100 && status <= 999 ? String(status) : 'unknown';
            console.log('Iris: WhatsApp disconnected; status=' + reason + '; registered=' + (auth.state.creds.registered === true));
            const attempt=openedAt&&Date.now()-openedAt>300000?0:restartCount;
            const delay=reconnectDelay(status,attempt,auth.state.creds.registered===true);
            setRuntime('whatsapp',delay===null?'desconectado':'reconectando');
            if(delay!==null){
                try{
                    await commandQueue;
                    await mediaQueue.idle();
                    await auth.saveCreds();
                    console.log('Iris: bounded reconnect scheduled');
                    await new Promise(resolve=>setTimeout(resolve,delay));
                    await startHeadlessBot(attempt+1);
                }catch{setRuntime('whatsapp','desconectado');console.error('Iris: bounded reconnect failed');}
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
    async function deliver(jid,response,msg){
        if(closed||!response||!chats.has(jid))return;
        if(response.soundSticker){
            try{await sendSoundSticker(sock,baileys,jid,response.soundSticker,msg);}
            catch{if(!closed&&chats.has(jid))await sock.sendMessage(jid,{text:'🌸 Não foi possível confirmar o envio com som. Use !iris s.'},{quoted:msg});}
        }else await sock.sendMessage(jid,typeof response==='string'?{text:response}:response,{quoted:msg});
    }
    const runFeature=(extra,jid,actor,msg,owner)=>features({command:extra,jid,actor,sock,msg,owner,sticker:(m,name,arg)=>stickerCommand(m,baileys,name,arg),textSticker:makeTextSticker,meme:(m,arg)=>makeMeme(m,arg,baileys),convert:(m,name)=>convertMedia(m,baileys,name),studio:(m,name,arg)=>studioCommand(m,baileys,name,arg)});
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (closed || type !== 'notify') return;
        commandQueue = commandQueue.then(async () => {
            for (const msg of messages || []) {
                if (closed) return;
                const jid = msg.key?.remoteJid;
                const id = msg.key?.id;
                if (!jid || !id || seen.has(jid + ':' + id)) continue;
                // Only fresh explicit commands or narrowly matched chess moves; never store chat contents.
                const ts = Number(msg.messageTimestamp || 0);
                if (!Number.isFinite(ts) || ts < Date.now() / 1000 - 120 || ts > Date.now() / 1000 + 120) continue;
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.documentMessage?.caption || msg.message?.videoMessage?.caption || '';
                const action = decideCommand({ jid, fromMe: msg.key?.fromMe === true, text, enabled: chats.has(jid) });
                const owner = msg.key?.fromMe === true;
                let extra = chats.has(jid) && jid.endsWith('@g.us') ? parseExtra(text, owner) : null;
                if(!extra&&!action&&chats.has(jid)&&jid.endsWith('@g.us')&&/^[./#][a-z]+(?:\s|$)/i.test(text)){
                    try{extra=await features.alternate({jid,text,owner});}catch{console.error('Iris: alternate prefix lookup failed');}
                }
                const plain = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const shortMove = !action && !extra && chats.has(jid) && jid.endsWith('@g.us') && isChessMove(plain);
                const activity=!action&&!extra&&!shortMove&&chats.has(jid)&&jid.endsWith('@g.us')?(shortActivity(plain)||megaShort(plain)):null;
                if (!action && !extra && !shortMove && !activity) continue;
                seen.add(jid + ':' + id);
                if (seen.size > 500) seen.delete(seen.values().next().value);
                const actor = owner ? (sock.user?.id || 'owner').split(':')[0] + '@self' : msg.key?.participant;
                if (action !== 'off' && action !== 'on' && (!actor || !allowCommand(jid,actor))) continue;
                let response;
                if (action === 'on') {
                    await chats.set(jid, true);
                    response = '🌸 Íris — bot ativado neste grupo. Respondo aos comandos !iris e a respostas curtas de atividades ativas. Use somente com a autorização dos participantes. O responsável pode desativar com !iris off.';
                } else if (action === 'off') {
                    await chats.set(jid, false);
                    response = '🌸 Íris — desativada neste grupo.';
                } else if (shortMove) {
                    try { response=await features.chessMove({jid,actor,arg:plain}); }
                    catch { console.error('Iris: chess shorthand processing failed'); }
                } else if (activity) {
                    try{response=await features.activity({jid,actor,command:activity});}
                    catch{console.error('Iris: short activity processing failed');}
                } else if (extra&&mediaNames.has(extra.name)){
                    const accepted=mediaQueue.add(async()=>{
                        if(closed||!chats.has(jid))return;
                        try{await deliver(jid,await runFeature(extra,jid,actor,msg,owner),msg);}
                        catch{console.error('Iris: media job failed');await deliver(jid,'🌸 Não consegui processar a mídia.',msg);}
                    },()=>deliver(jid,'🌸 A fila demorou demais. Envie o comando novamente.',msg));
                    if(!accepted)response='🌸 Fila de mídia ocupada. Tente novamente em instantes.';
                    else continue;
                } else if (extra) {
                    try { response = await runFeature(extra,jid,actor,msg,owner); }
                    catch { response = '🌸 Não foi possível executar este comando. Tente novamente.'; console.error('Iris: individual command failed'); }
                }
                if(!closed&&response){
                    try{
                        if(action==='off')await sock.sendMessage(jid,{text:response},{quoted:msg});
                        else await deliver(jid,response,msg);
                    }catch{console.error('Iris: individual response delivery failed');}
                }
            }
        }).catch(() => console.error('Iris: command processing failed; check storage and connection.'));
    });
}
