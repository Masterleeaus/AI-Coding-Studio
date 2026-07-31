import { test } from 'vitest';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { encodeNativeMessage, createNativeMessageDecoder } from './native-messaging-codec.js';
import { runNativeMessagingHost } from './native-messaging-host.js';

test('routes framed messages sequentially and writes framed responses only', async () => {
  const input = new EventEmitter();
  const chunks = [];
  const output = { write(chunk, callback) { chunks.push(Buffer.from(chunk)); callback(); } };
  const host = runNativeMessagingHost({
    input,
    output,
    dispatcher: { async dispatch(message) { return { version: 1, type: 'result', requestId: message.requestId, ok: true }; } },
  });
  input.emit('data', Buffer.concat([
    encodeNativeMessage({ version: 1, type: 'one', requestId: 'a' }),
    encodeNativeMessage({ version: 1, type: 'two', requestId: 'b' }),
  ]));
  await host.idle();
  const decoder = createNativeMessageDecoder();
  assert.deepEqual(decoder.push(Buffer.concat(chunks)).map((item) => item.requestId), ['a', 'b']);
  host.stop();
});
