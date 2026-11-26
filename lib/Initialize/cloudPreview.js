// Public read-only status server. Never serves logs, credentials or commands.
import http from 'node:http';
import { checkStorage } from './cloudSelfTest.js';

export function startCloudStatus() {
    const port = Number(process.env.PORT || 10000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    const html = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Íris — Legião Z</title><style>body{background:#141223;color:#eee;font:16px system-ui;margin:0;display:grid;place-items:center;min-height:100vh}main{max-width:32rem;padding:2rem}h1{color:#c4b5fd}p{line-height:1.6}</style><main><h1>Íris — Legião Z</h1><p>Servidor em preparação.</p><p>Este é um ambiente de teste. O painel administrativo e a conexão com o WhatsApp ainda não estão disponíveis.</p></main></html>';
    return http.createServer((req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
        }
        if (req.url === '/healthz') {
            res.writeHead(200, {'Content-Type':'application/json; charset=utf-8'});
            res.end(req.method === 'HEAD' ? undefined : '{"status":"ok","mode":"preview","whatsapp":"not_enabled"}'); return;
        }
        if (req.url === '/') {
            res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
            res.end(req.method === 'HEAD' ? undefined : html); return;
        }
        res.writeHead(404); res.end();
    }).listen(port, '0.0.0.0', () => console.log('Iris preview listening'));
}
startCloudStatus();
checkStorage().then(async () => {
    if (process.env.IRIS_BOT_ENABLED === 'true') {
        const { startHeadlessBot } = await import('../../cloud-runtime/bot.js');
        await startHeadlessBot();
    }
}).catch((error) => {
    const message = String(error?.message || '');
    const known = ['SUPABASE_URL is required', 'Invalid SUPABASE_URL', 'Invalid URL', 'A server-only Supabase key is required', 'A 32-byte encryption key in hex is required'];
    // Print only a fixed diagnostic or an HTTP status, never raw errors or credentials.
    const safe = known.includes(message) || /^Iris session storage (GET|POST|DELETE) failed: HTTP [0-9]{3}$/.test(message);
    console.error('Iris: startup or storage self-test failed: ' + (safe ? message : 'unclassified error; check configuration and connectivity'));
});
