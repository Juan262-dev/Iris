// Only explicitly authorized chats can use Iris commands.
// The connected account alone can enable or disable a group.
import { settings, seal, unseal, request } from '../lib/Initialize/cloudStorage.js';

export function decideCommand({ jid, fromMe, text, enabled }) {
    if (typeof jid !== 'string' || !jid.endsWith('@g.us')) return null;
    if (typeof text !== 'string') return null;
    const command = text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (command === ':on') return fromMe === true ? 'on' : null;
    if (command === ':off') return fromMe === true ? 'off' : null;
    if (!enabled) return null;
    if (command === ':ping') return 'ping';
    if (command === ':menu') return 'menu';
    if (command === ':status') return 'status';
    return null;
}

export async function loadChatSettings() {
    const s = settings('iris-chat-settings-v1');
    const rows = await request(s, 'GET');
    if (!Array.isArray(rows) || rows.length > 1) throw new Error('Invalid chat settings');
    const values = rows.length ? unseal(rows[0].encrypted_payload, s).groups : [];
    if (!Array.isArray(values) || values.some(x => typeof x !== 'string' || !x.endsWith('@g.us'))) throw new Error('Invalid stored groups');
    let groups = new Set(values);
    return {
        has: jid => groups.has(jid),
        list: () => [...groups],
        async set(jid, enabled) {
            if (!jid.endsWith('@g.us')) throw new Error('Group required');
            const next = new Set(groups);
            if (enabled) next.add(jid);
            else next.delete(jid);
            if (next.size > 100) throw new Error('Group limit reached');
            await request(s, 'POST', {
                session_id: s.sessionId, item_type: 'auth', item_id: 'snapshot',
                encrypted_payload: seal({ groups: [...next] }, s), updated_at: new Date().toISOString(),
            });
            groups = next;
        },
    };
}
