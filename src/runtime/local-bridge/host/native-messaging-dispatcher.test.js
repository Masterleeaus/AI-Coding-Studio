import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createNativeMessagingDispatcher } from './native-messaging-dispatcher.js';

test('opens, routes and closes authenticated native sessions', async () => {
  const revoked = [];
  const sessionAuthority = {
    issue({ clientId }) { return { sessionId: '_session_1234567890', token: 'x'.repeat(43), clientId, expiresAt: 9999 }; },
    verify(auth) { assert.equal(auth.sessionId, '_session_1234567890'); return { sessionId: auth.sessionId }; },
    revoke(id) { revoked.push(id); },
  };
  const registry = { async dispatch(request, context) { return { ok: true, requestId: request.requestId, identity: context.identity.id }; } };
  const dispatcher = createNativeMessagingDispatcher({
    sessionAuthority,
    registry,
    observedIdentity: { type: 'chrome-extension', id: 'abcdefghijklmnopabcdefghijklmnop' },
  });

  const opened = await dispatcher.dispatch({ version: 1, type: 'session.open', requestId: 'open-1', clientId: 'client-1' });
  assert.equal(opened.session.clientId, 'client-1');
  const routed = await dispatcher.dispatch({ version: 1, type: 'bridge.request', requestId: 'bridge-1', request: { requestId: 'bridge-1' } });
  assert.equal(routed.response.identity, 'abcdefghijklmnopabcdefghijklmnop');
  const closed = await dispatcher.dispatch({ version: 1, type: 'session.close', requestId: 'close-1', auth: { sessionId: '_session_1234567890' } });
  assert.equal(closed.closed, true);
  assert.deepEqual(revoked, ['_session_1234567890']);
});

test('fails closed for unknown types and mismatched bridge request IDs', async () => {
  const dispatcher = createNativeMessagingDispatcher({
    sessionAuthority: { issue() {}, verify() {}, revoke() {} },
    registry: { async dispatch() { throw new Error('must not run'); } },
    observedIdentity: { type: 'firefox-extension', id: 'ai@example.org' },
  });
  assert.equal((await dispatcher.dispatch({ version: 1, type: 'unknown', requestId: 'req-1' })).error.code, 'UNKNOWN_NATIVE_REQUEST');
  const invalid = await dispatcher.dispatch({ version: 1, type: 'bridge.request', requestId: 'req-1', request: { requestId: 'other' } });
  assert.equal(invalid.type, 'bridge.response');
  assert.equal(invalid.error.code, 'INVALID_BRIDGE_REQUEST');
});
