import { spawn as nodeSpawn } from 'node:child_process';
import { isAbsolute } from 'node:path';

const SAFE_ENV_KEYS = new Set([
  'PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'COMSPEC', 'ComSpec', 'PATHEXT',
  'TMP', 'TEMP', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM',
]);

export class ProcessRunnerError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'ProcessRunnerError';
    this.code = code;
    this.details = details;
  }
}

function validateExecutable(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || /[\r\n]/.test(value)) {
    throw new ProcessRunnerError('INVALID_EXECUTABLE', 'Executable is invalid.');
  }
  return value.trim();
}

function validateArgs(args) {
  if (!Array.isArray(args) || args.length > 100) {
    throw new ProcessRunnerError('INVALID_ARGUMENTS', 'Process args must be an array with at most 100 entries.');
  }
  return args.map((arg) => {
    if (typeof arg !== 'string' || arg.includes('\0') || arg.length > 8192) {
      throw new ProcessRunnerError('INVALID_ARGUMENTS', 'Process argument is invalid.');
    }
    return arg;
  });
}

function minimalEnvironment(source, additions = {}) {
  const env = {};
  for (const key of SAFE_ENV_KEYS) {
    if (typeof source?.[key] === 'string') env[key] = source[key];
  }
  for (const [key, value] of Object.entries(additions || {})) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key) || typeof value !== 'string' || value.includes('\0')) {
      throw new ProcessRunnerError('INVALID_ENVIRONMENT', 'Process environment override is invalid.');
    }
    env[key] = value;
  }
  return env;
}

export function createProcessRunner(options = {}) {
  const spawnImpl = typeof options.spawn === 'function' ? options.spawn : nodeSpawn;
  const baseEnv = options.env || process.env;

  return Object.freeze({
    run(input = {}) {
      const executable = validateExecutable(input.executable);
      const args = validateArgs(input.args || []);
      const cwd = input.cwd;
      const timeoutMs = input.timeoutMs === undefined ? 15_000 : input.timeoutMs;
      const maxOutputBytes = input.maxOutputBytes === undefined ? 1024 * 1024 : input.maxOutputBytes;
      if (typeof cwd !== 'string' || !isAbsolute(cwd)) {
        return Promise.reject(new ProcessRunnerError('INVALID_CWD', 'Process cwd must be absolute.'));
      }
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
        return Promise.reject(new RangeError('timeoutMs must be between 1 and 300000.'));
      }
      if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 10 * 1024 * 1024) {
        return Promise.reject(new RangeError('maxOutputBytes must be between 1 and 10485760.'));
      }
      if (input.signal?.aborted) {
        return Promise.reject(new ProcessRunnerError('PROCESS_ABORTED', 'Process was aborted before start.'));
      }

      return new Promise((resolve, reject) => {
        let child;
        try {
          child = spawnImpl(executable, args, {
            cwd,
            env: minimalEnvironment(baseEnv, input.env),
            shell: false,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
        } catch (error) {
          reject(new ProcessRunnerError('PROCESS_START_FAILED', error?.message || 'Could not start process.'));
          return;
        }

        let stdout = Buffer.alloc(0);
        let stderr = Buffer.alloc(0);
        let settled = false;

        function finish(error, result) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          input.signal?.removeEventListener?.('abort', onAbort);
          child.stdout?.removeAllListeners?.();
          child.stderr?.removeAllListeners?.();
          child.removeAllListeners?.();
          if (error) reject(error); else resolve(result);
        }

        function append(current, chunk) {
          const next = Buffer.concat([current, Buffer.from(chunk)]);
          if (stdout.byteLength + stderr.byteLength + Buffer.byteLength(chunk) > maxOutputBytes) {
            child.kill?.();
            finish(new ProcessRunnerError('PROCESS_OUTPUT_LIMIT', 'Process output exceeded the configured limit.'));
          }
          return next;
        }

        const onAbort = () => {
          child.kill?.();
          finish(new ProcessRunnerError('PROCESS_ABORTED', 'Process was aborted.'));
        };
        const timer = setTimeout(() => {
          child.kill?.();
          finish(new ProcessRunnerError('PROCESS_TIMEOUT', `Process exceeded ${timeoutMs} ms.`));
        }, timeoutMs);

        input.signal?.addEventListener?.('abort', onAbort, { once: true });
        child.stdout?.on?.('data', (chunk) => { if (!settled) stdout = append(stdout, chunk); });
        child.stderr?.on?.('data', (chunk) => { if (!settled) stderr = append(stderr, chunk); });
        child.on?.('error', (error) => finish(new ProcessRunnerError('PROCESS_START_FAILED', error?.message || 'Process failed to start.')));
        child.on?.('close', (code, signal) => finish(null, Object.freeze({
          executable,
          args: [...args],
          code: Number.isInteger(code) ? code : null,
          signal: signal || null,
          stdout: stdout.toString('utf8'),
          stderr: stderr.toString('utf8'),
        })));
      });
    },
  });
}
