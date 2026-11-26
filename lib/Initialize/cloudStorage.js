// Server-only authentication storage for a single Iris process.
// Never print the key, session state, API response body, or pairing material.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function settings(sessionId) {
    const rawUrl = process.env.SUPABASE_URL;
    if (!rawUrl) throw new Error('SUPABASE_URL is required');
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('Invalid SUPABASE_URL');
    }
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret || (!secret.startsWith('sb_secret_') && !secret.startsWith('eyJ'))) {
        throw new Error('A server-only Supabase key is required');
    }
    const raw = (process.env.IRIS_SESSION_ENCRYPTION_KEY || '').trim();
    let key;
    if (/^[a-fA-F0-9]{64}$/.test(raw)) {
        key = Buffer.from(raw, 'hex');
    } else if (/^[A-Za-z0-9+/]{43}=$/.test(raw)) {
        const decoded = Buffer.from(raw, 'base64');
        if (decoded.length === 32 && decoded.toString('base64') === raw) key = decoded;
    }
    if (!key) throw new Error('A 32-byte encryption key in hex or base64 is required');
    const headers = { apikey: secret, 'Content-Type': 'application/json' };
    if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
    const endpoint = new URL('/rest/v1/iris_session_store', url);
    return { endpoint, headers, key, sessionId: String(sessionId) };
}

function aad(s) {
    return Buffer.from(JSON.stringify(['iris-auth-v1', s.sessionId, 'auth', 'snapshot']));
}
export function seal(value, s, replacer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', s.key, iv);
    cipher.setAAD(aad(s));
    const payload = Buffer.concat([cipher.update(JSON.stringify(value, replacer), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), payload.toString('base64')].join('.');
}
export function unseal(envelope, s, reviver) {
    const [version, nonce, tag, body, extra] = envelope.split('.');
    if (version !== 'v1' || !nonce || !tag || !body || extra !== undefined) throw new Error('Invalid session envelope');
    const iv = Buffer.from(nonce, 'base64');
    const authTag = Buffer.from(tag, 'base64');
    if (iv.length !== 12 || authTag.length !== 16) throw new Error('Invalid session envelope');
    const decipher = createDecipheriv('aes-256-gcm', s.key, iv);
    decipher.setAAD(aad(s));
    decipher.setAuthTag(authTag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'), reviver);
}

export async function request(s, method, body) {
    const url = new URL(s.endpoint);
    const headers = { ...s.headers };
    if (method === 'POST') {
        url.searchParams.set('on_conflict', 'session_id,item_type,item_id');
        headers.Prefer = 'resolution=merge-duplicates,return=minimal';
    } else {
        url.searchParams.set('session_id', 'eq.' + s.sessionId);
        url.searchParams.set('item_type', 'eq.auth');
        url.searchParams.set('item_id', 'eq.snapshot');
        if (method === 'GET') url.searchParams.set('select', 'encrypted_payload');
    }
    const response = await fetch(url, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Iris session storage ' + method + ' failed: HTTP ' + response.status);
    return method === 'GET' ? response.json() : undefined;
}

