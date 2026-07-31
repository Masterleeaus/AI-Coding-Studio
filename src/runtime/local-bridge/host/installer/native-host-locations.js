import { homedir } from 'node:os';
import { join, win32 } from 'node:path';

const HOST_NAME = /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;

export class NativeHostLocationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeHostLocationError';
    this.code = code;
  }
}

export function getPerUserManifestLocation(options = {}) {
  const platform = options.platform || process.platform;
  const browser = options.browser;
  const hostName = options.hostName;
  const home = options.home || homedir();
  const env = options.env || process.env;
  if (browser !== 'chrome' && browser !== 'firefox') {
    throw new NativeHostLocationError(
      'INVALID_BROWSER',
      'browser must be chrome or firefox.',
    );
  }
  if (typeof hostName !== 'string' || !HOST_NAME.test(hostName)) {
    throw new NativeHostLocationError('INVALID_HOST_NAME', 'hostName is invalid.');
  }
  const file = `${hostName}.json`;
  if (platform === 'win32') {
    const root = env.LOCALAPPDATA || win32.join(home, 'AppData', 'Local');
    return win32.join(
      root,
      'AI Coding Studio',
      'local-bridge',
      'manifests',
      browser,
      file,
    );
  }
  if (platform === 'darwin') {
    const base = browser === 'chrome'
      ? join(
        home,
        'Library',
        'Application Support',
        'Google',
        'Chrome',
        'NativeMessagingHosts',
      )
      : join(
        home,
        'Library',
        'Application Support',
        'Mozilla',
        'NativeMessagingHosts',
      );
    return join(base, file);
  }
  if (platform === 'linux') {
    const base = browser === 'chrome'
      ? join(
        env.XDG_CONFIG_HOME || join(home, '.config'),
        'google-chrome',
        'NativeMessagingHosts',
      )
      : join(home, '.mozilla', 'native-messaging-hosts');
    return join(base, file);
  }
  throw new NativeHostLocationError(
    'UNSUPPORTED_PLATFORM',
    `Unsupported platform: ${platform}`,
  );
}
