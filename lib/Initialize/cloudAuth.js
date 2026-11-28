// Server-only Baileys authentication state.
import { settings, seal, unseal, request } from './cloudStorage.js';

export function relinkNumber(creds){
    // Only the previously registered account, never a user-supplied number.
    if(creds?.registered!==true)return null;
    for(const v of [creds.me?.id,creds.me?.phoneNumber]){
        if(typeof v!=='string')continue;
        const m=/^([1-9]\d{7,14})(?::\d+)?(?:@s\.whatsapp\.net)?$/.exec(v);
        if(m)return m[1];
    }
    return null;
}

export async function useCloudAuthState(sessionId, adapter, {relink=false}={}) {
    const { BufferJSON, initAuthCreds, proto } = adapter || await import('baileys');
    const s = settings(sessionId);
    const rows = await request(s, 'GET');
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Invalid session storage response');
    const initial = rows.length ? unseal(rows[0].encrypted_payload, s, BufferJSON.reviver) : { creds: initAuthCreds(), keys: {} };
    if (!initial.creds || !initial.keys) throw new Error('Invalid authentication state');
    const pairingNumber=relink?relinkNumber(initial.creds):null;
    if(relink&&(sessionId!=='0'||!pairingNumber))throw Error('Prior account unavailable');
    const creds = relink?initAuthCreds():initial.creds;
    const keys = new Map(Object.entries(relink?{}:initial.keys).map(([type, values]) => [type, new Map(Object.entries(values))]));
    let writes = Promise.resolve();
    let failed = false;
    function save() {
        // Do not replace the old snapshot until the new account is registered.
        if(relink&&creds.registered!==true)return Promise.resolve();
        if(relink&&relinkNumber(creds)!==pairingNumber)return Promise.reject(new Error('Pairing account mismatch'));
        if (failed) return Promise.reject(new Error('Session persistence halted'));
        const payload = seal({ creds, keys: Object.fromEntries([...keys].map(([type, values]) => [type, Object.fromEntries(values)])) }, s, BufferJSON.replacer);
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
        pairingNumber,
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
