import { readFile } from 'node:fs/promises';
import { managerV2 } from './managerV2.js';
const root=new URL('./manager-web/',import.meta.url);
const staticFiles={'/manager':['index.html','text/html; charset=utf-8'],'/manager/style.css':['style.css','text/css; charset=utf-8'],'/manager/app.js':['app.js','text/javascript; charset=utf-8']};
const cookieName='__Host-iris_session';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeOrigin=()=>{const u=new URL(process.env.RENDER_EXTERNAL_URL||'https://iris-cloud-oqit.onrender.com');return u.origin;};
function authConfig(){const url=new URL(process.env.SUPABASE_URL||'https://invalid.invalid'),key=process.env.IRIS_MANAGER_PUBLISHABLE_KEY||'';if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)&&!/^eyJ[A-Za-z0-9._-]+$/.test(key))throw Error('auth config');return {url,key};}
const reply=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
function headers(res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");}
function tokenOf(req){const value=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);return value&&value.length<6000&&/^[A-Za-z0-9._-]+$/.test(value)?value:null;}
function sessionCookie(res,token,expiry=0){const age=Math.min(3600,Math.max(0,Math.floor(Number(expiry)||0)));res.setHeader('Set-Cookie',cookieName+'='+(token||'')+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+age);}
async function body(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Error('content type');const parts=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>4096)throw Error('body size');parts.push(chunk);}const v=JSON.parse(Buffer.concat(parts).toString('utf8'));if(!v||typeof v!=='object'||Array.isArray(v))throw Error('body');return v;}
async function remote(path,{method='GET',token,data,query}={}){const {url,key}=authConfig();const u=new URL(path,url);if(query)for(const [k,v] of Object.entries(query))u.searchParams.set(k,v);const h={apikey:key,Accept:'application/json','Content-Type':'application/json'};if(token)h.Authorization='Bearer '+token;if(method==='POST'&&path.startsWith('/rest/'))h.Prefer='return=representation';if(method==='PATCH'||method==='DELETE')h.Prefer='return=minimal';const response=await fetch(u,{method,headers:h,body:data===undefined?undefined:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(10000)});let v=null;try{v=await response.json();}catch{}return {ok:response.ok,status:response.status,value:v};}
function assurance(token){try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')).aal==='aal2'?'aal2':'aal1';}catch{return 'aal1';}}
async function identify(req){const token=tokenOf(req);if(!token)return null;const a=await remote('/auth/v1/user',{token});const u=a.value;if(!a.ok||!u?.email_confirmed_at||!uuid.test(u.id||''))return null;return {id:u.id,token,factors:Array.isArray(u.factors)?u.factors.filter(f=>f.factor_type==='totp'&&uuid.test(f.id||'')).map(f=>({id:f.id,status:f.status})):[],verifiedFactors:Array.isArray(u.factors)?u.factors.filter(f=>f.status==='verified'):[],aal:token.split('.').length===3?assurance(token):'aal1'};}
async function isAdmin(user){const a=await remote('/rest/v1/iris_manager_admins',{token:user.token,query:{select:'user_id',user_id:'eq.'+user.id,limit:'1'}});return a.ok&&Array.isArray(a.value)&&a.value.some(v=>v.user_id===user.id);}
async function ownBot(user){const a=await remote('/rest/v1/iris_manager_bots',{token:user.token,query:{select:'display_name,provider,created_at',user_id:'eq.'+user.id,limit:'1'}});if(!a.ok||!Array.isArray(a.value))throw Error('bot lookup');return a.value[0]||null;}
export function validOrigin(req,origin=safeOrigin()){return req.headers.origin===origin&&req.headers['x-iris-request']==='1';}
export function makeManager(supervisor,{now=Date.now}={}){
 const rates=new Map();let adminLast=0;
 const gate=(key,max,window)=>{const t=now();let r=rates.get(key);if(!r||t-r.at>=window)r={at:t,n:0};if(r.n>=max)return false;r.n++;rates.set(key,r);while(rates.size>1000)rates.delete(rates.keys().next().value);return true;};
 return async function manager(req,res){
 const path=(req.url||'/').split('?')[0];if(path==='/'&&['GET','HEAD'].includes(req.method)){res.writeHead(302,{Location:'/manager'});res.end();return true;}
 if(path==='/manager/'&&req.method==='GET'){res.writeHead(302,{Location:'/manager'});res.end();return true;}
 if(!Object.hasOwn(staticFiles,path)&&!path.startsWith('/manager/api/'))return false;
 headers(res);
 try{
 if(Object.hasOwn(staticFiles,path)){if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}const [file,type]=staticFiles[path];res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?undefined:await readFile(new URL(file,root)));return true;}
 const endpoint=path.slice('/manager/api/'.length),post=req.method==='POST';
 if(req.method!=='GET'&&!post){reply(res,405,{error:'Método inválido.'});return true;}
 if(post&&!validOrigin(req)){reply(res,403,{error:'Origem inválida.'});return true;}
 if(endpoint==='recover'&&post){
 const v=await body(req),email=typeof v.email==='string'?v.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254){reply(res,400,{error:'Informe um e-mail válido.'});return true;}
 if(!gate('recover-all',15,60000)||!gate('recover-email:'+email,2,300000)){reply(res,429,{error:'Aguarde antes de solicitar novamente.'});return true;}
 await remote('/auth/v1/recover',{method:'POST',data:{email},query:{redirect_to:safeOrigin()+'/manager'}});
 reply(res,200,{message:'Se a conta estiver cadastrada e o envio estiver disponível, confira o e-mail de recuperação.'});return true;
 }
 if(endpoint==='reset-password'&&post){
 const v=await body(req),token=v.token,password=v.password;
 if(typeof token!=='string'||token.length>6000||!/^eyJ[A-Za-z0-9._-]+$/.test(token)||typeof password!=='string'||password.length<10||password.length>128||!gate('reset-all',15,60000)){reply(res,400,{error:'Link ou senha inválidos.'});return true;}
 const a=await remote('/auth/v1/user',{token});if(!a.ok||!uuid.test(a.value?.id||'')||!a.value.email_confirmed_at){reply(res,401,{error:'Link expirado. Solicite outro.'});return true;}
 if(a.value.factors?.some(f=>f.status==='verified')&&assurance(token)!=='aal2'){reply(res,403,{error:'Conta com 2FA: entre e verifique seu autenticador antes de alterar a senha.'});return true;}
 const update=await remote('/auth/v1/user',{method:'PUT',token,data:{password}});if(!update.ok){reply(res,400,{error:'Não foi possível alterar a senha. Solicite um novo link.'});return true;}
 sessionCookie(res,null);try{await remote('/auth/v1/logout',{method:'POST',token,query:{scope:'global'}});}catch{}
 reply(res,200,{message:'Senha alterada. Entre novamente.'});return true;
 }
 if(['signup','login'].includes(endpoint)&&post){
 if(!gate('auth-all',40,60000)){reply(res,429,{error:'Muitas tentativas. Tente mais tarde.'});return true;}
 const v=await body(req),email=typeof v.email==='string'?v.email.trim().toLowerCase():'',password=typeof v.password==='string'?v.password:'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<10||password.length>128){reply(res,400,{error:'Informe um e-mail válido e senha de 10 a 128 caracteres.'});return true;}
 if(!gate('auth-email:'+email,5,300000)){reply(res,429,{error:'Muitas tentativas. Tente mais tarde.'});return true;}
 const sign=endpoint==='signup';
 const a=await remote(sign?'/auth/v1/signup':'/auth/v1/token',{method:'POST',data:{email,password},query:sign?{redirect_to:safeOrigin()+'/manager'}:{grant_type:'password'}});
 if(sign){if(!a.ok&&a.status===429){reply(res,429,{error:'Limite de cadastro atingido.'});return true;}reply(res,200,{message:'Se o cadastro estiver disponível, confirme seu e-mail antes de entrar. Se já tem conta, use Entrar.'});return true;}
 const v2=a.value;if(!a.ok||!v2?.access_token||!v2?.user?.email_confirmed_at){reply(res,401,{error:'Não foi possível entrar. Confira seus dados e a confirmação do e-mail.'});return true;}
 if(!/^[A-Za-z0-9._-]+$/.test(v2.access_token)||v2.access_token.length>6000)throw Error('token');sessionCookie(res,v2.access_token,v2.expires_in);reply(res,200,{message:'Sessão iniciada.'});return true;
 }
 if(endpoint==='logout'&&post){const token=tokenOf(req);sessionCookie(res,null);if(token)try{await remote('/auth/v1/logout',{method:'POST',token,query:{scope:'local'}});}catch{}reply(res,200,{message:'Sessão encerrada.'});return true;}
 const user=await identify(req);if(!user){reply(res,401,{error:'Entre com uma conta de e-mail confirmada.'});return true;}
 if(!gate('user:'+user.id,45,60000)){reply(res,429,{error:'Limite temporário de solicitações.'});return true;}
 if(endpoint==='security'&&!post){reply(res,200,{factors:user.factors,aal:user.aal,required:user.verifiedFactors.length>0&&user.aal!=='aal2'});return true;}
 if(endpoint==='mfa-verify'&&post){
 const v=await body(req);if(!user.factors.some(f=>f.id===v.factor)||typeof v.code!=='string'||!/^\d{6}$/.test(v.code)||!gate('mfa:'+user.id,5,60000)){reply(res,400,{error:'Fator ou código inválido. Aguarde se necessário.'});return true;}
 const route='/auth/v1/factors/'+v.factor;
 const challenge=await remote(route+'/challenge',{method:'POST',token:user.token,data:{}});
 if(!challenge.ok||!uuid.test(challenge.value?.id||'')){reply(res,400,{error:'Não foi possível iniciar a verificação.'});return true;}
 const verify=await remote(route+'/verify',{method:'POST',token:user.token,data:{challenge_id:challenge.value.id,code:v.code}});
 const t=verify.value?.access_token;if(!verify.ok||typeof t!=='string'||t.length>6000||assurance(t)!=='aal2'){reply(res,400,{error:'Código incorreto ou expirado.'});return true;}
 sessionCookie(res,t,verify.value.expires_in);reply(res,200,{message:'Segundo fator confirmado.'});return true;
 }
 if(user.verifiedFactors.length&&user.aal!=='aal2'){reply(res,403,{error:'Confirme seu autenticador para continuar.',mfa:true});return true;}
 if(endpoint==='mfa-enroll'&&post){
 if(user.verifiedFactors.length){reply(res,409,{error:'Já existe um segundo fator ativo.'});return true;}
 const pending=user.factors.find(f=>f.status==='unverified');
 if(pending){const removed=await remote('/auth/v1/factors/'+pending.id,{method:'DELETE',token:user.token});if(!removed.ok){reply(res,400,{error:'Não foi possível reiniciar a configuração.'});return true;}}
 const a=await remote('/auth/v1/factors',{method:'POST',token:user.token,data:{factor_type:'totp',friendly_name:'Iris Manager',issuer:'Iris Cloud'}});
 if(!a.ok||!uuid.test(a.value?.id||'')||!/^([A-Z2-7]+)=*$/i.test(a.value?.totp?.secret||'')){reply(res,400,{error:'2FA indisponível. Confira as configurações de Auth no Supabase.'});return true;}
 reply(res,200,{factor:a.value.id,secret:a.value.totp.secret,message:'Adicione a chave no seu autenticador e confirme o código de seis dígitos.'});return true;
 }
 if(['instances','instance','administration'].includes(endpoint)){
 const r=await managerV2({endpoint,post,user,admin:endpoint==='administration'&&await isAdmin(user),body:()=>body(req),supervisor});if(r){reply(res,r.code,r.value);return true;}
 }
 if(endpoint==='me'&&req.method==='GET'){
 const [admin,bot]=await Promise.all([isAdmin(user),ownBot(user)]);reply(res,200,{id:user.id,admin,bot,official:{available:false,status:'Aguardando configuração e aprovação da Meta'},legacy:admin?supervisor.snapshot():null});return true;}
 if(endpoint==='bot'&&post){
 const v=await body(req);if(!['create','rename','delete'].includes(v.action)){reply(res,400,{error:'Ação inválida.'});return true;}
 if(v.action==='delete'){const a=await remote('/rest/v1/iris_manager_bots',{method:'DELETE',token:user.token,query:{user_id:'eq.'+user.id}});reply(res,a.ok?200:409,{message:a.ok?'Rascunho removido.':'Não foi possível remover.'});return true;}
 const name=typeof v.name==='string'?v.name.trim():'';
 if(!/^[\p{L}\p{M}\p{N} _.-]{1,40}$/u.test(name)){reply(res,400,{error:'Nome de 1 a 40 caracteres (letras e números).'});return true;}
 const a=await remote('/rest/v1/iris_manager_bots',{method:v.action==='create'?'POST':'PATCH',token:user.token,data:v.action==='create'?{user_id:user.id,display_name:name}:{display_name:name},query:v.action==='rename'?{user_id:'eq.'+user.id}:undefined});
 reply(res,a.ok?200:409,{message:a.ok?'Configuração salva. Conexão ainda pendente.':'Não foi possível salvar. Cada conta pode criar um rascunho.'});return true;
 }
 if(endpoint==='control'&&post){
 if(!await isAdmin(user)){reply(res,403,{error:'Acesso exclusivo do responsável autorizado.'});return true;}
 const v=await body(req);if(!['start','stop','restart'].includes(v.action)){reply(res,400,{error:'Ação inválida.'});return true;}
 if(now()-adminLast<5000){reply(res,429,{error:'Aguarde alguns segundos entre ações.'});return true;}adminLast=now();
 const result=await supervisor.action(v.action);reply(res,200,{message:'Comando recebido pelo supervisor.',legacy:result});return true;
 }
 reply(res,404,{error:'Recurso não encontrado.'});return true;
 }catch{if(!res.headersSent)reply(res,503,{error:'Serviço temporariamente indisponível. Não repita operações em sequência.'});else res.end();return true;}
 };
}
