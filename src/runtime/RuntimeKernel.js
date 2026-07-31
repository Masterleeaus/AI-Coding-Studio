import { LocalBridgeClient } from './local-bridge/LocalBridgeClient.js';
import { ToolRegistry } from './tool-registry/ToolRegistry.js';
import { RepositoryRuntime } from './repository/RepositoryRuntime.js';
import { WorkflowRegistry } from './workflow/WorkflowRegistry.js';
import { createProgressRuntime } from './progress/progress-runtime.js';
import { createWorkflowStore } from '../workflows/workflow-store.js';

export class RuntimeKernel {
  constructor({ bridge = null, transport = null, approve = null, approvalPolicy = null, storage = null } = {}) {
    this.bridge = bridge || new LocalBridgeClient({
      transport,
      approve,
      approvalPolicy: approvalPolicy || { autoApprove: ['read'] },
    });
    this.tools = new ToolRegistry();
    this.workflows = new WorkflowRegistry();
    this.repositories = new RepositoryRuntime({ bridge: this.bridge });

    // Initialize progress tracking system
    this.progress = null;
    const resolvedStorage = storage || globalThis.chrome?.storage?.local;
    if (resolvedStorage) {
      try {
        const workflowStore = createWorkflowStore({
          storage: resolvedStorage,
          prefix: 'bds:workflow:v1',
        });
        this.progress = createProgressRuntime({
          workflowStore,
          bridge: this.bridge,
          storage: resolvedStorage,
        });
      } catch (error) {
        console.warn('Progress tracking system unavailable:', error.message);
      }
    }

    this.initialized = false;
    this.lastDiscoveryError = null;
  }

  async init() {
    if (this.initialized) return this.getStatus();
    this.initialized = true;

    // Initialize progress system
    if (this.progress) {
      try {
        await this.progress.getAgentLog().load();
      } catch (error) {
        console.error('Failed to load agent progress log:', error);
      }
    }

    if (this.bridge.available) {
      const result = await this.bridge.execute('tool.detect', {});
      if (result.ok && Array.isArray(result.data?.tools)) {
        this.tools.applyDiscovery(result.data.tools);
      } else if (!result.ok) {
        this.lastDiscoveryError = result.error;
      }
    }

    return this.getStatus();
  }

  getStatus() {
    const progressSummary = this.progress?.getProgressSummary();
    return Object.freeze({
      initialized: this.initialized,
      bridgeAvailable: Boolean(this.bridge.available),
      workflowCount: this.workflows.list().length,
      availableToolCount: this.tools.list({ availableOnly: true }).length,
      lastDiscoveryError: this.lastDiscoveryError ? structuredClone(this.lastDiscoveryError) : null,
      ...(progressSummary && {
        progress: {
          agentActivityCount: progressSummary.totalEntries,
          completedActivities: progressSummary.byStatus.completed,
          failedActivities: progressSummary.byStatus.failed,
          activeAgents: progressSummary.uniqueAgents,
        },
      }),
    });
  }
}

export default RuntimeKernel;
