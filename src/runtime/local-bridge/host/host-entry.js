import { isAbsolute, win32 } from 'node:path';
import { startNativeHostRuntime } from './host-runtime.js';

export class HostEntryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HostEntryError';
    this.code = code;
  }
}

function isAbsolutePath(value) {
  return typeof value === 'string'
    && (isAbsolute(value) || win32.isAbsolute(value));
}

export function parseHostEntryArguments(argv = []) {
  if (!Array.isArray(argv)) throw new TypeError('argv must be an array.');
  let configPath = null;
  const nativeArgv = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = String(argv[index] || '');
    let candidate = null;
    if (value === '--config') {
      candidate = String(argv[index + 1] || '');
      index += 1;
    } else if (value.startsWith('--config=')) {
      candidate = value.slice('--config='.length);
    }
    if (candidate !== null) {
      if (configPath !== null) {
        throw new HostEntryError(
          'DUPLICATE_CONFIG_FLAG',
          'Configuration path was provided more than once.',
        );
      }
      if (!isAbsolutePath(candidate)) {
        throw new HostEntryError(
          'INVALID_CONFIG_PATH',
          'Configuration path must be absolute.',
        );
      }
      configPath = candidate;
    } else {
      nativeArgv.push(value);
    }
  }
  return Object.freeze({
    configPath,
    nativeArgv: Object.freeze(nativeArgv),
  });
}

export function writeFatalDiagnostic(error, output = process.stderr) {
  const code = typeof error?.code === 'string'
    && /^[A-Z][A-Z0-9_]{1,63}$/.test(error.code)
    ? error.code
    : 'HOST_START_FAILED';
  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.trim().slice(0, 1000)
    : 'Local Bridge host failed.';
  output.write(`${JSON.stringify({ level: 'error', code, message })}\n`);
}

export async function runHostEntry(options = {}) {
  const argv = options.argv || process.argv.slice(2);
  const errorOutput = options.errorOutput || process.stderr;
  const startRuntime = options.startRuntime || startNativeHostRuntime;
  try {
    const parsed = parseHostEntryArguments(argv);
    const runtime = await startRuntime({
      configPath: parsed.configPath || undefined,
      argv: parsed.nativeArgv,
      input: options.input,
      output: options.output,
      onFatal(error) {
        writeFatalDiagnostic(error, errorOutput);
        options.onFatal?.(error);
      },
    });
    return Object.freeze({ ok: true, runtime });
  } catch (error) {
    writeFatalDiagnostic(error, errorOutput);
    return Object.freeze({ ok: false, error });
  }
}
