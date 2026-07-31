export class DoctorCliError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DoctorCliError';
    this.code = code;
  }
}

const FLAGS = Object.freeze({
  browser: 'browser',
  'extension-id': 'extensionId',
  'host-path': 'hostPath',
  platform: 'platform',
  'manifest-path': 'manifestPath',
  home: 'home',
  config: 'configPath',
});

export function parseDoctorArguments(argv = []) {
  if (!Array.isArray(argv)) throw new TypeError('argv must be an array.');
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = String(argv[index] || '');
    if (!raw.startsWith('--')) {
      throw new DoctorCliError(
        'INVALID_ARGUMENT',
        `Unexpected positional argument: ${raw}`,
      );
    }
    const equals = raw.indexOf('=');
    const flag = raw.slice(2, equals === -1 ? undefined : equals);
    const property = FLAGS[flag];
    if (!property) {
      throw new DoctorCliError('UNKNOWN_ARGUMENT', `Unknown argument: --${flag}`);
    }
    if (Object.hasOwn(result, property)) {
      throw new DoctorCliError(
        'DUPLICATE_ARGUMENT',
        `Argument repeated: --${flag}`,
      );
    }
    const value = equals === -1
      ? String(argv[++index] || '')
      : raw.slice(equals + 1);
    if (!value) {
      throw new DoctorCliError(
        'MISSING_ARGUMENT_VALUE',
        `Argument requires a value: --${flag}`,
      );
    }
    result[property] = value;
  }
  if (
    result.browser !== undefined
    && result.browser !== 'chrome'
    && result.browser !== 'firefox'
  ) {
    throw new DoctorCliError(
      'INVALID_BROWSER',
      'browser must be chrome or firefox.',
    );
  }
  if (
    result.platform !== undefined
    && !['win32', 'darwin', 'linux'].includes(result.platform)
  ) {
    throw new DoctorCliError(
      'INVALID_PLATFORM',
      'platform must be win32, darwin or linux.',
    );
  }
  return Object.freeze(result);
}
