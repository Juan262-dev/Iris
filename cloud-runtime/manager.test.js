import assert from 'node:assert/strict';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { makeManager,validOrigin } from './manager.js';
import { makeSupervisor } from './managerSupervisor.js';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',origin='https://iris-cloud-oqit.onrender.com';
const children=[],writes=[];
const s=makeSupervisor({initial:async()=>true,persist:async v=>writes.push(v),spawn:()=>{const c=new EventEmitter();c.send=m=>{assert.equal(m.type,'stop');queueMicrotask(()=>c.emit('exit',0));};children.push(c);return c;}});
await s.boot();assert.equal(children.length,1);
children[0].emit('message',{type:'status',status:'conectado',storage:'ok'});assert.equal(s.snapshot().status,'conectado');
await s.action('stop');assert.equal(s.snapshot().desired,false);assert.equal(s.snapshot().status,'desativado');
await Promise.all([s.action('start'),s.action('start')]);assert.equal(children.length,2);
await s.action('restart');assert.equal(children.length,3);assert.deepEqual(writes,[false,true,true,true]);
assert.equal(validOrigin({headers:{origin,'x-iris-request':'1'}},origin),true);
assert.equal(validOrigin({headers:{origin:'https://evil.example','x-iris-request':'1'}},origin),false);
const originalFetch=globalThis.fetch;const env={...process.env};const bots=new Map();let controlCalls=0,mfaEnabled=false,recoveries=0,pairingCalls=0;const factor='33333333-3333-4333-8333-333333333333',challenge='44444444-4444-4444-8444-444444444444',aal2='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({aal:'aal2'})).toString('base64url')+'.test';
process.env.SUPABASE_URL='https://unit.supabase.co';process.env.IRIS_MANAGER_PUBLISHABLE_KEY='sb_publishable_unit_test';process.env.RENDER_EXTERNAL_URL=origin;
globalThis.fetch=async(url,opt={})=>{const u=new URL(url);if(u.hostname!=='unit.supabase.co')return originalFetch(url,opt);
 const token=opt.headers?.Authorization?.slice(7),uid=token==='token-a'||token===aal2?a:token==='token-b'?b:null;
 const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
 if(u.pathname==='/auth/v1/token'){const data=JSON.parse(opt.body);return json({access_token:data.email==='admin@example.test'?'token-a':'token-b',expires_in:3600,user:{email_confirmed_at:'2026-11-27'}});}
 if(u.pathname==='/auth/v1/user')return uid?json({id:uid,email_confirmed_at:'2026-11-27',factors:uid===a&&mfaEnabled?[{id:factor,factor_type:'totp',status:'verified'}]:[]}):json({},401);
 if(u.pathname==='/auth/v1/recover'){recoveries++;return json({});}
 if(u.pathname==='/auth/v1/factors/'+factor+'/challenge')return json({id:challenge});
 if(u.pathname==='/auth/v1/factors/'+factor+'/verify'){const v=JSON.parse(opt.body);return v.challenge_id===challenge&&v.code==='123456'?json({access_token:aal2,expires_in:3600}):json({},400);}
 if(u.pathname==='/auth/v1/signup')return json({user:{id:b}});
 if(u.pathname==='/auth/v1/logout')return new Response(null,{status:204});
 if(u.pathname.endsWith('/iris_manager_admins'))return json(uid===a?[{user_id:a}]:[]);
 if(u.pathname.endsWith('/iris_manager_bots')){
  if(!uid)return json({},401);
  if(opt.method==='POST'){const data=JSON.parse(opt.body);assert.equal(data.user_id,uid);bots.set(uid,{display_name:data.display_name,provider:'whatsapp_cloud'});return json([bots.get(uid)],201);}
  assert.equal(u.searchParams.get('user_id'),'eq.'+uid);
  if(opt.method==='PATCH'){bots.set(uid,{...bots.get(uid),...JSON.parse(opt.body)});return new Response(null,{status:204});}
  if(opt.method==='DELETE'){bots.delete(uid);return new Response(null,{status:204});}
  return json(bots.has(uid)?[bots.get(uid)]:[]);
 }
 throw Error('unexpected fetch');
};
const h=makeManager({relink:async uid=>{assert.equal(uid,a);pairingCalls++;},pairingStatus:uid=>{assert.equal(uid,a);return {state:'ready',code:'TEST1234'};},snapshot:()=>({ready:true,status:'conectado',desired:true,storage:'ok'}),action:async()=>{controlCalls++;return {ready:true,status:'conectado',desired:true,storage:'ok'};}});
const server=http.createServer(async(req,res)=>{if(!await h(req,res)){res.writeHead(404);res.end();}});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const call=(path,{method='GET',token,data,where=origin}={})=>originalFetch(base+'/manager/api/'+path,{method,headers:{...(token?{cookie:'__Host-iris_session='+token}:{}),...(method==='POST'?{'content-type':'application/json',origin:where,'x-iris-request':'1'}:{})},body:data?JSON.stringify(data):undefined});
 const page=await originalFetch(base+'/manager');assert.equal(page.status,200);assert.ok((await page.text()).includes('Íris Cloud Manager'));assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.equal((await call('me')).status,401);
 assert.equal((await call('control',{method:'POST',token:'token-b',data:{action:'stop'}})).status,403);
 assert.equal((await call('control',{method:'POST',token:'token-a',where:'https://bad.example',data:{action:'stop'}})).status,403);
 assert.equal(controlCalls,0);
 assert.equal((await call('pairing',{token:'token-b'})).status,403);
 assert.equal((await call('pairing',{method:'POST',token:'token-a',data:{accept:true}})).status,403);
 const login=await call('login',{method:'POST',data:{email:'admin@example.test',password:'test-password123'}});assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await call('bot',{method:'POST',token:'token-a',data:{action:'create',name:'Iris A',user_id:b}})).status,200);
 assert.equal((await call('bot',{method:'POST',token:'token-b',data:{action:'create',name:'Iris B',user_id:a}})).status,200);
 const meA=await (await call('me',{token:'token-a'})).json(),meB=await (await call('me',{token:'token-b'})).json();assert.equal(meA.bot.display_name,'Iris A');assert.equal(meB.bot.display_name,'Iris B');assert.equal(meB.admin,false);assert.equal(meB.legacy,null);assert.equal(meA.admin,true);assert.equal(meA.official.available,false);
 assert.equal((await call('control',{method:'POST',token:'token-a',data:{action:'restart'}})).status,200);assert.equal(controlCalls,1);
 assert.equal((await call('bot',{method:'POST',token:'token-b',data:{action:'delete'}})).status,200);assert.ok(bots.has(a));assert.ok(!bots.has(b));
 mfaEnabled=true;
 assert.equal((await (await call('security',{token:'token-a'})).json()).required,true);
 assert.equal((await call('me',{token:'token-a'})).status,403);
 assert.equal((await call('control',{method:'POST',token:'token-a',data:{action:'stop'}})).status,403);
 assert.equal((await call('mfa-verify',{method:'POST',token:'token-a',data:{factor,code:'000000'}})).status,400);
 const verified=await call('mfa-verify',{method:'POST',token:'token-a',data:{factor,code:'123456'}});assert.equal(verified.status,200);assert.match(verified.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await call('me',{token:aal2})).status,200);
 assert.equal((await call('pairing',{method:'POST',token:aal2,data:{accept:false}})).status,400);
 assert.equal((await call('pairing',{method:'POST',token:aal2,data:{accept:true},where:'https://bad.example'})).status,403);
 const paired=await call('pairing',{method:'POST',token:aal2,data:{accept:true}});assert.equal(paired.status,200);assert.equal((await paired.json()).code,'TEST1234');assert.equal(paired.headers.get('cache-control'),'no-store');assert.equal(pairingCalls,1);
 assert.equal((await call('pairing',{token:'token-b'})).status,403);
 assert.equal((await call('recover',{method:'POST',data:{email:'admin@example.test'}})).status,200);assert.equal(recoveries,1);
 console.log('Iris: Manager MFA gate, authenticated factor verification and recovery request mocks passed');
 console.log('Iris: Manager responsive assets, verified auth, cookie/CSRF, tenant isolation, owner-only controls and supervisor tests passed');
}finally{server.close();await s.shutdown();globalThis.fetch=originalFetch;for(const k of ['SUPABASE_URL','IRIS_MANAGER_PUBLISHABLE_KEY','RENDER_EXTERNAL_URL'])if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];}
