import { PlanRunnerModule } from './PlanRunnerModule.js';

const SETTINGS_KEY = 'auto-continue:settings';
const UNSAFE_RECOVERY_DISPOSITIONS = new Set([
  'OBSERVE_ONLY',
  'PRESERVE_PAUSE',
  'RECONCILE_EXISTING_ARTIFACT',
  'RECONNECT_REQUIRED',
  'NO_RESEND_VERIFIED',
  'NO_AUTOMATIC_ACTION',
]);

function clone(value) {
  if (value == null) return value;
  return structuredClone(value);
}

export class AutoContinueModule {
  #planRunner;
  #storage;
  #events;
  #inFlight = null;
  #enabled = false;

  constructor({ planRunner, storage = null, events = null } = {}) {
    if (!(planRunner instanceof PlanRunnerModule)) {
      const error = new TypeError('AutoContinueModule requires the canonical PlanRunnerModule');
      error.code = 'AUTO_CONTINUE_PLAN_RUNNER_REQUIRED';
      throw error;
    }
    this.#planRunner = planRunner;
    this.#storage = storage;
    this.#events = events;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return this.getStatus();
    const settings = await this.#get(SETTINGS_KEY);
    this.#enabled = settings?.enabled === true;
    this.initialized = true;
    await this.#publish('auto-continue:initialized', this.getStatus());
    return this.getStatus();
  }

  async enable() {
    this.#enabled = true;
    await this.#persist();
    await this.#publish('auto-continue:changed', this.getStatus());
    return this.getStatus();
  }

  async disable() {
    this.#enabled = false;
    await this.#persist();
    await this.#publish('auto-continue:changed', this.getStatus());
    return this.getStatus();
  }

  async requestContinuation({ reason = 'unspecified', source = 'automation' } = {}) {
    if (!this.#enabled) return Object.freeze({ dispatched: false, reason: 'AUTO_CONTINUE_DISABLED' });
    const status = this.#planRunner.getStatus();
    const donorState = status?.donorStatus?.state ?? null;
    const disposition = status?.recovery?.disposition ?? null;
    if (donorState === 'PAUSED' || disposition === 'PRESERVE_PAUSE') return Object.freeze({ dispatched: false, reason: 'PLAN_PAUSED' });
    if (UNSAFE_RECOVERY_DISPOSITIONS.has(disposition)) return Object.freeze({ dispatched: false, reason: 'RECOVERY_NOT_SAFE_FOR_AUTO_CONTINUE' });
    if (donorState && donorState !== 'READY') return Object.freeze({ dispatched: false, reason: 'PLAN_RUNNER_NOT_READY' });
    if (this.#inFlight) return this.#inFlight;
    this.#inFlight = (async () => {
      const result = await this.#planRunner.sendCurrentStep({ source: 'auto-continue', requestedBy: source, reason });
      const response = Object.freeze({ dispatched: true, result: clone(result) });
      await this.#publish('auto-continue:dispatched', { reason, requestedBy: source, result: clone(result), authority: 'codee-plan-runner' });
      return response;
    })();
    try { return await this.#inFlight; } finally { this.#inFlight = null; }
  }

  getStatus() {
    return Object.freeze({ initialized: this.initialized, enabled: this.#enabled, authority: 'automation-only', progressionAuthority: false, dispatchAuthority: 'PlanRunnerModule', inFlight: Boolean(this.#inFlight) });
  }

  async destroy() { this.#inFlight = null; this.initialized = false; }
  async #persist() { if (this.#storage && typeof this.#storage.set === 'function') await this.#storage.set(SETTINGS_KEY, { enabled: this.#enabled }); }
  async #get(key) { if (!this.#storage || typeof this.#storage.get !== 'function') return undefined; return this.#storage.get(key); }
  async #publish(type, payload) { if (!this.#events || typeof this.#events.publish !== 'function') return; return this.#events.publish(type, clone(payload), { source: 'auto-continue', authority: 'automation-only' }); }
}

export default AutoContinueModule;
