import { LocalBridgeClient } from './local-bridge/LocalBridgeClient.js';
import { ToolRegistry } from './tool-registry/ToolRegistry.js';
import { RepositoryRuntime } from './repository/RepositoryRuntime.js';
import { WorkflowRegistry } from './workflow/WorkflowRegistry.js';

export class RuntimeKernel {
  constructor({ bridge = null, transport = null, approve = null, approvalPolicy = null } = {}) {
    this.bridge = bridge || new LocalBridgeClient({
      transport,
      approve,
      approvalPolicy: approvalPolicy || { autoApprove: ['read'] },
    });
    this.tools = new ToolRegistry();
    this.workflows = new WorkflowRegistry();
    this.repositories = new RepositoryRuntime({ bridge: this.bridge });
    this.initialized = false;
    this.lastDiscoveryError = null;
  }

  async init() {
    if (this.initialized) return this.getStatus();
    this.initialized = true;

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
    return Object.freeze({
      initialized: this.initialized,
      bridgeAvailable: Boolean(this.bridge.available),
      workflowCount: this.workflows.list().length,
      availableToolCount: this.tools.list({ availableOnly: true }).length,
      lastDiscoveryError: this.lastDiscoveryError ? structuredClone(this.lastDiscoveryError) : null,
    });
  }
}

export default RuntimeKernel;
