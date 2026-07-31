import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { isSensitiveRepositoryPath } from '../../../../content/files/repository-file-policy.js';
import { resolveExistingRepositoryPath } from '../realpath-policy.js';

const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const SKIP_DIRECTORIES = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.cache',
  '.next', '.svelte-kit', 'vendor',
]);

function throwIfAborted(signal) {
  if (signal?.aborted) throw new Error('Repository read operation aborted.');
}

function isExcludedPath(path) {
  const normalized = String(path || '').replaceAll('\\', '/');
  const segments = normalized.split('/').filter(Boolean);
  return isSensitiveRepositoryPath(normalized) || segments.includes('.git');
}

function positiveInteger(value, fallback, max, name) {
  const normalized = value === undefined ? fallback : value;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > max) {
    throw new TypeError(`${name} must be an integer between 1 and ${max}.`);
  }
  return normalized;
}

function relativePath(root, absolute) {
  return relative(root, absolute).replaceAll('\\', '/') || '.';
}

async function walkRepository(root, start, options = {}) {
  const maxEntries = positiveInteger(options.maxEntries, 500, 5000, 'maxEntries');
  const maxDepth = positiveInteger(options.maxDepth, 8, 32, 'maxDepth');
  const entries = [];
  const queue = [{ path: start, depth: 0 }];

  while (queue.length && entries.length < maxEntries) {
    throwIfAborted(options.signal);
    const current = queue.shift();
    const children = await readdir(current.path, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      if (entries.length >= maxEntries) break;
      throwIfAborted(options.signal);
      const absolute = join(current.path, child.name);
      const rel = relativePath(root, absolute);
      if (isExcludedPath(rel) || child.isSymbolicLink()) continue;
      if (child.isDirectory() && SKIP_DIRECTORIES.has(child.name)) continue;
      if (!child.isFile() && !child.isDirectory()) continue;
      entries.push({ path: rel, type: child.isDirectory() ? 'directory' : 'file' });
      if (child.isDirectory() && options.recursive === true && current.depth < maxDepth) {
        queue.push({ path: absolute, depth: current.depth + 1 });
      }
    }
  }
  return entries;
}

async function readTextFile(root, requestedPath, maxBytes, signal = null) {
  const resolved = await resolveExistingRepositoryPath(root, requestedPath, { type: 'file' });
  const rel = relativePath(resolved.root, resolved.path);
  if (isExcludedPath(rel)) throw new Error('Sensitive repository files cannot be read.');
  throwIfAborted(signal);
  const info = await stat(resolved.path);
  if (info.size > maxBytes) throw new Error(`File exceeds the ${maxBytes} byte limit.`);
  const data = await readFile(resolved.path, { signal });
  if (data.includes(0)) throw new Error('Binary files cannot be read as text.');
  return { path: rel, content: data.toString('utf8'), size: data.byteLength };
}

function requireLiteralQuery(parameters) {
  const query = typeof parameters.query === 'string' ? parameters.query.trim() : '';
  if (!query || query.length > 500) {
    throw new TypeError('query must be 1 to 500 characters.');
  }
  return query;
}

export function registerFilesystemReadAdapters(registry) {
  registry.register({
    command: 'files.list',
    validateParameters(parameters) {
      return {
        path: typeof parameters.path === 'string' ? parameters.path : '.',
        recursive: parameters.recursive === true,
        maxEntries: positiveInteger(parameters.maxEntries, 500, 5000, 'maxEntries'),
        maxDepth: positiveInteger(parameters.maxDepth, 8, 32, 'maxDepth'),
      };
    },
    async handler({ repository, parameters, signal }) {
      const resolved = await resolveExistingRepositoryPath(
        repository.canonicalPath,
        parameters.path,
        { type: 'directory' },
      );
      return {
        root: relativePath(resolved.root, resolved.path),
        entries: await walkRepository(resolved.root, resolved.path, {
          ...parameters,
          signal,
        }),
      };
    },
  });

  registry.register({
    command: 'files.read',
    validateParameters(parameters) {
      if (typeof parameters.path !== 'string' || !parameters.path) {
        throw new TypeError('path is required.');
      }
      return {
        path: parameters.path,
        maxBytes: positiveInteger(
          parameters.maxBytes,
          DEFAULT_MAX_FILE_BYTES,
          2 * 1024 * 1024,
          'maxBytes',
        ),
      };
    },
    handler({ repository, parameters, signal }) {
      return readTextFile(
        repository.canonicalPath,
        parameters.path,
        parameters.maxBytes,
        signal,
      );
    },
  });

  registry.register({
    command: 'files.hash',
    validateParameters(parameters) {
      if (typeof parameters.path !== 'string' || !parameters.path) {
        throw new TypeError('path is required.');
      }
      return { path: parameters.path };
    },
    async handler({ repository, parameters, signal }) {
      const resolved = await resolveExistingRepositoryPath(
        repository.canonicalPath,
        parameters.path,
        { type: 'file' },
      );
      const rel = relativePath(resolved.root, resolved.path);
      if (isExcludedPath(rel)) {
        throw new Error('Sensitive repository files cannot be hashed through the bridge.');
      }
      const hash = createHash('sha256');
      const stream = createReadStream(resolved.path);
      const onAbort = () => stream.destroy(new Error('Hash operation aborted.'));
      signal?.addEventListener?.('abort', onAbort, { once: true });
      try {
        for await (const chunk of stream) hash.update(chunk);
      } finally {
        signal?.removeEventListener?.('abort', onAbort);
      }
      return { path: rel, algorithm: 'sha256', digest: hash.digest('hex') };
    },
  });

  registry.register({
    command: 'search.files',
    validateParameters(parameters) {
      return {
        query: requireLiteralQuery(parameters),
        path: typeof parameters.path === 'string' ? parameters.path : '.',
        maxResults: positiveInteger(parameters.maxResults, 100, 1000, 'maxResults'),
      };
    },
    async handler({ repository, parameters, signal }) {
      const resolved = await resolveExistingRepositoryPath(
        repository.canonicalPath,
        parameters.path,
        { type: 'directory' },
      );
      const entries = await walkRepository(resolved.root, resolved.path, {
        recursive: true,
        maxEntries: 5000,
        maxDepth: 32,
        signal,
      });
      const query = parameters.query.toLowerCase();
      return {
        query: parameters.query,
        results: entries
          .filter((entry) => (
            basename(entry.path).toLowerCase().includes(query)
            || entry.path.toLowerCase().includes(query)
          ))
          .slice(0, parameters.maxResults),
      };
    },
  });

  registry.register({
    command: 'search.text',
    validateParameters(parameters) {
      return {
        query: requireLiteralQuery(parameters),
        path: typeof parameters.path === 'string' ? parameters.path : '.',
        maxResults: positiveInteger(parameters.maxResults, 100, 1000, 'maxResults'),
        maxFileBytes: positiveInteger(
          parameters.maxFileBytes,
          DEFAULT_MAX_FILE_BYTES,
          2 * 1024 * 1024,
          'maxFileBytes',
        ),
      };
    },
    async handler({ repository, parameters, signal }) {
      const resolved = await resolveExistingRepositoryPath(
        repository.canonicalPath,
        parameters.path,
        { type: 'directory' },
      );
      const entries = await walkRepository(resolved.root, resolved.path, {
        recursive: true,
        maxEntries: 5000,
        maxDepth: 32,
        signal,
      });
      const results = [];
      const query = parameters.query.toLowerCase();
      for (const entry of entries) {
        throwIfAborted(signal);
        if (results.length >= parameters.maxResults || entry.type !== 'file') continue;
        try {
          const file = await readTextFile(
            resolved.root,
            entry.path,
            parameters.maxFileBytes,
            signal,
          );
          const lines = file.content.split(/\r?\n/);
          for (
            let index = 0;
            index < lines.length && results.length < parameters.maxResults;
            index += 1
          ) {
            if (lines[index].toLowerCase().includes(query)) {
              results.push({
                path: entry.path,
                line: index + 1,
                text: lines[index].slice(0, 1000),
              });
            }
          }
        } catch {
          // Oversized, binary and inaccessible files are intentionally skipped.
        }
      }
      return { query: parameters.query, results };
    },
  });

  return registry;
}
