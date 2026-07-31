/**
 * Agent Progress Log - Track agent work and activities
 * Shared access point for all agents to log what they're doing
 */

const DEFAULT_MAX_ENTRIES = 1000;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export class AgentProgressError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AgentProgressError';
    this.code = code;
  }
}

/**
 * Create an in-memory + persistent agent progress log
 * Tracks: agent name, action type, status, details, timestamps
 */
export function createAgentProgressLog(options = {}) {
  const maxEntries = options.maxEntries === undefined ? DEFAULT_MAX_ENTRIES : options.maxEntries;
  const storage = options.storage || null;
  const storageKey = options.storageKey || 'bds:agent-progress:v1';

  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 10000) {
    throw new RangeError('maxEntries must be between 1 and 10000');
  }

  const entries = [];
  let writeTimer = null;

  function validateEntry(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new AgentProgressError('INVALID_ENTRY', 'Entry must be an object');
    }
    const agentName = String(entry.agentName || '').trim();
    const action = String(entry.action || '').trim();
    const status = String(entry.status || 'in_progress').trim();

    if (!agentName) throw new AgentProgressError('MISSING_AGENT_NAME', 'agentName is required');
    if (!action) throw new AgentProgressError('MISSING_ACTION', 'action is required');
    if (!['pending', 'in_progress', 'completed', 'failed', 'skipped'].includes(status)) {
      throw new AgentProgressError('INVALID_STATUS', `Invalid status: ${status}`);
    }

    return {
      agentName,
      action,
      status,
      details: entry.details || null,
      startedAt: entry.startedAt || Date.now(),
      completedAt: entry.completedAt || null,
      durationMs: entry.durationMs || null,
      error: entry.error || null,
      metadata: entry.metadata || {},
    };
  }

  function persistToStorage() {
    if (!storage || !storage.set) return;
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      storage.set({ [storageKey]: clone(entries) });
      writeTimer = null;
    }, 500);
  }

  async function loadFromStorage() {
    if (!storage || !storage.get) return;
    try {
      const result = await storage.get(storageKey);
      if (result && Array.isArray(result[storageKey])) {
        entries.length = 0;
        entries.push(...result[storageKey]);
      }
    } catch {
      // Storage unavailable; continue with in-memory only
    }
  }

  return Object.freeze({
    /**
     * Log a new entry
     * @param {Object} entry - { agentName, action, status, details, startedAt, completedAt, durationMs, error }
     * @returns {Object} - Cloned entry with defaults applied
     */
    log(entry) {
      const validated = validateEntry(entry);
      entries.push(validated);
      if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
      persistToStorage();
      return clone(validated);
    },

    /**
     * Log an action start
     */
    start(agentName, action, details = null) {
      return this.log({
        agentName,
        action,
        status: 'in_progress',
        details,
        startedAt: Date.now(),
      });
    },

    /**
     * Log an action completion
     */
    complete(agentName, action, details = null, durationMs = null) {
      return this.log({
        agentName,
        action,
        status: 'completed',
        details,
        completedAt: Date.now(),
        durationMs,
      });
    },

    /**
     * Log an action failure
     */
    fail(agentName, action, error, details = null) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.log({
        agentName,
        action,
        status: 'failed',
        error: errorMessage,
        details,
        completedAt: Date.now(),
      });
    },

    /**
     * List all entries (optionally filtered)
     */
    list(filter = null) {
      if (!filter) return clone(entries);
      return clone(entries).filter((entry) => {
        if (filter.agentName && entry.agentName !== filter.agentName) return false;
        if (filter.action && entry.action !== filter.action) return false;
        if (filter.status && entry.status !== filter.status) return false;
        if (filter.since && entry.startedAt < filter.since) return false;
        return true;
      });
    },

    /**
     * Get entries for a specific agent
     */
    forAgent(agentName) {
      return this.list({ agentName });
    },

    /**
     * Get latest N entries
     */
    latest(count = 10) {
      return clone(entries.slice(-count));
    },

    /**
     * Get entries by status
     */
    byStatus(status) {
      return this.list({ status });
    },

    /**
     * Clear all entries
     */
    clear() {
      entries.length = 0;
      if (storage && storage.remove) storage.remove(storageKey);
    },

    /**
     * Get total count
     */
    size() {
      return entries.length;
    },

    /**
     * Load from storage
     */
    async load() {
      await loadFromStorage();
    },

    /**
     * Export as JSON
     */
    export() {
      return clone(entries);
    },

    /**
     * Summary statistics
     */
    summary() {
      const byStatus = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
      };
      const byAgent = {};
      let totalDurationMs = 0;

      for (const entry of entries) {
        byStatus[entry.status]++;
        byAgent[entry.agentName] = (byAgent[entry.agentName] || 0) + 1;
        if (entry.durationMs) totalDurationMs += entry.durationMs;
      }

      return {
        totalEntries: entries.length,
        byStatus,
        byAgent,
        totalDurationMs,
        uniqueAgents: Object.keys(byAgent).length,
      };
    },
  });
}
