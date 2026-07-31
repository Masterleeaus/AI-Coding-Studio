const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class NativeMessagingDispatchError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeMessagingDispatchError';
    this.code = code;
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function responseType(type) {
  if (type === 'bridge.request') return 'bridge.response';
  if (type === 'session.open') return 'session.open.result';
  if (type === 'session.close') return 'session.close.result';
  return 'native.result';
}

function errorResponse(message, code, text) {
  return {
    version: 1,
    type: responseType(message?.type),
    requestId: typeof message?.requestId === 'string' && SAFE_ID.test(message.requestId) ? message.requestId : 'unknown',
    ok: false,
    error: { code, message: text },
  };
}

export function createNativeMessagingDispatcher(options = {}) {
  const sessionAuthority = options.sessionAuthority;
  const registry = options.registry;
  const observedIdentity = options.observedIdentity;
  if (!sessionAuthority || typeof sessionAuthority.issue !== 'function' || typeof sessionAuthority.verify !== 'function') {
    throw new TypeError('sessionAuthority must implement issue() and verify().');
  }
  if (!registry || typeof registry.dispatch !== 'function') {
    throw new TypeError('registry must implement dispatch().');
  }
  if (!observedIdentity || typeof observedIdentity !== 'object') {
    throw new TypeError('observedIdentity is required.');
  }

  return Object.freeze({
    async dispatch(message) {
      try {
        if (!isPlainObject(message) || message.version !== 1 || !SAFE_ID.test(String(message.requestId || ''))) {
          throw new NativeMessagingDispatchError('INVALID_NATIVE_REQUEST', 'Native request envelope is invalid.');
        }

        if (message.type === 'session.open') {
          if (typeof message.clientId !== 'string') {
            throw new NativeMessagingDispatchError('INVALID_CLIENT_ID', 'clientId is required.');
          }
          const session = sessionAuthority.issue({ identity: observedIdentity, clientId: message.clientId });
          return { version: 1, type: 'session.open.result', requestId: message.requestId, ok: true, session };
        }

        if (message.type === 'session.close') {
          const identity = sessionAuthority.verify(message.auth, observedIdentity);
          sessionAuthority.revoke(identity.sessionId);
          return { version: 1, type: 'session.close.result', requestId: message.requestId, ok: true, closed: true };
        }

        if (message.type === 'bridge.request') {
          if (!isPlainObject(message.request) || message.request.requestId !== message.requestId) {
            throw new NativeMessagingDispatchError('INVALID_BRIDGE_REQUEST', 'Bridge request is invalid or mismatched.');
          }
          const response = await registry.dispatch(message.request, { identity: observedIdentity });
          return { version: 1, type: 'bridge.response', requestId: message.requestId, ok: true, response };
        }

        throw new NativeMessagingDispatchError('UNKNOWN_NATIVE_REQUEST', 'Native request type is not supported.');
      } catch (error) {
        return errorResponse(
          message,
          typeof error?.code === 'string' ? error.code : 'NATIVE_DISPATCH_FAILED',
          typeof error?.message === 'string' ? error.message.slice(0, 1000) : 'Native dispatch failed.',
        );
      }
    },
  });
}
