import { test } from 'vitest';
import assert from 'node:assert/strict';
import { inspectNativeHostInstallation } from './native-host-doctor.js';

function basePlan() {
  return {
    version: 1,
    platform: 'win32',
    browser: 'chrome',
    hostPath: 'C:\\acs\\bridge.exe',
    manifestPath: 'C:\\acs\\manifest.json',
    manifest: {
      name: 'com.ai_coding_studio.local_bridge',
      path: 'C:\\acs\\bridge.exe',
      type: 'stdio',
      allowed_origins: [
        'chrome-extension://abcdefghijklmnopabcdefghijklmnop/',
      ],
    },
    actions: [{
      type: 'registry-set',
      hive: 'HKCU',
      key: 'Software\\Google\\Chrome\\NativeMessagingHosts\\com.ai_coding_studio.local_bridge',
      value: 'C:\\acs\\manifest.json',
    }],
  };
}

function fsWith(files) {
  return {
    async lstat(path) {
      const item = files[path];
      if (!item) {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      }
      return {
        isFile: () => item.type === 'file',
        isSymbolicLink: () => Boolean(item.symlink),
        mode: item.mode ?? 0o100755,
      };
    },
    async readFile(path) {
      return files[path].content;
    },
  };
}

test('reports missing executable and manifest as failures', async () => {
  const result = await inspectNativeHostInstallation({
    plan: basePlan(),
    fs: fsWith({}),
    registry: { async get() { return null; } },
  });
  assert.equal(result.ok, false);
  assert.equal(result.counts.fail >= 2, true);
  assert.equal(
    result.findings.some(
      (finding) => finding.id === 'host.executable' && finding.status === 'fail',
    ),
    true,
  );
});

test('reports manifest identity mismatch', async () => {
  const plan = basePlan();
  const files = {
    [plan.hostPath]: { type: 'file' },
    [plan.manifestPath]: {
      type: 'file',
      content: JSON.stringify({
        ...plan.manifest,
        allowed_origins: [
          'chrome-extension://bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/',
        ],
      }),
    },
  };
  const result = await inspectNativeHostInstallation({
    plan,
    fs: fsWith(files),
    registry: { async get() { return plan.manifestPath; } },
  });
  assert.equal(
    result.findings.some(
      (finding) => finding.id === 'manifest.content' && finding.status === 'fail',
    ),
    true,
  );
});

test('reports a valid installation', async () => {
  const plan = basePlan();
  const files = {
    [plan.hostPath]: { type: 'file' },
    [plan.manifestPath]: {
      type: 'file',
      content: JSON.stringify(plan.manifest),
    },
  };
  const result = await inspectNativeHostInstallation({
    plan,
    fs: fsWith(files),
    registry: { async get() { return plan.manifestPath; } },
  });
  assert.equal(result.ok, true);
  assert.equal(result.counts.fail, 0);
});

test('fails when the configured repository allowlist is missing', async () => {
  const plan = basePlan();
  const configPath = 'C:\\acs\\config.json';
  const allowlistPath = 'C:\\acs\\allowlist.json';
  const files = {
    [plan.hostPath]: { type: 'file' },
    [plan.manifestPath]: {
      type: 'file',
      content: JSON.stringify(plan.manifest),
    },
    [configPath]: { type: 'file', content: '{}' },
  };
  const result = await inspectNativeHostInstallation({
    plan,
    configPath,
    fs: fsWith(files),
    registry: { async get() { return plan.manifestPath; } },
    loadConfig: async () => ({ repositoryAllowlistFile: allowlistPath }),
  });
  assert.equal(
    result.findings.some(
      (finding) => finding.id === 'repository.allowlist'
        && finding.status === 'fail',
    ),
    true,
  );
  assert.equal(result.ok, false);
});
