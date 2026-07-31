import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createWorkflowExecutor, WorkflowExecutorError } from './WorkflowExecutor.js';
import { createAgentProgressLog } from '../progress/agent-progress-log.js';
import { createProgressRuntime } from '../progress/progress-runtime.js';

// Mock WorkflowStore for tests
function createMockWorkflowStore() {
  const workflows = new Map();

  return Object.freeze({
    async save(workflow) {
      workflows.set(workflow.id, workflow);
    },
    async get(id) {
      return workflows.get(id) || null;
    },
    async list() {
      return Array.from(workflows.values());
    },
    async remove(id) {
      workflows.delete(id);
    },
  });
}

// Mock RuntimeKernel with progress system
function createMockKernel() {
  const workflowStore = createMockWorkflowStore();
  const progress = createProgressRuntime({
    workflowStore,
    bridge: null,
    storage: null,
  });

  return {
    progress,
  };
}

test('executes a single step with progress logging', async () => {
  const kernel = createMockKernel();
  const executor = createWorkflowExecutor({ kernel, agentName: 'test-agent' });

  const result = await executor.executeStep('scan', 'Scan Repository', async () => ({
    message: 'Found 15 files',
    findings: [],
  }));

  assert.equal(result.success, true);
  assert.equal(result.data.message, 'Found 15 files');
  assert.ok(result.durationMs >= 0);

  // Check progress was logged (start + complete = 2 entries)
  const summary = executor.getProgressSummary();
  assert.ok(summary.totalEntries >= 2);
  assert.ok(summary.byStatus.completed >= 1);
});

test('handles step failures with progress logging', async () => {
  const kernel = createMockKernel();
  const executor = createWorkflowExecutor({ kernel, agentName: 'test-agent' });

  const result = await executor.executeStep('scan', 'Scan Repository', async () => {
    throw new Error('Network timeout');
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'Network timeout');
  assert.ok(result.durationMs >= 0);

  // Check failure was logged (start + fail = 2 entries)
  const summary = executor.getProgressSummary();
  assert.ok(summary.totalEntries >= 2);
  assert.ok(summary.byStatus.failed >= 1);
});

test('executes a multi-step workflow', async () => {
  const kernel = createMockKernel();
  const executor = createWorkflowExecutor({ kernel, agentName: 'audit-agent' });

  const steps = [
    {
      id: 'inventory',
      title: 'Inventory repository',
      handler: async () => ({
        message: 'Found 50 files',
        findings: ['Unused dependency: lodash'],
      }),
    },
    {
      id: 'analyze',
      title: 'Analyze structure',
      handler: async () => ({
        message: 'Analysis complete',
        findings: ['Circular import: a.js -> b.js -> a.js'],
      }),
    },
  ];

  const result = await executor.executeWorkflow(
    'DEEP_AUDIT',
    '/home/user/repo',
    'main',
    steps
  );

  assert.equal(result.type, 'DEEP_AUDIT');
  assert.equal(result.state, 'COMPLETED');
  assert.equal(result.completedSteps.length, 2);
  assert.equal(result.findings.length, 2);
  assert.equal(result.errors.length, 0);

  // Check progress was logged for all steps (includes workflow lifecycle events)
  const summary = executor.getProgressSummary();
  assert.ok(summary.totalEntries >= 4); // At least the 2 step completions
  assert.ok(summary.byStatus.completed >= 2); // At least the 2 completed steps
});

test('stops workflow on step failure', async () => {
  const kernel = createMockKernel();
  const executor = createWorkflowExecutor({ kernel, agentName: 'audit-agent' });

  const steps = [
    {
      id: 'inventory',
      title: 'Inventory repository',
      handler: async () => ({
        message: 'Found 50 files',
      }),
    },
    {
      id: 'analyze',
      title: 'Analyze structure',
      handler: async () => {
        throw new Error('Analysis failed');
      },
    },
    {
      id: 'report',
      title: 'Generate report',
      handler: async () => ({
        message: 'Report generated',
      }),
    },
  ];

  const result = await executor.executeWorkflow(
    'DEEP_AUDIT',
    '/home/user/repo',
    'main',
    steps
  );

  assert.equal(result.state, 'FAILED');
  assert.equal(result.completedSteps.length, 1); // Only inventory completed
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].step, 'analyze');

  // Workflow only processes inventory (success) and analyze (failure), stops after 2 steps
  const summary = executor.getProgressSummary();
  assert.ok(summary.totalEntries >= 5); // Includes workflow lifecycle events
  assert.ok(summary.byStatus.failed >= 1); // At least the analyze step failure
});

test('requires kernel with progress system', () => {
  const kernelWithoutProgress = { };

  assert.throws(
    () => createWorkflowExecutor({ kernel: kernelWithoutProgress }),
    (error) => error instanceof WorkflowExecutorError && error.code === 'PROGRESS_UNAVAILABLE'
  );
});

test('generates progress report for agent', async () => {
  const kernel = createMockKernel();
  const executor = createWorkflowExecutor({ kernel, agentName: 'test-agent' });

  await executor.executeStep('scan', 'Scan', async () => ({
    message: 'Done',
  }));

  const report = executor.generateProgressReport();

  assert.ok(report.includes('test-agent Progress Report'));
  assert.ok(report.includes('Total Actions:**'));
  assert.ok(report.includes('Completed:**'));
  assert.ok(report.includes('✅') && report.includes('completed'));
});
