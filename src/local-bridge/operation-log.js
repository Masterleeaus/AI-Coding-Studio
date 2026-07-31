import { redactSecrets } from './secret-filter.js';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createOperationLog(options = {}) {
  const maxEntries = options.maxEntries === undefined ? 200 : options.maxEntries;
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 10000) {
    throw new RangeError('maxEntries must be an integer between 1 and 10000.');
  }
  const entries = [];

  return Object.freeze({
    append(record) {
      const source = record && typeof record === 'object' ? record : {};
      const entry = redactSecrets({
        timestamp: Number.isFinite(source.timestamp) ? source.timestamp : Date.now(),
        requestId: source.requestId ?? null,
        command: source.command ?? null,
        repositoryId: source.repositoryId ?? null,
        riskLevel: source.riskLevel ?? null,
        outcome: source.outcome ?? null,
        durationMs: Number.isFinite(source.durationMs) ? Math.max(0, source.durationMs) : null,
        parameters: source.parameters ?? {},
        error: source.error instanceof Error ? source.error.message : (source.error ?? null),
      });
      entries.push(entry);
      if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
      return clone(entry);
    },
    list() {
      return clone(entries);
    },
    clear() {
      entries.length = 0;
    },
    size() {
      return entries.length;
    },
  });
}
