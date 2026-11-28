import { startHeadlessBot } from './bot.js';
import { runtimeStatus,setRuntime } from './runtimeStatus.js';
const sendPairing=(type,code)=>{if(process.connected)try{process.send({type,code});}catch{}};
const life={stopping:false,relink:process.argv.includes('--relink'),onPairingCode:code=>sendPairing('pairing-code',code),onPairingClear:()=>sendPairing('pairing-clear'),onPairingError:()=>sendPairing('pairing-error')};let stopping=false;
function report(){if(process.connected)try{process.send({type:'status',status:runtimeStatus().whatsapp,storage:runtimeStatus().storage,memory:Math.round(process.memoryUsage().rss/1048576)});}catch{}}
const tick=setInterval(report,2000);tick.unref();
const startup=startHeadlessBot(0,life);
async function stop(){if(stopping)return;stopping=true;life.stopping=true;try{await startup;await life.stop?.();}catch{console.error('Iris worker: graceful shutdown failed');}finally{clearInterval(tick);process.exit(0);}}
let worldPending=0;
process.on('message',m=>{
 if(m?.type==='stop'){void stop();return;}
 if(m?.type!=='world'||!Number.isSafeInteger(m.id))return;
 const send=result=>{if(process.connected)try{process.send({type:'world-result',id:m.id,result});}catch{}};
 if(stopping||!life.world||worldPending>=16){send({status:503});return;}
 worldPending++;
 Promise.resolve().then(()=>life.world(m.input)).then(send,()=>send({status:503})).finally(()=>worldPending--);
});
process.on('SIGTERM',()=>void stop());
process.on('disconnect',()=>void stop());
try{await startup;report();}catch{setRuntime('whatsapp','erro de inicialização');report();process.exit(1);}
