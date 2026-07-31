import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createSessionAuthority, SessionAuthorityError } from './session-authority.js';

test('issues and verifies a session bound to an allowed observed identity', () => {
  let now = 1000;
  const authority = createSessionAuthority({
    allowedIdentities: [{ type: 'chrome-extension', id: 'abcdefghijklmnopabcdefghijklmnop' }],
    clock: () => now,
    ttlMs: 1000,
    randomBytes: (size) => Buffer.alloc(size, 7),
  });

  const session = authority.issue({
    identity: { type: 'chrome-extension', id: 'abcdefghijklmnopabcdefghijklmnop' },
    clientId: 'client-1',
  });
  const verified = authority.verify(
    {
      sessionId: session.sessionId,
      token: session.token,
      clientId: 'client-1',
    },
    { type: 'chrome-extension', id: 'abcdefghijklmnopabcdefghijklmnop' },
  );

  assert.equal(verified.sessionId, session.sessionId);
  assert.equal(verified.identity.id, 'abcdefghijklmnopabcdefghijklmnop');
  assert.equal(session.token.includes(' '), false);
});

test('rejects unallowlisted identity, token mismatch, identity mismatch, expiry and revocation', () => {
  let now = 1000;
  let counter = 1;
  const authority = createSessionAuthority({
    allowedIdentities: [{ type: 'firefox-extension', id: 'ai-coding-studio@example.test' }],
    clock: () => now,
    ttlMs: 1000,
    randomBytes: (size) => Buffer.alloc(size, counter++),
  });

  assert.throws(
    () => authority.issue({
      identity: { type: 'firefox-extension', id: 'other@example.test' },
      clientId: 'client',
    }),
    (error) => error instanceof SessionAuthorityError && error.code === 'IDENTITY_NOT_ALLOWED',
  );

  const session = authority.issue({
    identity: { type: 'firefox-extension', id: 'ai-coding-studio@example.test' },
    clientId: 'client',
  });
  assert.throws(
    () => authority.verify(
      { ...session, token: 'wrong_token_value_that_is_long_enough' },
      session.identity,
    ),
    (error) => error.code === 'INVALID_SESSION_TOKEN',
  );
  assert.throws(
    () => authority.verify(session, { type: 'firefox-extension', id: 'other@example.test' }),
    (error) => error.code === 'IDENTITY_MISMATCH',
  );

  now = 2200;
  assert.throws(
    () => authority.verify(session, session.identity),
    (error) => error.code === 'SESSION_EXPIRED',
  );

  now = 1000;
  const second = authority.issue({ identity: session.identity, clientId: 'client-2' });
  assert.equal(authority.revoke(second.sessionId), true);
  assert.throws(
    () => authority.verify(second, second.identity),
    (error) => error.code === 'SESSION_NOT_FOUND',
  );
});
