import { classifyCommand } from '../safety/approval-policy.js';

const definitions = [
  ['tool.detect', 'bridge', ['tool.discovery']],
  ['repo.list', 'git', ['repository.discovery']],
  ['repo.metadata', 'git', ['repository.metadata']],
  ['file.read', 'filesystem', ['filesystem.read']],
  ['file.write', 'filesystem', ['filesystem.write']],
  ['file.delete', 'filesystem', ['filesystem.delete']],
  ['patch.apply', 'git', ['repository.patch']],
  ['search.run', 'ripgrep', ['search.text']],
  ['git.status', 'git', ['repository.status']],
  ['git.diff', 'git', ['repository.diff']],
  ['git.history', 'git', ['repository.history']],
  ['git.branch', 'git', ['repository.branch']],
  ['git.commit', 'git', ['repository.commit']],
  ['git.push', 'git', ['repository.push']],
  ['git.pull', 'git', ['repository.pull']],
  ['git.fetch', 'git', ['repository.fetch']],
  ['git.forcePush', 'git', ['repository.forcePush']],
  ['git.resetHard', 'git', ['repository.resetHard']],
  ['test.run', 'test-runner', ['project.test']],
  ['build.run', 'build-system', ['project.build']],
  ['package.npm.install', 'npm', ['package.npm.install']],
  ['package.composer.install', 'composer', ['package.composer.install']],
  ['framework.artisan', 'php', ['framework.artisan']],
  ['archive.create', 'archive', ['archive.create']],
  ['archive.extract', 'archive', ['archive.extract']],
  ['archive.inventory', 'archive', ['archive.inventory']],
  ['archive.verify', 'archive', ['archive.verify']],
  ['archive.overwrite', 'archive', ['archive.overwrite']],
  ['scan.security', 'security-scanner', ['scan.security']],
  ['scan.dependencies', 'dependency-scanner', ['scan.dependencies']],
  ['vscode.openRepository', 'vscode', ['editor.openRepository']],
  ['vscode.openFile', 'vscode', ['editor.openFile']],
  ['vscode.openLine', 'vscode', ['editor.openLine']],
  ['vscode.revealFile', 'vscode', ['editor.revealFile']],
  ['vscode.openDiff', 'vscode', ['editor.openDiff']],
  ['workflow.run', 'github-cli', ['github.workflow.run']],
  ['release.create', 'github-cli', ['github.release.create']],
  ['docker.runPrivileged', 'docker', ['docker.privileged']],
  ['workspace.allow', 'bridge', ['workspace.allow']],
];

export const COMMAND_CATALOG = Object.freeze(Object.fromEntries(
  definitions.map(([name, tool, capabilities]) => [name, Object.freeze({
    name,
    tool,
    capabilities: Object.freeze([...capabilities]),
    approvalLevel: classifyCommand(name),
    timeoutMs: name.startsWith('build.') || name.startsWith('test.') ? 15 * 60_000 : 60_000,
  })]),
));

export function getCommandDefinition(name) {
  return COMMAND_CATALOG[name] || null;
}

export function listCommandDefinitions() {
  return Object.values(COMMAND_CATALOG);
}
