#!/usr/bin/env node
import { runHostEntry } from '../src/runtime/local-bridge/host/host-entry.js';

const result = await runHostEntry({
  onFatal(error) {
    process.exitCode = 1;
    process.stdin.destroy(error);
  },
});
if (!result.ok) process.exitCode = 1;
