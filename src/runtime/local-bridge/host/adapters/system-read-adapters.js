import { platform, arch, release } from 'node:os';

const TOOL_PROBES = Object.freeze([
  Object.freeze({ id: 'git', executable: 'git', args: ['--version'] }),
  Object.freeze({ id: 'vscode', executable: 'code', args: ['--version'] }),
  Object.freeze({ id: 'ripgrep', executable: 'rg', args: ['--version'] }),
]);

export function registerSystemReadAdapters(registry, options = {}) {
  const processRunner = options.processRunner;
  const hostCwd = options.hostCwd || process.cwd();
  const hostVersion = typeof options.hostVersion === 'string' && options.hostVersion.trim()
    ? options.hostVersion.trim()
    : '0.1.0';
  if (!processRunner || typeof processRunner.run !== 'function') {
    throw new TypeError('processRunner must implement run().');
  }

  registry.register({
    command: 'system.health',
    validateParameters() { return {}; },
    async handler() {
      return {
        status: 'ok',
        hostVersion,
        runtime: {
          platform: platform(),
          arch: arch(),
          release: release(),
          node: process.versions.node,
        },
        transport: 'native-messaging',
        mode: 'read-only',
      };
    },
  });

  registry.register({
    command: 'tools.list',
    validateParameters() { return {}; },
    async handler({ signal }) {
      const tools = [];
      for (const probe of TOOL_PROBES) {
        try {
          const result = await processRunner.run({
            executable: probe.executable,
            args: probe.args,
            cwd: hostCwd,
            timeoutMs: 5_000,
            maxOutputBytes: 64 * 1024,
            signal,
          });
          const output = `${result.stdout}\n${result.stderr}`.trim();
          tools.push({
            id: probe.id,
            available: result.code === 0,
            version: result.code === 0 ? output.split(/\r?\n/)[0].slice(0, 200) : null,
          });
        } catch {
          tools.push({ id: probe.id, available: false, version: null });
        }
      }
      return { tools };
    },
  });
  return registry;
}
