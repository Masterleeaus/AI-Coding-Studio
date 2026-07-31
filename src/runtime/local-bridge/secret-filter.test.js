import { test } from 'vitest';
import assert from 'node:assert/strict';
import { redactSecrets } from './secret-filter.js';

test('redacts sensitive object keys without mutating the input', () => {
  const input = { authorization: 'Bearer abc', nested: { githubToken: 'ghp_1234567890abcdef' }, safe: 'value' };
  const output = redactSecrets(input);
  assert.deepEqual(output, { authorization: '[REDACTED]', nested: { githubToken: '[REDACTED]' }, safe: 'value' });
  assert.equal(input.authorization, 'Bearer abc');
});

test('redacts token patterns, private keys, and sensitive environment assignments', () => {
  const text = [
    'Authorization: Bearer abc.def.ghi',
    'OPENAI_API_KEY=sk-proj-abcdefghijklmnop',
    'github_pat_1234567890abcdefghijklmnopqrstuvwxyz',
    '-----BEGIN PRIVATE KEY-----',
    'secret-body',
    '-----END PRIVATE KEY-----',
  ].join('\n');
  const output = redactSecrets(text);
  assert.equal(output.includes('sk-proj-'), false);
  assert.equal(output.includes('github_pat_'), false);
  assert.equal(output.includes('secret-body'), false);
  assert.equal(output.includes('[REDACTED]'), true);
});

test('preserves ordinary values and handles arrays', () => {
  assert.deepEqual(redactSecrets({ values: ['alpha', 3, true, null] }), { values: ['alpha', 3, true, null] });
});
