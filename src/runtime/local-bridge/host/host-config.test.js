import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, win32 } from 'node:path';
import {
  HostConfigError,
  getDefaultHostConfigPath,
  loadHostConfig,
  validateHostConfig,
} from './host-config.js';

test('derives per-user configuration paths for supported operating systems', () => {
  assert.equal(
    getDefaultHostConfigPath({
      platform: 'win32',
      home: 'C:\\Users\\Jason',
      env: { LOCALAPPDATA: 'C:\\Users\\Jason\\AppData\\Local' },
    }),
    win32.join(
      'C:\\Users\\Jason\\AppData\\Local',
      'AI Coding Studio',
      'local-bridge',
      'config.json',
    ),
  );
  assert.equal(
    getDefaultHostConfigPath({ platform: 'darwin', home: '/Users/jason', env: {} }),
    '/Users/jason/Library/Application Support/AI Coding Studio/local-bridge/config.json',
  );
  assert.equal(
    getDefaultHostConfigPath({
      platform: 'linux',
      home: '/home/jason',
      env: { XDG_CONFIG_HOME: '/home/jason/.xdg' },
    }),
    '/home/jason/.xdg/ai-coding-studio/local-bridge/config.json',
  );
});

test('normalizes a strict immutable version-one host config', () => {
  const config = validateHostConfig({
    version: 1,
    allowedIdentities: [
      { type: 'chrome-extension', id: 'abcdefghijklmnopabcdefghijklmnop' },
      { type: 'firefox-extension', id: 'ai-coding-studio@example.org' },
    ],
    repositoryAllowlistFile: '/tmp/acs/allowlist.json',
    limits: { commandTimeoutMs: 5000 },
  });
  assert.equal(config.limits.sessionTtlMs, 900000);
  assert.equal(config.limits.commandTimeoutMs, 5000);
  assert.equal(config.limits.maxResultBytes, 1000000);
  assert.equal(config.limits.maxMessageBytes, 1048576);
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.allowedIdentities), true);
  assert.equal(Object.isFrozen(config.limits), true);
});

test('rejects unknown keys, duplicate identities and relative allowlist paths', () => {
  assert.throws(
    () => validateHostConfig({
      version: 1,
      allowedIdentities: [],
      repositoryAllowlistFile: '/tmp/a',
      unexpected: true,
    }),
    (error) => error instanceof HostConfigError && error.code === 'UNKNOWN_CONFIG_KEY',
  );
  assert.throws(
    () => validateHostConfig({
      version: 1,
      allowedIdentities: [
        { type: 'firefox-extension', id: 'same@example.org' },
        { type: 'firefox-extension', id: 'same@example.org' },
      ],
      repositoryAllowlistFile: '/tmp/a',
    }),
    (error) => error.code === 'DUPLICATE_IDENTITY',
  );
  assert.throws(
    () => validateHostConfig({
      version: 1,
      allowedIdentities: [{ type: 'firefox-extension', id: 'x@example.org' }],
      repositoryAllowlistFile: 'relative.json',
    }),
    (error) => error.code === 'INVALID_ALLOWLIST_PATH',
  );
});

test('loads a regular config file and rejects a symlinked config', async () => {
  const root = await mkdtemp(join(tmpdir(), 'acs-host-config-'));
  await mkdir(join(root, 'config'));
  const real = join(root, 'config', 'host.json');
  const link = join(root, 'config', 'link.json');
  const body = JSON.stringify({
    version: 1,
    allowedIdentities: [{ type: 'firefox-extension', id: 'x@example.org' }],
    repositoryAllowlistFile: join(root, 'allowlist.json'),
  });
  await writeFile(real, body);
  await symlink(real, link);
  assert.equal((await loadHostConfig(real)).version, 1);
  await assert.rejects(
    () => loadHostConfig(link),
    (error) => error.code === 'UNSAFE_CONFIG_FILE',
  );
});
