import { createNativeMessageDecoder, encodeNativeMessage } from './native-messaging-codec.js';

export function runNativeMessagingHost(options = {}) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  const dispatcher = options.dispatcher;
  const maxMessageBytes = options.maxMessageBytes || 1024 * 1024;
  const onFatal = typeof options.onFatal === 'function' ? options.onFatal : () => {};
  if (!input || typeof input.on !== 'function') throw new TypeError('input stream is required.');
  if (!output || typeof output.write !== 'function') throw new TypeError('output stream is required.');
  if (!dispatcher || typeof dispatcher.dispatch !== 'function') throw new TypeError('dispatcher must implement dispatch().');

  const decoder = createNativeMessageDecoder({ maxMessageBytes });
  let chain = Promise.resolve();
  let stopped = false;

  function enqueue(message) {
    chain = chain.then(async () => {
      if (stopped) return;
      const response = await dispatcher.dispatch(message);
      const frame = encodeNativeMessage(response, { maxMessageBytes });
      await new Promise((resolve, reject) => {
        output.write(frame, (error) => error ? reject(error) : resolve());
      });
    }).catch((error) => {
      stopped = true;
      onFatal(error);
    });
  }

  function onData(chunk) {
    if (stopped) return;
    try {
      for (const message of decoder.push(chunk)) enqueue(message);
    } catch (error) {
      stopped = true;
      onFatal(error);
    }
  }

  function onEnd() {
    if (stopped) return;
    try { decoder.end(); } catch (error) { stopped = true; onFatal(error); }
  }

  function onInputError(error) {
    stopped = true;
    onFatal(error);
  }

  input.on('data', onData);
  input.on('end', onEnd);
  input.on('error', onInputError);

  return Object.freeze({
    async idle() { await chain; },
    stop() {
      stopped = true;
      input.removeListener?.('data', onData);
      input.removeListener?.('end', onEnd);
      input.removeListener?.('error', onInputError);
    },
  });
}
