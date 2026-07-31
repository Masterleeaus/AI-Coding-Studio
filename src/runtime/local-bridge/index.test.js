import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as bridge from './index.js';

test('exports the browser-safe local bridge contract surface', () => {
  assert.equal(bridge.BRIDGE_PROTOCOL_VERSION, 1);
  assert.equal(bridge.COMMANDS.GIT_STATUS, 'git.status');
  assert.equal(bridge.getCommandDefinition(bridge.COMMANDS.GIT_PUSH).riskLevel, bridge.RISK_LEVELS.PUBLISH);
  assert.equal(typeof bridge.validateBridgeRequest, 'function');
  assert.equal(typeof bridge.redactSecrets, 'function');
  assert.equal(typeof bridge.createOperationLog, 'function');
  assert.equal(typeof bridge.createCommandRegistry, 'function');
  assert.equal('resolveRepositoryPath' in bridge, false);
});
