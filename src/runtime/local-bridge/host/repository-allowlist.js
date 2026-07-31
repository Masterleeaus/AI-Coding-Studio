import { lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export class RepositoryAllowlistError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RepositoryAllowlistError';
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function validateRepositoryId(repositoryId) {
  if (typeof repositoryId !== 'string' || !SAFE_ID.test(repositoryId)) {
    throw new RepositoryAllowlistError('INVALID_REPOSITORY_ID', 'repositoryId is invalid.');
  }
  return repositoryId;
}

function normalizeLabel(label) {
  if (label === undefined || label === null || label === '') return null;
  if (typeof label !== 'string' || !label.trim() || label.trim().length > 200) {
    throw new RepositoryAllowlistError(
      'INVALID_LABEL',
      'label must be a non-empty string up to 200 characters.',
    );
  }
  return label.trim();
}

async function canonicalizeDirectory(inputPath) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new RepositoryAllowlistError('INVALID_REPOSITORY_PATH', 'Repository path is required.');
  }
  try {
    const canonicalPath = await realpath(resolve(inputPath));
    const info = await stat(canonicalPath);
    if (!info.isDirectory()) throw new Error('not a directory');
    return canonicalPath;
  } catch {
    throw new RepositoryAllowlistError(
      'INVALID_REPOSITORY_PATH',
      'Repository path must resolve to an existing directory.',
    );
  }
}

function validatePersistedRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new RepositoryAllowlistError('INVALID_ALLOWLIST_DATA', 'Allowlist record is invalid.');
  }
  if (typeof record.canonicalPath !== 'string' || !isAbsolute(record.canonicalPath)) {
    throw new RepositoryAllowlistError(
      'INVALID_ALLOWLIST_DATA',
      'canonicalPath must be absolute.',
    );
  }
  if (!Number.isFinite(Number(record.createdAt)) || !Number.isFinite(Number(record.updatedAt))) {
    throw new RepositoryAllowlistError(
      'INVALID_ALLOWLIST_DATA',
      'Allowlist timestamps must be finite numbers.',
    );
  }
  return Object.freeze({
    repositoryId: validateRepositoryId(record.repositoryId),
    canonicalPath: record.canonicalPath,
    label: normalizeLabel(record.label),
    createdAt: Number(record.createdAt),
    updatedAt: Number(record.updatedAt),
  });
}

export function createJsonRepositoryAllowlistStore(filePath) {
  if (typeof filePath !== 'string' || !isAbsolute(filePath)) {
    throw new TypeError('Allowlist filePath must be absolute.');
  }

  return Object.freeze({
    async load() {
      try {
        const info = await lstat(filePath);
        if (info.isSymbolicLink()) {
          throw new RepositoryAllowlistError(
            'UNSAFE_ALLOWLIST_FILE',
            'Allowlist file must not be a symbolic link.',
          );
        }
        const parsed = JSON.parse(await readFile(filePath, 'utf8'));
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.repositories)) {
          throw new RepositoryAllowlistError(
            'INVALID_ALLOWLIST_DATA',
            'Allowlist file has an unsupported schema.',
          );
        }
        return parsed;
      } catch (error) {
        if (error?.code === 'ENOENT') return { version: 1, repositories: [] };
        if (error instanceof RepositoryAllowlistError) throw error;
        throw new RepositoryAllowlistError(
          'ALLOWLIST_READ_FAILED',
          'Could not read the repository allowlist.',
        );
      }
    },

    async save(data) {
      const parent = dirname(filePath);
      await mkdir(parent, { recursive: true, mode: 0o700 });
      try {
        const info = await lstat(filePath);
        if (info.isSymbolicLink()) {
          throw new RepositoryAllowlistError(
            'UNSAFE_ALLOWLIST_FILE',
            'Allowlist file must not be a symbolic link.',
          );
        }
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }

      const tempPath = `${filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
      try {
        await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, {
          encoding: 'utf8',
          mode: 0o600,
          flag: 'wx',
        });
        await rename(tempPath, filePath);
      } catch (error) {
        await rm(tempPath, { force: true }).catch(() => {});
        if (error instanceof RepositoryAllowlistError) throw error;
        throw new RepositoryAllowlistError(
          'ALLOWLIST_WRITE_FAILED',
          'Could not persist the repository allowlist.',
        );
      }
    },
  });
}

export function createRepositoryAllowlist(options = {}) {
  const store = options.store;
  const clock = typeof options.clock === 'function' ? options.clock : Date.now;
  const canonicalizePath = typeof options.canonicalizePath === 'function'
    ? options.canonicalizePath
    : canonicalizeDirectory;
  if (!store || typeof store.load !== 'function' || typeof store.save !== 'function') {
    throw new TypeError('store must implement load() and save().');
  }

  const records = new Map();
  let loaded = false;

  function ensureLoaded() {
    if (!loaded) {
      throw new RepositoryAllowlistError(
        'ALLOWLIST_NOT_LOADED',
        'Repository allowlist must be loaded first.',
      );
    }
  }

  async function persist() {
    await store.save({
      version: 1,
      repositories: [...records.values()].map((record) => clone(record)),
    });
  }

  return Object.freeze({
    async load() {
      const data = await store.load();
      if (!data || data.version !== 1 || !Array.isArray(data.repositories)) {
        throw new RepositoryAllowlistError(
          'INVALID_ALLOWLIST_DATA',
          'Repository allowlist data is invalid.',
        );
      }

      records.clear();
      for (const raw of data.repositories) {
        const record = validatePersistedRecord(raw);
        if (records.has(record.repositoryId)) {
          throw new RepositoryAllowlistError(
            'INVALID_ALLOWLIST_DATA',
            'Duplicate repositoryId in allowlist.',
          );
        }
        records.set(record.repositoryId, record);
      }
      loaded = true;
      return this.list();
    },

    async allow({ repositoryId, path, label } = {}) {
      ensureLoaded();
      const id = validateRepositoryId(repositoryId);
      const canonicalPath = await canonicalizePath(path);
      for (const record of records.values()) {
        if (record.canonicalPath === canonicalPath && record.repositoryId !== id) {
          throw new RepositoryAllowlistError(
            'PATH_ALREADY_ALLOWED',
            'Canonical repository path is already assigned to another repositoryId.',
          );
        }
      }

      const now = clock();
      const existing = records.get(id);
      const record = Object.freeze({
        repositoryId: id,
        canonicalPath,
        label: normalizeLabel(label),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      records.set(id, record);
      await persist();
      return clone(record);
    },

    async revoke(repositoryId) {
      ensureLoaded();
      const removed = records.delete(validateRepositoryId(repositoryId));
      if (removed) await persist();
      return removed;
    },

    async require(repositoryId) {
      ensureLoaded();
      const record = records.get(validateRepositoryId(repositoryId));
      if (!record) {
        throw new RepositoryAllowlistError(
          'REPOSITORY_NOT_ALLOWED',
          'Repository is not allowlisted.',
        );
      }
      return clone(record);
    },

    list() {
      ensureLoaded();
      return [...records.values()].map((record) => clone(record));
    },
  });
}
