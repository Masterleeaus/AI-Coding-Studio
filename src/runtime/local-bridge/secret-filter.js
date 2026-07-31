const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(authorization|proxyauthorization|api[_-]?key|token|secret|password|passwd|private[_-]?key|access[_-]?key|client[_-]?secret|credential|cookie)/i;
const PRIVATE_KEY_BLOCK = /-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/gi;
const AUTH_HEADER = /(\b(?:proxy-)?authorization\s*:\s*(?:bearer|token|basic)\s+)[^\s,;]+/gi;
const BEARER_VALUE = /(\bbearer\s+)[A-Za-z0-9._~+\/-]{8,}/gi;
const GITHUB_TOKEN = /\b(?:github_pat_[A-Za-z0-9_]{10,}|gh[pousr]_[A-Za-z0-9]{10,})\b/g;
const OPENAI_TOKEN = /\bsk-(?:proj-)?[A-Za-z0-9_-]{10,}\b/g;
const SENSITIVE_ENV = /^(\s*[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|ACCESS_KEY|CLIENT_SECRET|CREDENTIAL)[A-Z0-9_]*\s*=\s*).+$/gim;

function redactString(value) {
  return value
    .replace(PRIVATE_KEY_BLOCK, REDACTED)
    .replace(AUTH_HEADER, `$1${REDACTED}`)
    .replace(BEARER_VALUE, `$1${REDACTED}`)
    .replace(GITHUB_TOKEN, REDACTED)
    .replace(OPENAI_TOKEN, REDACTED)
    .replace(SENSITIVE_ENV, `$1${REDACTED}`);
}

export function redactSecrets(value) {
  const seen = new WeakSet();

  function visit(current, depth) {
    if (depth > 30) return '[REDACTED:MAX_DEPTH]';
    if (typeof current === 'string') return redactString(current);
    if (current === null || typeof current === 'number' || typeof current === 'boolean') return current;
    if (current instanceof Error) return redactString(current.message || current.name);
    if (typeof current !== 'object') return String(current);
    if (seen.has(current)) return '[REDACTED:CIRCULAR]';

    seen.add(current);
    try {
      if (Array.isArray(current)) return current.map((entry) => visit(entry, depth + 1));
      const output = {};
      for (const [key, entry] of Object.entries(current)) {
        output[key] = SENSITIVE_KEY.test(key) ? REDACTED : visit(entry, depth + 1);
      }
      return output;
    } finally {
      seen.delete(current);
    }
  }

  return visit(value, 0);
}

export { REDACTED };
