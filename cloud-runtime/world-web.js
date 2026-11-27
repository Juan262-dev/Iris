const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Íris World • Evolution</title><style> :root{color-scheme:dark;--gold:#e7c884;--bg:#101c24;--panel:#1c3038;--muted:#b5c7c9}*{box-sizing:border-box}body{background:radial-gradient(ellipse at top,#273c43,var(--bg) 70%);color:#f0f5ee;font:16px system-ui;margin:0;min-height:100vh}main{max-width:1000px;margin:auto;padding:24px 16px}h1{font-family:Georgia,serif;color:var(--gold);letter-spacing:.08em;margin:0}h2{font-size:1.2rem}p{line-height:1.5}small,.muted{color:var(--muted)}header{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.panel{background:var(--panel);border:1px solid #43605e;border-radius:18px;padding:16px;margin:16px 0}button,input,select{font:inherit;color:inherit;border:1px solid #68877c;border-radius:10px;padding:10px;background:#293e40}button{cursor:pointer}button:hover,button:focus-visible{border-color:var(--gold);color:var(--gold)}button:disabled{opacity:.5;cursor:default}input{width:100%;margin:8px 0}.primary{background:#d7bc7b;color:#172629;border-color:#d7bc7b;font-weight:700}.primary:hover{color:#172629;background:#eedca5}.stats{display:flex;gap:12px;flex-wrap:wrap}.stat{flex:1;min-width:90px;background:#14262b;padding:12px;border-radius:12px}.stat b{display:block;color:var(--gold);font-size:1.35rem}.map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px;background:linear-gradient(145deg,#3a5743,#566946 40%,#34554f);border:2px solid #7d8e66;border-radius:24px;position:relative}.tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-height:105px;background:#1b3934da;border:1px solid #90a17e;overflow-wrap:anywhere;text-align:center;font-size:.9rem}.tile b{font-size:28px}.tile[aria-pressed=true]{outline:2px solid var(--gold);background:#355148}.tile span{font-size:.8rem;color:#d9e0cf}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions button{flex:1;min-width:110px}.inventory{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px}.inventory div{padding:8px;background:#14262b;border-radius:8px}#message{min-height:24px;color:var(--gold);white-space:pre-wrap}#login{max-width:520px;margin:20px auto}a{color:var(--gold)}[hidden]{display:none!important}@media(min-width:740px){.layout{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}.layout>.panel{margin:0}}@media(max-width:400px){.tile{padding:6px;font-size:.78rem;min-height:93px}.tile b{font-size:24px}}</style></head><body><main><header><div><small>ÍRIS CLOUD / WORLD EVOLUTION</small><h1>ÍRIS WORLD</h1><p class="muted">Seu mundo, do WhatsApp ao navegador.</p></div><button id="logout" hidden>Sair</button></header><section id="login" class="panel"><h2>Entre no seu mundo</h2><p>Em um grupo onde a Íris está ativa, crie seu perfil com <b>:perfil</b> e envie <b>:world</b>. O código será entregue somente no privado.</p><form id="login-form"><label for="code">Código temporário</label><input id="code" type="password" autocomplete="off" minlength="48" maxlength="48" required placeholder="Cole o código do WhatsApp"><button class="primary" type="submit">Conectar ao RPG</button></form><p class="muted">O código expira em 5 minutos e só funciona uma vez. A sessão dura até uma hora. Não informe sua senha nem seu número de telefone.</p></section><div id="game" hidden><section class="panel stats" id="stats"></section><div class="layout"><section class="panel"><h2>Mapa de Infinity</h2><p class="muted">Selecione uma região para explorar ou construir.</p><div id="map" class="map"></div></section><section class="panel"><h2 id="place-title">Praça</h2><p id="place-info"></p><div class="actions"><button data-action="explorar">Explorar</button><button data-action="construir">Construir</button><button data-action="npc">Conversar com NPC</button></div><h2>Oficina</h2><label for="job">Profissão</label> <select id="job"><option value="artesao">Artesão</option><option value="botanico">Botânico</option><option value="pesquisador">Pesquisador</option><option value="bibliotecario">Bibliotecário</option></select><div class="actions"><button id="choose-job">Escolher</button><button id="produce">Produzir</button></div><h2>Comunidade</h2><div class="actions"><button id="project">Contribuir</button><button id="mission">Missão de hoje</button><button id="complete">Concluir missão</button></div><p id="project-count" class="muted"></p></section></div><section class="panel"><h2>Inventário</h2><div id="inventory" class="inventory"></div><p class="muted">O progresso pertence ao grupo vinculado. Alterações feitas pelo WhatsApp aparecem ao atualizar.</p><button id="refresh">Atualizar progresso</button></section></div><p id="message" role="status" aria-live="polite"></p><small>Economia fictícia • Sem dinheiro real • <a href="/">Íris Cloud</a></small></main><script src="/world/app.js" defer></script></body></html>';
const js=`
const $=id=>document.getElementById(id);
let data=null,selected=1,busy=false;
const icons=['⛲','📚','🌿','🔭','⚙️','🏛️','🚉','🌊','🏪'];
function message(t){$('message').textContent=t;}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function draw(d){
 data=d;$('game').hidden=false;$('login').hidden=true;$('logout').hidden=false;
 $('stats').replaceChildren(...[['Nível',d.level],['XP',d.xp],['Moedas',d.coins],['Explorações',d.visits]].map(([k,v])=>{const a=el('div',undefined,'stat');a.append(el('small',k),el('b',v));return a;}));
 $('map').replaceChildren(...d.places.map(p=>{const b=el('button',undefined,'tile');b.type='button';b.setAttribute('aria-pressed',String(p.id===selected));b.append(el('b',icons[p.id-1]),el('strong',p.name),el('span',p.level?'Nível '+p.level:'Livre'));b.onclick=()=>{selected=p.id;draw(data);};return b;}));
 const p=d.places[selected-1];$('place-title').textContent=p.name;$('place-info').textContent=(p.visited?'Já visitado hoje. ':'Pode explorar hoje. ')+'Você possui '+p.owned+' '+p.item+'. Construção nível '+p.level+'/5 (custo: 2 itens).';
 if(d.job)$('job').value=d.job;
 $('project-count').textContent=d.project+' contribuições coletivas • '+d.contributions+' suas contribuições';
 $('inventory').replaceChildren(...d.places.map(p=>el('div',p.item+' × '+p.owned)));
}
function signedOut(){data=null;$('login').hidden=false;$('game').hidden=true;$('logout').hidden=true;}
async function api(op,body={}){
 if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const r=await fetch('/world/api/'+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const x=await r.json();
 if(r.status===401||r.status===403){signedOut();message(op==='login'?'Código inválido, expirado ou grupo indisponível.':'Sessão encerrada. Solicite outro código no WhatsApp.');return;}
 if(!r.ok){message(r.status===429?'Aguarde um instante antes de tentar novamente.':'Serviço indisponível. Tente novamente.');return;}
 if(op==='logout'){signedOut();message('Sessão encerrada.');return;}
 if(x.view)draw(x.view);else if(x.places)draw(x);
 message(x.message||'Progresso sincronizado.');
 }catch{message('Não foi possível conectar à Íris.');}
 finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
$('login-form').onsubmit=e=>{e.preventDefault();const code=$('code').value.trim();$('code').value='';api('login',{code});};
$('logout').onclick=()=>api('logout');
$('refresh').onclick=()=>api('state');
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>api('action',{name:b.dataset.action,arg:String(selected)}));
$('choose-job').onclick=()=>api('action',{name:'oficina',arg:'profissao '+$('job').value});
$('produce').onclick=()=>api('action',{name:'oficina',arg:'produzir'});
$('project').onclick=()=>api('action',{name:'projetoinfinity',arg:'ajudar'});
$('mission').onclick=()=>api('action',{name:'missaoinfinity',arg:''});
$('complete').onclick=()=>api('action',{name:'missaoinfinity',arg:'concluir'});
api('state');
`;
const origin='https://iris-cloud-oqit.onrender.com';
export const worldUrl=origin+'/world';
const cookie=(session='',maxAge=0)=>'iris_world='+session+'; Path=/world; HttpOnly; Secure; SameSite=Strict; Max-Age='+maxAge;
const sessionOf=req=>/(?:^|;\\s*)iris_world=([a-f0-9]{48})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
async function body(req){let n=0;const chunks=[];for await(const c of req){n+=c.length;if(n>2048)throw Error('size');chunks.push(c);}const x=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');if(!x||typeof x!=='object'||Array.isArray(x))throw Error('body');return x;}
export function makeWorldHttp(supervisor){
 let pending=0;
 return async(req,res)=>{
  const path=(req.url||'').split('?')[0];if(path!=='/world'&&!path.startsWith('/world/'))return false;
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));return true;};
  if((req.method==='GET'||req.method==='HEAD')&&(path==='/world'||path==='/world/'||path==='/world/app.js')){const script=path.endsWith('.js');res.writeHead(200,{'Content-Type':script?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:script?js:html);return true;}
  const op=/^\\/world\\/api\\/(login|state|action|logout)$/.exec(path)?.[1];if(!op)return json(404,{});
  if(req.method!=='POST'||req.headers.origin!==origin||!/^application\\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(403,{});
  if(pending>=24)return json(503,{});
  pending++;
  try{let input;try{input=await body(req);}catch{return json(400,{});}
   const result=await supervisor.world({op,session:sessionOf(req),code:input.code,name:input.name,arg:input.arg});
   if(result.status===200&&op==='login'&&typeof result.session==='string')res.setHeader('Set-Cookie',cookie(result.session,3600));
   if(op==='logout'||result.status===401||result.status===403)res.setHeader('Set-Cookie',cookie());
   return json(result.status,result.data||{});
  }catch{return json(503,{});}finally{pending--;}
 };
}
