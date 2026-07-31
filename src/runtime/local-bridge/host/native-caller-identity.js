const CHROME_ORIGIN = /^chrome-extension:\/\/([a-p]{32})\/?$/;
const FIREFOX_ADDON_ID = /^(?:[A-Za-z0-9._-]+@[A-Za-z0-9._-]+|\{[0-9a-fA-F-]{36}\})$/;

export class NativeCallerIdentityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeCallerIdentityError';
    this.code = code;
  }
}

export function parseNativeCallerIdentity(argv = []) {
  if (!Array.isArray(argv)) throw new TypeError('argv must be an array.');
  const identities = [];

  for (const raw of argv) {
    const value = String(raw || '').trim();
    const chrome = value.match(CHROME_ORIGIN);
    if (chrome) identities.push({ type: 'chrome-extension', id: chrome[1] });
    else if (FIREFOX_ADDON_ID.test(value)) identities.push({ type: 'firefox-extension', id: value });
  }

  const unique = new Map(identities.map((identity) => [`${identity.type}:${identity.id}`, identity]));
  if (unique.size === 0) {
    throw new NativeCallerIdentityError('CALLER_IDENTITY_MISSING', 'Browser did not provide a supported extension identity.');
  }
  if (unique.size !== 1) {
    throw new NativeCallerIdentityError('CALLER_IDENTITY_AMBIGUOUS', 'Multiple extension identities were provided.');
  }
  return Object.freeze([...unique.values()][0]);
}
