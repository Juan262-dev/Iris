import sharp from 'sharp';

export const profileCommands=['nomeperfil','perfilfoto','perfilbanner','perfiltema','perfilmoldura','perfiltitulo','perfilpublico','perfilstats','perfilvisual'];
const out=(text,changed=false)=>({text,changed});
const limit=900000;
const clean=v=>Array.from(String(v||'').normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'').replace(/\s+/g,' ').trim()).slice(0,32).join('');
export const displayName=(state,id)=>clean(state.players?.[id]?.card?.name)||clean(state.social3?.names?.[id])||'Jogador '+id.slice(0,6);
export function captureName(state,id,raw){
    const p=state.players[id],name=clean(raw);
    if(!p||!name||p.card?.name)return false;
    p.card??={};p.card.name=name;return true;
}
const themes={
    iris:{bg:'#1a152c',panel:'#302546',accent:'#bda2ff',label:'Íris'},
    oceano:{bg:'#102333',panel:'#214156',accent:'#7edaff',label:'Oceano',level:3},
    floresta:{bg:'#142b24',panel:'#27493d',accent:'#a3e6b1',label:'Floresta',level:5},
    aurora:{bg:'#30223e',panel:'#50365c',accent:'#ffc3ea',label:'Aurora',item:'cristal'},
    dourado:{bg:'#322718',panel:'#4c3b24',accent:'#ffdf90',label:'Dourado',item:'coroa'}
};
const frames={simples:{color:'#f4efff'},estrela:{color:'#ffdc7c',item:'estrela'},medalha:{color:'#a7e3fa',item:'medalha'},trofeu:{color:'#ffc75b',item:'trofeu'},cristal:{color:'#bb9cff',item:'cristal'},coroa:{color:'#ffe49a',item:'coroa'}};
const titles={iniciante:{label:'Iniciante'},aprendiz:{label:'Aprendiz',level:2},explorador:{label:'Explorador',level:5},veterano:{label:'Veterano',level:10},colecionador:{label:'Colecionador',item:'estrela'},campeao:{label:'Campeão',wins:3}};
const level=p=>1+Math.floor((p.xp||0)/10);
const n=v=>Number.isSafeInteger(v)&&v>=0?v:0;
const gameLabels={uno:'UNO',xadrez:'Xadrez',velhadupla:'Velha em dupla',velha:'Jogo da velha',naval:'Batalha naval',damas:'Damas',memoria:'Memória',detetive:'Detetive',stop:'Stop',coop:'Cooperativo',rpg:'RPG',aventura:'Aventura',forca:'Forca',numero:'Número',ppt:'Pedra/papel/tesoura',quiz:'Quiz',encoded:'Palavra codificada',inverse:'Palavra invertida',campeonato:'Campeonato'};
export function recordGame(state,game,id,result='w',points=0){
    if(!Object.hasOwn(gameLabels,game)||['uno','xadrez'].includes(game)||!['w','l','d','c'].includes(result))return false;
    const p=state.players?.[id];if(!p)return false;
    p.cardStats??={};const st=p.cardStats[game]??={w:0,l:0,d:0,c:0,points:0};
    st[result]=Math.min(1000000,n(st[result])+1);
    st.points=Math.min(1000000,n(st.points)+n(points));return true;
}
export function gameStats(state,id){
    const p=state.players[id],r={};
    for(const [game,s] of Object.entries(p?.cardStats||{}))if(Object.hasOwn(gameLabels,game))r[game]={w:n(s.w),l:n(s.l),d:n(s.d),c:n(s.c),points:n(s.points)};
    const u=state.megaGames?.unoStats?.[id],c=state.chess?.stats?.[id];
    if(u)r.uno={w:n(u.wins),l:n(u.losses),d:0,c:0,points:0};
    if(c)r.xadrez={w:n(c.w),l:n(c.l),d:n(c.d),c:0,points:0};
    return r;
}
const total=(stats,k)=>Object.values(stats).reduce((a,s)=>a+n(s[k]),0);
const unlocked=(p,stats,entry)=>!!entry&&(!entry.level||level(p)>=entry.level)&&(!entry.item||p.inventory?.[entry.item]===true)&&(!entry.wins||total(stats,'w')>=entry.wins);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function safeAsset(v,max){
    if(typeof v!=='string'||v.length>max||!/^[A-Za-z0-9+/]+={0,2}$/.test(v))return null;
    const b=Buffer.from(v,'base64');
    return b[0]===255&&b[1]===216&&b[2]===255?v:null;
}
export async function profileAsset(input,kind){
    if(!Buffer.isBuffer(input)||input.length>5*1024*1024||!['photo','banner'].includes(kind))throw Error('input');
    const s=sharp(input,{limitInputPixels:12000000}),meta=await s.metadata();
    if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error('format');
    const [w,h,max]=kind==='photo'?[128,128,14000]:[640,160,26000];
    for(const quality of [68,48,30,18]){
        const b=await sharp(input,{limitInputPixels:12000000}).rotate().resize(w,h,{fit:'cover'}).flatten({background:'#302546'}).jpeg({quality}).toBuffer();
        if(b.toString('base64').length<=max)return b.toString('base64');
    }
    throw Error('image size');
}
export async function ownProfileImage(msg,b,kind){
    // Only direct, explicitly submitted image: never read WhatsApp contact photos or another member's quoted media.
    const media=msg?.message?.imageMessage;
    if(!media||media.viewOnce||media.contextInfo?.expiration||!['image/jpeg','image/png','image/webp'].includes(media.mimetype)||Number(media.fileLength||0)>5*1024*1024)throw Error('image required');
    if(media.url){const u=new URL(media.url);if(u.protocol!=='https:'||u.username||u.password||u.port||!(u.hostname==='whatsapp.net'||u.hostname.endsWith('.whatsapp.net')))throw Error('url');}
    const stream=await b.downloadContentFromMessage(media,'image'),chunks=[];let size=0;
    for await(const chunk of stream){size+=chunk.length;if(size>5*1024*1024){stream.destroy?.();throw Error('size');}chunks.push(chunk);}
    return profileAsset(Buffer.concat(chunks),kind);
}
export async function renderProfile(state,id){
    const p=state.players[id],card=p.card||{},stats=gameStats(state,id),name=displayName(state,id);
    const t=Object.hasOwn(themes,card.theme)&&unlocked(p,stats,themes[card.theme])?themes[card.theme]:themes.iris;
    const frame=Object.hasOwn(frames,card.frame)&&unlocked(p,stats,frames[card.frame])?frames[card.frame]:frames.simples;
    const title=Object.hasOwn(titles,card.title)&&unlocked(p,stats,titles[card.title])?titles[card.title].label:'Iniciante';
    const photo=safeAsset(card.photo,14000),banner=safeAsset(card.banner,26000);
    const alias=clean(state.social3?.names?.[id]);
    const team=Object.entries(state.social3?.teams||{}).find(([,v])=>v.ids?.includes(id))?.[0]||'Nenhuma';
    const format=v=>n(v).toLocaleString('pt-BR');
    const line=(x,y,txt,size=20,color='#f6f1ff',weight='normal')=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-size="'+size+'" font-weight="'+weight+'">'+esc(txt)+'</text>';
    const box=(x,y,w,h)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="'+t.panel+'"/>';
    const img=(src,x,y,w,h,clip)=>'<image href="data:image/jpeg;base64,'+src+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice"'+(clip?' clip-path="url(#avatar)"':'')+'/>';
    const rows=[['CARTEIRA',format(p.coins)],['BANCO',format(p.bank)],['PROFISSÃO',p.role||'Nenhuma'],['EMPRESA',p.company?p.company+' • Nv. '+(p.companyLevel||1):'Nenhuma'],['PROPRIEDADE',p.property?p.property+' • Nv. '+(p.propertyLevel||1):'Nenhuma'],['EQUIPE',team]];
    const achievements=['Primeiro perfil',...(p.xp>=10?['Aprendiz']:[]),...(p.xp>=50?['Explorador']:[]),...(Object.keys(p.inventory||{}).length?['Colecionador']:[]),...(total(stats,'w')>=3?['Campeão']:[])];
    const body=['<defs><clipPath id="avatar"><circle cx="92" cy="152" r="56"/></clipPath><linearGradient id="banner"><stop stop-color="'+t.panel+'"/><stop offset="1" stop-color="'+t.accent+'"/></linearGradient></defs>','<rect width="720" height="760" rx="22" fill="'+t.bg+'"/>','<rect x="18" y="18" width="684" height="126" rx="14" fill="url(#banner)"/>',banner?img(banner,18,18,684,126,false):'', '<circle cx="92" cy="152" r="61" fill="'+frame.color+'"/>','<circle cx="92" cy="152" r="56" fill="'+t.panel+'"/>',photo?img(photo,36,96,112,112,true):line(68,167,Array.from(name)[0]||'J',42,t.accent,'bold'),line(166,182,name,name.length>24?23:30,'#ffffff','bold'),line(166,210,(alias&&alias!==name?'@'+alias+' • ':'')+title,17,t.accent),line(166,236,'Código '+id.slice(0,6)+'  |  Nível '+level(p),16),'<rect x="24" y="258" width="672" height="10" rx="5" fill="'+t.panel+'"/>','<rect x="24" y="258" width="'+(672*(n(p.xp)%10)/10)+'" height="10" rx="5" fill="'+t.accent+'"/>',line(24,293,format(p.xp)+' XP • '+(10-(n(p.xp)%10))+' XP para o próximo nível',16,t.accent)];
    rows.forEach(([k,v],i)=>{const x=24+i%2*342,y=308+Math.floor(i/2)*76;body.push(box(x,y,330,65),line(x+14,y+20,k,13,t.accent),line(x+14,y+48,clean(v),21,'#fff','bold'));});
    body.push(box(24,540,672,95),line(40,562,'ESTATÍSTICAS DE JOGOS',13,t.accent),line(40,595,'Vitórias '+total(stats,'w')+'  |  Derrotas '+total(stats,'l')+'  |  Empates '+total(stats,'d'),19),line(40,620,'Atividades concluídas '+total(stats,'c')+'  •  Itens '+Object.keys(p.inventory||{}).length,17));
    body.push(line(24,666,'CONQUISTAS',13,t.accent),line(24,695,achievements.slice(0,3).join('  •  '),18),line(24,720,achievements.slice(3).join('  •  '),18),line(24,746,'ÍRIS CLOUD  •  Perfil virtual • '+(card.public===true?'Compartilhável':'Somente sob comando do titular'),12,t.accent));
    const image=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="760"><g font-family="sans-serif">'+body.join('')+'</g></svg>')).png().toBuffer();
    return {image,caption:'🌸 Perfil de '+name+' • código '+id.slice(0,6)+'\n:perfilstats — estatísticas por jogo. Moedas exclusivamente virtuais.'};
}
export async function profileFeature({name,arg='',state,id,rawName,loadAsset}){
    const p=state.players[id];if(!p)return out('Use :perfil para criar seu perfil virtual.');
    const card=p.card??={},stats=gameStats(state,id);
    if(name==='perfilvisual'||name==='perfilstats'){
        let target=id;
        if(arg){
            if(!/^[a-f0-9]{6}$/i.test(arg))return out('Use :'+name+' ou :'+name+' código (somente perfis compartilhados).');
            const matches=Object.keys(state.players).filter(k=>k.startsWith(arg.toLowerCase()));
            if(matches.length!==1||(matches[0]!==id&&state.players[matches[0]].card?.public!==true))return out('Perfil não encontrado ou não autorizado para consulta.');
            target=matches[0];
        }
        if(name==='perfilstats'){
            const data=gameStats(state,target);
            return out('🎮 Estatísticas de '+displayName(state,target)+'\n'+(Object.entries(data).map(([k,v])=>gameLabels[k]+': '+v.w+' V / '+v.l+' D / '+v.d+' E / '+v.c+' concluídas'+(v.points?' • '+v.points+' pts':'')).join('\n')||'Sem resultados registrados.')+'\nUNO e xadrez incluem o histórico disponível; demais jogos contam a partir desta atualização.');
        }
        const changed=target===id&&captureName(state,id,rawName);
        return out(await renderProfile(state,target),changed);
    }
    if(name==='nomeperfil'){
        if(!arg)return out('Nome exibido: '+displayName(state,id)+'. Use :nomeperfil nome ou :nomeperfil whatsapp.');
        const value=clean(arg==='whatsapp'?rawName:arg);
        if(!value||!/\p{L}/u.test(value))return out('Nome indisponível. Use :nomeperfil seu nome (até 32 caracteres).');
        card.name=value;return out('Nome atualizado: '+value,true);
    }
    if(name==='perfilpublico'){
        if(!['on','off'].includes(arg))return out('Consulta por outros: '+(card.public===true?'ativada':'desativada')+'. :perfilpublico on permite que membros deste grupo consultem nome, imagem e estatísticas usando seu código. off revoga a permissão.');
        card.public=arg==='on';return out(card.public?'Consulta por outros autorizada neste grupo.':'Consulta por outros desativada.',true);
    }
    if(name==='perfilfoto'||name==='perfilbanner'){
        const key=name==='perfilfoto'?'photo':'banner';
        if(arg==='apagar'){delete card[key];return out('Imagem removida.',true);}
        if(arg)return out('Envie sua própria imagem autorizada com :'+name+' na legenda ou :'+name+' apagar.');
        let asset;try{asset=await loadAsset(key);}catch{return out('Envie sua própria imagem JPEG, PNG ou WebP (até 5 MB) com :'+name+' na legenda. Não use foto de outra pessoa sem autorização.');}
        if(!safeAsset(asset,key==='photo'?14000:26000))return out('Imagem inválida.');
        const used=Object.values(state.players).reduce((sum,v)=>sum+(v.card?.photo?.length||0)+(v.card?.banner?.length||0),0)-(card[key]?.length||0);
        if(used+asset.length>limit)return out('Limite de imagens do grupo atingido. Remova uma imagem antiga.');
        card[key]=asset;return out('Imagem personalizada salva. Use :perfilvisual.',true);
    }
    const config=name==='perfiltema'?[themes,'theme']:name==='perfilmoldura'?[frames,'frame']:name==='perfiltitulo'?[titles,'title']:null;
    if(!config)return out(null);
    const [options,key]=config;
    if(!arg)return out('Opções:\n'+Object.entries(options).map(([k,v])=>k+' — '+(unlocked(p,stats,v)?'disponível':v.level?'nível '+v.level:v.item?'item '+v.item:v.wins?v.wins+' vitórias':'bloqueado')).join('\n'));
    if(!Object.hasOwn(options,arg)||!unlocked(p,stats,options[arg]))return out('Opção indisponível. Use :'+name+' para consultar requisitos.');
    card[key]=arg;return out('Personalização equipada: '+arg+'.',true);
}
