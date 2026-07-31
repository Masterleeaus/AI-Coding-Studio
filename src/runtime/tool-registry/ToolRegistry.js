import { TOOL_DEFINITIONS } from './tool-definitions.js';

function clone(value) {
  return structuredClone(value);
}

export class ToolRegistry {
  constructor(definitions = TOOL_DEFINITIONS) {
    this.tools = new Map(definitions.map((definition) => [definition.id, {
      ...definition,
      capabilities: [...definition.capabilities],
      available: false,
      version: null,
      executable: null,
      detectedAt: null,
      metadata: {},
    }]));
  }

  applyDiscovery(discovery = []) {
    if (!Array.isArray(discovery)) throw new TypeError('Tool discovery must be an array');
    for (const detected of discovery) {
      if (!detected || typeof detected.id !== 'string') continue;
      const current = this.tools.get(detected.id);
      if (!current) continue;
      this.tools.set(detected.id, {
        ...current,
        available: detected.available === true,
        version: detected.version || null,
        executable: detected.executable || null,
        detectedAt: detected.detectedAt || Date.now(),
        metadata: detected.metadata && typeof detected.metadata === 'object'
          ? clone(detected.metadata)
          : {},
      });
    }
    return this.snapshot();
  }

  get(toolId) {
    const tool = this.tools.get(toolId);
    return tool ? clone(tool) : null;
  }

  list({ availableOnly = false } = {}) {
    return Array.from(this.tools.values())
      .filter((tool) => !availableOnly || tool.available)
      .map(clone);
  }

  hasCapability(capability) {
    return Array.from(this.tools.values()).some(
      (tool) => tool.available && tool.capabilities.includes(capability),
    );
  }

  snapshot() {
    return { tools: this.list() };
  }
}

export default ToolRegistry;
