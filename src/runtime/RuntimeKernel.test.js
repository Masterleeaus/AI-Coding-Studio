import test from 'node:test';
import assert from 'node:assert/strict';

let api;
try {
  api = await import('./RuntimeKernel.js');
} catch (error) {
  assert.fail(`RuntimeKernel.js must exist: ${error.message}`);
}

const { RuntimeKernel } = api;

test('kernel loads workflows while local tools remain unavailable without a bridge', async () => {
  const kernel = new RuntimeKernel();
  const status = await kernel.init();
  assert.equal(status.initialized, true);
  assert.equal(status.bridgeAvailable, false);
  assert.equal(status.workflowCount >= 12, true);
  assert.equal(kernel.tools.get('git').available, false);
});

test('kernel applies tool discovery returned by the bridge', async () => {
  const bridge = {
    available: true,
    async execute(command) {
      assert.equal(command, 'tool.detect');
      return {
        ok: true,
        status: 'completed',
        data: { tools: [{ id: 'git', available: true, version: '2.47.3' }] },
      };
    },
  };
  const kernel = new RuntimeKernel({ bridge });
  await kernel.init();
  assert.equal(kernel.tools.get('git').available, true);
});
