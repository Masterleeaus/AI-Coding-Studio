import { test } from 'vitest';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createProcessRunner } from './process-runner.js';

function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => { child.killed = true; };
  return child;
}

test('spawns fixed argv without a shell and returns bounded output', async () => {
  const child = fakeChild();
  let options;
  const runner = createProcessRunner({
    env: { PATH: '/bin', SECRET_TOKEN: 'do-not-copy' },
    spawn(executable, args, received) {
      assert.equal(executable, 'git');
      assert.deepEqual(args, ['--version']);
      options = received;
      return child;
    },
  });
  const pending = runner.run({ executable: 'git', args: ['--version'], cwd: '/tmp' });
  child.stdout.write('git version 2');
  child.emit('close', 0, null);
  const result = await pending;
  assert.equal(result.stdout, 'git version 2');
  assert.equal(options.shell, false);
  assert.equal('SECRET_TOKEN' in options.env, false);
});

test('kills timed out and oversized processes', async () => {
  const timeoutChild = fakeChild();
  const timeoutRunner = createProcessRunner({ spawn: () => timeoutChild });
  await assert.rejects(
    timeoutRunner.run({ executable: 'git', cwd: '/tmp', timeoutMs: 5 }),
    (error) => error.code === 'PROCESS_TIMEOUT',
  );
  assert.equal(timeoutChild.killed, true);

  const outputChild = fakeChild();
  const outputRunner = createProcessRunner({ spawn: () => outputChild });
  const pending = outputRunner.run({ executable: 'git', cwd: '/tmp', maxOutputBytes: 5 });
  outputChild.stdout.write('123456');
  await assert.rejects(pending, (error) => error.code === 'PROCESS_OUTPUT_LIMIT');
});
