import test from 'node:test';
import assert from 'node:assert/strict';

let catalogApi;
let protocolApi;
let clientApi;
try {
  catalogApi = await import('./command-catalog.js');
  protocolApi = await import('./protocol.js');
  clientApi = await import('./LocalBridgeClient.js');
} catch (error) {
  assert.fail(`local bridge modules must exist: ${error.message}`);
}

const { getCommandDefinition } = catalogApi;
const { createBridgeRequest, validateBridgeResponse, BRIDGE_PROTOCOL_VERSION } = protocolApi;
const { LocalBridgeClient } = clientApi;

test('command catalog contains allowlisted commands and no unrestricted shell command', () => {
  assert.equal(getCommandDefinition('git.status').tool, 'git');
  assert.equal(getCommandDefinition('vscode.openFile').tool, 'vscode');
  assert.equal(getCommandDefinition('shell.exec'), null);
});

test('createBridgeRequest produces a versioned immutable request', () => {
  const request = createBridgeRequest('git.status', { repository: '/repo' }, {
    requestId: 'req-1',
    workspaceId: 'workspace-1',
  });
  assert.equal(request.version, BRIDGE_PROTOCOL_VERSION);
  assert.equal(request.command, 'git.status');
  assert.equal(request.requestId, 'req-1');
  assert.equal(Object.isFrozen(request), true);
});

test('validateBridgeResponse rejects mismatched request IDs', () => {
  const request = createBridgeRequest('git.status', {}, { requestId: 'req-2' });
  assert.throws(() => validateBridgeResponse({
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: 'wrong',
    result: { status: 'completed' },
  }, request), /request ID/i);
});

test('LocalBridgeClient fails closed when no transport is configured', async () => {
  const client = new LocalBridgeClient();
  const result = await client.execute('git.status', { repository: '/repo' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'BRIDGE_UNAVAILABLE');
});

test('LocalBridgeClient requests approval before write commands', async () => {
  const approvals = [];
  const transport = {
    async request(request) {
      return {
        version: BRIDGE_PROTOCOL_VERSION,
        requestId: request.requestId,
        result: {
          operationId: request.requestId,
          command: request.command,
          status: 'completed',
          data: { written: true },
          startedAt: 1,
          completedAt: 2,
        },
      };
    },
  };
  const client = new LocalBridgeClient({
    transport,
    approve: async (request) => {
      approvals.push(request);
      return true;
    },
    requestIdFactory: () => 'req-write',
  });

  const result = await client.execute('file.write', { path: '/repo/a.js', content: 'x' });
  assert.equal(result.ok, true);
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].command, 'file.write');
});
