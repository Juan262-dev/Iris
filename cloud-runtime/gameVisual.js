import sharp from 'sharp';
const W=720;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(x,y,w,h,fill,r=12,stroke='none',sw=1)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const txt=(x,y,v,size=23,fill='#f6f3ff',anchor='start',weight=400)=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+fill+'" text-anchor="'+anchor+'" font-weight="'+weight+'">'+esc(v)+'</text>';
const circle=(x,y,r,fill,stroke='none',sw=1)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
function svg(h,body){return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+h+'"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#19152e"/><stop offset="1" stop-color="#272344"/></linearGradient></defs>'+rect(0,0,W,h,'url(#bg)',0)+'<g font-family="sans-serif">'+body+'</g></svg>');}
const header=(title,sub,accent)=>rect(24,24,672,8,accent,4)+txt(30,66,'ÍRIS GAME CENTER',17,'#c5b9e4','start',700)+txt(30,112,title,36,'#fff','start',700)+txt(30,145,sub,20,'#d2cce6');
const footer=(y,line)=>rect(24,y,672,58,'#33294e',12)+txt(360,y+36,line,19,'#eee5ff','middle',600);
const png=async(h,b,caption)=>({image:await sharp(svg(h,b)).png().toBuffer(),caption});
const pips=[[],[[1,1]],[[0,0],[2,2]],[[0,0],[1,1],[2,2]],[[0,0],[2,0],[0,2],[2,2]],[[0,0],[2,0],[1,1],[0,2],[2,2]],[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]];
function tile(x,y,t,highlight=false){
 let b=rect(x,y,94,48,'#fff7df',7,highlight?'#89e2a8':'#b8af9d',highlight?4:1);
 b+='<path d="M'+(x+47)+' '+(y+5)+'v38" stroke="#9d947f" stroke-width="1.5"/>';
 t.forEach((v,i)=>{for(const [a,c] of pips[v]||[])b+=circle(x+9+i*47+a*14,y+9+c*15,3.5,'#24212b');});return b;
}
const key=t=>[...t].sort((a,b)=>a-b).join('-');
export async function dominoHand(g,id,slots,caption){
 const hand=g.hands[id],l=g.chain[0][0],r=g.chain.at(-1)[1],rows=Math.max(1,Math.ceil(hand.length/5));
 let b=header('DOMINÓ • SUA MÃO',g.ids[g.turn]===id?'Sua vez de jogar':'Aguarde sua vez','#89e2a8');
 hand.forEach((t,i)=>{const x=35+i%5*132,y=178+Math.floor(i/5)*112,side=[t.includes(l)?'E':'',t.includes(r)?'D':''].filter(Boolean).join('/');
 b+=rect(x-7,y-9,116,100,side?'#285b48':'#362d50',10)+tile(x+3,y,t,!!side)+txt(x+50,y+72,'#'+slots[key(t)]+(side?' · '+side:''),20,'#fff','middle',700);});
 b+=footer(190+rows*112,':domino 2  •  2 e  •  2 d  •  c  •  p');
 return png(266+rows*112,b,caption);
}
export async function dominoTable(g,caption){
 const rows=Math.max(1,Math.ceil(g.chain.length/6));let b=header('DOMINÓ • MESA','Vez: Jogador '+(g.turn+1)+'  |  Monte: '+g.deck.length,'#89e2a8');
 b+=rect(24,164,672,rows*70+24,'#1d493e',16);
 g.chain.forEach((t,i)=>{const x=42+i%6*108,y=178+Math.floor(i/6)*70;b+=tile(x,y,t,i===0||i===g.chain.length-1);});
 let y=206+rows*70;b+=txt(36,y,'Ponta E: '+g.chain[0][0]+'     •     Ponta D: '+g.chain.at(-1)[1],24,'#b6efcc','start',700);y+=20;
 g.ids.forEach((id,i)=>{b+=rect(28,y,664,43,i===g.turn?'#315a4b':'#332c4a',8)+txt(44,y+29,'Jogador '+(i+1)+(i===g.turn?'  •  VEZ':''),21)+txt(674,y+29,g.hands[id].length+' peças',21,'#e5dafa','end');y+=50;});
 b+=footer(y+8,':domino m  •  :domino mao  •  :domino 2 e');return png(y+84,b,caption);
}
const memoryColors=['#dd856f','#e4b75f','#75c5a7','#7fafe1','#b99ae6','#e88db7'];
function symbol(x,y,v){const i='ABCDEF'.indexOf(v),c=memoryColors[i]||'#fff';
 if(i===0)return circle(x,y,23,c);
 if(i===1)return '<path d="M'+x+' '+(y-27)+'l27 27 -27 27 -27 -27Z" fill="'+c+'"/>';
 if(i===2)return rect(x-24,y-24,48,48,c,8);
 if(i===3)return '<path d="M'+x+' '+(y-28)+'l29 52h-58Z" fill="'+c+'"/>';
 if(i===4)return '<path d="M'+x+' '+(y-30)+'l9 20 22 1 -17 14 5 22 -19 -12 -19 12 5 -22 -17 -14 22 -1Z" fill="'+c+'"/>';
 return circle(x,y,25,c)+circle(x,y,13,'#332d4d');
}
export async function memoryBoard(g,reveal=[],caption=''){
 let b=header('MEMÓRIA','Pares '+g.found.length/2+'/6  •  Tentativas '+g.tries+'  •  '+g.ids.length+' jogador(es)','#e4b75f');
 for(let i=0;i<12;i++){const x=36+i%4*164,y=174+Math.floor(i/4)*145,found=g.found.includes(i),shown=found||reveal.includes(i);
 b+=rect(x,y,152,131,found?'#2e6656':shown?'#413557':'#393152',14,found?'#89e2a8':'#66577c',2);
 b+=shown?symbol(x+76,y+58,g.cards[i]):txt(x+76,y+76,'?',54,'#b9a9e4','middle',700);
 b+=txt(x+76,y+116,'#'+(i+1),19,'#f4e8ff','middle',700);}
 b+=footer(626,':memoria 3 7  •  :memoria mesa');return png(708,b,caption);
}
const lc=['#e37577','#ebc45c','#65c398','#6ba6e7'],ln=['Vermelho','Amarelo','Verde','Azul'];
export async function ludoVisual(g,caption){
 let b=header('LUDO','Vez: '+ln[g.turn]+'  •  '+(g.roll?'Dado: '+g.roll:'Lance o dado'),'#b9a2ef');
 const pts=[];for(let i=0;i<40;i++){const a=i*Math.PI/20-Math.PI/2;pts.push([360+252*Math.cos(a),438+252*Math.sin(a)]);}
 b+=circle(360,438,282,'#2d2545');
 pts.forEach(([x,y],i)=>{b+=circle(x,y,17,i%10===0?lc[i/10]:'#4c4168','#8b7aab',1)+txt(x,y+5,i+1,11,'#fff','middle');});
 g.ids.forEach((id,i)=>{const bx=203+i%2*165,by=306+Math.floor(i/2)*150;b+=rect(bx,by,148,133,'#382f50',12,lc[i],i===g.turn?4:2)+txt(bx+74,by+24,ln[i],17,lc[i],'middle',700)+txt(bx+74,by+120,'BASE / CHEGADA',12,'#d4cae6','middle');
 g.pieces[id].forEach((p,j)=>{let x,y;if(p<0||p>=40){x=bx+45+j*56;y=by+(p<0?53:87);}else{[x,y]=pts[(p+i*10)%40];x+=(j-.5)*10;y+=(i%2-.5)*8;}b+=circle(x,y,15,lc[i],'#fff',2)+txt(x,y+5,j+1,15,'#24213a','middle',700);});});
 let y=738;g.ids.forEach((id,i)=>{const moves=g.roll&&i===g.turn?g.pieces[id].map((p,j)=>(p<0?g.roll===6:p<40&&p+g.roll<=40)?j+1:null).filter(Boolean):[];
 b+=rect(30,y,660,36,i===g.turn?'#4f406b':'#332b4b',8)+txt(44,y+25,ln[i]+' • '+g.pieces[id].filter(p=>p===40).length+'/2 na chegada'+(moves.length?' • Pode mover '+moves.join(', '):''),19,lc[i]);y+=43;});
 b+=footer(y+6,':ludo d  •  :ludo 1  •  :ludo 2  •  :ludo m');return png(y+84,b,caption);
}
function wrap(s,n=48){const rows=[];for(const line of String(s).split('\n')){let cur='';for(let word of line.trim().split(/\s+/)){if(cur&&cur.length+word.length+1>n){rows.push(cur);cur='';}while(word.length>n){if(cur){rows.push(cur);cur='';}rows.push(word.slice(0,n));word=word.slice(n);}cur+=(cur?' ':'')+word;}rows.push(cur);}return rows;}
export async function stopForm(info,caption){
 let b=header('STOP • ADEDONHA','Rodada '+info.round+'  •  Respostas privadas','#f1bc70');
 b+=rect(30,168,660,100,'#594066',16)+txt(60,206,'LETRA DA RODADA',21,'#e8d9f4','start',700)+txt(650,240,info.letter.toUpperCase(),72,'#fff2c9','end',700);
 let y=286;info.categories.forEach((c,i)=>{b+=rect(30,y,660,54,'#342b4e',8)+txt(48,y+35,(i+1)+'. '+c,24)+txt(670,y+35,'____________',20,'#a99bc6','end');y+=63;});
 b+=footer(y+6,'Responda a esta foto • Uma palavra por linha');return png(y+84,b,caption);
}
export async function gameNotice(title,caption){
 const rows=wrap(caption.replace(/\*/g,''),48).slice(0,34);let b=header(title,'Painel da partida','#f1bc70');
 rows.forEach((r,i)=>{if(r)b+=txt(35,183+i*30,r,22,'#e9e2f5');});
 const y=196+rows.length*30;b+=footer(y,'Confira os comandos na legenda');return png(y+76,b,caption);
}

export async function sudokuVisual(g,caption,{focus=-1,hint=null}={}){
 const count=g.b.filter(Boolean).length,step=64,ox=76,oy=204;
 let b=header('SUDOKU',g.level.toUpperCase()+'  •  '+count+'/81 casas preenchidas','#8fd9ce');
 for(let i=0;i<9;i++){b+=txt(ox+i*step+32,190,i+1,20,'#c9bee6','middle',700)+txt(55,oy+i*step+40,i+1,20,'#c9bee6','middle',700);}
 for(let i=0;i<81;i++){const x=ox+i%9*step,y=oy+Math.floor(i/9)*step,fixed=!!g.initial[i],v=g.b[i],bg=i===focus?'#536b65':fixed?'#494066':'#292440';
 b+=rect(x+2,y+2,60,60,bg,5,i===focus?'#a4f1d5':'none',3);
 if(v)b+=txt(x+32,y+44,v,32,fixed?'#fff1ff':'#93e4cc','middle',fixed?700:500);}
 for(let i=0;i<=9;i+=3){b+='<path d="M'+(ox+i*step)+' '+oy+'v576 M'+ox+' '+(oy+i*step)+'h576" stroke="#b9a5e0" stroke-width="3" fill="none"/>';}
 b+=txt(76,815,'Branco: fixo    Verde: sua jogada',20,'#c5b9e4');
 if(hint)b+=txt(76,847,'Candidatos: '+hint,20,'#a4f1d5');
 const y=hint?867:840;b+=footer(y,':sudoku 1 2 5  •  :sudoku dica  •  :sudoku m');return png(y+76,b,caption);
}
export async function termoVisual(g,caption){
 let b=header('TERMO','Palavra de 5 letras • '+g.guesses.length+'/6 tentativas','#e4b75f');
 const colors=['#514961','#a47c36','#2e795b'],known={};
 g.guesses.forEach(e=>[...e.word].forEach((c,i)=>known[c]=Math.max(known[c]??-1,e.score[i])));
 for(let r=0;r<6;r++)for(let i=0;i<5;i++){const x=104+i*104,y=174+r*78,e=g.guesses[r];b+=rect(x,y,94,69,e?colors[e.score[i]]:'#302844',9,e?'none':'#584b71',2);if(e)b+=txt(x+47,y+48,e.word[i].toUpperCase(),38,'#fff','middle',700);}
 ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].forEach((row,i)=>{const start=(720-row.length*58)/2;[...row].forEach((c,j)=>{const x=start+j*58,y=660+i*48,v=known[c.toLowerCase()];b+=rect(x,y,52,40,v===undefined?'#493e60':colors[v],6)+txt(x+26,y+28,c,21,'#fff','middle',700);});});
 b+=txt(360,832,'Verde: posição certa  •  Amarelo: outra posição',18,'#e8d4a1','middle')+footer(850,':termo amigo  •  :termo m');return png(926,b,caption);
}
export async function visual2048(g,best,caption){
 const palette=['#302844','#55416a','#654b82','#8e638d','#a87381','#b77c56','#bc9854','#c4ab55','#9974b8','#8055b4','#5f459f','#4b896e'];
 let b=header('2048','Deslize e combine peças iguais','#e4b75f');
 b+=rect(34,166,316,70,'#3c3156')+txt(52,191,'PONTOS',16,'#cbb9e9','start',700)+txt(52,222,g.score,30,'#fff','start',700);
 b+=rect(370,166,316,70,'#3c3156')+txt(388,191,'RECORDE',16,'#cbb9e9','start',700)+txt(388,222,Math.max(best||0,g.score),30,'#fff','start',700);
 b+=rect(34,254,652,652,'#211c35',18);
 g.b.forEach((v,i)=>{const x=47+i%4*158,y=267+Math.floor(i/4)*158,ix=v?Math.min(palette.length-1,Math.log2(v)):0;b+=rect(x,y,152,152,palette[ix],12);if(v)b+=txt(x+76,y+92,v,v>=1000?42:54,'#fff','middle',700);});
 b+=footer(926,':2048 c  •  b  •  e  •  d  •  m');return png(1002,b,caption);
}
export async function damasVisual(g,caption){
 const ox=72,oy=194,s=72;
 let b=header('DAMAS','Vez: '+(g.turn===0?'Azul':'Vermelho')+(g.forced>=0?' • Continue a captura':''),'#db9a9e');
 for(let i=0;i<8;i++){b+=txt(ox+i*s+36,179,String.fromCharCode(65+i),21,'#c9bee6','middle',700)+txt(49,oy+i*s+43,i+1,21,'#c9bee6','middle',700);}
 for(let i=0;i<64;i++){const r=Math.floor(i/8),c=i%8,x=ox+c*s,y=oy+r*s,p=g.b[i];b+=rect(x,y,s,s,(r+c)%2?'#76628c':'#e9dcc6',0);
 if(p){const color=p.toLowerCase()==='b'?'#426c9e':'#c34c5c';b+=circle(x+36,y+38,27,'#292238')+circle(x+36,y+32,26,color,g.forced===i?'#f3da8a':'#f7eadb',g.forced===i?4:2)+circle(x+36,y+32,18,color,'#ffffff',1);if(p===p.toUpperCase())b+=txt(x+36,y+39,'D',22,'#fff','middle',700);}}
 b+=txt(72,803,'Azul: '+g.b.filter(p=>p&&p.toLowerCase()==='b').length+' peças',20,'#a7c9f6')+txt(648,803,'Vermelho: '+g.b.filter(p=>p&&p.toLowerCase()==='r').length+' peças',20,'#f3aab4','end');
 b+=footer(824,':damas b3 a4  •  :damas jogadas  •  :damas m');return png(900,b,caption);
}
export async function crossVisual(p,solved,caption){
 const n=p.rows.length,cols=p.rows[0].length,s=Math.min(108,Math.floor(620/Math.max(n,cols))),ox=(720-cols*s)/2,oy=182;
 let b=header('PALAVRAS CRUZADAS',solved.length+'/'+p.words.length+' pistas resolvidas','#9ed6be');
 const starts={'0,0':'1/2','0,2':'3'};
 p.rows.forEach((row,y)=>[...row].forEach((c,x)=>{const X=ox+x*s,Y=oy+y*s;if(c==='#'){b+=rect(X+3,Y+3,s-6,s-6,'#211b32',9);return;}
 const shown=solved.includes(0)&&y===0||solved.includes(1)&&x===0||solved.includes(2)&&x===2;
 b+=rect(X+3,Y+3,s-6,s-6,shown?'#326454':'#4a3b65',9,'#8272a5',1);if(starts[y+','+x])b+=txt(X+10,Y+20,starts[y+','+x],14,'#dacdf1','start',700);if(shown)b+=txt(X+s/2,Y+s/2+15,c,40,'#fff','middle',700);}));
 let y=oy+n*s+24;
 p.clues.forEach((cl,i)=>{const rows=wrap(cl,48);b+=rect(30,y,660,rows.length*28+20,solved.includes(i)?'#285748':'#342b4e',8);rows.forEach((r,j)=>b+=txt(46,y+30+j*28,r,20));y+=rows.length*28+28;});
 b+=footer(y+4,':cruzadas 1 palavra  •  :cruzadas m');return png(y+80,b,caption);
}
function navalGridVisual(g,id,ox,oy,own=false,s=47){
 let b='';for(let i=0;i<6;i++){b+=txt(ox+i*s+s/2,oy-8,String.fromCharCode(65+i),17,'#b9d8ed','middle',700)+txt(ox-9,oy+i*s+s/2+6,i+1,17,'#b9d8ed','end',700);}
 for(let i=0;i<36;i++){const x=ox+i%6*s,y=oy+Math.floor(i/6)*s,v=g.shots[id]?.[i],ship=own&&g.boards[id][i];b+=rect(x+2,y+2,s-4,s-4,v==='hit'?'#d57970':v==='miss'?'#a9c9e0':ship?'#96ac83':'#285677',5);
 if(v==='hit')b+=txt(x+s/2,y+s/2+9,'×',28,'#3b2338','middle',700);else if(v==='miss')b+=circle(x+s/2,y+s/2,4,'#214966');else if(ship)b+=rect(x+9,y+12,s-18,s-24,'#405a48',6);}
 return b;
}
export async function navalVisual(g,caption,privateId=null){
 const own=privateId!==null;if(own&&!g.ids.includes(privateId))throw Error('Invalid fleet recipient');
 let b=header(own?'NAVAL • SUA FROTA':'BATALHA NAVAL','Vez: Jogador '+(g.turn+1)+(own?'  •  Conteúdo privado':'  •  Mapa público'),'#87badc');
 const ids=own?[privateId,g.ids.find(k=>k!==privateId)]:g.ids;
 ids.forEach((id,i)=>{const x=47+i*340;b+=txt(x,193,own?(i===0?'Sua frota':'Adversário'):'Jogador '+(g.ids.indexOf(id)+1),21,'#d9ebfa','start',700)+navalGridVisual(g,id,x,231,own&&i===0);});
 b+=txt(35,545,'× Acerto   •   Ponto: água'+(own?'   •   Verde: sua frota':''),19,'#d6e7f2');
 b+=footer(568,':naval b4  •  :naval m  •  :naval mao');return png(644,b,caption);
}

const cleanCaption=s=>String(s).replace(/\*/g,'').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'').trim();
function bodyLines(lines,y=180,size=23){let b='';for(const line of lines){for(const r of wrap(line,46)){if(r)b+=txt(36,y,r,size);y+=30;}}return {b,y};}
function panel(title,sub,lines,caption,accent='#b9a2ef'){
 const result=bodyLines(lines);return png(result.y+86,header(title,sub,accent)+result.b+footer(result.y+8,'Confira os comandos na legenda'),caption);
}
async function quizVisual(title,caption){
 const lines=cleanCaption(caption).split('\n').filter(Boolean),options=lines.filter(l=>/^[123]\.\s+/.test(l));
 if(options.length<2)return gameNotice(title,caption);
 let b=header(title,'Escolha uma alternativa','#82c8e4'),y=184;
 const question=lines.filter(l=>!options.includes(l)&&!/^(?:Envie|Use|:|Quiz Íris)/i.test(l)).slice(0,5);
 const q=bodyLines(question,y);b+=q.b;y=q.y+12;
 options.forEach(l=>{const n=l[0],rows=wrap(l.slice(2).trim(),40),h=42+rows.length*28;b+=rect(30,y,660,h,'#3b3358',12)+circle(70,y+h/2,23,'#61528b')+txt(70,y+h/2+8,n,23,'#fff','middle',700);rows.forEach((r,i)=>b+=txt(110,y+31+i*28,r,22));y+=h+13;});
 b+=footer(y+4,'Responda com 1, 2 ou 3');return png(y+80,b,caption);
}
async function velhaVisual(title,caption){
 const rows=caption.split('\n').filter(l=>l.includes('│')).map(l=>l.split('│').map(v=>v.trim()));
 if(rows.length!==3||rows.some(r=>r.length!==3))return gameNotice(title,caption);
 const result=caption.split('\n').filter(l=>!l.includes('│')).find(l=>/venceu|empate|sua vez|vez de/i.test(l));let b=header(title,result?cleanCaption(result).slice(0,55):'Escolha uma casa livre','#b9a2ef');
 rows.flat().forEach((v,i)=>{const x=105+i%3*170,y=178+Math.floor(i/3)*170;b+=rect(x,y,160,160,'#3f345c',14);
 if(v==='❌'||v==='X'){b+='<path d="M'+(x+45)+' '+(y+45)+'l70 70m0 -70l-70 70" fill="none" stroke="#e58b91" stroke-width="14" stroke-linecap="round"/>';}
 else if(v==='⭕'||v==='O')b+=circle(x+80,y+80,42,'none','#84cce8',14);
 else b+=txt(x+80,y+96,v,44,'#c1b2df','middle',700);});
 b+=footer(704,':'+(title==='VELHA EM DUPLA'?'velhadupla':'velha')+' 1 a 9');return png(780,b,caption);
}
async function forcaVisual(title,caption){
 const word=caption.match(/(?:[A-Z_]\s+){2,}[A-Z_](?=\s|$)/)?.[0];
 if(!word)return gameNotice(title,caption);
 const letters=word.trim().split(/\s+/),error=Number(caption.match(/Erros:\s*(\d)\/6/)?.[1]||0),cols=Math.min(10,letters.length),s=Math.min(66,Math.floor(650/cols)),rows=Math.ceil(letters.length/cols);
 let b=header(title,'Descubra a palavra secreta','#e4b75f');
 letters.forEach((c,i)=>{const x=(720-cols*s)/2+i%cols*s,y=184+Math.floor(i/cols)*s;b+=rect(x+3,y,s-6,s-8,c==='_'?'#42365d':'#336655',7)+txt(x+s/2,y+s*.67,c==='_'?'':c,Math.min(35,s*.55),'#fff','middle',700);});
 let y=190+rows*s;b+=txt(36,y+30,'Tentativas restantes: '+(6-error)+'/6',25,'#e7d1a0','start',700);
 for(let i=0;i<6;i++)b+=rect(36+i*110,y+52,96,23,i<6-error?'#7bb89b':'#544461',8);
 b+=footer(y+99,':forca a  •  :forca palavra  •  :forca mesa');return png(y+175,b,caption);
}
async function numberVisual(title,caption){
 const m=caption.match(/Intervalo:\s*(\d+)[–-](\d+)/i),attempt=caption.match(/Restam\s+(\d+)\s+tentativas/i);
 if(!m&&!/número de 1 a 100/.test(caption))return gameNotice(title,caption);
 const lo=m?Number(m[1]):1,hi=m?Number(m[2]):100,n=attempt?Number(attempt[1]):8;
 let b=header(title,'Encontre o número secreto','#82c8e4')+rect(30,176,660,128,'#3b3358',15)+txt(360,214,'INTERVALO POSSÍVEL',19,'#c8bddf','middle',700)+txt(360,278,lo+' — '+hi,55,'#e0f2ff','middle',700);
 b+=rect(45,336,630,18,'#4c4068',8)+rect(45+(lo-1)*6.3,336,Math.max(6.3,(hi-lo+1)*6.3),18,'#84cce8',8)+txt(45,387,'1',19)+txt(675,387,'100',19,'#fff','end');
 b+=txt(45,438,'Tentativas restantes: '+n,25,'#e5dafa','start',700)+footer(470,':numero 50  •  :numero status');return png(546,b,caption);
}
async function luckVisual(name,title,caption){
 if(name==='dado'){const n=Number(caption.match(/Resultado:\s*([1-6])/)?.[1]);if(!n)return gameNotice(title,caption);
 let b=header(title,'Resultado da rodada','#e4b75f')+rect(240,180,240,240,'#fff5dc',30);for(const [x,y] of pips[n])b+=circle(290+x*70,230+y*70,18,'#302844');b+=footer(452,'Sem apostas • :dado');return png(528,b,caption);}
 if(name==='moeda'){const side=caption.includes('Cara')?'CARA':'COROA';let b=header(title,'Resultado da rodada','#e4b75f')+circle(360,308,132,'#c49b47','#f3d487',8)+circle(360,308,108,'#d5ae59','#a68139',3)+txt(360,323,side,38,'#493a23','middle',700)+footer(464,'Sem apostas • :moeda');return png(540,b,caption);}
 const m=caption.match(/Você:\s*(pedra|papel|tesoura)\s*\|\s*Íris:\s*(pedra|papel|tesoura)/i);if(!m)return gameNotice(title,caption);
 let b=header(title,'Você contra Íris','#e4b75f');[m[1],m[2]].forEach((v,i)=>{const x=40+i*340;b+=rect(x,180,300,170,'#3b3358',15)+txt(x+150,222,i?'ÍRIS':'VOCÊ',22,'#c8bddf','middle',700)+txt(x+150,300,v.toUpperCase(),33,'#fff','middle',700);});b+=txt(360,399,caption.split('\n').at(-1),26,'#e4d8f5','middle',700)+footer(430,':ppt pedra  •  papel  •  tesoura');return png(506,b,caption);
}
async function trackVisual(title,caption){
 const rows=[...caption.matchAll(/^(.+?) • casa (\d+) • (\d+) pontos$/gm)].slice(0,4);
 if(!rows.length)return quizVisual(title,caption);
 let b=header(title,'Progresso da partida','#82c8e4'),y=180;
 for(const [_,label,pos,score] of rows){b+=rect(30,y,660,100,'#393052',12)+txt(46,y+29,label,20,'#fff','start',700)+txt(673,y+29,score+' pts',21,'#a3debe','end',700)+rect(46,y+45,628,18,'#514465',8)+rect(46,y+45,Math.max(0,Math.min(628,Number(pos)*628/18)),18,'#82c8e4',8)+txt(46,y+86,'Casa '+pos,18);y+=111;}
 const extra=cleanCaption(caption).split('\n').filter(l=>!/ • casa \d+ • \d+ pontos$/.test(l)).slice(0,9),tail=bodyLines(extra,y+20,21);b+=tail.b+footer(tail.y+8,'Jogue usando os comandos na legenda');return png(tail.y+84,b,caption);
}
// Operates exclusively on text already approved for the current group; never reads secret game state.
export async function visualGameResponse(name,title,response){
 if(typeof response!=='string'||!response.trim()||response.length>1000)return response;
 if(/^(?:📩|Não consegui|STOP privado|Jogos limitados|Comando restrito|Recurso limitado|🌸 Não foi possível)/.test(response))return response;
 const cap=response,titleUpper=title.toUpperCase();
 if(['quiz','quizmulti','batalhaconhecimento','bingoeducativo','detetive'].includes(name))return quizVisual(titleUpper,cap);
 if(['velha','velhadupla'].includes(name))return velhaVisual(titleUpper,cap);
 if(name==='forca')return forcaVisual(titleUpper,cap);
 if(name==='numero')return numberVisual(titleUpper,cap);
 if(['dado','moeda','ppt'].includes(name))return luckVisual(name,titleUpper,cap);
 if(['imobiliario','trilha','expedicao','reliquia'].includes(name))return trackVisual(titleUpper,cap);
 return gameNotice(titleUpper,cap);
}

export async function gameCatalogVisual(page){
 const labels={todos:'Todos os jogos',solo:'Individuais',grupo:'Multiplayer',tabuleiro:'Tabuleiro e cartas',logica:'Lógica e palavras',estudos:'Estudos e desafios',equipe:'Equipes e campeonatos',rapidos:'Jogos rápidos'};
 let b=header('CENTRAL DE JOGOS',labels[page.mode]+' • '+page.total+' jogos • '+page.page+'/'+page.pages,'#b9a2ef'),y=170;
 page.rows.forEach((r,i)=>{const tint=r.mode==='solo'?'#83cdb2':r.mode==='grupo'?'#9fc9f0':'#f0c27a';
 b+=rect(30,y,660,84,'#393052',12)+rect(42,y+12,6,60,tint,3)+txt(64,y+30,r.title,24,'#fff','start',700)+txt(64,y+60,r.command,21,'#d2c5eb')+txt(674,y+30,r.mode==='solo'?'SOLO':r.mode==='grupo'?'GRUPO':'AMBOS',14,tint,'end',700);
 y+=94;});
 b+=rect(30,y+4,660,106,'#302744',12)+txt(48,y+34,'CATEGORIAS',17,'#c9b7e9','start',700)+txt(48,y+64,'tabuleiro • lógica • estudos • equipe',21)+txt(48,y+91,'rápidos • solo • grupo',21);
 const base=':jogos '+(page.mode==='todos'?'lista':page.mode),nav=[page.page>1?base+' '+(page.page-1):'',page.page<page.pages?base+' '+(page.page+1):''].filter(Boolean).join('   |   ');
 b+=footer(y+124,nav||':jogos lista  •  :jogos meus');return png(y+200,b,page.caption);
}
