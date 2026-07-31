import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  parseHostEntryArguments,
  runHostEntry,
} from './host-entry.js';

test('separates an absolute config flag from browser-provided identity arguments', () => {
  const result = parseHostEntryArguments([
    '--config=/home/jason/.config/ai-coding-studio/local-bridge/config.json',
    'chrome-extension://abcdefghijklmnopabcdefghijklmnop/',
    '--parent-window=0',
  ]);
  assert.equal(
    result.configPath,
    '/home/jason/.config/ai-coding-studio/local-bridge/config.json',
  );
  assert.deepEqual(result.nativeArgv, [
    'chrome-extension://abcdefghijklmnopabcdefghijklmnop/',
    '--parent-window=0',
  ]);
});

test('rejects repeated or relative config flags', () => {
  assert.throws(
    () => parseHostEntryArguments(['--config', 'relative.json']),
    (error) => error.code === 'INVALID_CONFIG_PATH',
  );
  assert.throws(
    () => parseHostEntryArguments([
      '--config=/a.json',
      '--config=/b.json',
    ]),
    (error) => error.code === 'DUPLICATE_CONFIG_FLAG',
  );
});

test('reports startup failures only to stderr', async () => {
  const stderr = [];
  let stdoutWrites = 0;
  const output = { write() { stdoutWrites += 1; } };
  const result = await runHostEntry({
    argv: ['ai-coding-studio@example.org'],
    output,
    errorOutput: {
      write(chunk) { stderr.push(String(chunk)); },
    },
    startRuntime: async () => {
      const error = new Error('failed');
      error.code = 'START_FAILED';
      throw error;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(stdoutWrites, 0);
  assert.equal(stderr.length, 1);
  assert.equal(stderr[0].includes('START_FAILED'), true);
});

test('forwards asynchronous fatal events to the executable callback', async () => {
  const seen = [];
  const result = await runHostEntry({
    argv: ['ai-coding-studio@example.org'],
    errorOutput: { write() {} },
    onFatal(error) { seen.push(error.code); },
    startRuntime: async (options) => {
      const error = new Error('stream failed');
      error.code = 'STREAM_FAILED';
      options.onFatal(error);
      return { host: { stop() {} } };
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(seen, ['STREAM_FAILED']);
});
