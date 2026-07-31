import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('host and doctor entry points exist while production activation remains untouched', async () => {
  const host = await readFile(
    new URL('../scripts/local-bridge-host.mjs', import.meta.url),
    'utf8',
  );
  const doctor = await readFile(
    new URL('../scripts/local-bridge-doctor.mjs', import.meta.url),
    'utf8',
  );
  const manifest = await readFile(
    new URL('../static/manifest.json', import.meta.url),
    'utf8',
  );
  const background = await readFile(
    new URL('../src/background/index.js', import.meta.url),
    'utf8',
  );
  const permissionName = ['native', 'Messaging'].join('');
  const connectionMethod = ['connect', 'Native'].join('');
  assert.match(host, /runHostEntry/);
  assert.match(doctor, /inspectNativeHostInstallation/);
  assert.equal(manifest.includes(permissionName), false);
  assert.equal(background.includes(connectionMethod), false);
});
