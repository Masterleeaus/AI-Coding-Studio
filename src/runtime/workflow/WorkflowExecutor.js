/**
 * Workflow Executor - Integrates ProgressRuntime with workflow execution
 * Demonstrates pattern for all agents to follow when executing work
 */

export class WorkflowExecutorError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WorkflowExecutorError';
    this.code = code;
  }
}

/**
 * Create a workflow executor that logs progress to RuntimeKernel
 * @param {Object} options
 * @param {RuntimeKernel} options.kernel - RuntimeKernel instance with progress tracking
 * @param {string} options.agentName - Name of this agent (e.g., 'agent-audit', 'agent-fix')
 * @returns {Object} Executor with methods to run workflow steps with progress tracking
 */
export function createWorkflowExecutor(options = {}) {
  const { kernel = null, agentName = 'system' } = options;

  if (!kernel) {
    throw new WorkflowExecutorError('KERNEL_REQUIRED', 'RuntimeKernel instance is required');
  }
  if (!kernel.progress) {
    throw new WorkflowExecutorError('PROGRESS_UNAVAILABLE', 'Kernel progress tracking not available');
  }

  return Object.freeze({
    /**
     * Execute a workflow step with automatic progress logging
     * @param {string} stepId - Step identifier
     * @param {string} stepTitle - Human-readable step title
     * @param {Function} stepHandler - Async function that executes the step
     * @returns {Promise<Object>} Step result with { success, data, error, durationMs }
     */
    async executeStep(stepId, stepTitle, stepHandler) {
      const startTime = Date.now();
      const action = stepId;

      try {
        // Log step start
        kernel.progress.logStart(agentName, action, stepTitle);

        // Execute the step
        const result = await stepHandler();

        // Log completion
        const durationMs = Date.now() - startTime;
        kernel.progress.logComplete(
          agentName,
          action,
          result?.message || 'Step completed successfully',
          durationMs
        );

        return {
          success: true,
          data: result,
          durationMs,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Log failure
        kernel.progress.logFail(agentName, action, errorMessage);

        return {
          success: false,
          error: errorMessage,
          durationMs,
        };
      }
    },

    /**
     * Execute a multi-step workflow with progress tracking
     * @param {string} workflowType - Type of workflow (e.g., 'DEEP_AUDIT', 'BUG_FIX')
     * @param {string} repository - Repository path
     * @param {string} branch - Branch name
     * @param {Array} steps - Array of { id, title, handler } objects
     * @returns {Promise<Object>} Workflow result with completion status and findings
     */
    async executeWorkflow(workflowType, repository, branch, steps = []) {
      if (!Array.isArray(steps)) {
        throw new WorkflowExecutorError('INVALID_STEPS', 'Steps must be an array');
      }

      // Start workflow
      const workflow = await kernel.progress.startWorkflow(
        workflowType,
        repository,
        branch,
        { agentName }
      );

      const results = [];
      const findings = [];
      const errors = [];
      const completedSteps = [];

      try {
        // Execute each step
        for (const step of steps) {
          const { id, title, handler } = step;

          // Update workflow state
          await kernel.progress.transitionWorkflow(workflow.id, 'RUNNING', {
            agentName,
            currentPhase: title,
            activeStep: id,
            completedSteps,
          });

          // Execute step
          const result = await this.executeStep(id, title, handler);
          results.push({ id, ...result });

          if (result.success) {
            completedSteps.push(id);
            if (result.data?.findings) {
              findings.push(...result.data.findings);
            }
          } else {
            errors.push({ step: id, error: result.error });
            // Stop on first error unless configured otherwise
            break;
          }
        }

        // Mark workflow complete
        const finalState = errors.length > 0 ? 'FAILED' : 'COMPLETED';
        await kernel.progress.transitionWorkflow(workflow.id, finalState, {
          agentName,
          findings,
          completedSteps,
          errors: errors.length > 0 ? errors : [],
        });

        return {
          workflowId: workflow.id,
          type: workflowType,
          state: finalState,
          repository,
          branch,
          steps: results,
          findings,
          errors,
          completedSteps,
        };
      } catch (error) {
        // Mark workflow as failed
        await kernel.progress.transitionWorkflow(workflow.id, 'FAILED', {
          agentName,
          errors: [{ error: error.message }],
          completedSteps,
        }).catch(() => {}); // Ignore transition errors

        throw new WorkflowExecutorError(
          'WORKFLOW_FAILED',
          `Workflow execution failed: ${error.message}`
        );
      }
    },

    /**
     * Get the agent name this executor is using
     */
    getAgentName() {
      return agentName;
    },

    /**
     * Get current progress summary
     */
    getProgressSummary() {
      return kernel.progress.getProgressSummary();
    },

    /**
     * Generate progress report for this agent
     */
    generateProgressReport(repositoryStatus = null) {
      const agentEntries = kernel.progress.getAgentProgress(agentName);
      const summary = kernel.progress.getProgressSummary();

      let md = `# ${agentName} Progress Report\n\n`;
      md += `**Generated:** ${new Date().toISOString()}\n\n`;

      md += '## Summary\n\n';
      md += `- **Total Actions:** ${summary.totalEntries}\n`;
      md += `- **Completed:** ${summary.byStatus.completed}\n`;
      md += `- **Failed:** ${summary.byStatus.failed}\n`;
      md += `- **In Progress:** ${summary.byStatus.in_progress}\n`;

      if (summary.totalDurationMs) {
        const seconds = (summary.totalDurationMs / 1000).toFixed(1);
        md += `- **Total Duration:** ${seconds}s\n`;
      }

      md += '\n## Recent Activities\n\n';
      md += '| Action | Status | Duration | Details |\n';
      md += '|--------|--------|----------|----------|\n';

      for (const entry of agentEntries.slice(-10)) {
        const status = entry.status === 'completed' ? '✅' : entry.status === 'failed' ? '❌' : '⏳';
        const duration = entry.durationMs ? `${(entry.durationMs / 1000).toFixed(1)}s` : '-';
        const details = entry.details || '-';
        md += `| ${entry.action} | ${status} ${entry.status} | ${duration} | ${details} |\n`;
      }

      return md;
    },
  });
}
