// Self-contained WebGL renderer. Geometry is generated in the browser; no third-party CDN.
function bootWorld3D(){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const rgb=h=>[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];
 const mul=(a,b)=>{const c=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c;};
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 function look(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
 function perspective(aspect,far){const f=1/Math.tan(Math.PI/5),n=.2;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);}
 function mesh(){const a=[];function tri(p,q,r,c){const normal=norm(cross(sub(q,p),sub(r,p))),shade=.65+.35*Math.abs(dot(normal,norm([.4,1,.5])));for(const v of [p,q,r])a.push(...v,...c.map(x=>x*shade));}function quad(p,q,r,s,c){tri(p,q,r,c);tri(p,r,s,c);}
 function box(x,y,z,w,h,d,c){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c1=[x+w/2,y,z+d/2],d1=[x-w/2,y,z+d/2],e=[a[0],y+h,a[2]],f=[b[0],y+h,b[2]],g=[c1[0],y+h,c1[2]],h1=[d1[0],y+h,d1[2]];quad(a,b,f,e,c);quad(b,c1,g,f,c);quad(c1,d1,h1,g,c);quad(d1,a,e,h1,c);quad(e,f,g,h1,c);}
 function cone(x,y,z,r,h,c,sides=6){for(let i=0;i<sides;i++){const t=i*2*Math.PI/sides,u=(i+1)*2*Math.PI/sides;tri([x+Math.cos(t)*r,y,z+Math.sin(t)*r],[x,y+h,z],[x+Math.cos(u)*r,y,z+Math.sin(u)*r],c);}}
 return {a,tri,quad,box,cone};}
 const land=(x,z)=>Math.sin(x*.13)*Math.cos(z*.15)*.45;
 const anchors=[{id:0,x:0,z:12},{id:1,x:-16,z:1},{id:2,x:0,z:-19},{id:3,x:16,z:1}];
 const themes={Deserto:['c5a46a','d7bc81','a68c54'],Montanhas:['77857b','aeb7b1','56725c'],Cavernas:['5c5967','8d6678','685d70'],'Pântano':['617d64','89945f','304f45'],Ruínas:['8c9276','b1ab8c','51725a'],Costa:['9aab79','d6c491','508a78'],Santuário:['8c9c89','c0c8ae','637f72']};
 function path(m,a,b,w,c){const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,px=-dz/len*w,pz=dx/len*w;const v=(x,z)=>[x,land(x,z)+.12,z];m.quad(v(a.x+px,a.z+pz),v(b.x+px,b.z+pz),v(b.x-px,b.z-pz),v(a.x-px,a.z-pz),c);}
 function house(m,x,z,scale=1,roof='9f6149'){const y=land(x,z);m.box(x,y,z,4*scale,3.2*scale,3.8*scale,rgb('cab890'));m.cone(x,y+3.2*scale,z,3.2*scale,2.4*scale,rgb(roof),4);m.box(x,y,z+1.94*scale,.9*scale,1.7*scale,.15,rgb('574b40'));m.box(x-1.2*scale,y+1.3*scale,z+1.95*scale,.65*scale,.65*scale,.16,rgb('e9d59b'));}
 function tree(m,x,z,s=1,c='395e46'){const y=land(x,z);m.box(x,y,z,.5*s,1.8*s,.5*s,rgb('806247'));m.cone(x,y+1.1*s,z,1.7*s,3.5*s,rgb(c),6);m.cone(x,y+2.6*s,z,1.2*s,2.6*s,rgb('547d52'),6);}
 function localScene(view){const m=mesh(),r=view.regions[view.position-1],t=themes[r.biome]||['76965f','b8ba84','426d49'];let seed=view.position*7919;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let x=-40;x<40;x+=4)for(let z=-40;z<40;z+=4){const v=(x,z)=>[x,land(x,z),z],c=rgb(t[0]).map(v=>v*(.94+rand()*.12));m.quad(v(x,z),v(x+4,z),v(x+4,z+4),v(x,z+4),c);}
 for(let i=1;i<anchors.length;i++)path(m,anchors[0],anchors[i],1.1,rgb(t[1]));path(m,anchors[1],anchors[2],.8,rgb(t[1]));path(m,anchors[2],anchors[3],.8,rgb(t[1]));
 for(const a of anchors){const y=land(a.x,a.z);m.box(a.x,y+.05,a.z,3.5,.15,3.5,rgb('c7b884'));m.box(a.x+2,y,a.z,.22,2,.22,rgb('706047'));m.box(a.x+2,y+1.6,a.z,1.4,.55,.2,rgb('e7d49e'));}
 for(let i=0;i<75;i++){const x=rand()*74-37,z=rand()*74-37;if(Math.abs(x)<22&&Math.abs(z)<24)continue;if(r.biome==='Deserto'||r.biome==='Cavernas'||r.biome==='Montanhas'){const y=land(x,z);m.cone(x,y,z,1+rand()*3,2+rand()*7,rgb(t[2]),5);}else tree(m,x,z,.6+rand(),t[2]);}
 if(['Cavernas','Ruínas','Fortaleza'].includes(r.biome)){for(let i=0;i<5;i++){m.box(-10+i*5,0,-30,2,5,2,rgb('8b8d83'));m.box(-10+i*5,5,-30,3,.6,3,rgb('c1b99c'));}m.box(0,5,-30,23,1.5,2,rgb('9e9d8e'));m.box(0,0,-31,6,4,1,rgb('343449'));}else{for(let i=0;i<4;i++)house(m,-9+i*6,23,.9+((i+view.position)%3)*.2);}
 if(['Costa','Lago e pradaria','Pântano'].includes(r.biome)){m.box(29,-.15,-5,20,.2,35,rgb('548f9e'));m.box(22,.4,-5,7,.35,3,rgb('96734e'));}
 const living=view.living||{};if(living.home)house(m,-25,14,1+living.home*.08,'916f9d');if(living.farm){m.box(26,land(26,22),22,10,.15,8,rgb('8f714a'));for(let i=0;i<living.farm+2;i++)for(let j=0;j<4;j++)m.cone(22+i*1.3,land(22+i*1.3,19+j*1.5)+.1,19+j*1.5,.45,.9,rgb('77964c'),5);}if(living.business)house(m,22,26,1+living.business*.08,'bd985c');
 if(r.biome==='Cavernas'){for(let i=0;i<8;i++){const x=-30+i*8,z=-34+Math.sin(i)*2;const y=land(x,z);m.cone(x,y,z,2.8,6+i%3,rgb('a65175'),5);m.cone(x+1,y,z+2,1.4,3.5,rgb('d0849e'),5);}}
 const lv=view.places[view.position-1]?.level||0;if(lv>0){m.box(-25,land(-25,23),23,5,3+lv,5,rgb('b4a98a'));m.cone(-25,3+lv,23,4,3,rgb('736a85'),4);}
 return m;}
 function overview(view){const m=mesh(),coords=r=>({x:(r.x-1000)/10,z:(r.y-325)/10});m.box(0,-2,0,220,.2,85,rgb('3c7789'));
 for(let x=-95;x<95;x+=4)for(let z=-31;z<31;z+=4){const a=((x+50)/46)**2+(z/29)**2,b=((x-45)/43)**2+(z/27)**2;if(Math.min(a,b)>1.08)continue;const y=Math.max(0,1-Math.min(a,b))*.8;m.box(x,y-.3,z,4.1,.35,4.1,rgb(x>22?'a6a06b':'75965f'));}
 for(const [a,b] of view.roads){const p=coords(view.regions[a-1]),q=coords(view.regions[b-1]),dx=q.x-p.x,dz=q.z-p.z,l=Math.hypot(dx,dz)||1,px=-dz/l*.55,pz=dx/l*.55;m.quad([p.x+px,.8,p.z+pz],[q.x+px,.8,q.z+pz],[q.x-px,.8,q.z-pz],[p.x-px,.8,p.z-pz],rgb('d8c08b'));}
 for(const r of view.regions){const p=coords(r);m.box(p.x,.9,p.z,3.2,1.8,3.2,rgb('bdb393'));m.cone(p.x,2.7,p.z,2.6,2.5,rgb(r.id===view.position?'b886d2':r.id>9?'a66f4d':'597a6b'),4);if(r.biome==='Montanhas')m.cone(p.x+4,.5,p.z-4,4,7,rgb('9ca9a3'),5);}
 return m;}
 function person(m,x,z,col,t,walking,scale=1){const y=land(x,z),s=scale,step=walking?Math.sin(t*9)*.3*s:0;
 m.box(x-.28*s,y,z+step,.36*s,1.05*s,.45*s,rgb('343846'));m.box(x+.28*s,y,z-step,.36*s,1.05*s,.45*s,rgb('343846'));m.box(x,y+1*s,z,1.08*s,1.1*s,.65*s,col);m.box(x,y+2.1*s,z,.65*s,.65*s,.65*s,rgb('e0b68a'));m.cone(x,y+2.75*s,z,.55*s,.5*s,rgb('435b55'),6);m.box(x-.7*s,y+1.1*s,z-step,.3*s,.85*s,.35*s,col);m.box(x+.7*s,y+1.1*s,z+step,.3*s,.85*s,.35*s,col);}
 window.Iris3D=function create({canvas,onArea,onError,onInfo}){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL indisponível');
 const shader=(kind,src)=>{const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;};
 const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,'attribute vec3 pos;attribute vec3 color;uniform mat4 vp;varying vec3 c;void main(){c=color;gl_Position=vp*vec4(pos,1.0);}'));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 c;uniform float light;void main(){gl_FragColor=vec4(c*light,1.0);}'));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('program');gl.useProgram(prog);
 const p=gl.getAttribLocation(prog,'pos'),c=gl.getAttribLocation(prog,'color'),vp=gl.getUniformLocation(prog,'vp'),light=gl.getUniformLocation(prog,'light'),staticBuf=gl.createBuffer(),dynamicBuf=gl.createBuffer();
 gl.enable(gl.DEPTH_TEST);gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(c);
 let view=null,mode='local',active=false,frame=0,vertices=0,staticKey='',x=0,z=12,yaw=0,dist=12,prev=0,areaKey='',pointer=null,joy=[0,0],keys=new Set(),lastNear=-1;
 function upload(){if(!view)return;const key=mode+':'+view.position+':'+(view.places[view.position-1]?.level||0)+':'+[view.living?.home,view.living?.farm,view.living?.business].join(',');if(key===staticKey)return;staticKey=key;const m=mode==='local'?localScene(view):overview(view);gl.bindBuffer(gl.ARRAY_BUFFER,staticBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.a),gl.STATIC_DRAW);vertices=m.a.length/6;}
 function drawBuffer(buf,count){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,count);}
 function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),dpr=Math.min(1.5,window.devicePixelRatio||1);const width=Math.min(1200,Math.round(w*dpr)),height=Math.min(800,Math.round(h*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}gl.viewport(0,0,width,height);}
 function nearest(){let best=null,d=Infinity;for(const a of anchors){const k=Math.hypot(x-a.x,z-a.z);if(k<d){d=k;best=a;}}return d<4.5?best:null;}
 function render(ts){frame=0;if(!active||!view||document.hidden)return;try{resize();const t=ts/1000,dt=Math.min(.05,(ts-(prev||ts))/1000);prev=ts;let walk=false;
 if(mode==='local'){let forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)+joy[1],side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy[0];const speed=8*dt,mag=Math.max(1,Math.hypot(forward,side));forward/=mag;side/=mag;walk=Math.abs(forward)+Math.abs(side)>.05;x=clamp(x+speed*(side*Math.cos(yaw)-forward*Math.sin(yaw)),-35,35);z=clamp(z+speed*(-side*Math.sin(yaw)-forward*Math.cos(yaw)),-35,35);const near=nearest();if((near?.id??-1)!==lastNear){lastNear=near?.id??-1;onInfo(near?('Próximo: '+(near.id===0?'Centro':view.adventure.areas[near.id-1].name)):'Caminhe até um ponto para interagir.');}}
 const night=view.adventure.phase==='Noite',fog=view.adventure.weather==='Neblina',rain=view.adventure.weather==='Chuva leve';gl.clearColor(night?.055:fog?.47:.42,night?.085:fog?.54:.63,night?.14:fog?.57:.76,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(light,night?.57:rain?.82:1);
 const eye=mode==='local'?[x+Math.sin(yaw)*dist,land(x,z)+dist*.65+3,z+Math.cos(yaw)*dist]:[Math.sin(yaw)*dist*5,dist*3.8,Math.cos(yaw)*dist*5];const target=mode==='local'?[x,land(x,z)+1.6,z]:[0,0,0];gl.uniformMatrix4fv(vp,false,mul(perspective(canvas.width/canvas.height,mode==='local'?180:500),look(eye,target)));drawBuffer(staticBuf,vertices);
 if(mode==='local'){const m=mesh(),classColors={guerreiro:'a66a57',arqueiro:'648d54',mago:'8267b6',alquimista:'549b91',explorador:'ba9563'};person(m,x,z,rgb(classColors[view.adventure.class]||'ba9563'),t,walk);for(let i=0;i<3;i++){const a=anchors[i+1],nx=a.x+Math.sin(t*.4+i)*2.2,nz=a.z+Math.cos(t*.4+i)*2.2;person(m,nx,nz,rgb(['d0af65','6987b0','a97d9a'][i]),t,true,.9);}if(view.living?.pet){const px=x+1.5,pz=z+1.4,y=land(px,pz);const pet=view.living.pet,pc=rgb(pet==='golem'?'899a92':pet==='coruja'?'b1a7cb':'bc8b55');m.box(px,y,pz,.85,.55,.9,pc);m.cone(px,y+.55,pz,.45,.55,pc,4);if(pet==='raposa')m.cone(px,y+.2,pz+1,.4,.6,rgb('d8b178'),4);}if(rain){for(let i=0;i<50;i++){const xx=x+Math.sin(i*31.1)*15,zz=z+Math.cos(i*16.7)*15,yy=1+((i*.73-t*7)%7+7)%7;m.tri([xx,yy,zz],[xx+.05,yy,zz],[xx+.08,yy-.35,zz+.05],rgb('b2d1df'));}}gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.a),gl.DYNAMIC_DRAW);drawBuffer(dynamicBuf,m.a.length/6);}
 frame=requestAnimationFrame(render);}catch{stop();onError();}}
 function start(){if(active)return;active=true;prev=0;upload();if(!document.hidden)frame=requestAnimationFrame(render);}
 function stop(){active=false;areaKey='';if(frame)cancelAnimationFrame(frame);frame=0;keys.clear();joy=[0,0];}
 function sync(v){view=v;const key=v.position+':'+v.adventure.area;if(areaKey!==key){const a=anchors[v.adventure.area]||anchors[0];x=a.x;z=a.z;areaKey=key;lastNear=-1;}upload();}
 function switchMode(v){mode=v==='overview'?'overview':'local';dist=mode==='overview'?27:12;staticKey='';upload();onInfo(mode==='overview'?'Visão 3D dos dois continentes. Viaje pelo seletor.':'Caminhe até uma subárea e confirme.');}
 const keydown=e=>{if(!active||/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target?.tagName||''))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys.add(k);e.preventDefault();}};
 const keyup=e=>keys.delete(e.key.toLowerCase());window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',()=>{keys.clear();joy=[0,0];});
 canvas.addEventListener('pointerdown',e=>{canvas.focus?.({preventScroll:true});pointer={x:e.clientX};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(pointer){yaw-=(e.clientX-pointer.x)*.008;pointer.x=e.clientX;}});
 const release=()=>pointer=null;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 const zoom=n=>dist=clamp(dist+n,mode==='local'?6:16,mode==='local'?22:42);
 canvas.addEventListener('wheel',e=>{if(active){e.preventDefault();zoom(Math.sign(e.deltaY)*2);}},{passive:false});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;keys.clear();joy=[0,0];}else if(active&&!frame){prev=0;frame=requestAnimationFrame(render);}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();onError();});
 return {sync,start,stop,switchMode,zoom,joystick:(sx,sy)=>joy=[clamp(sx,-1,1),clamp(sy,-1,1)],interact:()=>{const a=nearest();if(mode==='local'&&a)onArea(a.id);else onInfo('Aproxime-se de um marco para interagir.');}};
 };
}
export const world3dScript='('+bootWorld3D.toString()+')();';
