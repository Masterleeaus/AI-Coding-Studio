import path from 'node:path';

export class RepositoryPathError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RepositoryPathError';
    this.code = code;
  }
}

function isWindowsRoot(root) {
  return /^[A-Za-z]:[\\/]/.test(root) || /^\\\\/.test(root);
}

function selectPathApi(root) {
  return isWindowsRoot(root) ? path.win32 : path.posix;
}

function comparable(value, windows) {
  return windows ? value.toLowerCase() : value;
}

export function resolveRepositoryPath(repositoryRoot, requestedPath, options = {}) {
  if (typeof repositoryRoot !== 'string' || !repositoryRoot.trim()) {
    throw new RepositoryPathError('INVALID_REPOSITORY_ROOT', 'Repository root must be a non-empty absolute path.');
  }
  if (typeof requestedPath !== 'string') {
    throw new RepositoryPathError('INVALID_REQUESTED_PATH', 'Requested path must be a string.');
  }
  if (repositoryRoot.includes('\0') || requestedPath.includes('\0')) {
    throw new RepositoryPathError('INVALID_PATH', 'NUL bytes are not allowed in paths.');
  }

  const pathApi = selectPathApi(repositoryRoot);
  const windows = pathApi === path.win32;
  const root = pathApi.resolve(repositoryRoot);
  if (!pathApi.isAbsolute(repositoryRoot)) {
    throw new RepositoryPathError('INVALID_REPOSITORY_ROOT', 'Repository root must be absolute.');
  }

  if (!requestedPath.trim()) {
    if (options.allowRoot === true) return root;
    throw new RepositoryPathError('ROOT_ACCESS_NOT_ALLOWED', 'Repository root access requires explicit permission.');
  }

  if (
    path.posix.isAbsolute(requestedPath) ||
    path.win32.isAbsolute(requestedPath) ||
    /^[A-Za-z]:/.test(requestedPath) ||
    requestedPath.startsWith('\\')
  ) {
    throw new RepositoryPathError('ABSOLUTE_PATH_NOT_ALLOWED', 'Requested paths must be repository-relative.');
  }

  const segments = requestedPath.split(/[\\/]+/);
  if (segments.includes('..')) {
    throw new RepositoryPathError('PATH_TRAVERSAL', 'Parent traversal is not allowed.');
  }

  const normalizedRelative = windows
    ? requestedPath.replaceAll('/', '\\')
    : requestedPath.replaceAll('\\', '/');
  const resolved = pathApi.resolve(root, normalizedRelative);
  const rootComparable = comparable(root, windows);
  const resolvedComparable = comparable(resolved, windows);
  const rootPrefix = rootComparable.endsWith(pathApi.sep) ? rootComparable : `${rootComparable}${pathApi.sep}`;

  if (resolvedComparable !== rootComparable && !resolvedComparable.startsWith(rootPrefix)) {
    throw new RepositoryPathError('PATH_OUTSIDE_REPOSITORY', 'Resolved path is outside the repository boundary.');
  }
  if (resolvedComparable === rootComparable && options.allowRoot !== true) {
    throw new RepositoryPathError('ROOT_ACCESS_NOT_ALLOWED', 'Repository root access requires explicit permission.');
  }
  return resolved;
}
