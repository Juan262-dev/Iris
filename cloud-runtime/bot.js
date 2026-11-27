// Experimental headless connection test, not the full Iris command engine.
import * as baileys from '@whiskeysockets/baileys';
import { useCloudAuthState } from '../lib/Initialize/cloudAuth.js';
import { decideCommand, loadChatSettings } from './chatSettings.js';
import { parseExtra, makeFeatures } from './features.js';
import { infinityMedia } from './infinity.js';
import { makeWorldSessions } from './world.js';
import sharp from 'sharp';
import { makeTextSticker } from './sticker.js';
import { stickerCommand, sendSoundSticker } from './stickerCommands.js';
import { makeMeme } from './advancedMedia.js';
import { makeLimiter } from './extras.js';
import { isChessMove } from './persistentChess.js';
import { shortActivity } from './community.js';
import { megaShort } from './megaGames.js';
import { short3 } from './games3.js';
import { media3,media3Names } from './media3.js';
import { originalMedia,searchOriginal,tts } from './originalCompat.js';
import { ownProfileImage } from './profileCard.js';
import { funMediaNames,runFunMedia,directFunImage } from './funMedia.js';
import { media4,mediaFeature4 } from './media4.js';
import { media5,mediaFeature5 } from './media5.js';
import { settings,request } from '../lib/Initialize/cloudStorage.js';
import { unoRoute,dispatchUno } from './unoVisual.js';
import { studioCommand,studioNames } from './studio.js';
import { convertMedia,converterNames } from './converters.js';
import { setRuntime,makeJobQueue,reconnectDelay,incrementRuntime } from './runtimeStatus.js';

export async function startHeadlessBot(restartCount = 0, lifecycle = { stopping:false }) {
    if (lifecycle.stopping || process.env.IRIS_BOT_ENABLED !== 'true') return;
    // Bound libvips cache and parallelism for small hosted instances.
    sharp.cache({memory:24,files:0,items:40});sharp.concurrency(2);
    const makeSocket = baileys.makeWASocket || baileys.default;
    if (typeof makeSocket !== 'function') throw new Error('Baileys socket export unavailable');
    const chats = await loadChatSettings();
    const features = makeFeatures();
    setRuntime('whatsapp','conectando');
    const mediaQueue=makeJobQueue({onChange:n=>setRuntime('media',n)});
    const mediaNames=new Set(['s','figurinha','slonga','som','texto','meme',...converterNames,...studioNames,...media3Names,...originalMedia,...funMediaNames,...media4,...media5,...infinityMedia]);
    let openedAt=0;
    const pairingNumber = lifecycle.localPrivate ? (lifecycle.pairingNumber || '') : (process.env.IRIS_PAIRING_PHONE || '');
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
        defaultQueryTimeoutMs: 15000,
        getMessage: async () => undefined,
    });
    let pending = false;
    let closed = false;
    const worldVerify=async({jid,route})=>{if(closed||lifecycle.stopping||!chats.has(jid)||!route)return false;try{const meta=await sock.groupMetadata(jid);return !closed&&chats.has(jid)&&(meta.participants||[]).some(p=>[p.id,p.lid,p.phoneNumber].map(unoRoute).includes(route));}catch{return false;}};
    const world=makeWorldSessions({verify:worldVerify,operate:(identity,command)=>!closed&&!lifecycle.stopping&&chats.has(identity.jid)?features.world(identity,command):null});
    lifecycle.world=input=>closed||lifecycle.stopping?{status:503}:world.rpc(input);
    const seen = new Set();
    const allowCommand = makeLimiter();
    let commandQueue = Promise.resolve();
    let scheduleTimer=null;
    let scheduleMinute='';
    let scheduleWork=null;
    let dbTimer=null,dbWork=null;
    const dbTick=()=>{if(closed||dbWork)return;dbWork=request(settings('iris-health-probe-v4'),'GET').then(()=>setRuntime('storage','ok')).catch(()=>{setRuntime('storage','indisponível');console.error('Iris: periodic storage probe failed');}).finally(()=>{dbWork=null;});};
    const scheduleTick=()=>{
        const stamp=new Date().toISOString().slice(0,16);
        if(closed||scheduleWork||stamp===scheduleMinute)return;
        scheduleMinute=stamp;
        scheduleWork=(async()=>{
            for(const jid of chats.list()){
                if(closed||!chats.has(jid))continue;
                try{const action=await features.schedule({jid,now:Date.parse(stamp+':00Z')});
                    if(action&&!closed&&chats.has(jid))await sock.groupSettingUpdate(jid,action);
                }catch{console.error('Iris: scheduled group update failed');}
            }
        })().catch(()=>console.error('Iris: schedule tick failed')).finally(()=>{scheduleWork=null;});
    };
    lifecycle.stop=async()=>{
        lifecycle.stopping=true;closed=true;
        if(scheduleTimer){clearInterval(scheduleTimer);scheduleTimer=null;}
        if(dbTimer){clearInterval(dbTimer);dbTimer=null;}
        try{await commandQueue;if(scheduleWork)await scheduleWork;await mediaQueue.idle();if(dbWork)await dbWork;await auth.saveCreds();}
        finally{try{sock.end(new Error('Manager shutdown'));}catch{}setRuntime('whatsapp','desativado');}
    };
    if(lifecycle.stopping){await lifecycle.stop();return;}
    sock.ev.on('creds.update', () => auth.saveCreds().catch(() => { process.exit(1); }));
    sock.ev.on('connection.update', async update => {
        if (closed) return;
        if (update.connection === 'open') {
            lifecycle.onPairingClear?.();
            openedAt=Date.now();
            setRuntime('whatsapp','conectado');
            if(!scheduleTimer){scheduleTimer=setInterval(scheduleTick,30000);scheduleTimer.unref?.();}
            if(!dbTimer){dbTick();dbTimer=setInterval(dbTick,180000);dbTimer.unref?.();}
            console.log('Iris: WhatsApp connected');
        }
        if (update.connection === 'close') {
            lifecycle.onPairingClear?.();
            closed = true;
            if(dbTimer){clearInterval(dbTimer);dbTimer=null;}
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
                    if(scheduleWork)await scheduleWork;
                    await mediaQueue.idle();
                    if(dbWork)await dbWork;
                    await auth.saveCreds();
                    console.log('Iris: bounded reconnect scheduled');
                    await new Promise(resolve=>setTimeout(resolve,delay));
                    if(!lifecycle.stopping)await startHeadlessBot(attempt+1,lifecycle);
                }catch{setRuntime('whatsapp','desconectado');console.error('Iris: bounded reconnect failed');}
                return;
            }
            console.log('Iris: check linked-device status before restarting.');
            return;
        }
        if (update.qr && !auth.state.creds.registered && !pending && (!lifecycle.localPrivate||!lifecycle.pairingRequested) && process.env.IRIS_ALLOW_PAIRING === 'true') {
            pending = true;
            if(lifecycle.localPrivate)lifecycle.pairingRequested=true;
            try {
                const code = await sock.requestPairingCode(pairingNumber);
                // Never emit a local private pairing code to logs or the shared Manager.
                if(lifecycle.localPrivate){lifecycle.pairingNumber='';if(!closed&&!lifecycle.stopping)lifecycle.onPairingCode?.(code);}
                else console.log('Iris: private device pairing code: '+code);
            } catch {
                if(lifecycle.localPrivate){lifecycle.pairingNumber='';lifecycle.onPairingError?.();}
                console.error('Iris: pairing request failed; check the official linked-device screen.');
            }
        }
    });
    sock.ev.on('group-participants.update', event => {
        if(closed||!event?.id?.endsWith('@g.us')||!chats.has(event.id)||!['add','remove'].includes(event.action))return;
        const jid=event.id, action=event.action, count=event.participants?.length||0;
        if(action==='remove')world.revokeGroup(jid);
        commandQueue=commandQueue.then(async()=>{
            if(closed||!chats.has(jid))return;
            const message=await features.welcome({jid,action,count});
            if(message&&!closed&&chats.has(jid))await sock.sendMessage(jid,{text:message});
        }).catch(()=>console.error('Iris: welcome notification failed'));
    });
    async function deliver(jid,response,msg){
        if(closed||!response||!chats.has(jid))return;
        if(response.unoDelivery){
            const payload=response.unoDelivery;
            const allowed=new Set();
            try{
                const meta=await sock.groupMetadata(jid);
                for(const p of meta.participants||[]){
                    for(const v of [p.id,p.lid,p.phoneNumber]){const route=unoRoute(v);if(route)allowed.add(route);}
                }
            }catch{console.error('Iris: UNO group membership verification failed');}
            const failed=await dispatchUno({payload,allowed,active:()=>!closed&&chats.has(jid),send:(to,content)=>sock.sendMessage(to,content)});
            if(closed||!chats.has(jid))return;
            const publicPart=payload.public;
            if(publicPart)await sock.sendMessage(jid,typeof publicPart==='string'?{text:publicPart}:publicPart,{quoted:msg});
            if(failed)await sock.sendMessage(jid,{text:'🌸 Algumas mãos não puderam ser enviadas no privado. O jogador pode usar :uno pv ou :uno mao. Nenhuma carta será revelada no grupo.'},{quoted:msg});
            return;
        }
        if(response.soundSticker){
            try{await sendSoundSticker(sock,baileys,jid,response.soundSticker,msg);}
            catch{if(!closed&&chats.has(jid))await sock.sendMessage(jid,{text:'🌸 Não foi possível confirmar o envio com som. Use :s.'},{quoted:msg});}
        }else await sock.sendMessage(jid,typeof response==='string'?{text:response}:response,{quoted:msg});
    }
    const runFeature=(extra,jid,actor,msg,owner)=>features({command:extra,jid,actor,sock,msg,owner,rawName:msg.pushName||(owner?sock.user?.name:null),loadProfileAsset:kind=>ownProfileImage(msg,baileys,kind),funMedia:(m,name,arg)=>runFunMedia(m,baileys,name,arg),newMedia:(m,name,arg)=>mediaFeature4(m,baileys,name,arg),professionalMedia:(m,name,arg)=>mediaFeature5(m,baileys,name,arg),loadPackImage:()=>directFunImage(msg,baileys),sticker:(m,name,arg)=>stickerCommand(m,baileys,name,arg),textSticker:makeTextSticker,meme:(m,arg)=>makeMeme(m,arg,baileys),convert:(m,name)=>convertMedia(m,baileys,name),studio:(m,name,arg)=>studioCommand(m,baileys,name,arg),advancedMedia:(m,name,arg)=>media3(m,baileys,name,arg),original:async(m,name,arg)=>{try{return name==='tts'?await tts(arg):name==='renomear'?await studioCommand(m,baileys,name,arg):await searchOriginal(name,arg);}catch{return '🌸 Não foi possível concluir. Use um tema disponível ou texto de até 200 caracteres.';}},unoRoute:((['uno','domino','unobot'].includes(extra.name)&&extra.arg==='pv')||(extra.name==='unobot'&&extra.arg==='novo')||(extra.name==='revanche'&&extra.arg==='unobot'))?unoRoute(owner?sock.user?.id:msg.key?.participant):null});
    const fresh=msg=>{
        const ts=Number(msg.messageTimestamp||0);
        return Number.isFinite(ts)&&Math.abs(Date.now()/1000-ts)<=120;
    };
    const remember=(jid,id)=>{
        const key=jid+':'+id;
        if(seen.has(key))return false;
        seen.add(key);if(seen.size>500)seen.delete(seen.values().next().value);
        return true;
    };
    const getActor=msg=>msg.key?.fromMe===true?(sock.user?.id||'owner').split(':')[0]+'@self':msg.key?.participant;
    let pingPending=0;
    let nextPingLog=0;
    let pendingBatches=0;
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (closed || type !== 'notify') return;
        const normal=[];
        for(const msg of messages||[]){
            const jid=msg.key?.remoteJid,id=msg.key?.id;
            const plain=msg.message?.conversation||msg.message?.extendedTextMessage?.text||'';
            if(!jid?.endsWith('@g.us'))continue;
            if(String(plain).trim().toLowerCase()!==':ping'){
                const text=plain||msg.message?.imageMessage?.caption||msg.message?.documentMessage?.caption||msg.message?.videoMessage?.caption||'';
                const enabled=chats.has(jid),owner=msg.key?.fromMe===true;
                if(!fresh(msg)||(!decideCommand({jid,fromMe:owner,text,enabled})&&!(enabled&&(parseExtra(text,owner)||isChessMove(plain)||shortActivity(plain)||short3(plain)||megaShort(plain)))))continue;
                if(normal.length<30)normal.push(msg);else incrementRuntime('dropped');
                continue;
            }
            if(!id||!fresh(msg)||!remember(jid,id))continue;
            const enabled=chats.has(jid),actor=getActor(msg);
            const log=Date.now()>=nextPingLog;
            if(log){nextPingLog=Date.now()+15000;console.log('Iris: ping received; group authorized='+enabled);}
            if(!enabled||!actor||!allowCommand(jid,actor)||pingPending>=3)continue;
            pingPending++;
            Promise.resolve().then(()=>deliver(jid,'🌸 Íris — online!',msg))
                .then(()=>{if(log)console.log('Iris: ping delivery completed');})
                .catch(()=>console.error('Iris: ping delivery failed'))
                .finally(()=>{pingPending--;});
        }
        if(!normal.length)return;
        if(pendingBatches>=12){incrementRuntime('dropped');return;}
        pendingBatches++;setRuntime('commands',pendingBatches);
        commandQueue = commandQueue.then(async () => {
            for (const msg of normal) {
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
                const extra = chats.has(jid) && jid.endsWith('@g.us') ? parseExtra(text, owner) : null;
                const plain = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const shortMove = !action && !extra && chats.has(jid) && jid.endsWith('@g.us') && isChessMove(plain);
                const activity=!action&&!extra&&chats.has(jid)&&jid.endsWith('@g.us')?(shortActivity(plain)||short3(plain)||megaShort(plain)):null;
                if (!action && !extra && !shortMove && !activity) continue;
                seen.add(jid + ':' + id);
                if (seen.size > 500) seen.delete(seen.values().next().value);
                const actor = owner ? (sock.user?.id || 'owner').split(':')[0] + '@self' : msg.key?.participant;
                if (action !== 'off' && action !== 'on' && (!actor || !allowCommand(jid,actor))) continue;
                let response;
                const commandStarted=Date.now();
                if (action === 'on') {
                    await chats.set(jid, true);
                    response = '🌸 Íris — bot ativado neste grupo. Respondo aos comandos iniciados por : e a respostas curtas de atividades ativas. Use somente com a autorização dos participantes. O responsável pode desativar com :off.';
                } else if (action === 'off') {
                    await chats.set(jid, false);
                    world.revokeGroup(jid);
                    response = '🌸 Íris — desativada neste grupo.';
                } else if (shortMove) {
                    try { response=await features.chessMove({jid,actor,arg:plain,sock,msg,owner}); if(!response&&activity?.name==='uno')response=await features.activity({jid,actor,command:activity,sock,msg,owner}); }
                    catch { console.error('Iris: chess shorthand processing failed'); }
                } else if (activity) {
                    try{response=await features.activity({jid,actor,command:activity,sock,msg,owner});}
                    catch{console.error('Iris: short activity processing failed');}
                } else if(extra?.name==='world'){
                    const identity={jid,actor,route:unoRoute(owner?sock.user?.id:msg.key?.participant)};
                    if(extra.arg==='sair'){world.revoke(identity);response='🌸 Sessão do Íris World revogada.';}
                    else if(extra.arg){response='🌸 Use :world ou :world sair. Nunca envie o código de acesso no grupo.';}
                    else try{
                        if(!await worldVerify(identity)||!await features.world(identity)){response='🌸 Use :perfil e confirme que o RPG está permitido neste grupo.';}
                        else{const code=world.issue(identity);if(!code)response='🌸 Limite de sessões atingido. Tente mais tarde.';
                            else try{await sock.sendMessage(identity.route,{text:'🌸 Íris World — https://iris-cloud-oqit.onrender.com/world\nCódigo de acesso temporário (5 minutos):\n'+code+'\nCole somente no site. Não compartilhe. :world sair no grupo revoga a sessão.'});response='🌸 Código do Íris World enviado no privado. Abra https://iris-cloud-oqit.onrender.com/world';}
                            catch{world.revoke(identity);response='🌸 Não consegui entregar o código no privado. Nenhum código será mostrado no grupo.';}
                        }
                    }catch{response='🌸 Íris World indisponível no momento.';}
                } else if (extra&&mediaNames.has(extra.name)){
                    const accepted=mediaQueue.add(async()=>{
                        if(closed||!chats.has(jid))return;
                        try{await deliver(jid,await runFeature(extra,jid,actor,msg,owner),msg);}
                        catch{console.error('Iris: media job failed');await deliver(jid,'🌸 Não consegui processar a mídia.',msg);}
                    },()=>deliver(jid,'🌸 A fila demorou demais. Envie o comando novamente.',msg));
                    if(!accepted)response='🌸 Fila de mídia ocupada. Tente novamente em instantes.';
                    else continue;
                } else if (extra) {
                    try { if(extra.name==='sair')world.revoke({jid,actor}); response = await runFeature(extra,jid,actor,msg,owner); }
                    catch { response = '🌸 Não foi possível executar este comando. Tente novamente.'; incrementRuntime('errors');console.error('Iris: individual command failed'); }
                }
                if(!closed&&response){
                    try{
                        if(action==='off')await sock.sendMessage(jid,{text:response},{quoted:msg});
                        else await deliver(jid,response,msg);
                    }catch{incrementRuntime('errors');console.error('Iris: individual response delivery failed');}
                }
                incrementRuntime('processed');if(Date.now()-commandStarted>10000)incrementRuntime('slow');
            }
        }).catch(() => {incrementRuntime('errors');console.error('Iris: command processing failed; check storage and connection.');}).finally(()=>{pendingBatches--;setRuntime('commands',pendingBatches);});
    });
}
