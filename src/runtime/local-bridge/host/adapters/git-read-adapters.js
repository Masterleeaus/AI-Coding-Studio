import { resolveExistingRepositoryPath } from '../realpath-policy.js';

function integer(value, fallback, max, name) {
  const normalized = value === undefined ? fallback : value;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > max) {
    throw new TypeError(`${name} must be an integer between 1 and ${max}.`);
  }
  return normalized;
}

async function optionalPath(root, value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new TypeError('path must be a string.');
  const resolved = await resolveExistingRepositoryPath(root, value);
  return resolved.path.slice(resolved.root.length + 1).replaceAll('\\', '/');
}

async function runGit(processRunner, repository, args, signal, maxOutputBytes = 1024 * 1024) {
  const result = await processRunner.run({
    executable: 'git',
    args: [
      '-c', 'core.fsmonitor=false',
      '-c', 'core.pager=cat',
      '-c', 'color.ui=false',
      '-C', repository.canonicalPath,
      ...args,
    ],
    cwd: repository.canonicalPath,
    timeoutMs: 20_000,
    maxOutputBytes,
    signal,
    env: {
      GIT_PAGER: 'cat',
      GIT_OPTIONAL_LOCKS: '0',
      GIT_TERMINAL_PROMPT: '0',
      LC_ALL: 'C',
    },
  });
  if (result.code !== 0) {
    throw new Error(`Git inspection failed with exit code ${result.code}: ${result.stderr.slice(0, 500)}`);
  }
  return result.stdout;
}

export function registerGitReadAdapters(registry, options = {}) {
  const processRunner = options.processRunner;
  if (!processRunner || typeof processRunner.run !== 'function') {
    throw new TypeError('processRunner must implement run().');
  }

  registry.register({
    command: 'git.status',
    validateParameters() { return {}; },
    async handler({ repository, signal }) {
      const output = await runGit(
        processRunner,
        repository,
        ['status', '--short', '--branch', '--untracked-files=normal'],
        signal,
      );
      return { output, lines: output ? output.split(/\r?\n/).filter(Boolean) : [] };
    },
  });

  registry.register({
    command: 'git.diff',
    validateParameters(parameters) {
      return {
        staged: parameters.staged === true,
        path: parameters.path ?? null,
        maxBytes: integer(parameters.maxBytes, 1024 * 1024, 5 * 1024 * 1024, 'maxBytes'),
      };
    },
    async handler({ repository, parameters, signal }) {
      const path = await optionalPath(repository.canonicalPath, parameters.path);
      const args = ['diff', '--no-ext-diff', '--no-textconv', '--no-color'];
      if (parameters.staged) args.push('--cached');
      if (path) args.push('--', path);
      return {
        staged: parameters.staged,
        path,
        diff: await runGit(processRunner, repository, args, signal, parameters.maxBytes),
      };
    },
  });

  registry.register({
    command: 'git.log',
    validateParameters(parameters) {
      return {
        limit: integer(parameters.limit, 25, 100, 'limit'),
        path: parameters.path ?? null,
      };
    },
    async handler({ repository, parameters, signal }) {
      const path = await optionalPath(repository.canonicalPath, parameters.path);
      const args = [
        'log',
        '--no-decorate',
        '--date=iso-strict',
        '--pretty=format:%H%x09%an%x09%ad%x09%s',
        '-n',
        String(parameters.limit),
      ];
      if (path) args.push('--', path);
      const output = await runGit(processRunner, repository, args, signal);
      const commits = output
        ? output.split(/\r?\n/).filter(Boolean).map((line) => {
          const [sha = '', author = '', date = '', ...subject] = line.split('\t');
          return { sha, author, date, subject: subject.join('\t') };
        })
        : [];
      return { commits };
    },
  });
  return registry;
}
