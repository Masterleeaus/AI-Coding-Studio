import state from "../../src/content/state.js";

function cloneValue(value) {
  if (value instanceof Map) {
    return new Map(Array.from(value.entries(), ([key, entry]) => [key, cloneValue(entry)]));
  }
  if (value instanceof Set) {
    return new Set(Array.from(value.values(), cloneValue));
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]),
    );
  }
  return value;
}

const initialState = cloneValue(state);

/**
 * Restore the shared mutable content-script state to its import-time defaults.
 * Optional top-level overrides are applied after the reset.
 */
export function resetAppState(overrides = {}) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, cloneValue(initialState), cloneValue(overrides));
  return state;
}
