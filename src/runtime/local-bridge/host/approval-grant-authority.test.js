import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createApprovalGrantAuthority, ApprovalGrantError } from './approval-grant-authority.js';

test('issues a signed single-use grant bound to the exact operation', () => {
  let now = 1000;
  const authority = createApprovalGrantAuthority({
    clock: () => now,
    ttlMs: 1000,
    secret: Buffer.alloc(32, 9),
    randomBytes: (size) => Buffer.alloc(size, 3),
  });
  const expected = {
    sessionId: 'session-1',
    requestId: 'request-1',
    command: 'git.push',
    repositoryId: 'repo-1',
    riskLevel: 'PUBLISH',
  };

  const grant = authority.issue(expected);
  assert.equal(authority.verifyAndConsume(grant, expected), true);
  assert.throws(
    () => authority.verifyAndConsume(grant, expected),
    (error) => error instanceof ApprovalGrantError && error.code === 'GRANT_REPLAYED',
  );
});

test('rejects tampering, binding mismatch and expiry', () => {
  let now = 1000;
  let counter = 4;
  const authority = createApprovalGrantAuthority({
    clock: () => now,
    ttlMs: 1000,
    secret: Buffer.alloc(32, 5),
    randomBytes: (size) => Buffer.alloc(size, counter++),
  });
  const expected = {
    sessionId: 'session',
    requestId: 'request',
    command: 'files.write',
    repositoryId: 'repo',
    riskLevel: 'WRITE',
  };
  const grant = authority.issue(expected);

  assert.throws(
    () => authority.verifyAndConsume({ ...grant, riskLevel: 'READ' }, expected),
    (error) => error.code === 'GRANT_MISMATCH' || error.code === 'INVALID_GRANT_SIGNATURE',
  );
  assert.throws(
    () => authority.verifyAndConsume(grant, { ...expected, requestId: 'other' }),
    (error) => error.code === 'GRANT_MISMATCH',
  );

  now = 2200;
  assert.throws(
    () => authority.verifyAndConsume(grant, expected),
    (error) => error.code === 'GRANT_EXPIRED',
  );
});
