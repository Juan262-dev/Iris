import assert from 'node:assert/strict';
import { normalizeConfig,managerV2 } from './managerV2.js';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',ia='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ib='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const good={name:'Íris A',prefix:':',greeting:'Olá',modules:{jogos:true},commands:{uno:false},groups:['Amigos']};
assert.equal(normalizeConfig(good).display_name,'Íris A');
assert.equal(normalizeConfig({...good,prefix:'<'}),null);
assert.equal(normalizeConfig({...good,commands:{unknown:true}}),null);
assert.equal(normalizeConfig({...good,modules:{admin:true}}),null);
assert.equal(normalizeConfig({...good,groups:Array(21).fill('Grupo')}),null);
assert.deepEqual(normalizeConfig({...good,groups:['Amigos','Amigos']}).groups,['Amigos']);
const rows=[{id:ia,user_id:a,display_name:'A'},{id:ib,user_id:b,display_name:'B'}],limits=new Map(),writes=[];
const db=async(table,{method='GET',query={},data}={})=>{
 const owner=query.user_id?.slice(3),id=query.id?.slice(3);
 if(table==='iris_manager_admins')return !owner||owner===a?[{user_id:a}]:[];
 if(table==='iris_manager_limits'){if(method==='POST'){limits.set(data.user_id,{...data});writes.push(data);return [data];}return [...limits.values()].filter(r=>!owner||r.user_id===owner);}
 if(table!=='iris_manager_instances')throw Error('unexpected table');
 const filtered=rows.filter(r=>(!owner||r.user_id===owner)&&(!id||r.id===id));
 if(method==='POST'){rows.push({id:'new',...data});return [data];}
 if(method==='PATCH'){for(const r of filtered)Object.assign(r,data);return filtered;}
 if(method==='DELETE'){for(const r of filtered)rows.splice(rows.indexOf(r),1);return filtered;}
 return filtered.map(r=>({...r}));
};
const getLimit=async id=>limits.get(id)||{bot_limit:3,suspended:false};
const run=(endpoint,post,userId=a,body={},admin=false)=>managerV2({endpoint,post,user:{id:userId},admin,body:async()=>body,supervisor:{snapshot:()=>({status:'conectado'})},dbCall:db,getLimit});
assert.equal((await run('instances',false,a)).value.bots.length,1);
assert.equal((await run('instance',true,b,{action:'save',id:ia,...good})).code,404);
assert.equal((await run('instance',true,b,{action:'delete',id:ia})).code,404);
assert.equal((await run('instance',true,a,{action:'save',id:ia,...good})).code,200);
assert.equal((await run('instance',true,a,{action:'enable',id:ia})).code,409);
assert.equal((await run('administration',false,b)).code,403);
assert.equal((await run('administration',true,a,{id:a,limit:0,suspended:true},true)).code,400);
assert.equal((await run('administration',true,a,{id:b,limit:1,suspended:false},true)).code,200);
assert.equal((await run('instance',true,b,{action:'create',name:'Extra'})).code,409);
assert.equal((await run('administration',true,a,{id:b,limit:2,suspended:true},true)).code,200);
assert.equal((await run('instance',true,b,{action:'save',id:ib,...good})).code,403);
assert.equal((await run('administration',false,a,{},true)).value.instanceCount,2);
assert.equal(rows.find(r=>r.id===ia).display_name,'Íris A');
assert.equal(writes.length,2);
console.log('Iris: Manager 2.0 instance ownership, quotas, config validation, protected administration and inactive official connection tests passed');
