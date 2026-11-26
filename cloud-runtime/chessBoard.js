import sharp from 'sharp';

// Original vector silhouettes. No external assets, network or chess fonts needed.
const art = {
    p:'<circle cx="32" cy="17" r="9"/><path d="M27 26 L37 26 Q36 35 43 43 L47 49 H17 L21 43 Q28 35 27 26Z"/>',
    r:'<path d="M15 10 H23 V19 H28 V10 H36 V19 H41 V10 H49 V26 L43 32 L45 45 L49 49 H15 L19 45 L21 32 L15 26Z"/><path d="M21 31 H43 M19 45 H45" fill="none"/>',
    n:'<path d="M19 49 L23 43 Q24 35 36 27 L27 31 L19 28 L14 32 L10 25 L23 11 L27 4 L34 12 Q51 14 50 34 L48 49Z"/><path d="M27 16 L30 17 M21 23 L17 25 M36 14 Q43 22 43 31" fill="none" stroke-linecap="round"/>',
    b:'<path d="M32 8 Q17 20 22 30 Q24 35 29 36 L23 44 L18 49 H46 L41 44 L35 36 Q42 33 42 26 Q42 18 32 8Z"/><circle cx="32" cy="6" r="3.5"/><path d="M35 13 L28 24 M26 37 H38" fill="none" stroke-linecap="round"/>',
    q:'<path d="M12 15 L22 34 L24 43 L18 49 H46 L40 43 L42 34 L52 15 L40 26 L32 12 L24 26Z"/><circle cx="11" cy="12" r="4"/><circle cx="32" cy="8" r="4"/><circle cx="53" cy="12" r="4"/><path d="M22 34 H42 M24 42 H40" fill="none"/>',
    k:'<path d="M32 4 V20 M25 11 H39" fill="none" stroke-width="4" stroke-linecap="round"/><path d="M32 22 Q19 13 13 25 Q10 33 23 38 L24 43 L18 49 H46 L40 43 L41 38 Q54 33 51 25 Q45 13 32 22Z"/><path d="M23 38 H41 M24 43 H40" fill="none"/>',
};
const CELL=88, M=42, SIZE=788;
const coord=s=>typeof s==='string'&&/^[a-h][1-8]$/.test(s)?{c:s.charCodeAt(0)-97,r:8-Number(s[1])}:null;
export function boardSvg(game,lastMove=null){
    const cells=[],pieces=[],labels=[];
    const highlighted=new Set([lastMove?.from,lastMove?.to].filter(s=>coord(s)));
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const x=M+c*CELL,y=M+r*CELL,square=String.fromCharCode(97+c)+(8-r);
        cells.push('<rect x="'+x+'" y="'+y+'" width="'+CELL+'" height="'+CELL+'" fill="'+((r+c)%2?'#63834e':'#f0e5c6')+'"/>');
        if(highlighted.has(square))cells.push('<rect x="'+(x+2)+'" y="'+(y+2)+'" width="84" height="84" fill="#f8d34e" fill-opacity=".58" stroke="#e9b92f" stroke-width="3"/>');
        const p=game.get(square);
        if(!p)continue;
        const white=p.color==='w';
        pieces.push('<g transform="translate('+(x+7)+' '+(y+5)+') scale(1.15)" fill="'+(white?'#fffaf0':'#202b35')+'" stroke="'+(white?'#23313a':'#101820')+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">'+art[p.type]+'<path d="M17 49 H47 L50 53 V57 H14 V53Z"/>'+(white?'':'<path d="M19 54 H45" stroke="#8293a1" stroke-width="1.2" fill="none"/>')+'</g>');
    }
    for(let i=0;i<8;i++){
        const f=String.fromCharCode(97+i);
        labels.push('<text x="'+(M+i*CELL+CELL/2)+'" y="28">'+f+'</text><text x="'+(M+i*CELL+CELL/2)+'" y="775">'+f+'</text>');
        const y=M+i*CELL+CELL/2+8;
        labels.push('<text x="21" y="'+y+'">'+(8-i)+'</text><text x="767" y="'+y+'">'+(8-i)+'</text>');
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+SIZE+'" height="'+SIZE+'" viewBox="0 0 '+SIZE+' '+SIZE+'"><rect width="'+SIZE+'" height="'+SIZE+'" rx="18" fill="#162b26"/><g font-family="sans-serif" font-size="23" font-weight="bold" text-anchor="middle" fill="#edf3e6">'+labels.join('')+'</g>'+cells.join('')+pieces.join('')+'<rect x="'+M+'" y="'+M+'" width="704" height="704" fill="none" stroke="#253b30" stroke-width="2"/></svg>';
}
export async function renderBoard(game,lastMove=null) {
    return sharp(Buffer.from(boardSvg(game,lastMove))).png().toBuffer();
}
