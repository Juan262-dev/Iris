// Private per-process storage. Not an HTTP API; used only by the local owner runner.
import { createHash, randomUUID } from 'node:crypto';
import { readFile,writeFile,rename,unlink,lstat } from 'node:fs/promises';
import { isAbsolute,join } from 'node:path';
const limit=16*1024*1024;
export function localSettings(dir,key,sessionId){
 if(!isAbsolute(dir)||!Buffer.isBuffer(key)||key.length!==32)throw Error('Invalid local storage configuration');
 const id=String(sessionId);
 return {local:true,dir,key,sessionId:id,file:join(dir,createHash('sha256').update(id).digest('hex')+'.enc')};
}
export async function localRequest(s,method,body){
 if(method==='GET'){
  try{const stat=await lstat(s.file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)throw Error('Invalid local snapshot');
   const value=await readFile(s.file,'utf8');if(!value.startsWith('v1.'))throw Error('Invalid local snapshot');
   return [{encrypted_payload:value}];
  }catch(e){if(e.code==='ENOENT')return [];throw e;}
 }
 if(method==='POST'){
  if(!body||body.session_id!==s.sessionId||body.item_type!=='auth'||body.item_id!=='snapshot'||typeof body.encrypted_payload!=='string'||!body.encrypted_payload.startsWith('v1.')||Buffer.byteLength(body.encrypted_payload)>limit)throw Error('Invalid local write');
  const temp=s.file+'.'+randomUUID()+'.tmp';
  try{await writeFile(temp,body.encrypted_payload,{mode:0o600,flag:'wx'});await rename(temp,s.file);}
  finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  return;
 }
 if(method==='DELETE'){try{await unlink(s.file);}catch(e){if(e.code!=='ENOENT')throw e;}return;}
 throw Error('Invalid local request');
}
