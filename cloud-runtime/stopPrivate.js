import {randomBytes} from 'node:crypto';
export function makeStopTickets({clock=Date.now,limit=180}={}){
 const tickets=new Map();
 const prune=()=>{for(const [k,v] of tickets)if(v.expires<=clock())tickets.delete(k);};
 return {
  issue(data){prune();for(const [k,v] of tickets)if(v.jid===data.jid&&v.actor===data.actor)tickets.delete(k);if(tickets.size>=limit)return null;const code=randomBytes(16).toString('hex');tickets.set(code,{...data,expires:clock()+180000});return code;},
  find(code){prune();return /^[a-f0-9]{32}$/.test(code)?tickets.get(code)||null:null;},
  remove(code){tickets.delete(code);},
  revokeGroup(jid){for(const [k,v] of tickets)if(v.jid===jid)tickets.delete(k);}
 };
}
export function parseStopPrivate(text){if(typeof text!=='string'||text.length>600)return null;const m=/^:stop responder ([a-f0-9]{32}) ([\s\S]{1,500})$/i.exec(text.trim());return m?{code:m[1].toLowerCase(),answer:m[2]}:null;}
