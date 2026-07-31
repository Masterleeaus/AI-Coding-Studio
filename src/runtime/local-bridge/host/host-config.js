import { lstat, readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, win32 } from 'node:path';

const TOP_LEVEL_KEYS = new Set(['version', 'allowedIdentities', 'repositoryAllowlistFile', 'limits']);
const IDENTITY_KEYS = new Set(['type', 'id']);
const LIMIT_KEYS = new Set(['sessionTtlMs', 'commandTimeoutMs', 'maxResultBytes', 'maxMessageBytes']);
const CHROME_ID = /^[a-p]{32}$/;
const FIREFOX_ID = /^(?:[A-Za-z0-9._-]+@[A-Za-z0-9._-]+|\{[0-9a-fA-F-]{36}\})$/;
const DEFAULT_LIMITS = Object.freeze({
  sessionTtlMs: 15 * 60_000,
  commandTimeoutMs: 30_000,
  maxResultBytes: 1_000_000,
  maxMessageBytes: 1024 * 1024,
});

export class HostConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HostConfigError';
    this.code = code;
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertKnownKeys(value, allowed, code) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new HostConfigError(code, `Unsupported configuration key: ${key}`);
  }
}

function absolutePath(value, code, message) {
  if (typeof value !== 'string' || (!isAbsolute(value) && !win32.isAbsolute(value))) {
    throw new HostConfigError(code, message);
  }
  return value;
}

function integerLimit(value, fallback, min, max, name) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new HostConfigError('INVALID_LIMIT', `${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function normalizeIdentity(value) {
  if (!isPlainObject(value)) throw new HostConfigError('INVALID_IDENTITY', 'Identity must be an object.');
  assertKnownKeys(value, IDENTITY_KEYS, 'UNKNOWN_IDENTITY_KEY');
  const type = value.type;
  const id = value.id;
  const valid = type === 'chrome-extension'
    ? CHROME_ID.test(id)
    : type === 'firefox-extension'
      ? FIREFOX_ID.test(id)
      : false;
  if (!valid) throw new HostConfigError('INVALID_IDENTITY', 'Identity type or ID is invalid.');
  return Object.freeze({ type, id });
}

export function getDefaultHostConfigPath(options = {}) {
  const platform = options.platform || process.platform;
  const home = options.home || homedir();
  const env = options.env || process.env;
  if (platform === 'win32') {
    const root = env.LOCALAPPDATA || win32.join(home, 'AppData', 'Local');
    return win32.join(root, 'AI Coding Studio', 'local-bridge', 'config.json');
  }
  if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'AI Coding Studio', 'local-bridge', 'config.json');
  }
  if (platform === 'linux') {
    return join(env.XDG_CONFIG_HOME || join(home, '.config'), 'ai-coding-studio', 'local-bridge', 'config.json');
  }
  throw new HostConfigError('UNSUPPORTED_PLATFORM', `Unsupported platform: ${platform}`);
}

export function validateHostConfig(value) {
  if (!isPlainObject(value)) throw new HostConfigError('INVALID_CONFIG', 'Host configuration must be an object.');
  assertKnownKeys(value, TOP_LEVEL_KEYS, 'UNKNOWN_CONFIG_KEY');
  if (value.version !== 1) {
    throw new HostConfigError('UNSUPPORTED_CONFIG_VERSION', 'Host configuration version 1 is required.');
  }
  if (!Array.isArray(value.allowedIdentities) || value.allowedIdentities.length === 0) {
    throw new HostConfigError('INVALID_IDENTITIES', 'At least one allowed identity is required.');
  }
  const identities = value.allowedIdentities.map(normalizeIdentity);
  const keys = identities.map((identity) => `${identity.type}:${identity.id}`);
  if (new Set(keys).size !== keys.length) {
    throw new HostConfigError('DUPLICATE_IDENTITY', 'Allowed identities must be unique.');
  }

  const limitsInput = value.limits === undefined ? {} : value.limits;
  if (!isPlainObject(limitsInput)) throw new HostConfigError('INVALID_LIMITS', 'limits must be an object.');
  assertKnownKeys(limitsInput, LIMIT_KEYS, 'UNKNOWN_LIMIT_KEY');
  const limits = Object.freeze({
    sessionTtlMs: integerLimit(limitsInput.sessionTtlMs, DEFAULT_LIMITS.sessionTtlMs, 1_000, 86_400_000, 'sessionTtlMs'),
    commandTimeoutMs: integerLimit(limitsInput.commandTimeoutMs, DEFAULT_LIMITS.commandTimeoutMs, 1, 300_000, 'commandTimeoutMs'),
    maxResultBytes: integerLimit(limitsInput.maxResultBytes, DEFAULT_LIMITS.maxResultBytes, 1, 100_000_000, 'maxResultBytes'),
    maxMessageBytes: integerLimit(limitsInput.maxMessageBytes, DEFAULT_LIMITS.maxMessageBytes, 1_024, 1024 * 1024, 'maxMessageBytes'),
  });

  return Object.freeze({
    version: 1,
    allowedIdentities: Object.freeze(identities),
    repositoryAllowlistFile: absolutePath(
      value.repositoryAllowlistFile,
      'INVALID_ALLOWLIST_PATH',
      'repositoryAllowlistFile must be absolute.',
    ),
    limits,
  });
}

export async function loadHostConfig(filePath) {
  const requested = absolutePath(
    filePath,
    'INVALID_CONFIG_PATH',
    'Host configuration path must be absolute.',
  );
  let info;
  try {
    info = await lstat(requested);
  } catch {
    throw new HostConfigError('CONFIG_NOT_FOUND', 'Host configuration file was not found.');
  }
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new HostConfigError(
      'UNSAFE_CONFIG_FILE',
      'Host configuration must be a regular non-symbolic-link file.',
    );
  }
  const canonical = await realpath(requested);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(canonical, 'utf8'));
  } catch {
    throw new HostConfigError('INVALID_CONFIG_JSON', 'Host configuration is not valid JSON.');
  }
  return validateHostConfig(parsed);
}
