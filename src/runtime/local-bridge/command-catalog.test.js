import { test } from 'vitest';
import assert from 'node:assert/strict';
import { COMMANDS, RISK_LEVELS } from './protocol.js';
import { getCommandDefinition } from './command-catalog.js';

test('assigns authoritative risk levels to representative commands', () => {
  assert.equal(getCommandDefinition(COMMANDS.GIT_STATUS).riskLevel, RISK_LEVELS.READ);
  assert.equal(getCommandDefinition(COMMANDS.TESTS_RUN).riskLevel, RISK_LEVELS.SAFE_EXECUTION);
  assert.equal(getCommandDefinition(COMMANDS.FILES_WRITE).riskLevel, RISK_LEVELS.WRITE);
  assert.equal(getCommandDefinition(COMMANDS.GIT_PUSH).riskLevel, RISK_LEVELS.PUBLISH);
});

test('marks repository-scoped commands and rejects unknown commands', () => {
  assert.equal(getCommandDefinition(COMMANDS.FILES_READ).repositoryRequired, true);
  assert.equal(getCommandDefinition(COMMANDS.SYSTEM_HEALTH).repositoryRequired, false);
  assert.equal(getCommandDefinition('shell.exec'), null);
});
