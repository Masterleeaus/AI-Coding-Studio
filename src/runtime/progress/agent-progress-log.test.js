import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createAgentProgressLog, AgentProgressError } from './agent-progress-log.js';

test('logs and retrieves entries', () => {
  const log = createAgentProgressLog();

  const entry1 = log.start('agent-1', 'analyze-code', 'Analyzing repository structure');
  assert.equal(entry1.agentName, 'agent-1');
  assert.equal(entry1.action, 'analyze-code');
  assert.equal(entry1.status, 'in_progress');
  assert.equal(entry1.details, 'Analyzing repository structure');

  const entry2 = log.complete('agent-1', 'analyze-code', 'Found 50 files', 1000);
  assert.equal(entry2.status, 'completed');
  assert.equal(entry2.details, 'Found 50 files');
  assert.equal(entry2.durationMs, 1000);

  assert.equal(log.size(), 2);
});

test('filters entries by agent', () => {
  const log = createAgentProgressLog();

  log.start('agent-1', 'task-a');
  log.start('agent-2', 'task-b');
  log.start('agent-1', 'task-c');

  const agent1Entries = log.forAgent('agent-1');
  assert.equal(agent1Entries.length, 2);
  assert(agent1Entries.every((e) => e.agentName === 'agent-1'));
});

test('filters entries by status', () => {
  const log = createAgentProgressLog();

  log.start('agent', 'task-1');
  log.complete('agent', 'task-2', null, 100);
  log.fail('agent', 'task-3', 'Network error');

  const completed = log.byStatus('completed');
  assert.equal(completed.length, 1);
  assert.equal(completed[0].action, 'task-2');

  const failed = log.byStatus('failed');
  assert.equal(failed.length, 1);
  assert.equal(failed[0].error, 'Network error');
});

test('provides summary statistics', () => {
  const log = createAgentProgressLog();

  log.start('agent-1', 'task-a');
  log.complete('agent-1', 'task-b', null, 500);
  log.complete('agent-2', 'task-c', null, 1000);
  log.fail('agent-2', 'task-d', 'Error');

  const summary = log.summary();
  assert.equal(summary.totalEntries, 4);
  assert.equal(summary.byStatus.in_progress, 1);
  assert.equal(summary.byStatus.completed, 2);
  assert.equal(summary.byStatus.failed, 1);
  assert.equal(summary.uniqueAgents, 2);
  assert.equal(summary.byAgent['agent-1'], 2);
  assert.equal(summary.byAgent['agent-2'], 2);
  assert.equal(summary.totalDurationMs, 1500);
});

test('retrieves latest entries', () => {
  const log = createAgentProgressLog();

  for (let i = 0; i < 10; i++) {
    log.start('agent', `task-${i}`);
  }

  const latest = log.latest(3);
  assert.equal(latest.length, 3);
  assert.equal(latest[0].action, 'task-7');
  assert.equal(latest[2].action, 'task-9');
});

test('respects max entries limit', () => {
  const log = createAgentProgressLog({ maxEntries: 5 });

  for (let i = 0; i < 10; i++) {
    log.start('agent', `task-${i}`);
  }

  assert.equal(log.size(), 5);
  const entries = log.list();
  assert.equal(entries[0].action, 'task-5');
  assert.equal(entries[4].action, 'task-9');
});

test('rejects invalid entries', () => {
  const log = createAgentProgressLog();

  assert.throws(
    () => log.log({ action: 'task' }), // missing agentName
    (error) => error instanceof AgentProgressError && error.code === 'MISSING_AGENT_NAME',
  );

  assert.throws(
    () => log.log({ agentName: 'agent' }), // missing action
    (error) => error instanceof AgentProgressError && error.code === 'MISSING_ACTION',
  );

  assert.throws(
    () => log.log({ agentName: 'agent', action: 'task', status: 'invalid' }),
    (error) => error instanceof AgentProgressError && error.code === 'INVALID_STATUS',
  );
});

test('clears all entries', () => {
  const log = createAgentProgressLog();

  log.start('agent', 'task-1');
  log.start('agent', 'task-2');
  assert.equal(log.size(), 2);

  log.clear();
  assert.equal(log.size(), 0);
});

test('exports entries as JSON', () => {
  const log = createAgentProgressLog();

  log.start('agent-1', 'task-a');
  log.complete('agent-1', 'task-b', null, 100);

  const exported = log.export();
  assert(Array.isArray(exported));
  assert.equal(exported.length, 2);
  assert.equal(exported[0].agentName, 'agent-1');
});

test('filters by timestamp', () => {
  const log = createAgentProgressLog();
  const now = Date.now();

  log.log({ agentName: 'agent', action: 'old', startedAt: now - 10000 });
  log.log({ agentName: 'agent', action: 'recent', startedAt: now });

  const recent = log.list({ since: now - 5000 });
  assert.equal(recent.length, 1);
  assert.equal(recent[0].action, 'recent');
});
