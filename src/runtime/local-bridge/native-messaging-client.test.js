import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createNativeMessagingClient } from './native-messaging-client.js';

function event() {
  const listeners = new Set();
  return {
    addListener(fn) { listeners.add(fn); },
    removeListener(fn) { listeners.delete(fn); },
    emit(value) { for (const fn of listeners) fn(value); },
  };
}

function fakeRuntime() {
  const onMessage = event();
  const onDisconnect = event();
  const sent = [];
  const port = {
    onMessage,
    onDisconnect,
    postMessage(message) { sent.push(message); },
    disconnect() {},
  };
  return {
    sent,
    port,
    runtime: {
      connectNative(name) {
        assert.equal(name, 'com.ai_coding_studio.local_bridge');
        return port;
      },
      lastError: null,
    },
  };
}

test('opens one session and attaches auth to correlated bridge requests', async () => {
  const fake = fakeRuntime();
  let id = 0;
  const client = createNativeMessagingClient({
    runtime: fake.runtime,
    idFactory: () => `req-${++id}`,
    clientId: 'client-1',
  });
  const connecting = client.connect();
  assert.equal(fake.sent[0].type, 'session.open');
  fake.port.onMessage.emit({
    version: 1,
    type: 'session.open.result',
    requestId: 'req-1',
    ok: true,
    session: {
      sessionId: '_opaque-session-id-123',
      token: 'a'.repeat(43),
      clientId: 'client-1',
      expiresAt: Date.now() + 60_000,
    },
  });
  await connecting;

  const pending = client.request({
    version: 1,
    requestId: 'bridge-1',
    command: 'system.health',
    parameters: {},
  });
  await Promise.resolve();
  assert.equal(fake.sent[1].request.auth.sessionId, '_opaque-session-id-123');
  fake.port.onMessage.emit({
    version: 1,
    type: 'bridge.response',
    requestId: 'bridge-1',
    ok: true,
    response: {
      version: 1,
      requestId: 'bridge-1',
      ok: true,
      result: { healthy: true },
    },
  });
  assert.equal((await pending).result.healthy, true);
  assert.equal(fake.sent.filter((item) => item.type === 'session.open').length, 1);
});

test('rejects all pending requests when the native port disconnects', async () => {
  const fake = fakeRuntime();
  const client = createNativeMessagingClient({
    runtime: fake.runtime,
    idFactory: () => 'session-open',
    clientId: 'client-1',
  });
  const connecting = client.connect();
  fake.port.onDisconnect.emit();
  await assert.rejects(connecting, (error) => error.code === 'NATIVE_HOST_DISCONNECTED');
  assert.equal(client.status().connected, false);
});

test('times out and enforces the pending request limit', async () => {
  const fake = fakeRuntime();
  let id = 0;
  const client = createNativeMessagingClient({
    runtime: fake.runtime,
    idFactory: () => `req-${++id}`,
    clientId: 'client-1',
    timeoutMs: 5,
    maxPending: 1,
  });
  const first = client.connect();
  await assert.rejects(client.connect(), (error) => error.code === 'TOO_MANY_PENDING');
  await assert.rejects(first, (error) => error.code === 'REQUEST_TIMEOUT');
});
