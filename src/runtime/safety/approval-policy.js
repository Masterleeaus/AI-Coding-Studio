export const APPROVAL_LEVELS = Object.freeze({
  READ: 'read',
  EXECUTE: 'execute',
  WRITE: 'write',
  DESTRUCTIVE: 'destructive',
  PRIVILEGED: 'privileged',
});

const COMMAND_APPROVALS = Object.freeze({
  'tool.detect': APPROVAL_LEVELS.READ,
  'repo.list': APPROVAL_LEVELS.READ,
  'repo.metadata': APPROVAL_LEVELS.READ,
  'file.read': APPROVAL_LEVELS.READ,
  'search.run': APPROVAL_LEVELS.READ,
  'git.status': APPROVAL_LEVELS.READ,
  'git.diff': APPROVAL_LEVELS.READ,
  'git.history': APPROVAL_LEVELS.READ,
  'test.run': APPROVAL_LEVELS.EXECUTE,
  'build.run': APPROVAL_LEVELS.EXECUTE,
  'scan.security': APPROVAL_LEVELS.READ,
  'scan.dependencies': APPROVAL_LEVELS.READ,
  'archive.inventory': APPROVAL_LEVELS.READ,
  'archive.verify': APPROVAL_LEVELS.READ,
  'vscode.openRepository': APPROVAL_LEVELS.READ,
  'vscode.openFile': APPROVAL_LEVELS.READ,
  'vscode.openLine': APPROVAL_LEVELS.READ,
  'vscode.revealFile': APPROVAL_LEVELS.READ,
  'vscode.openDiff': APPROVAL_LEVELS.READ,

  'file.write': APPROVAL_LEVELS.WRITE,
  'patch.apply': APPROVAL_LEVELS.WRITE,
  'git.branch': APPROVAL_LEVELS.WRITE,
  'git.commit': APPROVAL_LEVELS.WRITE,
  'git.push': APPROVAL_LEVELS.WRITE,
  'git.pull': APPROVAL_LEVELS.WRITE,
  'git.fetch': APPROVAL_LEVELS.WRITE,
  'package.npm.install': APPROVAL_LEVELS.EXECUTE,
  'package.composer.install': APPROVAL_LEVELS.EXECUTE,
  'framework.artisan': APPROVAL_LEVELS.EXECUTE,
  'archive.create': APPROVAL_LEVELS.WRITE,
  'archive.extract': APPROVAL_LEVELS.WRITE,
  'release.create': APPROVAL_LEVELS.WRITE,
  'workflow.run': APPROVAL_LEVELS.EXECUTE,

  'file.delete': APPROVAL_LEVELS.DESTRUCTIVE,
  'git.forcePush': APPROVAL_LEVELS.DESTRUCTIVE,
  'git.resetHard': APPROVAL_LEVELS.DESTRUCTIVE,
  'archive.overwrite': APPROVAL_LEVELS.DESTRUCTIVE,

  'docker.runPrivileged': APPROVAL_LEVELS.PRIVILEGED,
  'workspace.allow': APPROVAL_LEVELS.PRIVILEGED,
});

export function classifyCommand(commandName) {
  return COMMAND_APPROVALS[commandName] || APPROVAL_LEVELS.PRIVILEGED;
}

export function requiresConfirmation(commandName, policy = {}) {
  const level = classifyCommand(commandName);
  const autoApprove = Array.isArray(policy.autoApprove) ? policy.autoApprove : [];
  return !autoApprove.includes(level);
}

export { COMMAND_APPROVALS };
