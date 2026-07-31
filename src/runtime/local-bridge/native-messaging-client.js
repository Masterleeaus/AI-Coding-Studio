const DEFAULT_HOST_NAME = 'com.ai_coding_studio.local_bridge';
const HOST_NAME_PATTERN = /^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export class NativeMessagingClientError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeMessagingClientError';
    this.code = code;
  }
}

function validateHostName(value) {
  if (typeof value !== 'string' || !HOST_NAME_PATTERN.test(value)) {
    throw new NativeMessagingClientError('INVALID_HOST_NAME', 'Native host name is invalid.');
  }
  return value;
}

function validateId(value, name) {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) {
    throw new NativeMessagingClientError('INVALID_IDENTIFIER', `${name} is invalid.`);
  }
  return value;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function createNativeMessagingClient(options = {}) {
  const runtime = options.runtime || globalThis.browser?.runtime || globalThis.chrome?.runtime;
  const hostName = validateHostName(options.hostName || DEFAULT_HOST_NAME);
  const clientId = validateId(options.clientId || 'ai-coding-studio', 'clientId');
  const defaultTimeoutMs = options.timeoutMs === undefined ? 30_000 : options.timeoutMs;
  const maxPending = options.maxPending === undefined ? 100 : options.maxPending;
  const idFactory = typeof options.idFactory === 'function'
    ? options.idFactory
    : () => globalThis.crypto?.randomUUID?.() || `nm-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (!runtime || typeof runtime.connectNative !== 'function') {
    throw new NativeMessagingClientError('NATIVE_MESSAGING_UNAVAILABLE', 'runtime.connectNative() is unavailable.');
  }
  if (!Number.isInteger(defaultTimeoutMs) || defaultTimeoutMs < 1 || defaultTimeoutMs > 300_000) {
    throw new RangeError('timeoutMs must be between 1 and 300000.');
  }
  if (!Number.isInteger(maxPending) || maxPending < 1 || maxPending > 1000) {
    throw new RangeError('maxPending must be between 1 and 1000.');
  }

  let port = null;
  let session = null;
  let disconnected = null;
  const pending = new Map();

  function rejectPending(error) {
    for (const record of pending.values()) {
      clearTimeout(record.timer);
      record.signal?.removeEventListener?.('abort', record.onAbort);
      record.reject(error);
    }
    pending.clear();
  }

  function onMessage(message) {
    if (!isPlainObject(message) || typeof message.requestId !== 'string') return;
    const record = pending.get(message.requestId);
    if (!record) return;
    pending.delete(message.requestId);
    clearTimeout(record.timer);
    record.signal?.removeEventListener?.('abort', record.onAbort);

    if (byteLength(message) > MAX_RESPONSE_BYTES) {
      record.reject(new NativeMessagingClientError('RESPONSE_TOO_LARGE', 'Native response exceeds one megabyte.'));
      return;
    }
    if (message.version !== 1 || message.type !== record.expectedType) {
      record.reject(new NativeMessagingClientError('INVALID_RESPONSE', 'Native response envelope is invalid.'));
      return;
    }
    if (message.ok !== true) {
      record.reject(new NativeMessagingClientError(
        typeof message.error?.code === 'string' ? message.error.code : 'NATIVE_REQUEST_FAILED',
        typeof message.error?.message === 'string' ? message.error.message : 'Native request failed.',
      ));
      return;
    }
    record.resolve(message);
  }

  function onDisconnect() {
    const detail = runtime.lastError?.message || 'Native messaging port disconnected.';
    disconnected = new NativeMessagingClientError('NATIVE_HOST_DISCONNECTED', detail);
    port = null;
    session = null;
    rejectPending(disconnected);
  }

  function ensurePort() {
    if (port) return port;
    disconnected = null;
    const next = runtime.connectNative(hostName);
    if (!next || typeof next.postMessage !== 'function') {
      throw new NativeMessagingClientError('NATIVE_CONNECT_FAILED', 'Native messaging port is invalid.');
    }
    next.onMessage?.addListener?.(onMessage);
    next.onDisconnect?.addListener?.(onDisconnect);
    port = next;
    return port;
  }

  function send(message, expectedType, requestOptions = {}) {
    if (pending.size >= maxPending) {
      return Promise.reject(new NativeMessagingClientError('TOO_MANY_PENDING', 'Too many native requests are pending.'));
    }
    const activePort = ensurePort();
    const requestId = validateId(message.requestId, 'requestId');
    const timeoutMs = requestOptions.timeoutMs === undefined ? defaultTimeoutMs : requestOptions.timeoutMs;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000) {
      return Promise.reject(new RangeError('Request timeout must be between 1 and 300000.'));
    }
    if (requestOptions.signal?.aborted) {
      return Promise.reject(new NativeMessagingClientError('REQUEST_ABORTED', 'Native request was aborted.'));
    }

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        const record = pending.get(requestId);
        if (!record) return;
        pending.delete(requestId);
        clearTimeout(record.timer);
        reject(new NativeMessagingClientError('REQUEST_ABORTED', 'Native request was aborted.'));
      };
      const timer = setTimeout(() => {
        pending.delete(requestId);
        requestOptions.signal?.removeEventListener?.('abort', onAbort);
        reject(new NativeMessagingClientError('REQUEST_TIMEOUT', `Native request exceeded ${timeoutMs} ms.`));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer, signal: requestOptions.signal, onAbort, expectedType });
      requestOptions.signal?.addEventListener?.('abort', onAbort, { once: true });
      try {
        activePort.postMessage(message);
      } catch (error) {
        pending.delete(requestId);
        clearTimeout(timer);
        requestOptions.signal?.removeEventListener?.('abort', onAbort);
        reject(new NativeMessagingClientError('NATIVE_SEND_FAILED', error?.message || 'Could not send native message.'));
      }
    });
  }

  async function openSession(requestOptions = {}) {
    if (session && session.expiresAt > Date.now() + 5_000) return { ...session };
    const requestId = validateId(String(idFactory()), 'requestId');
    const response = await send({ version: 1, type: 'session.open', requestId, clientId }, 'session.open.result', requestOptions);
    if (!isPlainObject(response.session)
      || typeof response.session.sessionId !== 'string'
      || typeof response.session.token !== 'string'
      || response.session.clientId !== clientId
      || !Number.isFinite(response.session.expiresAt)) {
      throw new NativeMessagingClientError('INVALID_SESSION_RESPONSE', 'Native host returned an invalid session.');
    }
    session = {
      sessionId: response.session.sessionId,
      token: response.session.token,
      clientId,
      expiresAt: response.session.expiresAt,
    };
    return { ...session };
  }

  return Object.freeze({
    async connect(requestOptions = {}) {
      await openSession(requestOptions);
      return this.status();
    },

    async request(bridgeRequest, requestOptions = {}) {
      if (!isPlainObject(bridgeRequest) || typeof bridgeRequest.requestId !== 'string') {
        throw new NativeMessagingClientError('INVALID_BRIDGE_REQUEST', 'Bridge request must be an object with requestId.');
      }
      const auth = await openSession(requestOptions);
      const request = { ...bridgeRequest, auth: {
        sessionId: auth.sessionId,
        token: auth.token,
        clientId: auth.clientId,
      } };
      const response = await send({
        version: 1,
        type: 'bridge.request',
        requestId: bridgeRequest.requestId,
        request,
      }, 'bridge.response', requestOptions);
      if (!isPlainObject(response.response)) {
        throw new NativeMessagingClientError('INVALID_BRIDGE_RESPONSE', 'Native host returned no bridge response.');
      }
      return response.response;
    },

    async disconnect(requestOptions = {}) {
      if (session && port) {
        const requestId = validateId(String(idFactory()), 'requestId');
        try {
          await send({
            version: 1,
            type: 'session.close',
            requestId,
            auth: { sessionId: session.sessionId, token: session.token, clientId: session.clientId },
          }, 'session.close.result', requestOptions);
        } catch {
          // Closing is best-effort; the host also expires sessions.
        }
      }
      session = null;
      const active = port;
      port = null;
      active?.onMessage?.removeListener?.(onMessage);
      active?.onDisconnect?.removeListener?.(onDisconnect);
      active?.disconnect?.();
      rejectPending(new NativeMessagingClientError('CLIENT_DISCONNECTED', 'Native messaging client disconnected.'));
    },

    status() {
      return Object.freeze({
        connected: Boolean(port),
        authenticated: Boolean(session && session.expiresAt > Date.now()),
        expiresAt: session?.expiresAt ?? null,
        pending: pending.size,
        lastDisconnectError: disconnected?.message ?? null,
      });
    },
  });
}

export { DEFAULT_HOST_NAME as NATIVE_HOST_NAME };
