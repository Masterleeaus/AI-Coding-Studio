const DEFAULT_MAX_MESSAGE_BYTES = 1024 * 1024;

export class NativeMessagingCodecError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NativeMessagingCodecError';
    this.code = code;
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function validateLimit(value) {
  if (!Number.isInteger(value) || value < 1 || value > 64 * 1024 * 1024) {
    throw new RangeError('maxMessageBytes must be between 1 and 67108864.');
  }
  return value;
}

export function encodeNativeMessage(message, options = {}) {
  if (!isPlainObject(message)) {
    throw new NativeMessagingCodecError('INVALID_MESSAGE', 'Native message must be a plain object.');
  }
  const maxMessageBytes = validateLimit(options.maxMessageBytes || DEFAULT_MAX_MESSAGE_BYTES);
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  if (payload.byteLength === 0 || payload.byteLength > maxMessageBytes) {
    throw new NativeMessagingCodecError('MESSAGE_TOO_LARGE', 'Native message exceeds the configured size limit.');
  }
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32LE(payload.byteLength, 0);
  return Buffer.concat([header, payload]);
}

export function createNativeMessageDecoder(options = {}) {
  const maxMessageBytes = validateLimit(options.maxMessageBytes || DEFAULT_MAX_MESSAGE_BYTES);
  let buffered = Buffer.alloc(0);
  let failed = false;

  return Object.freeze({
    push(chunk) {
      if (failed) throw new NativeMessagingCodecError('DECODER_FAILED', 'Native message decoder is no longer usable.');
      if (!(chunk instanceof Uint8Array)) {
        throw new TypeError('Native message chunks must be Uint8Array values.');
      }
      buffered = Buffer.concat([buffered, Buffer.from(chunk)]);
      const messages = [];
      try {
        while (buffered.byteLength >= 4) {
          const length = buffered.readUInt32LE(0);
          if (length < 2 || length > maxMessageBytes) {
            throw new NativeMessagingCodecError('INVALID_MESSAGE_LENGTH', 'Native message length is invalid.');
          }
          if (buffered.byteLength < 4 + length) break;
          const payload = buffered.subarray(4, 4 + length);
          buffered = buffered.subarray(4 + length);
          let parsed;
          try {
            parsed = JSON.parse(payload.toString('utf8'));
          } catch {
            throw new NativeMessagingCodecError('INVALID_JSON', 'Native message contains invalid JSON.');
          }
          if (!isPlainObject(parsed)) {
            throw new NativeMessagingCodecError('INVALID_MESSAGE', 'Native message must decode to an object.');
          }
          messages.push(parsed);
        }
        return messages;
      } catch (error) {
        failed = true;
        buffered = Buffer.alloc(0);
        throw error;
      }
    },

    end() {
      if (buffered.byteLength !== 0) {
        failed = true;
        buffered = Buffer.alloc(0);
        throw new NativeMessagingCodecError('TRUNCATED_MESSAGE', 'Native message stream ended mid-frame.');
      }
    },
  });
}

export { DEFAULT_MAX_MESSAGE_BYTES as NATIVE_MESSAGE_MAX_BYTES };
