import { createHash, randomBytes as nodeRandomBytes, timingSafeEqual } from 'node:crypto';

const IDENTITY_TYPES = new Set(['chrome-extension', 'firefox-extension', 'android-app']);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@{}-]{0,199}$/;
const SAFE_CLIENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class SessionAuthorityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SessionAuthorityError';
    this.code = code;
  }
}

function normalizeIdentity(identity) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    throw new SessionAuthorityError('INVALID_IDENTITY', 'Observed identity must be an object.');
  }
  const type = String(identity.type || '');
  const id = String(identity.id || '');
  if (!IDENTITY_TYPES.has(type) || !SAFE_ID.test(id)) {
    throw new SessionAuthorityError('INVALID_IDENTITY', 'Observed identity is invalid.');
  }
  return Object.freeze({ type, id });
}

function identityKey(identity) {
  return `${identity.type}:${identity.id}`;
}

function hashToken(token) {
  return createHash('sha256').update(String(token), 'utf8').digest();
}

function safeEqual(left, right) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionAuthority(options = {}) {
  const clock = typeof options.clock === 'function' ? options.clock : Date.now;
  const randomBytes = typeof options.randomBytes === 'function' ? options.randomBytes : nodeRandomBytes;
  const ttlMs = options.ttlMs === undefined ? 15 * 60_000 : options.ttlMs;
  const maxSessions = options.maxSessions === undefined ? 100 : options.maxSessions;
  if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 24 * 60 * 60_000) {
    throw new RangeError('ttlMs must be an integer between 1000 and 86400000.');
  }
  if (!Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 10_000) {
    throw new RangeError('maxSessions must be an integer between 1 and 10000.');
  }

  const allowed = new Set(
    (options.allowedIdentities || []).map((identity) => identityKey(normalizeIdentity(identity))),
  );
  if (allowed.size === 0) {
    throw new TypeError('allowedIdentities must contain at least one identity.');
  }

  const sessions = new Map();

  function pruneExpired() {
    const now = clock();
    for (const [sessionId, record] of sessions) {
      if (record.expiresAt <= now) sessions.delete(sessionId);
    }
  }

  return Object.freeze({
    issue({ identity, clientId } = {}) {
      const normalizedIdentity = normalizeIdentity(identity);
      if (!allowed.has(identityKey(normalizedIdentity))) {
        throw new SessionAuthorityError('IDENTITY_NOT_ALLOWED', 'Observed identity is not allowlisted.');
      }
      if (typeof clientId !== 'string' || !SAFE_CLIENT_ID.test(clientId)) {
        throw new SessionAuthorityError('INVALID_CLIENT_ID', 'clientId is invalid.');
      }

      pruneExpired();
      if (sessions.size >= maxSessions) {
        throw new SessionAuthorityError('SESSION_LIMIT_REACHED', 'The active session limit has been reached.');
      }

      const sessionId = Buffer.from(randomBytes(18)).toString('base64url');
      const token = Buffer.from(randomBytes(32)).toString('base64url');
      const issuedAt = clock();
      const expiresAt = issuedAt + ttlMs;
      sessions.set(sessionId, {
        sessionId,
        tokenHash: hashToken(token),
        clientId,
        identity: normalizedIdentity,
        issuedAt,
        expiresAt,
      });

      return Object.freeze({
        sessionId,
        token,
        clientId,
        identity: normalizedIdentity,
        issuedAt,
        expiresAt,
      });
    },

    verify(auth, observedIdentity) {
      if (!auth || typeof auth !== 'object' || Array.isArray(auth)) {
        throw new SessionAuthorityError('AUTHENTICATION_REQUIRED', 'Session authentication is required.');
      }

      const sessionId = String(auth.sessionId || '');
      const token = String(auth.token || '');
      const clientId = String(auth.clientId || '');
      const record = sessions.get(sessionId);
      if (!record) {
        throw new SessionAuthorityError('SESSION_NOT_FOUND', 'Session was not found.');
      }
      if (record.expiresAt <= clock()) {
        sessions.delete(sessionId);
        throw new SessionAuthorityError('SESSION_EXPIRED', 'Session has expired.');
      }
      if (clientId !== record.clientId) {
        throw new SessionAuthorityError('CLIENT_ID_MISMATCH', 'Session clientId does not match.');
      }

      const normalizedObserved = normalizeIdentity(observedIdentity);
      if (identityKey(normalizedObserved) !== identityKey(record.identity)) {
        throw new SessionAuthorityError(
          'IDENTITY_MISMATCH',
          'Observed transport identity does not match the session.',
        );
      }
      if (!safeEqual(hashToken(token), record.tokenHash)) {
        throw new SessionAuthorityError('INVALID_SESSION_TOKEN', 'Session token is invalid.');
      }

      return Object.freeze({
        sessionId: record.sessionId,
        clientId: record.clientId,
        identity: record.identity,
        issuedAt: record.issuedAt,
        expiresAt: record.expiresAt,
      });
    },

    revoke(sessionId) {
      return sessions.delete(String(sessionId || ''));
    },

    clearExpired() {
      const before = sessions.size;
      pruneExpired();
      return before - sessions.size;
    },

    size() {
      pruneExpired();
      return sessions.size;
    },
  });
}
