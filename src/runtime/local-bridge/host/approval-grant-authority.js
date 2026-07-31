import { createHmac, randomBytes as nodeRandomBytes, timingSafeEqual } from 'node:crypto';

const GRANTABLE_RISK_LEVELS = new Set(['SAFE_EXECUTION', 'WRITE', 'DESTRUCTIVE', 'PUBLISH']);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_SESSION_ID = /^[A-Za-z0-9_-]{16,128}$/;

export class ApprovalGrantError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApprovalGrantError';
    this.code = code;
  }
}

function requireId(value, name, nullable = false) {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  const pattern = name === 'sessionId' ? SAFE_SESSION_ID : SAFE_ID;
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new ApprovalGrantError('INVALID_GRANT_INPUT', `${name} is invalid.`);
  }
  return value;
}

function normalizeBinding(value) {
  const riskLevel = String(value?.riskLevel || '');
  if (!GRANTABLE_RISK_LEVELS.has(riskLevel)) {
    throw new ApprovalGrantError('INVALID_GRANT_INPUT', 'riskLevel is not grantable.');
  }
  return {
    sessionId: requireId(value?.sessionId, 'sessionId'),
    requestId: requireId(value?.requestId, 'requestId'),
    command: requireId(value?.command, 'command'),
    repositoryId: requireId(value?.repositoryId, 'repositoryId', true),
    riskLevel,
  };
}

function payload(grant) {
  return JSON.stringify([
    grant.version,
    grant.grantId,
    grant.sessionId,
    grant.requestId,
    grant.command,
    grant.repositoryId,
    grant.riskLevel,
    grant.issuedAt,
    grant.expiresAt,
    grant.nonce,
  ]);
}

function sign(secret, grant) {
  return createHmac('sha256', secret).update(payload(grant), 'utf8').digest('base64url');
}

function equalSignature(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createApprovalGrantAuthority(options = {}) {
  const clock = typeof options.clock === 'function' ? options.clock : Date.now;
  const randomBytes = typeof options.randomBytes === 'function' ? options.randomBytes : nodeRandomBytes;
  const ttlMs = options.ttlMs === undefined ? 60_000 : options.ttlMs;
  const maxOutstanding = options.maxOutstanding === undefined ? 1_000 : options.maxOutstanding;
  const secret = options.secret ? Buffer.from(options.secret) : Buffer.from(randomBytes(32));

  if (secret.byteLength < 32) {
    throw new RangeError('secret must contain at least 32 bytes.');
  }
  if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 10 * 60_000) {
    throw new RangeError('ttlMs must be an integer between 1000 and 600000.');
  }
  if (!Number.isInteger(maxOutstanding) || maxOutstanding < 1 || maxOutstanding > 10_000) {
    throw new RangeError('maxOutstanding must be an integer between 1 and 10000.');
  }

  const issued = new Map();
  const consumed = new Map();

  function prune() {
    const now = clock();
    for (const [id, expiry] of issued) {
      if (expiry <= now) issued.delete(id);
    }
    for (const [id, expiry] of consumed) {
      if (expiry <= now) consumed.delete(id);
    }
  }

  return Object.freeze({
    issue(input) {
      const binding = normalizeBinding(input);
      prune();
      if (issued.size >= maxOutstanding) {
        throw new ApprovalGrantError(
          'GRANT_LIMIT_REACHED',
          'Outstanding approval grant limit reached.',
        );
      }

      const issuedAt = clock();
      const unsigned = {
        version: 1,
        grantId: Buffer.from(randomBytes(18)).toString('base64url'),
        ...binding,
        issuedAt,
        expiresAt: issuedAt + ttlMs,
        nonce: Buffer.from(randomBytes(16)).toString('base64url'),
      };
      const grant = Object.freeze({ ...unsigned, signature: sign(secret, unsigned) });
      issued.set(grant.grantId, grant.expiresAt);
      return grant;
    },

    verifyAndConsume(grant, expectedInput) {
      const expected = normalizeBinding(expectedInput);
      if (!grant || typeof grant !== 'object' || Array.isArray(grant) || grant.version !== 1) {
        throw new ApprovalGrantError('INVALID_GRANT', 'Approval grant is malformed.');
      }
      if (consumed.has(grant.grantId)) {
        throw new ApprovalGrantError('GRANT_REPLAYED', 'Approval grant was already consumed.');
      }
      if (!Number.isFinite(grant.expiresAt) || grant.expiresAt <= clock()) {
        issued.delete(grant.grantId);
        throw new ApprovalGrantError('GRANT_EXPIRED', 'Approval grant has expired.');
      }

      prune();
      if (!issued.has(grant.grantId)) {
        throw new ApprovalGrantError('GRANT_NOT_ISSUED', 'Approval grant was not issued by this host.');
      }

      for (const field of ['sessionId', 'requestId', 'command', 'repositoryId', 'riskLevel']) {
        if ((grant[field] ?? null) !== (expected[field] ?? null)) {
          throw new ApprovalGrantError('GRANT_MISMATCH', `Approval grant ${field} does not match.`);
        }
      }
      if (!equalSignature(grant.signature, sign(secret, grant))) {
        throw new ApprovalGrantError(
          'INVALID_GRANT_SIGNATURE',
          'Approval grant signature is invalid.',
        );
      }

      issued.delete(grant.grantId);
      consumed.set(grant.grantId, grant.expiresAt);
      return true;
    },

    revoke(grantId) {
      return issued.delete(String(grantId || ''));
    },

    clearExpired() {
      const before = issued.size + consumed.size;
      prune();
      return before - issued.size - consumed.size;
    },
  });
}
