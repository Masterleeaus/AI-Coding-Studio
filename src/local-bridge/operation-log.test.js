import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createOperationLog } from './operation-log.js';

test('evicts oldest entries and redacts payloads', () => {
  const log = createOperationLog({ maxEntries: 2 });
  log.append({ requestId: '1', command: 'files.read', parameters: { token: 'secret' } });
  log.append({ requestId: '2', command: 'files.read' });
  log.append({ requestId: '3', command: 'files.read' });
  const entries = log.list();
  assert.deepEqual(entries.map((entry) => entry.requestId), ['2', '3']);
  assert.equal(log.size(), 2);
});

test('returns immutable snapshots and clears records', () => {
  const log = createOperationLog({ maxEntries: 2 });
  log.append({ requestId: '1', command: 'git.status', parameters: { apiKey: 'secret' } });
  const first = log.list();
  first[0].requestId = 'changed';
  first[0].parameters.apiKey = 'changed';
  const second = log.list();
  assert.equal(second[0].requestId, '1');
  assert.equal(second[0].parameters.apiKey, '[REDACTED]');
  log.clear();
  assert.equal(log.size(), 0);
});
