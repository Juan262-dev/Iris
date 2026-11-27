'use strict';
const $=id=>document.getElementById(id), notice=$('notice');
let me=null,busy=false;
function show(t){notice.textContent=t||'';}
function loading(v){busy=v;for(const e of document.querySelectorAll('button'))e.disabled=v;}
async function api(name,data){const r=await fetch('/manager/api/'+name,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json','X-Iris-Request':'1'},credentials:'same-origin',cache:'no-store',body:data===undefined?undefined:JSON.stringify(data)});let v;try{v=await r.json();}catch{throw Error('Servidor indisponível.');}if(!r.ok){const e=Error(v.error||v.message||'Não foi possível concluir.');e.status=r.status;throw e;}return v;}
function render(){const logged=!!me;$('auth').hidden=logged;$('dashboard').hidden=!logged;$('logout').hidden=!logged;if(!logged)return;
$('account-id').value=me.id;$('owner-help').hidden=me.admin;$('admin').hidden=!me.admin;
$('bot-name').textContent=me.bot?.display_name||'Minha Íris';$('name').value=me.bot?.display_name||'';$('save-bot').textContent=me.bot?'Salvar nome':'Criar configuração';$('delete-bot').hidden=!me.bot;$('bot-description').textContent=me.bot?'Configuração criada. A integração oficial ainda precisa ser habilitada.':'Crie uma configuração individual para seu futuro bot.';
if(me.admin&&me.legacy){$('legacy-status').textContent=me.legacy.status;$('desired').textContent=me.legacy.desired?'Ligada':'Desligada';$('storage').textContent=me.legacy.storage;}
}
async function refresh(silent=false){try{me=await api('me');render();}catch(e){if(e.status===401){me=null;render();if(!silent)show('Entre na sua conta.');}else show(e.message);}}
async function act(fn){if(busy)return;loading(true);try{await fn();}catch(e){show(e.message);if(e.status===401)await refresh(true);}finally{loading(false);}}
$('auth-form').addEventListener('submit',e=>{e.preventDefault();act(async()=>{const v=await api('login',{email:$('email').value,password:$('password').value});$('password').value='';await refresh(true);show(v.message);});});
$('signup').addEventListener('click',()=>{if(!$('auth-form').reportValidity())return;act(async()=>{const v=await api('signup',{email:$('email').value,password:$('password').value});$('password').value='';show(v.message);});});
$('logout').addEventListener('click',()=>act(async()=>{await api('logout',{});me=null;render();show('Sessão encerrada.');}));
$('refresh').addEventListener('click',()=>act(async()=>{await refresh();show('Painel atualizado.');}));
$('bot-form').addEventListener('submit',e=>{e.preventDefault();act(async()=>{const v=await api('bot',{action:me.bot?'rename':'create',name:$('name').value});await refresh(true);show(v.message);});});
$('delete-bot').addEventListener('click',()=>{if(!confirm('Excluir apenas sua configuração ainda não conectada?'))return;act(async()=>{const v=await api('bot',{action:'delete'});await refresh(true);show(v.message);});});
for(const action of ['start','stop','restart'])$(action).addEventListener('click',()=>{if(action!=='start'&&!confirm(action==='stop'?'Desligar a Íris principal sem desvincular o WhatsApp?':'Reiniciar a Íris principal?'))return;act(async()=>{const v=await api('control',{action});await refresh(true);show(v.message+' Use Atualizar para acompanhar a conexão.');});});
$('copy').addEventListener('click',()=>act(async()=>{await navigator.clipboard.writeText($('account-id').value);show('Identificador copiado.');}));
if(location.hash)history.replaceState(null,'',location.pathname);refresh(true);
