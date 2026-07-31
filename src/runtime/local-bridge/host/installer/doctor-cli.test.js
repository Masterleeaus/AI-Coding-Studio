import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseDoctorArguments } from './doctor-cli.js';

test('parses the manual doctor command without accepting unknown flags', () => {
  const options = parseDoctorArguments([
    '--browser=firefox',
    '--extension-id=ai-coding-studio@example.org',
    '--host-path=/opt/acs/local-bridge',
    '--platform=linux',
  ]);
  assert.equal(options.browser, 'firefox');
  assert.equal(options.extensionId, 'ai-coding-studio@example.org');
  assert.equal(options.hostPath, '/opt/acs/local-bridge');
  assert.equal(options.platform, 'linux');
  assert.throws(
    () => parseDoctorArguments(['--unknown=value']),
    (error) => error.code === 'UNKNOWN_ARGUMENT',
  );
});
