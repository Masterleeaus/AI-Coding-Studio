export class RepositoryRuntime {
  constructor({ bridge } = {}) {
    if (!bridge || typeof bridge.execute !== 'function') {
      throw new TypeError('RepositoryRuntime requires a Local Bridge client');
    }
    this.bridge = bridge;
  }

  discover(options = {}) { return this.bridge.execute('repo.list', options); }
  metadata(repository, options = {}) { return this.bridge.execute('repo.metadata', { repository }, options); }
  status(repository, options = {}) { return this.bridge.execute('git.status', { repository }, options); }
  diff(repository, input = {}, options = {}) { return this.bridge.execute('git.diff', { repository, ...input }, options); }
  history(repository, input = {}, options = {}) { return this.bridge.execute('git.history', { repository, ...input }, options); }
  createBranch(repository, branch, options = {}) { return this.bridge.execute('git.branch', { repository, branch }, options); }
  applyPatch(repository, patch, options = {}) { return this.bridge.execute('patch.apply', { repository, patch }, options); }
  commit(repository, message, input = {}, options = {}) { return this.bridge.execute('git.commit', { repository, message, ...input }, options); }
  push(repository, input = {}, options = {}) { return this.bridge.execute('git.push', { repository, ...input }, options); }
  runTests(repository, input = {}, options = {}) { return this.bridge.execute('test.run', { repository, ...input }, options); }
  build(repository, input = {}, options = {}) { return this.bridge.execute('build.run', { repository, ...input }, options); }
  createArchive(repository, input = {}, options = {}) { return this.bridge.execute('archive.create', { repository, ...input }, options); }
  openInVsCode(repository, options = {}) { return this.bridge.execute('vscode.openRepository', { repository }, options); }
  openFile(repository, path, line = null, options = {}) {
    const command = line == null ? 'vscode.openFile' : 'vscode.openLine';
    return this.bridge.execute(command, { repository, path, line }, options);
  }
}

export default RepositoryRuntime;
