import { describe, expect, it } from "vitest";
import { WORKFLOW_TYPES, createWorkflowRecord } from "./workflow-state.js";
import { createWorkflowStore } from "./workflow-store.js";

function createMemoryStorage() {
  const data = new Map();
  return {
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list
        .filter((key) => data.has(key))
        .map((key) => [key, structuredClone(data.get(key))]));
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) {
        data.set(key, structuredClone(value));
      }
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) data.delete(key);
    },
  };
}

function record(id, type = WORKFLOW_TYPES.DEEP_AUDIT) {
  return createWorkflowRecord({
    id,
    repository: "Masterleeaus/AI-Coding-Studio",
    branch: "agent-3/workflows-tests-integration",
    type,
  }, 1000);
}

describe("workflow store", () => {
  it("persists and lists workflow records", async () => {
    const store = createWorkflowStore({ storage: createMemoryStorage() });
    await store.save(record("one"));
    await store.save(record("two", WORKFLOW_TYPES.BUG_FIX));

    expect((await store.list()).map((item) => item.id)).toEqual(["one", "two"]);
    expect((await store.get("two")).type).toBe(WORKFLOW_TYPES.BUG_FIX);
  });

  it("returns clones that cannot mutate persisted state", async () => {
    const store = createWorkflowStore({ storage: createMemoryStorage() });
    await store.save(record("one"));

    const loaded = await store.get("one");
    loaded.changedFiles.push("src/background/index.js");

    expect((await store.get("one")).changedFiles).toEqual([]);
  });

  it("serializes concurrent saves so the index retains every workflow", async () => {
    const store = createWorkflowStore({ storage: createMemoryStorage() });
    await Promise.all([
      store.save(record("one")),
      store.save(record("two")),
      store.save(record("three")),
    ]);

    expect((await store.list()).map((item) => item.id)).toEqual([
      "one",
      "three",
      "two",
    ]);
  });

  it("removes the record and its index entry", async () => {
    const store = createWorkflowStore({ storage: createMemoryStorage() });
    await store.save(record("one"));
    await store.remove("one");

    expect(await store.get("one")).toBeNull();
    expect(await store.list()).toEqual([]);
  });
});
