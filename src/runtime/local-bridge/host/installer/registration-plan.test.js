import { test } from 'vitest';
import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import {
  createRegistrationPlan,
  createUninstallPlan,
} from './registration-plan.js';
import { getPerUserManifestLocation } from './native-host-locations.js';

const hostName = 'com.ai_coding_studio.local_bridge';
const chromeId = 'abcdefghijklmnopabcdefghijklmnop';
const firefoxId = 'ai-coding-studio@example.org';

test('derives exact per-user Chrome and Firefox manifest locations', () => {
  assert.equal(
    getPerUserManifestLocation({
      platform: 'darwin',
      browser: 'chrome',
      hostName,
      home: '/Users/jason',
      env: {},
    }),
    '/Users/jason/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ai_coding_studio.local_bridge.json',
  );
  assert.equal(
    getPerUserManifestLocation({
      platform: 'darwin',
      browser: 'firefox',
      hostName,
      home: '/Users/jason',
      env: {},
    }),
    '/Users/jason/Library/Application Support/Mozilla/NativeMessagingHosts/com.ai_coding_studio.local_bridge.json',
  );
  assert.equal(
    getPerUserManifestLocation({
      platform: 'linux',
      browser: 'chrome',
      hostName,
      home: '/home/jason',
      env: { XDG_CONFIG_HOME: '/home/jason/.cfg' },
    }),
    '/home/jason/.cfg/google-chrome/NativeMessagingHosts/com.ai_coding_studio.local_bridge.json',
  );
  assert.equal(
    getPerUserManifestLocation({
      platform: 'linux',
      browser: 'firefox',
      hostName,
      home: '/home/jason',
      env: {},
    }),
    '/home/jason/.mozilla/native-messaging-hosts/com.ai_coding_studio.local_bridge.json',
  );
  assert.equal(
    getPerUserManifestLocation({
      platform: 'win32',
      browser: 'chrome',
      hostName,
      home: 'C:\\Users\\Jason',
      env: { LOCALAPPDATA: 'C:\\Users\\Jason\\AppData\\Local' },
    }),
    win32.join(
      'C:\\Users\\Jason\\AppData\\Local',
      'AI Coding Studio',
      'local-bridge',
      'manifests',
      'chrome',
      `${hostName}.json`,
    ),
  );
});

test('creates a deterministic per-user Windows registration plan', () => {
  const manifestPath = 'C:\\Users\\Jason\\AppData\\Local\\AI Coding Studio\\local-bridge\\chrome.json';
  const plan = createRegistrationPlan({
    platform: 'win32',
    browser: 'chrome',
    extensionId: chromeId,
    hostPath: 'C:\\Program Files\\AI Coding Studio\\local-bridge.exe',
    manifestPath,
  });
  assert.equal(plan.scope, 'user');
  assert.equal(plan.actions[0].type, 'write-file');
  assert.equal(plan.actions[1].type, 'registry-set');
  assert.equal(plan.actions[1].hive, 'HKCU');
  assert.equal(
    plan.actions[1].key,
    `Software\\Google\\Chrome\\NativeMessagingHosts\\${hostName}`,
  );
  assert.equal(
    plan.manifest.allowed_origins[0],
    `chrome-extension://${chromeId}/`,
  );
  assert.equal(Object.isFrozen(plan.actions), true);
});

test('rejects a non-executable Windows Chrome host path', () => {
  assert.throws(
    () => createRegistrationPlan({
      platform: 'win32',
      browser: 'chrome',
      extensionId: chromeId,
      hostPath: 'C:\\host\\local-bridge.cmd',
      manifestPath: 'C:\\host\\manifest.json',
    }),
    (error) => error.code === 'WINDOWS_EXECUTABLE_REQUIRED',
  );
});

test('creates Firefox manifest content and non-recursive uninstall actions', () => {
  const plan = createRegistrationPlan({
    platform: 'linux',
    browser: 'firefox',
    extensionId: firefoxId,
    hostPath: '/opt/acs/local-bridge',
    home: '/home/jason',
    env: {},
  });
  assert.deepEqual(plan.manifest.allowed_extensions, [firefoxId]);
  const uninstall = createUninstallPlan(plan);
  assert.deepEqual(uninstall.actions, [
    { type: 'delete-file', path: plan.manifestPath },
  ]);
  assert.equal(
    uninstall.actions.some((action) => action.type === 'delete-directory'),
    false,
  );
});
