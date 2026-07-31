import { WORKFLOW_DEFINITIONS } from './workflow-definitions.js';

export class WorkflowRegistry {
  constructor(definitions = WORKFLOW_DEFINITIONS) {
    this.workflows = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  register(definition) {
    if (!definition || typeof definition.id !== 'string' || !Array.isArray(definition.steps)) {
      throw new TypeError('Invalid workflow definition');
    }
    if (this.workflows.has(definition.id)) throw new Error(`Workflow already registered: ${definition.id}`);
    const steps = Object.freeze(definition.steps.map((step) => Object.freeze({ ...step })));
    const normalized = Object.freeze({ ...definition, steps });
    this.workflows.set(normalized.id, normalized);
    return normalized;
  }

  get(id) {
    return this.workflows.get(id) || null;
  }

  list() {
    return Array.from(this.workflows.values());
  }
}

export default WorkflowRegistry;
