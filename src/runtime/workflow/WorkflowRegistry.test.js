import test from 'node:test';
import assert from 'node:assert/strict';

let api;
try {
  api = await import('./WorkflowRegistry.js');
} catch (error) {
  assert.fail(`WorkflowRegistry.js must exist: ${error.message}`);
}

const { WorkflowRegistry } = api;

test('registry exposes the required local engineering workflows', () => {
  const registry = new WorkflowRegistry();
  const ids = registry.list().map((workflow) => workflow.id);
  for (const id of [
    'deep-audit', 'bug-fix', 'architecture-review', 'dependency-audit',
    'security-audit', 'code-review', 'generate-documentation',
    'build-extension', 'build-release', 'create-delta', 'run-tests', 'publish-release',
  ]) {
    assert.equal(ids.includes(id), true, `missing ${id}`);
  }
});

test('workflow definitions are immutable and contain ordered steps', () => {
  const registry = new WorkflowRegistry();
  const workflow = registry.get('bug-fix');
  assert.equal(Object.isFrozen(workflow), true);
  assert.equal(Array.isArray(workflow.steps), true);
  assert.equal(workflow.steps.length > 0, true);
  assert.equal(workflow.steps[0].id, 'reproduce');
});
