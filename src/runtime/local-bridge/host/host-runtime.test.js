import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  createNativeHostRuntime,
  startNativeHostRuntime,
} from './host-runtime.js';

const config = {
  version: 1,
  allowedIdentities: [
    { type: 'firefox-extension', id: 'ai-coding-studio@example.org' },
  ],
  repositoryAllowlistFile: '/tmp/allowlist.json',
  limits: {
    sessionTtlMs: 1000,
    commandTimeoutMs: 5000,
    maxResultBytes: 10000,
    maxMessageBytes: 100000,
  },
};

test('composes the secure runtime and registers read-only adapters only', async () => {
  const calls = [];
  const registry = {
    register(definition) {
      calls.push(definition.command);
      return this;
    },
    dispatch() {},
  };
  const dependencies = {
    parseNativeCallerIdentity: () => ({
      type: 'firefox-extension',
      id: 'ai-coding-studio@example.org',
    }),
    createJsonRepositoryAllowlistStore: (path) => ({ path }),
    createRepositoryAllowlist: () => ({
      async load() { calls.push('allowlist.load'); },
      require() {},
    }),
    createSessionAuthority: () => ({ issue() {}, verify() {} }),
    createApprovalGrantAuthority: () => ({ verifyAndConsume() {} }),
    createSecureHostCommandRegistry: () => registry,
    registerReadOnlyAdapters(target) {
      for (const command of [
        'system.health',
        'tools.list',
        'files.read',
        'git.status',
      ]) {
        target.register({ command });
      }
      return target;
    },
    createNativeMessagingDispatcher: () => ({ dispatch() {} }),
    runNativeMessagingHost: () => ({ stop() {} }),
  };

  const runtime = await createNativeHostRuntime({
    config,
    argv: ['ai-coding-studio@example.org'],
    dependencies,
  });
  assert.deepEqual(runtime.observedIdentity, {
    type: 'firefox-extension',
    id: 'ai-coding-studio@example.org',
  });
  assert.equal(calls.includes('allowlist.load'), true);
  assert.deepEqual(
    calls.filter((entry) => entry.includes('.')),
    [
      'allowlist.load',
      'system.health',
      'tools.list',
      'files.read',
      'git.status',
    ],
  );
  assert.equal(calls.some((entry) => /write|apply|push|commit/.test(entry)), false);
});

test('starts the stdio host with the configured message limit', async () => {
  let received = null;
  const dependencies = {
    parseNativeCallerIdentity: () => ({
      type: 'firefox-extension',
      id: 'ai-coding-studio@example.org',
    }),
    createJsonRepositoryAllowlistStore: () => ({}),
    createRepositoryAllowlist: () => ({ async load() {}, require() {} }),
    createSessionAuthority: () => ({ issue() {}, verify() {} }),
    createApprovalGrantAuthority: () => ({ verifyAndConsume() {} }),
    createSecureHostCommandRegistry: () => ({
      register() { return this; },
      dispatch() {},
    }),
    registerReadOnlyAdapters: (registry) => registry,
    createNativeMessagingDispatcher: () => ({ dispatch() {} }),
    runNativeMessagingHost: (options) => {
      received = options;
      return { stop() {} };
    },
  };

  const runtime = await startNativeHostRuntime({
    config,
    dependencies,
    input: { on() {} },
    output: { write() {} },
  });
  assert.equal(received.maxMessageBytes, 100000);
  assert.equal(typeof runtime.host.stop, 'function');
});
