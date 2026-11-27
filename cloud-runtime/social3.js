import sharp from 'sharp';
import { shop } from './localFun.js';
import { collectionImage } from './megaCommunity.js';
export const social3=['apelido','ajuda','perfilvisual','evoluir','troca','equipe','aniversario','eventoespecial'];
const out=(text,changed=false)=>({text,changed});
const label=id=>'Jogador '+id.slice(0,6);
const clean=s=>String(s).trim();
const help={
uno:'UNO: :uno novo, :uno entrar, :uno pv, :uno iniciar, :uno mao, :uno mesa. Envie carta g7 ou verde 7. A mão é privada.',
damas:'Damas: :damas desafio, :damas aceitar, dama b3 a4. Captura obrigatória; variante de alcance curto.',
memoria:'Memória: :memoria novo, :memoria entrar, par 2 7.',
stop:'Stop: :stop novo, :stop entrar, :stop resposta animal | fruta | cor.',
midia:'Responda a mídia autorizada: :s, :borda #ffffff, :pdf, :textanim frase, :montagem, :autor nome. Limites de tamanho.',
economia:'Economia fictícia: :perfil, :banco, :empresa, :evoluir empresa, :troca propor código item item, :equipe criar nome.',
privacidade:'O bot atua em grupos autorizados. Apelidos e aniversário são voluntários. :apelido apagar e :aniversario apagar removem os registros. :sair apaga seu perfil econômico.'
};
function find(state,code){const ids=Object.keys(state.players).filter(k=>k.startsWith(code));return ids.length===1?ids[0]:null;}
export async function socialFeature({name,arg='',state,id,now=Date.now()}){
    if(!social3.includes(name))return null;
    const x=state.social3??={},p=state.players[id];
    if(name==='ajuda')return out((Object.hasOwn(help,arg)?help[arg]:null)||'🌸 Ajuda Íris 3.0\n:ajuda uno | damas | memoria | stop | midia | economia | privacidade\n:menu para todas as categorias.');
    if(name==='apelido'){
        x.names??={};
        if(arg==='apagar'){delete x.names[id];return out('Apelido removido.',true);}
        if(!arg)return out('Seu apelido: '+(x.names[id]||label(id))+'. :apelido nome (até 20 caracteres).');
        if(!/^[\p{L}\p{N} _-]{1,20}$/u.test(arg))return out('Use letras, números, espaços, _ ou - (até 20).');
        if(!Object.hasOwn(x.names,id)&&Object.keys(x.names).length>=200)return out('Limite de apelidos.');
        x.names[id]=arg;return out('Apelido salvo: '+arg,true);
    }
    if(name==='aniversario'){
        x.birthdays??={};
        if(arg==='apagar'){delete x.birthdays[id];return out('Data removida.',true);}
        if(arg==='hoje'){
            const d=new Date(now-3*3600000).toISOString().slice(5,10);
            return out('🎂 Aniversários voluntários de hoje: '+(Object.entries(x.birthdays).filter(([,v])=>v===d).map(([k])=>x.names?.[k]||label(k)).join(', ')||'nenhum.'));
        }
        const m=/^(\d{2})\/(\d{2})$/.exec(arg);
        if(!m)return out('Cadastro voluntário: :aniversario DD/MM (sem ano). :aniversario hoje ou apagar.');
        const d=new Date(Date.UTC(2000,Number(m[2])-1,Number(m[1])));
        if(d.getUTCDate()!==Number(m[1])||d.getUTCMonth()+1!==Number(m[2]))return out('Data inválida.');
        if(!Object.hasOwn(x.birthdays,id)&&Object.keys(x.birthdays).length>=200)return out('Limite atingido.');
        x.birthdays[id]=m[2]+'-'+m[1];return out('Dia e mês registrados. Nenhum ano salvo.',true);
    }
    if(!p)return out('Use :perfil para criar um perfil virtual.');
    if(name==='perfilvisual'){
        return out({image:await collectionImage([['Moedas',String(p.coins)],['XP',String(p.xp)],['Nível',String(1+Math.floor(p.xp/10))],['Colecionáveis',String(Object.keys(p.inventory||{}).length)],['Empresa',p.company||'nenhuma'],['Propriedade',p.property||'nenhuma']],(x.names?.[id]||label(id))+' • PERFIL'),caption:'Seu perfil virtual.'});
    }
    if(name==='evoluir'){
        if(!['empresa','propriedade'].includes(arg))return out('Use :evoluir empresa ou propriedade.');
        const asset=arg==='empresa'?'company':'property',levelKey=asset+'Level';
        if(!p[asset])return out('Adquira um '+arg+' primeiro.');
        const level=p[levelKey]||1;if(level>=(asset==='company'?10:5))return out('Nível máximo.');
        const price=level*50;if(p.coins<price)return out('Custo: '+price+' moedas virtuais. Saldo insuficiente.');
        p.coins-=price;p[levelKey]=level+1;return out(arg+' nível '+p[levelKey]+'.',true);
    }
    if(name==='eventoespecial'){
        const day=new Date(now).toISOString().slice(0,10);
        if(arg!=='participar')return out('🌟 Evento de exploração: :eventoespecial participar. Recompensa fixa: 10 moedas e 2 XP.');
        if(p.specialDay===day)return out('Participação já registrada hoje.');
        p.specialDay=day;p.coins=Math.min(1000000,p.coins+10);p.xp+=2;return out('Participação registrada.',true);
    }
    if(name==='equipe'){
        x.teams??={};
        const membership=Object.keys(x.teams).find(k=>x.teams[k].ids.includes(id));
        if(arg==='sair'&&membership){
            const t=x.teams[membership];t.ids=t.ids.filter(k=>k!==id);if(!t.ids.length)delete x.teams[membership];return out('Você saiu da equipe.',true);
        }
        const m=/^(criar|entrar) ([a-z0-9_-]{2,16})$/.exec(arg);
        if(m){
            if(membership)return out('Saia da equipe atual primeiro.');
            if(m[1]==='criar'){
                if(Object.hasOwn(x.teams,m[2])||['__proto__','constructor','prototype'].includes(m[2])||Object.keys(x.teams).length>=20)return out('Nome indisponível.');
                x.teams[m[2]]={ids:[id]};return out('Equipe '+m[2]+' criada.',true);
            }
            const t=Object.hasOwn(x.teams,m[2])?x.teams[m[2]]:null;if(!t||t.ids.length>=6)return out('Equipe indisponível.');
            t.ids.push(id);return out('Você entrou na equipe '+m[2]+'.',true);
        }
        return out('Equipes: '+(Object.entries(x.teams).map(([k,t])=>k+' ('+t.ids.length+'/6)').join(', ')||'nenhuma')+'\n: equipe criar nome / entrar nome / sair'.replace(': equipe',':equipe'));
    }
    x.trades??={};
    for(const [k,t] of Object.entries(x.trades))if(t.expires<now)delete x.trades[k];
    if(arg==='listar'||!arg)return out('Trocas pendentes suas:\n'+(Object.entries(x.trades).filter(([,t])=>[t.from,t.to].includes(id)).map(([k,t])=>k+' — '+t.give+' por '+t.want).join('\n')||'nenhuma')+'\n:troca propor codigo item item | aceitar codigo | cancelar codigo');
    const m=/^propor ([a-f0-9]{6}) ([a-z]+) ([a-z]+)$/.exec(arg);
    if(m){
        const to=find(state,m[1]),[give,want]=m.slice(2);
        if(!to||to===id||give===want||!Object.hasOwn(shop,give)||!Object.hasOwn(shop,want)||!p.inventory?.[give]||p.inventory?.[want]||!state.players[to].inventory?.[want]||state.players[to].inventory?.[give])return out('Troca inválida. Ambos devem possuir os itens oferecidos.');
        if(Object.keys(x.trades).length>=30||Object.values(x.trades).some(t=>t.from===id))return out('Já há proposta sua ou limite atingido.');
        const code=id.slice(0,6)+'-'+to.slice(0,6);if(Object.hasOwn(x.trades,code))return out('Código ocupado.');
        x.trades[code]={from:id,to,give,want,expires:now+600000};return out('Proposta '+code+' para '+label(to)+'. O destinatário usa :troca aceitar '+code+'.',true);
    }
    const a=/^(aceitar|cancelar) ([a-f0-9]{6}-[a-f0-9]{6})$/.exec(arg);
    if(!a||!Object.hasOwn(x.trades,a[2]))return out('Proposta inexistente.');
    const t=x.trades[a[2]];
    if(a[1]==='cancelar'&&[t.from,t.to].includes(id)){delete x.trades[a[2]];return out('Proposta cancelada.',true);}
    if(a[1]!=='aceitar'||t.to!==id)return out('Somente o destinatário pode aceitar.');
    const seller=state.players[t.from];
    if(!seller?.inventory?.[t.give]||seller.inventory[t.want]||!p.inventory?.[t.want]||p.inventory[t.give])return out('Itens indisponíveis. Cancele a proposta.');
    delete seller.inventory[t.give];delete p.inventory[t.want];seller.inventory[t.want]=true;p.inventory[t.give]=true;delete x.trades[a[2]];
    return out('Troca concluída com a confirmação de ambos.',true);
}
export function removeSocial(state,id){
    const x=state.social3;if(!x)return;
    if(x.names)delete x.names[id];if(x.birthdays)delete x.birthdays[id];
    for(const [k,t] of Object.entries(x.trades||{}))if([t.from,t.to].includes(id))delete x.trades[k];
    for(const [k,t] of Object.entries(x.teams||{})){t.ids=t.ids.filter(v=>v!==id);if(!t.ids.length)delete x.teams[k];}
}
