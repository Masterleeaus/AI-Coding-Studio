import { isAbsolute, win32 } from 'node:path';
import { NATIVE_HOST_NAME } from '../native-messaging-client.js';

const CHROME_ID = /^[a-p]{32}$/;
const FIREFOX_ID = /^(?:[A-Za-z0-9._-]+@[A-Za-z0-9._-]+|\{[0-9a-fA-F-]{36}\})$/;

export class NativeHostManifestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeHostManifestError';
    this.code = code;
  }
}

export function createNativeHostManifest(options = {}) {
  const browser = options.browser;
  const path = options.path;
  const extensionId = options.extensionId;
  const name = options.name || NATIVE_HOST_NAME;
  const description = options.description || 'AI Coding Studio local bridge';
  if (browser !== 'chrome' && browser !== 'firefox') {
    throw new NativeHostManifestError('INVALID_BROWSER', 'browser must be chrome or firefox.');
  }
  if (typeof path !== 'string' || (!isAbsolute(path) && !win32.isAbsolute(path))) {
    throw new NativeHostManifestError('INVALID_HOST_PATH', 'Native host path must be absolute.');
  }
  if (!/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/.test(name)) {
    throw new NativeHostManifestError('INVALID_HOST_NAME', 'Native host name is invalid.');
  }
  if (browser === 'chrome' && !CHROME_ID.test(extensionId)) {
    throw new NativeHostManifestError('INVALID_EXTENSION_ID', 'Chrome extension ID is invalid.');
  }
  if (browser === 'firefox' && !FIREFOX_ID.test(extensionId)) {
    throw new NativeHostManifestError('INVALID_EXTENSION_ID', 'Firefox extension ID is invalid.');
  }
  const manifest = { name, description, path, type: 'stdio' };
  if (browser === 'chrome') {
    manifest.allowed_origins = [`chrome-extension://${extensionId}/`];
  } else {
    manifest.allowed_extensions = [extensionId];
  }
  return Object.freeze(manifest);
}
