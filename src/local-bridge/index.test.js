import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as bridge from './index.js';

test('exports the stable local bridge contract surface', () => {
  assert.equal(bridge.BRIDGE_PROTOCOL_VERSION, 1);
  assert.equal(bridge.COMMANDS.GIT_STATUS, 'git.status');
  assert.equal(typeof bridge.validateBridgeRequest, 'function');
  assert.equal(typeof bridge.resolveRepositoryPath, 'function');
  assert.equal(typeof bridge.redactSecrets, 'function');
  assert.equal(typeof bridge.createOperationLog, 'function');
  assert.equal(typeof bridge.createCommandRegistry, 'function');
});
