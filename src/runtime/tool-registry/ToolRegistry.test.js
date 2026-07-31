import test from 'node:test';
import assert from 'node:assert/strict';

let api;
try {
  api = await import('./ToolRegistry.js');
} catch (error) {
  assert.fail(`ToolRegistry.js must exist: ${error.message}`);
}

const { ToolRegistry } = api;

test('registry starts with known tools unavailable until discovery', () => {
  const registry = new ToolRegistry();
  assert.equal(registry.get('git').available, false);
  assert.equal(registry.get('github-cli').available, false);
  assert.equal(registry.hasCapability('repository.status'), false);
});

test('applyDiscovery enables only detected tools and capabilities', () => {
  const registry = new ToolRegistry();
  registry.applyDiscovery([
    { id: 'git', available: true, version: '2.47.3', executable: '/usr/bin/git' },
    { id: 'docker', available: false },
  ]);
  assert.equal(registry.get('git').available, true);
  assert.equal(registry.get('git').version, '2.47.3');
  assert.equal(registry.hasCapability('repository.status'), true);
  assert.equal(registry.get('docker').available, false);
});

test('snapshot does not expose mutable internal state', () => {
  const registry = new ToolRegistry();
  const snapshot = registry.snapshot();
  snapshot.tools[0].available = true;
  assert.equal(registry.get(snapshot.tools[0].id).available, false);
});
