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
