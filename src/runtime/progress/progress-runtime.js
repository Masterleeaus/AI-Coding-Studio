/**
 * Progress Runtime Integration
 * Wires together: Workflow State, Agent Progress Log, Repository Status, Documentation
 * Provides unified API for tracking and documenting work
 */

import { createAgentProgressLog } from './agent-progress-log.js';
import { createRepositoryStatus } from './repository-status.js';
import { createProgressDocumentation } from './progress-documentation.js';

export class ProgressRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProgressRuntimeError';
    this.code = code;
  }
}

/**
 * Create unified progress runtime
 * Integrates: workflows, agent log, repo status, auto-documentation
 */
export function createProgressRuntime(options = {}) {
  const workflowStore = options.workflowStore || null;
  const operationLog = options.operationLog || null;
  const bridge = options.bridge || null;
  const storage = options.storage || null;

  const agentLog = createAgentProgressLog({ storage, maxEntries: 1000 });
  const repoStatus = bridge ? createRepositoryStatus({ bridge, operationLog }) : null;
  const docGenerator = createProgressDocumentation();

  return Object.freeze({
    // =========== Workflow Management ===========

    /**
     * Start a new workflow
     */
    async startWorkflow(type, repository, branch, context = {}) {
      if (!workflowStore) {
        throw new ProgressRuntimeError('WORKFLOW_STORE_UNAVAILABLE', 'WorkflowStore not configured');
      }

      const id = context.workflowId || `${type}-${Date.now()}`;
      const workflow = {
        id,
        type,
        repository,
        branch,
        state: 'DRAFT',
        currentPhase: null,
        currentPass: 1,
        completedSteps: [],
        activeStep: null,
        approvals: [],
        changedFiles: [],
        findings: [],
        testRuns: [],
        errors: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Log agent action
      agentLog.start(context.agentName || 'system', `Start workflow: ${type}`, JSON.stringify({ repository, branch }));

      // Persist workflow
      try {
        await workflowStore.save(workflow);
      } catch (error) {
        throw new ProgressRuntimeError('WORKFLOW_SAVE_FAILED', `Failed to save workflow: ${error.message}`);
      }

      return workflow;
    },

    /**
     * Transition workflow to new state
     */
    async transitionWorkflow(workflowId, newState, context = {}) {
      if (!workflowStore) {
        throw new ProgressRuntimeError('WORKFLOW_STORE_UNAVAILABLE', 'WorkflowStore not configured');
      }

      let workflow;
      try {
        workflow = await workflowStore.get(workflowId);
      } catch (error) {
        throw new ProgressRuntimeError('WORKFLOW_LOAD_FAILED', `Failed to load workflow: ${error.message}`);
      }

      if (!workflow) {
        throw new ProgressRuntimeError('WORKFLOW_NOT_FOUND', `Workflow ${workflowId} not found`);
      }

      const updated = {
        ...workflow,
        state: newState,
        currentPhase: context.currentPhase || workflow.currentPhase,
        activeStep: context.activeStep || workflow.activeStep,
        currentPass: context.currentPass || workflow.currentPass,
        completedSteps: context.completedSteps || workflow.completedSteps,
        approvals: context.approvals || workflow.approvals,
        changedFiles: context.changedFiles || workflow.changedFiles,
        findings: context.findings || workflow.findings,
        testRuns: context.testRuns || workflow.testRuns,
        errors: context.errors || workflow.errors,
        updatedAt: Date.now(),
      };

      agentLog.complete(
        context.agentName || 'system',
        `Transition workflow to ${newState}`,
        `${workflowId}: ${workflow.state} → ${newState}`,
      );

      try {
        await workflowStore.save(updated);
      } catch (error) {
        throw new ProgressRuntimeError('WORKFLOW_SAVE_FAILED', `Failed to save workflow: ${error.message}`);
      }

      return updated;
    },

    /**
     * Get workflow by ID
     */
    async getWorkflow(workflowId) {
      if (!workflowStore) return null;
      try {
        return await workflowStore.get(workflowId);
      } catch (error) {
        console.error('Failed to get workflow:', error);
        return null;
      }
    },

    /**
     * List all workflows
     */
    async listWorkflows(filter = null) {
      if (!workflowStore) return [];
      try {
        const workflows = await workflowStore.list();
        if (!filter) return workflows;
        return workflows.filter((w) => {
          if (filter.type && w.type !== filter.type) return false;
          if (filter.state && w.state !== filter.state) return false;
          if (filter.repository && w.repository !== filter.repository) return false;
          return true;
        });
      } catch (error) {
        console.error('Failed to list workflows:', error);
        return [];
      }
    },

    // =========== Agent Progress Logging ===========

    /**
     * Log agent starting an action
     */
    logStart(agentName, action, details = null) {
      return agentLog.start(agentName, action, details);
    },

    /**
     * Log agent completing an action
     */
    logComplete(agentName, action, details = null, durationMs = null) {
      return agentLog.complete(agentName, action, details, durationMs);
    },

    /**
     * Log agent failure
     */
    logFail(agentName, action, error, details = null) {
      return agentLog.fail(agentName, action, error, details);
    },

    /**
     * Get agent progress entries
     */
    getAgentProgress(agentName = null) {
      if (agentName) return agentLog.forAgent(agentName);
      return agentLog.list();
    },

    /**
     * Get progress summary
     */
    getProgressSummary() {
      return agentLog.summary();
    },

    // =========== Repository Status ===========

    /**
     * Get repository status
     */
    async getRepositoryStatus(repositoryPath) {
      if (!repoStatus) {
        throw new ProgressRuntimeError('BRIDGE_UNAVAILABLE', 'LocalBridgeClient not configured');
      }
      return repoStatus.getStatus(repositoryPath);
    },

    /**
     * Check if repository is dirty
     */
    async isRepositoryDirty(repositoryPath) {
      if (!repoStatus) return null;
      return repoStatus.isDirty(repositoryPath);
    },

    /**
     * Get current branch
     */
    async getCurrentBranch(repositoryPath) {
      if (!repoStatus) return null;
      return repoStatus.getCurrentBranch(repositoryPath);
    },

    // =========== Documentation Generation ===========

    /**
     * Generate progress report markdown
     */
    generateProgressReport(repositoryStatus = null) {
      return docGenerator.generateProgressReport(agentLog, repositoryStatus);
    },

    /**
     * Generate workflow report markdown
     */
    generateWorkflowReport(workflow) {
      return docGenerator.generateWorkflowReport(workflow);
    },

    /**
     * Generate activity timeline markdown
     */
    generateActivityTimeline() {
      return docGenerator.generateActivityTimeline(agentLog);
    },

    /**
     * Generate repository overview markdown
     */
    generateRepositoryOverview(repositories = []) {
      return docGenerator.generateRepositoryOverview(repositories, agentLog);
    },

    /**
     * Generate documentation index
     */
    generateIndex(files = []) {
      return docGenerator.generateIndex(files);
    },

    // =========== Batch Operations ===========

    /**
     * Export all progress data as JSON
     */
    async exportData() {
      let workflows = [];
      if (workflowStore) {
        try {
          workflows = await workflowStore.list();
        } catch (error) {
          console.error('Failed to export workflows:', error);
        }
      }

      const agentEntries = agentLog.export();
      const summary = agentLog.summary();

      return {
        exported: new Date().toISOString(),
        workflows,
        agentProgress: agentEntries,
        summary,
      };
    },

    /**
     * Generate full progress report with all sections
     */
    async generateFullReport(workflowId = null, repositoryPath = null) {
      let md = '# Full Progress Report\n\n';
      md += `**Generated:** ${new Date().toISOString()}\n\n`;

      // Summary
      md += '---\n\n';
      const summary = agentLog.summary();
      md += docGenerator
        .generateProgressReport(
          repositoryPath ? await this.getRepositoryStatus(repositoryPath) : null,
        )
        .split('\n')
        .slice(2) // Skip title
        .join('\n');
      md += '\n---\n\n';

      // Workflow if specified
      if (workflowId) {
        const workflow = await this.getWorkflow(workflowId);
        if (workflow) {
          md += docGenerator.generateWorkflowReport(workflow);
          md += '\n---\n\n';
        }
      }

      // Activity timeline
      md += docGenerator.generateActivityTimeline();

      return md;
    },

    /**
     * Clear all progress data
     */
    async clearAllData() {
      agentLog.clear();
      if (workflowStore) {
        const workflows = await workflowStore.list();
        for (const workflow of workflows) {
          await workflowStore.remove(workflow.id);
        }
      }
    },

    // =========== Direct Access ===========

    /**
     * Get underlying agent log
     */
    getAgentLog() {
      return agentLog;
    },

    /**
     * Get underlying workflow store
     */
    getWorkflowStore() {
      return workflowStore;
    },

    /**
     * Get underlying repository status
     */
    getRepositoryStatus() {
      return repoStatus;
    },
  });
}
