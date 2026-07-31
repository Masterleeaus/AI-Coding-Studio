/**
 * Background Service Progress Tracking
 * Wraps message handlers with automatic progress logging
 */

import { getRuntimeKernel } from '../runtime/singleton.js';

/**
 * Get runtime kernel, with graceful fallback if unavailable
 */
function getKernel() {
  try {
    return getRuntimeKernel();
  } catch {
    return null;
  }
}

/**
 * Wraps an async handler with progress tracking
 * @param {string} agentName - Name of the agent (e.g., 'background-youtube', 'background-github')
 * @param {string} actionId - Unique action identifier
 * @param {string} description - Human-readable description of the action
 * @param {Function} handler - Async function to execute
 * @returns {Promise} Handler result
 */
export async function trackProgress(agentName, actionId, description, handler) {
  const kernel = getKernel();

  // Log start
  if (kernel?.progress) {
    kernel.progress.logStart(agentName, actionId, description);
  }

  try {
    // Execute handler
    const result = await handler();

    // Log completion
    if (kernel?.progress) {
      const message = result?.message || 'Operation completed successfully';
      kernel.progress.logComplete(agentName, actionId, message);
    }

    return result;
  } catch (error) {
    // Log failure
    if (kernel?.progress) {
      const message = error instanceof Error ? error.message : String(error);
      kernel.progress.logFail(agentName, actionId, message);
    }

    // Re-throw to maintain error handling
    throw error;
  }
}

/**
 * Create a tracked fetch operation
 * Useful for HTTP operations like fetching GitHub data or web content
 */
export async function trackedFetch(agentName, actionId, description, fetchFn) {
  return trackProgress(agentName, actionId, description, async () => {
    const result = await fetchFn();
    return {
      message: `${description} completed`,
      ...result,
    };
  });
}

/**
 * Create a workflow for multi-step background operations
 * Useful for complex operations like processing multiple repositories
 */
export async function createBackgroundWorkflow(workflowType, agentName) {
  const kernel = getKernel();

  if (!kernel?.progress) {
    // Return a no-op workflow if progress not available
    return {
      steps: [],
      async execute(repository, branch, steps) {
        const results = [];
        for (const step of steps) {
          try {
            results.push(await step.handler());
          } catch (error) {
            throw error;
          }
        }
        return { steps: results, state: 'COMPLETED' };
      },
    };
  }

  // Start workflow
  const workflow = await kernel.progress.startWorkflow(
    workflowType,
    globalThis.location?.href || 'background-service',
    'main',
    { agentName }
  );

  return {
    workflowId: workflow.id,
    async execute(repository, branch, steps) {
      const results = [];
      const completedSteps = [];

      try {
        for (const step of steps) {
          // Update state
          await kernel.progress.transitionWorkflow(workflow.id, 'RUNNING', {
            agentName,
            currentPhase: step.title,
            activeStep: step.id,
            completedSteps,
          });

          // Execute step
          try {
            const result = await step.handler();
            results.push({ id: step.id, success: true, result });
            completedSteps.push(step.id);
          } catch (error) {
            results.push({ id: step.id, success: false, error: error.message });

            // Stop on first error
            await kernel.progress.transitionWorkflow(workflow.id, 'FAILED', {
              agentName,
              completedSteps,
              errors: [{ step: step.id, error: error.message }],
            });

            throw error;
          }
        }

        // Mark complete
        await kernel.progress.transitionWorkflow(workflow.id, 'COMPLETED', {
          agentName,
          completedSteps,
          results: results.length,
        });

        return {
          workflowId: workflow.id,
          state: 'COMPLETED',
          steps: results,
          completedSteps,
        };
      } catch (error) {
        await kernel.progress.transitionWorkflow(workflow.id, 'FAILED', {
          agentName,
          errors: [{ error: error.message }],
          completedSteps,
        }).catch(() => {});

        throw error;
      }
    },
  };
}

/**
 * Get progress summary for a background agent
 */
export function getProgressSummary(agentName) {
  const kernel = getKernel();

  if (!kernel?.progress) {
    return null;
  }

  const agentEntries = kernel.progress.getAgentProgress(agentName);
  const summary = kernel.progress.getProgressSummary();

  return {
    agent: agentName,
    totalActions: agentEntries.length,
    completed: agentEntries.filter(e => e.status === 'completed').length,
    failed: agentEntries.filter(e => e.status === 'failed').length,
    recentActions: agentEntries.slice(-5),
    globalSummary: summary,
  };
}

/**
 * Generate progress report for background operations
 */
export function generateReport(agentName) {
  const kernel = getKernel();

  if (!kernel?.progress) {
    return 'Progress tracking not available';
  }

  return kernel.progress.generateProgressReport();
}
