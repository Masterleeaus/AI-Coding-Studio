const EXACT_SENSITIVE_NAMES = new Set([
  '.npmrc', '.yarnrc', '.pypirc', '.netrc',
  'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519',
  'credentials', 'credentials.json', 'service-account.json',
  'application_default_credentials.json',
]);

const PRIVATE_KEY_EXTENSIONS = new Set(['pem', 'key', 'p12', 'pfx', 'jks', 'keystore']);

export function isSensitiveRepositoryPath(inputPath) {
  const normalized = String(inputPath || '').replaceAll('\\', '/').replace(/^\.\//, '').toLowerCase();
  if (!normalized) return false;
  const segments = normalized.split('/').filter(Boolean);
  const basename = segments.at(-1) || '';
  if (basename === '.env' || basename.startsWith('.env.')) return true;
  if (EXACT_SENSITIVE_NAMES.has(basename)) return true;
  if (segments.includes('.ssh') || segments.includes('.gnupg')) return true;
  if (normalized.endsWith('/.aws/credentials') || normalized === '.aws/credentials') return true;
  const extension = basename.includes('.') ? basename.split('.').at(-1) : '';
  if (PRIVATE_KEY_EXTENSIONS.has(extension)) return true;
  return /(?:^|[-_.])(credential|credentials|service[-_.]?account|private[-_.]?key)(?:[-_.]|$)/.test(basename);
}
