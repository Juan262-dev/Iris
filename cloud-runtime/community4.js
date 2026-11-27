import { collectionImage } from './megaCommunity.js';
import { displayName } from './profileCard.js';
import { unoRoute } from './unoVisual.js';
export const admin4=['configgrupo','permissao','avisohistorico','avisoregistrar','salvarconfig','restaurarconfig','temagrupo'];
export const economy4=['temporada','missaosemanal','lojatema','comprartema','rankequipes','eventotema','conquistavisual'];
const out=(text,changed=false)=>({text,changed});
export const groupThemes={iris:['#201831','#382b55','#d8b4fe'],oceano:['#112c40','#204963','#98e4fa'],floresta:['#193027','#2f5241','#b5e8b5'],dourado:['#33291b','#54402a','#ffe2a4']};
export const categories4=['jogos','economia','fun','midia'];
export const groupConfig=state=>state.config4??={theme:'iris',roles:{},spam:'normal'};
export async function adminRole(sock,jid,msg,owner){
    if(owner)return 'responsavel';
    try{const v=unoRoute(msg?.key?.participant);if(!v||!jid.endsWith('@g.us'))return 'membro';const m=await sock.groupMetadata(jid);const p=(m.participants||[]).filter(p=>[p.id,p.lid,p.phoneNumber].map(unoRoute).includes(v));return p.length===1&&['admin','superadmin'].includes(p[0].admin)?'admin':'membro';}catch{return 'membro';}
}
export async function categoryAllowed(state,category,role){
    const required=groupConfig(state).roles?.[category]||'todos';
    return required==='todos'||role==='responsavel'||required==='admin'&&role==='admin';
}
const noticeTemplates={regras:'Relembrete: consulte :regras e mantenha o respeito.',organizacao:'Aviso: mantenha o assunto adequado ao grupo.',jogos:'Aviso: respeite as regras dos jogos e os demais jogadores.',pausa:'Aviso: faça uma pausa nas brincadeiras se necessário.'};
function snapshot(state){
    const c=groupConfig(state);return {rules:String(state.rules||'').slice(0,400),custom:{...state.custom},welcome:state.welcome===true,welcomeText:state.community?.welcomeText||'',schedule:state.mega?.schedule?{...state.mega.schedule}:null,config:{theme:c.theme,spam:c.spam,roles:{...c.roles}},config5:{commands:{...(state.config5?.commands||{})}}};
}
export async function adminFeature4({name,arg='',state,owner=false,role='membro',now=Date.now()}){
    if(!admin4.includes(name))return null;
    const c=groupConfig(state),isAdmin=owner||role==='admin';
    if(name==='configgrupo'&&!arg)return out('Configuração do grupo\nTema: '+c.theme+'\nAntispam: '+c.spam+'\nPermissões novas: '+categories4.map(k=>k+'='+ (c.roles?.[k]||'todos')).join(', ')+'\nResponsável: :configgrupo spam normal | rigoroso; :permissao jogos admin; :temagrupo oceano.');
    if(name==='avisoregistrar'||name==='avisohistorico'){
        if(!isAdmin)return out('Somente administradores podem usar este recurso.');
        const h=state.notices4??=[];
        if(name==='avisohistorico')return out('Histórico de avisos gerais (últimos 30 dias):\n'+(h.filter(v=>now-v.at<30*86400000).slice(-15).map(v=>new Date(v.at).toISOString().slice(0,10)+' — '+noticeTemplates[v.kind]).join('\n')||'Nenhum.'));
        if(!Object.hasOwn(noticeTemplates,arg))return out('Modelos: '+Object.keys(noticeTemplates).join(', ')+'. Avisos não identificam pessoas.');
        if(h.length&&now-h.at(-1).at<60000)return out('Aguarde um minuto entre avisos.');
        h.push({at:now,kind:arg});while(h.length>50)h.shift();return out(noticeTemplates[arg],true);
    }
    if(!owner)return out('Somente o responsável pelo bot pode alterar a configuração.');
    if(name==='temagrupo'){if(!Object.hasOwn(groupThemes,arg))return out('Temas: '+Object.keys(groupThemes).join(', '));c.theme=arg;return out('Tema salvo: '+arg,true);}
    if(name==='configgrupo'){const m=/^spam (normal|rigoroso)$/.exec(arg);if(!m)return out('Use :configgrupo spam normal ou rigoroso.');c.spam=m[1];return out('Antispam ajustado. Nenhuma punição automática.',true);}
    if(name==='permissao'){const m=/^(jogos|economia|fun|midia) (todos|admin|responsavel)$/.exec(arg);if(!m)return out('Use :permissao jogos|economia|fun|midia todos|admin|responsavel (somente módulos 4.0).');c.roles??={};c.roles[m[1]]=m[2];return out('Permissão atualizada: '+m[1]+' — '+m[2],true);}
    if(name==='salvarconfig'){state.configBackup4={at:now,data:snapshot(state)};return out('Cópia de configuração deste grupo salva, sem dados de contas, jogos ou credenciais.',true);}
    if(name==='restaurarconfig'){
        if(!state.configBackup4?.data)return out('Nenhuma cópia interna. Use :salvarconfig.');
        if(arg!=='confirmar')return out('Para restaurar a cópia de '+new Date(state.configBackup4.at).toISOString().slice(0,10)+' use :restaurarconfig confirmar. Perfis e partidas não serão alterados.');
        const b=state.configBackup4.data;const old=snapshot(state);state.rules=b.rules;state.custom={...b.custom};state.welcome=b.welcome;state.community??={};state.community.welcomeText=b.welcomeText;state.mega??={};if(b.schedule)state.mega.schedule={...b.schedule};else delete state.mega.schedule;state.config4={...b.config,roles:{...b.config.roles}};if(b.config5)state.config5={commands:{...b.config5.commands}};state.configBackup4={at:now,data:old};return out('Configurações restauradas. Cópia anterior disponível para desfazer.',true);
    }
    return out(null);
}
const themeShop={aurora:90,dourado:150,oceano:50,floresta:65};
const week=now=>{const d=new Date(now);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
const month=now=>new Date(now).toISOString().slice(0,7);
const seasonPoints=(p,now)=>p.season4?.month===month(now)?p.season4.points||0:0;
const themes=['ciência','arte','natureza','cooperação'];
export async function economyFeature4({name,arg='',state,id,now=Date.now()}){
    if(!economy4.includes(name))return null;
    const p=state.players[id],label=k=>state.players[k]?.card?.public===true?displayName(state,k):'Jogador '+k.slice(0,6);
    if(name==='temporada'){
        const top=Object.entries(state.players).filter(([,v])=>seasonPoints(v,now)>0).sort((a,b)=>seasonPoints(b[1],now)-seasonPoints(a[1],now)).slice(0,10);
        return out('Temporada mensal '+month(now)+' • pontos dos novos jogos\n'+(top.map(([k,v],i)=>(i+1)+'. '+label(k)+' — '+seasonPoints(v,now)).join('\n')||'Sem resultados.')+'\nSeus pontos: '+(p?seasonPoints(p,now):0)+'. Moedas e XP não reiniciam.');
    }
    if(name==='rankequipes'){
        const rows=Object.entries(state.social3?.teams||{}).map(([k,v])=>[k,v.ids.reduce((a,k)=>a+seasonPoints(state.players[k]||{},now),0)]).sort((a,b)=>b[1]-a[1]).slice(0,10);
        return out('Ranking de equipes • temporada '+month(now)+'\n'+(rows.map(([k,v],i)=>(i+1)+'. '+k+' — '+v+' pts').join('\n')||'Nenhuma equipe.'));
    }
    if(name==='lojatema')return out('Loja virtual de temas:\n'+Object.entries(themeShop).map(([k,v])=>k+' — '+v+' moedas').join('\n')+'\n:comprartema nome. Use :perfiltema para equipar.');
    if(!p)return out('Use :perfil para criar seu perfil.');
    if(name==='comprartema'){if(!Object.hasOwn(themeShop,arg))return out('Consulte :lojatema.');p.ownedThemes4??={};if(p.ownedThemes4[arg])return out('Tema já comprado.');if(p.coins<themeShop[arg])return out('Moedas virtuais insuficientes.');p.coins-=themeShop[arg];p.ownedThemes4[arg]=true;return out('Tema desbloqueado: '+arg+'. Use :perfiltema '+arg,true);}
    if(name==='missaosemanal'){const w=week(now),v=p.week4?.week===w?p.week4:{week:w,days:[],claimed:false};if(v.claimed)return out('Missão semanal já resgatada.');const today=new Date(now).toISOString().slice(0,10);if(arg==='participar'){if(v.days.includes(today))return out('Participação de hoje já registrada.');v.days.push(today);p.week4=v;return out('Missão semanal: '+v.days.length+'/3 dias distintos. :missaosemanal resgatar.',true);}if(arg==='resgatar'){if(v.days.length<3)return out('Participe em três dias diferentes da semana.');v.claimed=true;p.week4=v;p.coins=Math.min(1000000,p.coins+30);p.xp+=3;return out('Missão semanal concluída: +30 moedas e +3 XP.',true);}return out('Missão semanal cooperativa: participe em três dias com :missaosemanal participar. '+v.days.length+'/3. Sem perdas ou penalidades.');}
    if(name==='eventotema'){const w=week(now),theme=themes[Math.floor(Date.parse(w)/604800000)%themes.length];if(arg!=='participar')return out('Evento temático da semana: '+theme+'. :eventotema participar. Recompensa fixa e simbólica.');if(p.eventWeek4===w)return out('Já participou esta semana.');p.eventWeek4=w;p.coins=Math.min(1000000,p.coins+12);p.xp+=2;return out('Evento '+theme+' concluído: +12 moedas e +2 XP.',true);}
    if(name==='conquistavisual'){const rows=[['Nível',String(1+Math.floor(p.xp/10))],['Primeiro perfil','desbloqueado'],['Colecionáveis',String(Object.keys(p.inventory||{}).length)],['Temporada',String(seasonPoints(p,now))+' pts'],['Missão semanal',p.week4?.claimed&&p.week4.week===week(now)?'concluída':'em progresso']];return out({image:await collectionImage(rows,'CONQUISTAS • ÍRIS'),caption:'Suas conquistas virtuais.'});}
    return out(null);
}
export function strictSpamGate({now=Date.now,max=3,window=15000}={}){
    const slots=new Map();return (group,id,strict)=>{if(!strict)return true;const k=group+':'+id,t=now();let s=slots.get(k);if(!s||t-s.start>=window)s={start:t,count:0};if(s.count>=max)return false;s.count++;slots.set(k,s);if(slots.size>1000)slots.delete(slots.keys().next().value);return true;};
}
