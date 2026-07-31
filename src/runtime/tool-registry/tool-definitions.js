const rawDefinitions = [
  ['git', 'Git', ['repository.discovery', 'repository.metadata', 'repository.status', 'repository.diff', 'repository.history', 'repository.branch', 'repository.patch', 'repository.commit', 'repository.push', 'repository.pull', 'repository.fetch']],
  ['github-cli', 'GitHub CLI', ['github.auth', 'github.repository', 'github.issue', 'github.pullRequest', 'github.actions', 'github.release', 'github.review']],
  ['vscode', 'Visual Studio Code', ['editor.openRepository', 'editor.openFile', 'editor.openLine', 'editor.revealFile', 'editor.openDiff']],
  ['powershell', 'PowerShell', ['script.powershell']],
  ['node', 'Node.js', ['runtime.node', 'project.build', 'project.test']],
  ['npm', 'npm', ['package.npm.install', 'package.npm.run']],
  ['php', 'PHP', ['runtime.php', 'framework.artisan']],
  ['composer', 'Composer', ['package.composer.install', 'package.composer.run']],
  ['python', 'Python', ['runtime.python']],
  ['docker', 'Docker', ['container.build', 'container.run']],
  ['7zip', '7-Zip', ['archive.create', 'archive.extract', 'archive.inventory', 'archive.verify']],
  ['ripgrep', 'ripgrep', ['search.text', 'search.todo', 'search.references']],
  ['playwright', 'Playwright', ['test.browser']],
  ['mysql', 'MySQL', ['database.mysql']],
];

export const TOOL_DEFINITIONS = Object.freeze(rawDefinitions.map(([id, name, capabilities]) => Object.freeze({
  id,
  name,
  capabilities: Object.freeze([...capabilities]),
})));
