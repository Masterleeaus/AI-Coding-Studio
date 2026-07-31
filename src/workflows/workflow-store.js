const DEFAULT_PREFIX = "bds:workflow:v1";

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function requireId(value) {
  const id = String(value || "").trim();
  if (!id) throw new TypeError("workflow id is required");
  return id;
}

function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("workflow record must be an object");
  }
  requireId(record.id);
  for (const field of ["repository", "branch", "type", "state"]) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      throw new TypeError(`workflow ${field} is required`);
    }
  }
  return record;
}

export function createWorkflowStore({
  storage = globalThis.chrome?.storage?.local,
  prefix = DEFAULT_PREFIX,
} = {}) {
  if (!storage?.get || !storage?.set || !storage?.remove) {
    throw new TypeError("A chrome.storage.local-compatible storage area is required");
  }

  const indexKey = `${prefix}:index`;
  let writeQueue = Promise.resolve();

  const recordKey = (id) => `${prefix}:record:${encodeURIComponent(requireId(id))}`;

  async function readIndex() {
    const result = await storage.get(indexKey);
    const value = result?.[indexKey];
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(String).filter(Boolean))].sort();
  }

  function enqueueWrite(operation) {
    const next = writeQueue.then(operation, operation);
    writeQueue = next.catch(() => {});
    return next;
  }

  return Object.freeze({
    async get(id) {
      const key = recordKey(id);
      const result = await storage.get(key);
      return result?.[key] ? clone(result[key]) : null;
    },

    async list() {
      const ids = await readIndex();
      if (!ids.length) return [];
      const keys = ids.map(recordKey);
      const result = await storage.get(keys);
      return ids
        .map((id) => result?.[recordKey(id)])
        .filter(Boolean)
        .map(clone);
    },

    save(record) {
      const safeRecord = clone(validateRecord(record));
      return enqueueWrite(async () => {
        const ids = await readIndex();
        if (!ids.includes(safeRecord.id)) ids.push(safeRecord.id);
        ids.sort();
        await storage.set({
          [recordKey(safeRecord.id)]: safeRecord,
          [indexKey]: ids,
        });
        return clone(safeRecord);
      });
    },

    remove(id) {
      const safeId = requireId(id);
      return enqueueWrite(async () => {
        const ids = (await readIndex()).filter((entry) => entry !== safeId);
        await storage.remove(recordKey(safeId));
        await storage.set({ [indexKey]: ids });
      });
    },
  });
}
