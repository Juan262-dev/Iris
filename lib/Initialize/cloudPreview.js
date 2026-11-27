// Public read-only status server. Never serves logs, credentials or commands.
import http from 'node:http';
import { makeManager } from '../../cloud-runtime/manager.js';
import { makeSupervisor } from '../../cloud-runtime/managerSupervisor.js';
import { checkStorage } from './cloudSelfTest.js';
import { runtimeStatus,setRuntime } from '../../cloud-runtime/runtimeStatus.js';

const supervisor=makeSupervisor({onStatus:s=>{setRuntime('whatsapp',s.status);setRuntime('storage',s.storage);}});
const manager=makeManager(supervisor);
export function startCloudStatus() {
    const port = Number(process.env.PORT || 10000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    const html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Íris — Legião Z</title><style>body{background:#141223;color:#eee;font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:32rem;padding:2rem}h1{color:#c4b5fd}p{line-height:1.6}</style><main><h1>Íris — Legião Z</h1><p>Servidor Íris Cloud.</p><p>🎮 Game Center: envie :jogos no WhatsApp.</p><p>Consulte <a href="/healthz" style="color:#c4b5fd">/healthz</a> para ver a situação atual da conexão.</p></main></html>';
    return http.createServer(async (req, res) => {
        if(/^\/world(?:\/|\?|$)/.test(req.url||'')){res.writeHead(410,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Set-Cookie':'iris_world=; Path=/world; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});res.end('Íris World foi desativado. Use :jogos no WhatsApp.');return;}
        try{if(await manager(req,res))return;}catch{if(!res.headersSent)res.writeHead(503);res.end();return;}
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
        }
        const pathname = (req.url || '/').split('?')[0];
        if (pathname === '/healthz') {
            res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
            res.end(req.method === 'HEAD' ? undefined : JSON.stringify({status:'ok',mode:'cloud',whatsapp:runtimeStatus().whatsapp,storage:runtimeStatus().storage})); return;
        }
        if (pathname === '/') {
            res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
            res.end(req.method === 'HEAD' ? undefined : html); return;
        }
        res.writeHead(404); res.end();
    }).listen(port, '0.0.0.0', () => console.log('Iris preview listening'));
}
const server=startCloudStatus();
let ending=false;
process.on('SIGTERM',()=>{if(ending)return;ending=true;server.close();supervisor.shutdown().catch(()=>{}).finally(()=>process.exit(0));});
checkStorage().then(async () => {
    setRuntime('storage','ok');
    await supervisor.boot();
}).catch((error) => {
    setRuntime('storage','erro de inicialização');
    const message = String(error?.message || '');
    const known = ['SUPABASE_URL is required', 'Invalid SUPABASE_URL', 'Invalid URL', 'A server-only Supabase key is required', 'A 32-byte encryption key in hex or base64 is required'];
    // Print only a fixed diagnostic or an HTTP status, never raw errors or credentials.
    const safe = known.includes(message) || /^Iris session storage (GET|POST|DELETE) failed: HTTP [0-9]{3}$/.test(message);
    console.error('Iris: startup or storage self-test failed: ' + (safe ? message : 'unclassified error; check configuration and connectivity'));
});
