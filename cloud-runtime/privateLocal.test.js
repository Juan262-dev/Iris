import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createPrivatePanel,pairingState,privateHostAllowed,normalizeOwnNumber } from './privateLocal.js';
import { localSettings,localRequest } from '../lib/Initialize/localStorage.js';
import { seal,unseal } from '../lib/Initialize/cloudStorage.js';
const dir=await mkdtemp(join(tmpdir(),'iris-local-test-'));
try{
 const key=randomBytes(32),a=localSettings(dir,key,'a'),b=localSettings(dir,key,'b'),sample={test:'synthetic'};
 assert.deepEqual(await localRequest(a,'GET'),[]);
 await localRequest(a,'POST',{session_id:a.sessionId,item_type:'auth',item_id:'snapshot',encrypted_payload:seal(sample,a)});
 assert.deepEqual(unseal((await localRequest(a,'GET'))[0].encrypted_payload,a),sample);
 assert.deepEqual(await localRequest(b,'GET'),[]);
 await localRequest(a,'DELETE');assert.deepEqual(await localRequest(a,'GET'),[]);
}finally{await rm(dir,{recursive:true,force:true});}
assert.equal(normalizeOwnNumber('+1 (202) 555-0100'),'12025550100');assert.equal(normalizeOwnNumber('invalid'),null);assert.equal(normalizeOwnNumber('123'),null);
let now=100;const p=pairingState(()=>now);p.set('TEST1234');assert.equal(p.get(),'TEST1234');now+=120000;assert.equal(p.get(),null);p.set('TEST1234');p.clear();assert.equal(p.get(),null);
assert.equal(privateHostAllowed({socket:{remoteAddress:'192.0.2.1'},headers:{host:'127.0.0.1:8787'}},8787),false);
assert.equal(privateHostAllowed({socket:{remoteAddress:'127.0.0.1'},headers:{host:'other.example'}},8787),false);
assert.equal(privateHostAllowed({socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:8787'}},8787),true);
// An offline simulated launcher: no account or WhatsApp connection is used.
const port=18787,token='synthetic-claim',origin='http://127.0.0.1:'+port;let launched=0,stopped=0;
const server=createPrivatePanel({port,claimToken:token,launch:async cb=>{assert.equal(cb.phone,'12025550100');launched++;cb.onPairingCode('TEST1234');},stop:async()=>{stopped++;},status:()=> 'test',clock:()=>now});
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
 const req=(path,opts={})=>fetch(origin+path,opts);
 assert.equal((await req('/status')).status,401);
 const post=(path,data,cookie,from=origin)=>req(path,{method:'POST',headers:{origin:from,'content-type':'application/json','x-iris-local':'1',...(cookie?{cookie}:{})},body:JSON.stringify(data)});
 assert.equal((await post('/claim',{token},null,'https://other.example')).status,403);
 const claim=await post('/claim',{token});assert.equal(claim.status,200);
 const cookie=claim.headers.get('set-cookie').split(';')[0];assert.equal((await post('/claim',{token})).status,403);
 assert.equal((await post('/start',{accept:false},cookie)).status,409);
 assert.equal((await post('/start',{accept:true,phone:'invalid'},cookie)).status,400);
 assert.equal((await post('/start',{accept:true,phone:'+1 (202) 555-0100'},cookie)).status,202);
 const state=await (await req('/status',{headers:{cookie}})).json();assert.equal(launched,1);assert.equal(state.code,'TEST1234');
 assert.equal((await post('/start',{accept:true},cookie)).status,409);
 now+=120000;assert.equal((await (await req('/status',{headers:{cookie}})).json()).code,null);
 assert.equal((await post('/stop',{},cookie)).status,200);assert.equal(stopped,1);
}finally{await new Promise(ok=>server.close(ok));}
console.log('Iris: isolated local storage, loopback access, one-time claim, explicit consent and display expiry tests passed');
