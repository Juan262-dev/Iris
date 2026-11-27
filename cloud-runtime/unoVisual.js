import sharp from 'sharp';
export const validUnoRoute=v=>typeof v==='string'&&/^[0-9]{5,20}@(s\.whatsapp\.net|lid)$/.test(v);
export function unoRoute(raw){
    if(typeof raw!=='string')return null;
    const v=raw.replace(/:\d+(?=@)/,'');
    return validUnoRoute(v)?v:null;
}
const colors={v:'#d13c49',a:'#e9ad18',g:'#218c58',b:'#3079d0'};
const names={v:'Vermelho',a:'Amarelo',g:'Verde',b:'Azul'};
const labels={s:'PULAR',r:'INVERTER',d:'+2'};
const label=id=>'Jogador '+id.slice(0,6);
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function card(c,x,y,w=106,h=146){
    if(!/^(?:[vagb][0-9srd]|c)$/.test(c))throw Error('invalid card');
    const color=colors[c[0]]||'#23213b',symbol=c==='c'?'★':({s:'⊘',r:'↔',d:'+2'}[c[1]]||c[1]);
    const ink=c[0]==='a'?'#5a3d00':color;
    return '<g transform="translate('+x+' '+y+')"><rect width="'+w+'" height="'+h+'" rx="12" fill="'+color+'" stroke="#ffffff" stroke-width="2"/><ellipse cx="'+w/2+'" cy="'+h/2+'" rx="'+w*.36+'" ry="'+h*.34+'" fill="#fff" transform="rotate(24 '+w/2+' '+h/2+')"/><text x="'+w/2+'" y="'+(h/2+14)+'" text-anchor="middle" font-size="38" font-weight="bold" fill="'+ink+'">'+esc(symbol)+'</text><text x="8" y="21" font-size="16" fill="#fff" font-weight="bold">'+esc(c.toUpperCase())+'</text><text x="'+(w-8)+'" y="'+(h-8)+'" text-anchor="end" font-size="13" fill="#fff">'+esc(c==='c'?'CORINGA':labels[c[1]]||names[c[0]].toUpperCase())+'</text></g>';
}
const svg=(w,h,body)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="'+w+'" height="'+h+'" rx="20" fill="#19152d"/><g font-family="sans-serif">'+body+'</g></svg>');
const text=(x,y,t,size=19,fill='#f4efff')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+fill+'">'+esc(t)+'</text>';
export function publicUnoSvg(g){
    const top=g.discard.at(-1),body=[text(24,39,'UNO • MESA',25),card(top,28,63,106,146),text(155,90,'Cor atual: '+names[g.color],20),text(155,125,'Vez: '+label(g.ids[g.turn]),20),text(155,159,'Sentido: '+(g.dir===1?'normal':'invertido'),16)];
    g.ids.forEach((id,i)=>{const y=233+i*43;body.push('<rect x="24" y="'+y+'" width="552" height="36" rx="8" fill="'+(g.ids[g.turn]===id?'#4b3c77':'#2b2545')+'"/>',text(38,y+24,label(id)+' — '+g.hands[id].length+' carta(s)',18));});
    return svg(600,260+g.ids.length*43,body.join(''));
}
export function privateUnoSvg(cards,page=0){
    const part=cards.slice(page*24,(page+1)*24);
    const body=[text(20,35,'UNO • SUA MÃO',24),text(20,60,'Cartas: '+cards.length+' | Página '+(page+1)+'/'+Math.max(1,Math.ceil(cards.length/24)),16)];
    part.forEach((c,i)=>body.push(card(c,20+(i%4)*120,78+Math.floor(i/4)*162)));
    return svg(500,100+Math.max(1,Math.ceil(part.length/4))*162,body.join(''));
}
export async function unoPublic(g,caption){
    return {image:await sharp(publicUnoSvg(g)).png().toBuffer(),caption};
}
export async function unoPrivate(g,id){
    const route=g.routes?.[id];
    if(!validUnoRoute(route)||!g.ids.includes(id)||!Array.isArray(g.hands[id]))return [];
    const cards=g.hands[id],out=[];
    for(let page=0;page<Math.max(1,Math.ceil(cards.length/24));page++){
        const image=await sharp(privateUnoSvg(cards,page)).png().toBuffer();
        const codes=cards.slice(page*24,(page+1)*24).join(', ');
        out.push({to:route,content:{image,caption:'🃏 Sua mão de UNO — '+label(id)+'\n'+codes+'\nJogue no grupo: carta v5, carta c azul ou comprar carta. Página '+(page+1)+'/'+Math.max(1,Math.ceil(cards.length/24))}});
    }
    return out;
}
export function unoRecipients(g,ids){
    return [...new Set(ids)].filter(id=>g.ids.includes(id)&&validUnoRoute(g.routes?.[id]));
}
export async function dispatchUno({payload,send,allowed,active}){
    if(!payload||!Array.isArray(payload.private)||!active())return 0;
    let failed=0;
    // Never send a private hand to the group or use a public fallback.
    for(const item of payload.private){
        if(!active())break;
        if(!validUnoRoute(item.to)||!allowed.has(item.to)){failed++;continue;}
        try{await send(item.to,item.content);}catch{failed++;}
    }
    return failed;
}
