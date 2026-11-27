import { startHeadlessBot } from './bot.js';
import { runtimeStatus,setRuntime } from './runtimeStatus.js';
const life={stopping:false};let stopping=false;
function report(){if(process.connected)try{process.send({type:'status',status:runtimeStatus().whatsapp,storage:runtimeStatus().storage});}catch{}}
const tick=setInterval(report,2000);tick.unref();
const startup=startHeadlessBot(0,life);
async function stop(){if(stopping)return;stopping=true;life.stopping=true;try{await startup;await life.stop?.();}catch{console.error('Iris worker: graceful shutdown failed');}finally{clearInterval(tick);process.exit(0);}}
process.on('message',m=>{if(m?.type==='stop')void stop();});
process.on('SIGTERM',()=>void stop());
process.on('disconnect',()=>void stop());
try{await startup;report();}catch{setRuntime('whatsapp','erro de inicialização');report();process.exit(1);}
