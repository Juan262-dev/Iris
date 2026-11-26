import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { settings, seal, unseal, request } from './cloudStorage.js';

export async function checkStorage() {
    // Test encryption using synthetic data, not WhatsApp credentials.
    const sample = { check: 'iris-storage-test', number: 42 };
    const local = { key: randomBytes(32), sessionId: 'local-test' };
    const encrypted = seal(sample, local);
    assert.deepEqual(unseal(encrypted, local), sample);
    assert.notEqual(encrypted, seal(sample, local));
    assert.throws(() => unseal(encrypted, { ...local, sessionId: 'different' }));
    assert.throws(() => unseal(encrypted, { ...local, key: randomBytes(32) }));
    const parts = encrypted.split('.');
    const bytes = Buffer.from(parts[3], 'base64');
    bytes[0] ^= 1;
    parts[3] = bytes.toString('base64');
    assert.throws(() => unseal(parts.join('.'), local));
    console.log('Iris: local encryption self-test passed');
    if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) || !process.env.IRIS_SESSION_ENCRYPTION_KEY) {
        console.log('Iris: database self-test not configured');
        return;
    }
    const s = settings('probe-' + randomUUID());
    const payload = seal(sample, s);
    try {
        await request(s, 'POST', {
            session_id: s.sessionId, item_type: 'auth', item_id: 'snapshot',
            encrypted_payload: payload,
        });
        const rows = await request(s, 'GET');
        assert.equal(rows.length, 1);
        assert.deepEqual(unseal(rows[0].encrypted_payload, s), sample);
    } finally {
        await request(s, 'DELETE');
    }
    const remaining = await request(s, 'GET');
    assert.equal(remaining.length, 0);
    console.log('Iris: encrypted database round-trip self-test passed');
}
