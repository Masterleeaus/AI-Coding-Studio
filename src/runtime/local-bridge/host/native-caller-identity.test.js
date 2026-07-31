import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseNativeCallerIdentity } from './native-caller-identity.js';

test('parses Chrome origin and Firefox add-on IDs from browser arguments', () => {
  assert.deepEqual(parseNativeCallerIdentity(['chrome-extension://abcdefghijklmnopabcdefghijklmnop/', '--parent-window=0']), {
    type: 'chrome-extension', id: 'abcdefghijklmnopabcdefghijklmnop',
  });
  assert.deepEqual(parseNativeCallerIdentity(['/path/to/manifest.json', 'ai-coding-studio@example.org']), {
    type: 'firefox-extension', id: 'ai-coding-studio@example.org',
  });
});

test('rejects missing and ambiguous caller identities', () => {
  assert.throws(() => parseNativeCallerIdentity(['/tmp/host.json']), (error) => error.code === 'CALLER_IDENTITY_MISSING');
  assert.throws(() => parseNativeCallerIdentity([
    'chrome-extension://abcdefghijklmnopabcdefghijklmnop/',
    'ai-coding-studio@example.org',
  ]), (error) => error.code === 'CALLER_IDENTITY_AMBIGUOUS');
});
