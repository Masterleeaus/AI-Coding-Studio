import {
  getDefaultHostConfigPath,
  loadHostConfig,
  validateHostConfig,
} from './host-config.js';
import { parseNativeCallerIdentity } from './native-caller-identity.js';
import {
  createJsonRepositoryAllowlistStore,
  createRepositoryAllowlist,
} from './repository-allowlist.js';
import { createSessionAuthority } from './session-authority.js';
import { createApprovalGrantAuthority } from './approval-grant-authority.js';
import { createSecureHostCommandRegistry } from './security-context.js';
import { registerReadOnlyAdapters } from './adapters/index.js';
import { createNativeMessagingDispatcher } from './native-messaging-dispatcher.js';
import { runNativeMessagingHost } from './native-messaging-host.js';

const DEFAULT_DEPENDENCIES = Object.freeze({
  getDefaultHostConfigPath,
  loadHostConfig,
  validateHostConfig,
  parseNativeCallerIdentity,
  createJsonRepositoryAllowlistStore,
  createRepositoryAllowlist,
  createSessionAuthority,
  createApprovalGrantAuthority,
  createSecureHostCommandRegistry,
  registerReadOnlyAdapters,
  createNativeMessagingDispatcher,
  runNativeMessagingHost,
});

export class HostRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HostRuntimeError';
    this.code = code;
  }
}

function identityKey(identity) {
  return `${identity.type}:${identity.id}`;
}

export async function createNativeHostRuntime(options = {}) {
  const dependencies = Object.freeze({
    ...DEFAULT_DEPENDENCIES,
    ...(options.dependencies || {}),
  });
  const config = options.config
    ? dependencies.validateHostConfig(options.config)
    : await dependencies.loadHostConfig(
      options.configPath || dependencies.getDefaultHostConfigPath(options.pathOptions),
    );
  const observedIdentity = options.observedIdentity
    || dependencies.parseNativeCallerIdentity(options.argv || process.argv.slice(2));
  const allowed = new Set(config.allowedIdentities.map(identityKey));
  if (!allowed.has(identityKey(observedIdentity))) {
    throw new HostRuntimeError(
      'IDENTITY_NOT_ALLOWED',
      'Observed extension identity is not allowed by host configuration.',
    );
  }

  const repositoryAllowlist = dependencies.createRepositoryAllowlist({
    store: dependencies.createJsonRepositoryAllowlistStore(config.repositoryAllowlistFile),
  });
  await repositoryAllowlist.load();
  const sessionAuthority = dependencies.createSessionAuthority({
    allowedIdentities: config.allowedIdentities,
    ttlMs: config.limits.sessionTtlMs,
  });
  const approvalGrantAuthority = dependencies.createApprovalGrantAuthority();
  const registry = dependencies.createSecureHostCommandRegistry({
    sessionAuthority,
    repositoryAllowlist,
    approvalGrantAuthority,
    timeoutMs: config.limits.commandTimeoutMs,
    maxResultBytes: config.limits.maxResultBytes,
  });
  dependencies.registerReadOnlyAdapters(registry, options.adapterOptions || {});
  const dispatcher = dependencies.createNativeMessagingDispatcher({
    sessionAuthority,
    registry,
    observedIdentity,
  });

  return Object.freeze({
    config,
    observedIdentity,
    repositoryAllowlist,
    sessionAuthority,
    approvalGrantAuthority,
    registry,
    dispatcher,
    dependencies,
  });
}

export async function startNativeHostRuntime(options = {}) {
  const runtime = await createNativeHostRuntime(options);
  const host = runtime.dependencies.runNativeMessagingHost({
    input: options.input,
    output: options.output,
    dispatcher: runtime.dispatcher,
    maxMessageBytes: runtime.config.limits.maxMessageBytes,
    onFatal: options.onFatal,
  });
  return Object.freeze({ ...runtime, host });
}
