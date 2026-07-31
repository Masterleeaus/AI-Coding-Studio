import test from 'node:test';
import assert from 'node:assert/strict';

let api;
try {
  api = await import('./approval-policy.js');
} catch (error) {
  assert.fail(`approval-policy.js must exist: ${error.message}`);
}

const { APPROVAL_LEVELS, classifyCommand, requiresConfirmation } = api;

test('classifyCommand maps known commands to explicit approval levels', () => {
  assert.equal(classifyCommand('file.read'), APPROVAL_LEVELS.READ);
  assert.equal(classifyCommand('file.write'), APPROVAL_LEVELS.WRITE);
  assert.equal(classifyCommand('test.run'), APPROVAL_LEVELS.EXECUTE);
  assert.equal(classifyCommand('file.delete'), APPROVAL_LEVELS.DESTRUCTIVE);
  assert.equal(classifyCommand('docker.runPrivileged'), APPROVAL_LEVELS.PRIVILEGED);
});

test('unknown commands fail closed as privileged', () => {
  assert.equal(classifyCommand('shell.exec'), APPROVAL_LEVELS.PRIVILEGED);
  assert.equal(requiresConfirmation('shell.exec'), true);
});

test('read commands can be auto-approved while writes require confirmation', () => {
  const policy = { autoApprove: [APPROVAL_LEVELS.READ] };
  assert.equal(requiresConfirmation('file.read', policy), false);
  assert.equal(requiresConfirmation('file.write', policy), true);
  assert.equal(requiresConfirmation('test.run', policy), true);
});
