import { extname, isAbsolute, win32 } from 'node:path';
import { NATIVE_HOST_NAME } from '../../native-messaging-client.js';
import { createNativeHostManifest } from '../native-host-manifest.js';
import { getPerUserManifestLocation } from './native-host-locations.js';

export class RegistrationPlanError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RegistrationPlanError';
    this.code = code;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}

function absolute(value, code, message) {
  if (typeof value !== 'string' || (!isAbsolute(value) && !win32.isAbsolute(value))) {
    throw new RegistrationPlanError(code, message);
  }
  return value;
}

function registryKey(browser, hostName) {
  return browser === 'chrome'
    ? `Software\\Google\\Chrome\\NativeMessagingHosts\\${hostName}`
    : `Software\\Mozilla\\NativeMessagingHosts\\${hostName}`;
}

export function createRegistrationPlan(options = {}) {
  const platform = options.platform || process.platform;
  const browser = options.browser;
  const hostName = options.hostName || NATIVE_HOST_NAME;
  const hostPath = absolute(
    options.hostPath,
    'INVALID_HOST_PATH',
    'hostPath must be absolute.',
  );
  const hostExtension = platform === 'win32'
    ? win32.extname(hostPath).toLowerCase()
    : extname(hostPath).toLowerCase();
  if (platform === 'win32' && browser === 'chrome' && hostExtension !== '.exe') {
    throw new RegistrationPlanError(
      'WINDOWS_EXECUTABLE_REQUIRED',
      'Windows Chrome requires a packaged executable host.',
    );
  }
  const manifestPath = absolute(
    options.manifestPath || getPerUserManifestLocation({ ...options, hostName }),
    'INVALID_MANIFEST_PATH',
    'manifestPath must be absolute.',
  );
  const manifest = createNativeHostManifest({
    browser,
    path: hostPath,
    extensionId: options.extensionId,
    name: hostName,
    description: options.description,
  });
  const actions = [{
    type: 'write-file',
    path: manifestPath,
    content: `${JSON.stringify(manifest, null, 2)}\n`,
    mode: 0o600,
  }];
  if (platform === 'win32') {
    actions.push({
      type: 'registry-set',
      hive: 'HKCU',
      key: registryKey(browser, hostName),
      name: '',
      value: manifestPath,
    });
  }
  return deepFreeze({
    version: 1,
    operation: 'install',
    scope: 'user',
    platform,
    browser,
    hostName,
    hostPath,
    manifestPath,
    manifest,
    actions,
  });
}

export function createUninstallPlan(registrationPlan) {
  if (
    !registrationPlan
    || registrationPlan.version !== 1
    || registrationPlan.operation !== 'install'
  ) {
    throw new RegistrationPlanError(
      'INVALID_REGISTRATION_PLAN',
      'A version-one registration plan is required.',
    );
  }
  const actions = [];
  for (const action of registrationPlan.actions) {
    if (action.type === 'registry-set') {
      actions.push({
        type: 'registry-delete',
        hive: action.hive,
        key: action.key,
      });
    }
  }
  actions.push({ type: 'delete-file', path: registrationPlan.manifestPath });
  return deepFreeze({
    version: 1,
    operation: 'uninstall',
    scope: 'user',
    platform: registrationPlan.platform,
    browser: registrationPlan.browser,
    hostName: registrationPlan.hostName,
    actions,
  });
}
