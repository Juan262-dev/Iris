import { shop } from './localFun.js';
import sharp from 'sharp';
export const economyNames=['empresa','propriedade','mercado','anunciar','adquirir','cancelarvenda','vitrine','mochila','evento'];
export const adminNames=['advertir','advertencias','limparadvertencia','agenda','sugestao','sugestoes','limparsugestoes','prefixo','menuimagem','backup','versao'];
const adminOnly=new Set(['advertir','advertencias','limparadvertencia','agenda','sugestoes','limparsugestoes','prefixo','backup']);
const label=id=>'Jogador '+id.slice(0,6),out=(text,changed=false)=>({text,changed});
const properties={biblioteca:150,jardim:100,atelie:125};
const companies={livraria:100,floricultura:80,atelier:90};
const date=t=>new Date(t).toISOString().slice(0,10);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
export async function collectionImage(items,title){
    const h=130+items.length*64;
    const rows=items.map(([name,price],i)=>'<rect x="20" y="'+(78+i*64)+'" width="520" height="54" rx="12" fill="#342a55"/><text x="36" y="'+(112+i*64)+'" font-size="19" fill="#fff">'+esc(name.replace(/[^\p{L}\p{N} .-]/gu,''))+'</text><text x="522" y="'+(112+i*64)+'" text-anchor="end" font-size="18" fill="#f5d486">'+esc(price)+'</text>').join('');
    return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="560" height="'+h+'"><rect width="560" height="'+h+'" rx="18" fill="#201633"/><text x="280" y="46" font-size="25" font-family="sans-serif" text-anchor="middle" fill="#eee3ff">'+esc(title)+'</text><g font-family="sans-serif">'+rows+'</g></svg>')).png().toBuffer();
}
export function removeMegaProfile(state,id){
    const m=state.mega;if(!m)return;
    for(const [k,v] of Object.entries(m.market||{}))if(v.seller===id)delete m.market[k];
    if(m.warnings)delete m.warnings[id];
    if(m.suggestions)delete m.suggestions[id];
}
export async function megaFeature({name,arg='',state,id,owner=false,now=Date.now()}){
    if(!economyNames.includes(name)&&!adminNames.includes(name))return null;
    if(adminOnly.has(name)&&!owner)return out(null);
    const m=state.mega??={};
    const p=state.players[id];
    if(name==='versao')return out('🌸 Íris Cloud 2.0 — mega atualização. Runtime adaptado; IA externa desativada.');
    if(name==='menuimagem'){
        const items=[['Jogos multiplayer','!iris menu jogos'],['Estúdio de mídia','!iris menu midia'],['Economia virtual','!iris menu economia'],['Administração','!iris menu admin'],['Interação','!iris menu diversao']];
        return out({image:await collectionImage(items,'ÍRIS CLOUD 2.0'),caption:'🌸 Central de comandos. !iris menu para a lista completa.'});
    }
    if(name==='prefixo'){
        if(!arg)return out('Prefixo alternativo: '+(m.prefix||'desativado')+'. !iris sempre permanece disponível.');
        if(arg==='padrao'){delete m.prefix;return out('Prefixo alternativo desativado.',true);}
        if(!['.','/','#'].includes(arg))return out('Escolha ., / ou #. O prefixo !iris continua ativo.');
        m.prefix=arg;return out('Prefixo alternativo: '+arg+'menu, '+arg+'ping. Comandos administrativos permanecem !iris.',true);
    }
    if(name==='backup'){
        const b={version:2,rules:state.rules||'',custom:state.custom||{},welcome:state.welcome===true,welcomeText:state.community?.welcomeText||'',prefix:m.prefix||'',schedule:m.schedule||null};
        return out({document:Buffer.from(JSON.stringify(b,null,2)),mimetype:'application/json',fileName:'iris-config-backup.json',caption:'Backup de configuração do grupo. Sem credenciais, perfis, conversas ou chaves.'});
    }
    if(name==='agenda'){
        if(!arg)return out(m.schedule?'Agenda: '+m.schedule.open+'–'+m.schedule.close+' (horário de Fortaleza).':'Agenda desativada. !iris agenda 08:00 22:00 ou off.');
        if(arg==='off'){delete m.schedule;return out('Agenda desativada.',true);}
        const match=/^([01]\d|2[0-3]):([0-5]\d) ([01]\d|2[0-3]):([0-5]\d)$/.exec(arg);
        if(!match||arg.slice(0,5)===arg.slice(6))return out('Use !iris agenda 08:00 22:00 ou off.');
        m.schedule={open:arg.slice(0,5),close:arg.slice(6)};return out('Agenda salva. Funciona enquanto a Íris estiver online e tiver permissão de administrar.',true);
    }
    if(name==='sugestao'){
        if(!arg||arg.length>200)return out('Use !iris sugestao texto (até 200 caracteres, sem dados pessoais) ou !iris sugestao apagar.');
        m.suggestions??={};
        if(arg==='apagar'){delete m.suggestions[id];return out('Sua sugestão foi removida.',true);}
        if(!Object.hasOwn(m.suggestions,id)&&Object.keys(m.suggestions).length>=30)return out('Caixa de sugestões cheia.');
        m.suggestions[id]=arg;return out('Sugestão registrada para o responsável. Você pode apagá-la.',true);
    }
    if(name==='sugestoes')return out('💡 Sugestões:\n'+(Object.values(m.suggestions||{}).join('\n— ')||'Nenhuma.'));
    if(name==='limparsugestoes'){delete m.suggestions;return out('Sugestões removidas.',true);}
    if(['advertir','advertencias','limparadvertencia'].includes(name)){
        // Only voluntary profiles, manually recorded by the authorized owner. No automatic punishment.
        const match=/^([a-f0-9]{6})(?: (.+))?$/i.exec(arg);
        if(!match)return out('Informe o código do perfil voluntário. !iris advertir codigo motivo; !iris advertencias codigo; !iris limparadvertencia codigo.');
        const matches=Object.keys(state.players).filter(k=>k.startsWith(match[1].toLowerCase()));if(matches.length!==1)return out('Perfil inexistente ou ambíguo.');
        const k=matches[0];m.warnings??={};const notes=(m.warnings[k]||[]).filter(v=>now-v.at<7*86400000);
        if(name==='advertencias')return out('Advertências dos últimos 7 dias: '+notes.length+'\n'+notes.map(n=>n.reason).join('\n'));
        if(name==='limparadvertencia'){delete m.warnings[k];return out('Advertências removidas.',true);}
        if(!match[2]||match[2].length>120||notes.length>=3)return out('Motivo obrigatório (até 120 caracteres), máximo 3 registros ativos.');
        notes.push({at:now,reason:match[2]});m.warnings[k]=notes;return out('Advertência manual registrada. Nenhuma punição automática.',true);
    }
    if(name==='vitrine')return out({image:await collectionImage(Object.entries(shop).map(([k,v])=>[k,v.price+' moedas']),'LOJA ÍRIS'),caption:'Use !iris comprar item. Sem dinheiro real.'});
    if(name==='mercado')return out('🏪 Mercado de colecionáveis\n'+(Object.entries(m.market||{}).map(([k,v])=>k+' — '+v.item+' | '+v.price+' moedas').join('\n')||'Sem anúncios.')+'\n!iris adquirir código');
    if(!p)return out('Use !iris perfil para participar.');
    if(name==='mochila')return out({image:await collectionImage(Object.keys(p.inventory||{}).map(k=>[k,'possui']),'INVENTÁRIO'),caption:'Seus itens colecionáveis.'});
    if(name==='empresa'||name==='propriedade'){
        const store=name==='empresa'?companies:properties;
        const list=Object.entries(store).map(([k,v])=>k+' — '+v).join(', ');
        const key=name==='empresa'?'company':'property';
        if(!arg)return out('Seu registro: '+(p[key]||'nenhum')+'. Opções: '+list+' moedas virtuais.');
        if(arg==='receber'&&name==='empresa'){
            if(!Object.hasOwn(store,p.company||''))return out('Crie uma empresa virtual primeiro.');
            if(p.companyDay===date(now))return out('Receita diária já coletada.');
            p.companyDay=date(now);p.coins=Math.min(1000000,p.coins+10);return out('Empresa virtual: +10 moedas.',true);
        }
        if(!Object.hasOwn(store,arg)||p[key])return out('Escolha uma opção válida. Apenas uma '+name+' por perfil.');
        if(p.coins<store[arg])return out('Saldo insuficiente.');
        p.coins-=store[arg];p[key]=arg;return out(name+' virtual adquirida: '+arg,true);
    }
    if(name==='evento'){
        if(p.eventDay===date(now))return out('Recompensa do evento diário já coletada.');
        if(arg!=='participar')return out('🎉 Evento diário: !iris evento participar. +5 moedas e +1 XP, sem sorteio.');
        p.eventDay=date(now);p.coins=Math.min(1000000,p.coins+5);p.xp+=1;return out('Participação registrada!',true);
    }
    m.market??={};
    if(name==='anunciar'){
        const match=/^([a-z]+) ([1-9]\d{0,3})$/.exec(arg);
        if(!match||!Object.hasOwn(shop,match[1])||!p.inventory?.[match[1]])return out('Use !iris anunciar item preco; você deve possuir o item.');
        if(Object.keys(m.market).length>=40||Object.values(m.market).some(v=>v.seller===id&&v.item===match[1]))return out('Limite de anúncios ou item já anunciado.');
        // Reserve the item; no duplication or wagering.
        const code=id.slice(0,6)+'-'+match[1];if(Object.hasOwn(m.market,code))return out('Código ocupado.');
        delete p.inventory[match[1]];m.market[code]={seller:id,item:match[1],price:Number(match[2])};
        return out('Anúncio criado: '+code+'. Use !iris cancelarvenda '+code+' para recuperar o item.',true);
    }
    if(!/^[a-f0-9]{6}-[a-z]+$/.test(arg)||!Object.hasOwn(m.market,arg))return out('Anúncio inexistente.');
    const v=m.market[arg];
    if(name==='cancelarvenda'){
        if(v.seller!==id)return out('Somente o vendedor pode cancelar.');
        p.inventory??={};if(p.inventory[v.item])return out('Já possui esse item; resolva seu inventário antes de cancelar.');
        p.inventory[v.item]=true;delete m.market[arg];return out('Anúncio cancelado.',true);
    }
    if(name==='adquirir'){
        const seller=state.players[v.seller];
        if(!seller||v.seller===id||p.inventory?.[v.item]||p.coins<v.price||seller.coins+v.price>1000000)return out('Compra indisponível, saldo insuficiente ou item já possuído.');
        p.inventory??={};p.inventory[v.item]=true;p.coins-=v.price;seller.coins+=v.price;delete m.market[arg];return out('Item adquirido com moedas virtuais.',true);
    }
    return null;
}
export function scheduleAction(schedule,now=Date.now()){
    if(!schedule)return null;
    const t=new Date(now-3*3600000).toISOString().slice(11,16);
    if(t===schedule.open)return 'not_announcement';
    if(t===schedule.close)return 'announcement';
    return null;
}
