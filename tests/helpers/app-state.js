import state from '../../src/content/state.js';

const baseline = structuredClone(state);

export function resetAppState(overrides = {}) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, structuredClone(baseline), overrides);
  return state;
}
