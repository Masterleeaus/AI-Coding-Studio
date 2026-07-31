import { test } from 'vitest';
import assert from 'node:assert/strict';
import { COMMANDS, validateBridgeRequest } from './protocol.js';

test('accepts base64url session IDs that begin with underscore or dash', () => {
  for (const sessionId of ['________________________', '------------------------']) {
    const request = validateBridgeRequest({
      version: 1,
      requestId: 'req-session-id',
      command: COMMANDS.SYSTEM_HEALTH,
      parameters: {},
      auth: {
        sessionId,
        clientId: 'client-1',
        token: 'a'.repeat(43),
      },
    });
    assert.equal(request.auth.sessionId, sessionId);
  }
});
