import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export class RepositoryRealpathError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RepositoryRealpathError';
    this.code = code;
  }
}

function inside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

export async function resolveExistingRepositoryPath(repositoryRoot, requestedPath = '.', options = {}) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot) {
    throw new RepositoryRealpathError('INVALID_REPOSITORY_ROOT', 'Repository root is required.');
  }
  if (typeof requestedPath !== 'string' || requestedPath.includes('\0') || requestedPath.length > 4096) {
    throw new RepositoryRealpathError('INVALID_REPOSITORY_PATH', 'Requested repository path is invalid.');
  }
  if (/^(?:[A-Za-z]:[\\/]|[\\/]{1,2})/.test(requestedPath)) {
    throw new RepositoryRealpathError('ABSOLUTE_PATH_REJECTED', 'Requested path must be repository-relative.');
  }
  const root = await realpath(repositoryRoot);
  const lexical = resolve(root, requestedPath || '.');
  if (!inside(root, lexical)) {
    throw new RepositoryRealpathError('PATH_OUTSIDE_REPOSITORY', 'Requested path escapes the repository.');
  }
  let target;
  let info;
  try {
    info = await lstat(lexical);
    if (info.isSymbolicLink() && options.allowFinalSymlink !== true) {
      throw new RepositoryRealpathError('SYMLINK_REJECTED', 'Symbolic links are not allowed.');
    }
    target = await realpath(lexical);
  } catch (error) {
    if (error instanceof RepositoryRealpathError) throw error;
    throw new RepositoryRealpathError('PATH_NOT_FOUND', 'Requested repository path does not exist.');
  }
  if (!inside(root, target)) {
    throw new RepositoryRealpathError('PATH_OUTSIDE_REPOSITORY', 'Resolved path escapes the repository.');
  }
  if (options.type === 'file' && !info.isFile()) {
    throw new RepositoryRealpathError('FILE_REQUIRED', 'Requested path must be a regular file.');
  }
  if (options.type === 'directory' && !info.isDirectory()) {
    throw new RepositoryRealpathError('DIRECTORY_REQUIRED', 'Requested path must be a directory.');
  }
  return Object.freeze({ root, path: target, info });
}
