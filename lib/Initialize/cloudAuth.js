// Server-only authentication storage for a single Iris process.
// Never print the key, session state, API response body, or pairing material.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { BufferJSON, initAuthCreds, proto } from 'baileys';

function settings(sessionId) {
    const url = new URL(process.env.SUPABASE_URL || '');
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('Invalid SUPABASE_URL');
    }
    const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret || (!secret.startsWith('sb_secret_') && !secret.startsWith('eyJ'))) {
        throw new Error('A server-only Supabase key is required');
    }
    const hex = process.env.IRIS_SESSION_ENCRYPTION_KEY || '';
    if (!/^[a-fA-F0-9]{64}$/.test(hex)) throw new Error('A 32-byte encryption key in hex is required');
    const headers = { apikey: secret, 'Content-Type': 'application/json' };
    if (!secret.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + secret;
    const endpoint = new URL('/rest/v1/iris_session_store', url);
    return { endpoint, headers, key: Buffer.from(hex, 'hex'), sessionId: String(sessionId) };
}

function aad(s) {
    return Buffer.from(JSON.stringify(['iris-auth-v1', s.sessionId, 'auth', 'snapshot']));
}
export function seal(value, s) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', s.key, iv);
    cipher.setAAD(aad(s));
    const payload = Buffer.concat([cipher.update(JSON.stringify(value, BufferJSON.replacer), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), payload.toString('base64')].join('.');
}
export function unseal(envelope, s) {
    const [version, nonce, tag, body, extra] = envelope.split('.');
    if (version !== 'v1' || !nonce || !tag || !body || extra !== undefined) throw new Error('Invalid session envelope');
    const iv = Buffer.from(nonce, 'base64');
    const authTag = Buffer.from(tag, 'base64');
    if (iv.length !== 12 || authTag.length !== 16) throw new Error('Invalid session envelope');
    const decipher = createDecipheriv('aes-256-gcm', s.key, iv);
    decipher.setAAD(aad(s));
    decipher.setAuthTag(authTag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'), BufferJSON.reviver);
}

async function request(s, method, body) {
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

export async function useCloudAuthState(sessionId) {
    const s = settings(sessionId);
    const rows = await request(s, 'GET');
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Invalid session storage response');
    const initial = rows.length ? unseal(rows[0].encrypted_payload, s) : { creds: initAuthCreds(), keys: {} };
    if (!initial.creds || !initial.keys) throw new Error('Invalid authentication state');
    const creds = initial.creds;
    const keys = new Map(Object.entries(initial.keys).map(([type, values]) => [type, new Map(Object.entries(values))]));
    let writes = Promise.resolve();
    let failed = false;
    function save() {
        if (failed) return Promise.reject(new Error('Session persistence halted'));
        const payload = seal({ creds, keys: Object.fromEntries([...keys].map(([type, values]) => [type, Object.fromEntries(values)])) }, s);
        // Queue writes so an older snapshot cannot overwrite a newer one.
        writes = writes.then(() => request(s, 'POST', {
            session_id: s.sessionId, item_type: 'auth', item_id: 'snapshot',
            encrypted_payload: payload, updated_at: new Date().toISOString(),
        })).catch((error) => {
            failed = true;
            // Stop this instance on persistence failure instead of continuing with stale keys.
            console.error('Iris session persistence failed; stopping to protect session consistency.');
            process.exitCode = 1;
            setImmediate(() => process.exit(1));
            throw error;
        });
        return writes;
    }
    return {
        state: {
            creds,
            keys: {
                async get(type, ids) {
                    const bucket = keys.get(type);
                    const out = Object.create(null);
                    for (const id of ids) {
                        let value = bucket?.get(id);
                        if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        out[id] = value;
                    }
                    return out;
                },
                async set(data) {
                    for (const [type, changes] of Object.entries(data)) {
                        if (!keys.has(type)) keys.set(type, new Map());
                        const bucket = keys.get(type);
                        for (const [id, value] of Object.entries(changes)) {
                            if (value == null) bucket.delete(id);
                            else bucket.set(id, value);
                        }
                    }
                    await save();
                },
            },
        },
        saveCreds: save,
    };
}
