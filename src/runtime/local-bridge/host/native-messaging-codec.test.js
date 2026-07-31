import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createNativeMessageDecoder, encodeNativeMessage } from './native-messaging-codec.js';

test('encodes and incrementally decodes multiple native frames', () => {
  const first = encodeNativeMessage({ type: 'one', value: '✓' });
  const second = encodeNativeMessage({ type: 'two' });
  const decoder = createNativeMessageDecoder();
  assert.deepEqual(decoder.push(first.subarray(0, 3)), []);
  assert.deepEqual(decoder.push(Buffer.concat([first.subarray(3), second])), [
    { type: 'one', value: '✓' },
    { type: 'two' },
  ]);
  decoder.end();
});

test('rejects oversized, malformed and truncated messages', () => {
  assert.throws(() => encodeNativeMessage({ data: 'x'.repeat(100) }, { maxMessageBytes: 32 }), (error) => error.code === 'MESSAGE_TOO_LARGE');
  const decoder = createNativeMessageDecoder({ maxMessageBytes: 32 });
  const header = Buffer.alloc(4); header.writeUInt32LE(100, 0);
  assert.throws(() => decoder.push(header), (error) => error.code === 'INVALID_MESSAGE_LENGTH');

  const truncated = createNativeMessageDecoder();
  truncated.push(encodeNativeMessage({ ok: true }).subarray(0, 6));
  assert.throws(() => truncated.end(), (error) => error.code === 'TRUNCATED_MESSAGE');
});
