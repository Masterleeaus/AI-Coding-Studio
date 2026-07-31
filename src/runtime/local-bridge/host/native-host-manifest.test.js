import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createNativeHostManifest } from './native-host-manifest.js';

test('generates explicit Chrome and Firefox native host allowlists', () => {
  assert.deepEqual(
    createNativeHostManifest({
      browser: 'chrome',
      path: '/opt/acs/host',
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
    }).allowed_origins,
    ['chrome-extension://abcdefghijklmnopabcdefghijklmnop/'],
  );
  assert.deepEqual(
    createNativeHostManifest({
      browser: 'firefox',
      path: '/opt/acs/host',
      extensionId: 'ai-coding-studio@example.org',
    }).allowed_extensions,
    ['ai-coding-studio@example.org'],
  );
  assert.equal(
    createNativeHostManifest({
      browser: 'chrome',
      path: 'C:\\Program Files\\ACS\\host.exe',
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
    }).path.startsWith('C:'),
    true,
  );
});

test('rejects wildcard, relative and malformed manifest inputs', () => {
  assert.throws(
    () => createNativeHostManifest({
      browser: 'chrome',
      path: 'host',
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
    }),
    (error) => error.code === 'INVALID_HOST_PATH',
  );
  assert.throws(
    () => createNativeHostManifest({
      browser: 'chrome',
      path: '/host',
      extensionId: '*',
    }),
    (error) => error.code === 'INVALID_EXTENSION_ID',
  );
});
