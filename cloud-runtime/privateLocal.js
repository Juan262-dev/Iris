// Private single-owner process. Never run this launcher on a shared/public web host.
import http from 'node:http';
import { randomBytes,timingSafeEqual } from 'node:crypto';
import { mkdir,lstat,readFile,writeFile,unlink,realpath } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { homedir } from 'node:os';
import { configureLocalStorage } from '../lib/Initialize/cloudStorage.js';
import { runtimeStatus } from './runtimeStatus.js';

export const NOTICE='Modo não oficial: o WhatsApp pode desconectar ou suspender a conta, temporária ou permanentemente. Um dispositivo vinculado pode acessar mensagens privadas. Use somente sua própria conta, em equipamento sob seu controle, e apenas em grupos que autorizaram o bot. Não compartilhe códigos, chaves ou arquivos de sessão. O consentimento não elimina os riscos.';
export function privateHostAllowed(req,port){
 return req.socket?.remoteAddress==='127.0.0.1'&&req.headers.host==='127.0.0.1:'+port;
}
export function pairingState(now=Date.now){
 let value=null,until=0;
 return {set(code){if(typeof code==='string'&&/^[A-Z0-9-]{6,16}$/i.test(code)){value=code;until=now()+120000;}},clear(){value=null;until=0;},get(){if(now()>=until){value=null;until=0;}return value;}};
}
function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);}
async function readBody(req){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>1024)throw Error('body');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Íris • Instância particular</title><style>body{background:#161222;color:#f6efff;font:16px/1.6 system-ui;max-width:660px;margin:40px auto;padding:18px}article{border:1px solid #574672;border-radius:16px;padding:20px;background:#241d33}button{padding:12px;border:0;border-radius:9px;background:#c5a8fa;color:#221633;font:600 15px system-ui;margin:10px 4px}button:disabled{opacity:.5}label{display:flex;gap:10px;align-items:start}strong{font-size:26px;letter-spacing:.12em}a{color:#d9c7ff}</style><h1>🌸 Íris particular</h1><p>Este painel só existe no seu próprio equipamento. Não pertence ao site compartilhado.</p><article><h2>Aviso importante</h2><p>'+NOTICE+'</p><p><a href="https://faq.whatsapp.com/378279804439436/" rel="noreferrer">Informações de segurança do WhatsApp</a></p><label><input id="accept" type="checkbox">Eu controlo este equipamento e a conta é minha. Li os riscos.</label><button id="start" disabled>Iniciar instância</button><button id="refresh">Atualizar estado</button><button id="stop">Encerrar instância</button><p id="status" role="status">Autenticando acesso local…</p><strong id="code"></strong><p>O código, quando disponível, aparece apenas nesta página e é ocultado após 2 minutos ou quando a conexão muda. Nunca compartilhe esse código.</p></article><script src="/app.js"></script></html>';
const js=String.raw`'use strict';
const $=id=>document.getElementById(id);
let ready=false,started=false,busy=false;
async function call(path,data){const r=await fetch(path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json','X-Iris-Local':'1'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});const v=await r.json();if(!r.ok)throw Error(v.error||'Acesso indisponível');return v;}
function sync(){$('start').disabled=!ready||started||busy||!$('accept').checked;}
async function status(){try{const v=await call('/status');$('status').textContent=v.status;$('code').textContent=v.code||'';started=v.started;sync();}catch(e){$('status').textContent=e.message;$('code').textContent='';}}
$('accept').addEventListener('change',sync);
$('start').addEventListener('click',async()=>{if(busy||!ready||!$('accept').checked)return;busy=true;sync();try{await call('/start',{accept:true});await status();}catch(e){$('status').textContent=e.message;}finally{busy=false;sync();}});
$('refresh').addEventListener('click',status);
$('stop').addEventListener('click',async()=>{if(!ready||!confirm('Encerrar esta instância particular sem desvincular a conta?'))return;try{await call('/stop',{});$('code').textContent='';$('status').textContent='Instância encerrada.';}catch(e){$('status').textContent=e.message;}});
(async()=>{try{const token=location.hash.slice(1);history.replaceState(null,'','/');if(token)await call('/claim',{token});await call('/status');ready=true;await status();setInterval(()=>{if(ready&&!document.hidden)status();},3000);}catch(e){$('status').textContent='Abra o endereço privado exibido no terminal desta instância.';}finally{sync();}})();`;
export function createPrivatePanel({port,claimToken,launch,stop,status,clock=Date.now}){
 const browserToken=randomBytes(32).toString('hex');let claimed=false,started=false,starting=false,stopping=false;const pairing=pairingState(clock);
 const result=(res,n,v)=>{res.writeHead(n,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(v));};
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");res.setHeader('X-Frame-Options','DENY');
  if(!privateHostAllowed(req,port)){result(res,403,{error:'Acesso exclusivamente local.'});return;}
  const path=req.url;
  if(req.method==='GET'&&path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  if(req.method==='GET'&&path==='/app.js'){res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8'});res.end(js);return;}
  if(req.method==='POST'&&(req.headers.origin!=='http://127.0.0.1:'+port||req.headers['x-iris-local']!=='1'||req.headers['content-type']!=='application/json')){result(res,403,{error:'Origem inválida.'});return;}
  try{
   if(req.method==='POST'&&path==='/claim'){
    const b=await readBody(req);
    if(claimed||!equal(b.token,claimToken)){result(res,403,{error:'Acesso local inválido ou já utilizado.'});return;}
    claimed=true;res.setHeader('Set-Cookie','iris_local='+browserToken+'; HttpOnly; SameSite=Strict; Path=/');
    result(res,200,{ok:true});return;
   }
   const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('iris_local='))?.slice(11);
   if(!claimed||!equal(cookie,browserToken)){result(res,401,{error:'Abra o painel privado do terminal.'});return;}
   if(req.method==='GET'&&path==='/status'){result(res,200,{started,status:status(),code:pairing.get()});return;}
   if(req.method==='POST'&&path==='/start'){
    const b=await readBody(req);if(b.accept!==true||started||starting||stopping){result(res,409,{error:'Ação indisponível.'});return;}
    starting=true;started=true;result(res,202,{ok:true});
    Promise.resolve().then(()=>launch({onPairingCode:pairing.set,onPairingClear:pairing.clear})).catch(()=>{pairing.clear();}).finally(()=>{starting=false;});return;
   }
   if(req.method==='POST'&&path==='/stop'){
    if(stopping){result(res,409,{error:'Encerrando.'});return;}
    stopping=true;pairing.clear();result(res,200,{ok:true});Promise.resolve().then(stop).catch(()=>{});return;
   }
   result(res,404,{error:'Não encontrado.'});
  }catch{result(res,400,{error:'Solicitação inválida.'});}
 });
}
async function run(){
 if(process.env.RENDER||process.env.RENDER_SERVICE_ID||!process.stdin.isTTY||!process.stdout.isTTY)throw Error('Use somente um terminal interativo em equipamento próprio.');
 const dir=resolve(process.env.IRIS_LOCAL_DATA_DIR||join(homedir(),'.iris-private'));
 await mkdir(dir,{recursive:true,mode:0o700});const info=await lstat(dir);
 if(!info.isDirectory()||info.isSymbolicLink()||(info.mode&0o077)!==0||await realpath(dir)!==dir)throw Error('Use uma pasta privada real com acesso apenas ao proprietário.');
 const lock=join(dir,'instance.lock');await writeFile(lock,String(process.pid),{flag:'wx',mode:0o600});
 let server,life={stopping:false,localPrivate:true};let startup=Promise.resolve();
 try{
  const keyfile=join(dir,'key.bin');try{await writeFile(keyfile,randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
  const keyinfo=await lstat(keyfile);if(!keyinfo.isFile()||keyinfo.isSymbolicLink()||(keyinfo.mode&0o077)!==0||keyinfo.size!==32)throw Error('Invalid private key');
  configureLocalStorage(dir,await readFile(keyfile));
  const phone=String(process.env.IRIS_PAIRING_PHONE||'');
  if(phone&&!/^[1-9]\d{7,14}$/.test(phone))throw Error('Invalid own account number');
  const port=8787,claimToken=randomBytes(32).toString('hex');
  const {startHeadlessBot}=await import('./bot.js');
  const shutdown=async()=>{if(life.stopping)return;life.stopping=true;life.onPairingClear?.();try{await startup.catch(()=>{});if(life.stop)await life.stop();}finally{await unlink(lock).catch(()=>{});server?.close();process.exit(0);}};
  server=createPrivatePanel({port,claimToken,status:()=>runtimeStatus().whatsapp,launch:callbacks=>{
   Object.assign(life,callbacks);process.env.IRIS_BOT_ENABLED='true';process.env.IRIS_ALLOW_PAIRING=phone?'true':'false';
   startup=startHeadlessBot(0,life);return startup;
  },stop:shutdown});
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
  console.log('Painel particular (não compartilhe o endereço): http://127.0.0.1:'+port+'/#'+claimToken);
 }catch(e){await unlink(lock).catch(()=>{});throw e;}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){run().catch(()=>{console.error('Não foi possível iniciar. Use um terminal próprio, pasta privada e apenas uma instância por pasta.');process.exitCode=1;});}
