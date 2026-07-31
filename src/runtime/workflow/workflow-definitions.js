function freezeWorkflow(workflow) {
  for (const step of workflow.steps) Object.freeze(step);
  Object.freeze(workflow.steps);
  return Object.freeze(workflow);
}

const workflow = (id, name, steps) => freezeWorkflow({
  id,
  name,
  steps: steps.map(([stepId, title, command = null]) => ({ id: stepId, title, command })),
});

export const WORKFLOW_DEFINITIONS = Object.freeze([
  workflow('deep-audit', 'Deep Audit', [
    ['inventory', 'Inventory repository'], ['analyze', 'Trace architecture'], ['verify', 'Verify findings'], ['report', 'Produce audit report'],
  ]),
  workflow('bug-fix', 'Bug Fix', [
    ['reproduce', 'Reproduce defect'], ['diagnose', 'Identify root cause'], ['patch', 'Apply minimal patch', 'patch.apply'], ['test', 'Run focused tests', 'test.run'], ['verify', 'Verify regression risk'],
  ]),
  workflow('architecture-review', 'Architecture Review', [
    ['inventory', 'Map components'], ['boundaries', 'Review boundaries'], ['duplication', 'Find duplicated capabilities'], ['recommend', 'Recommend simplifications'],
  ]),
  workflow('dependency-audit', 'Dependency Audit', [
    ['inventory', 'Inventory dependencies'], ['scan', 'Run dependency scan', 'scan.dependencies'], ['triage', 'Classify findings'], ['report', 'Produce remediation report'],
  ]),
  workflow('security-audit', 'Security Audit', [
    ['threat-model', 'Define trust boundaries'], ['scan', 'Run security scan', 'scan.security'], ['verify', 'Verify findings'], ['report', 'Produce security report'],
  ]),
  workflow('code-review', 'Code Review', [
    ['diff', 'Read change set', 'git.diff'], ['analyze', 'Review correctness'], ['test', 'Run relevant tests', 'test.run'], ['report', 'Produce review findings'],
  ]),
  workflow('generate-documentation', 'Generate Documentation', [
    ['inventory', 'Inventory public interfaces'], ['draft', 'Draft documentation'], ['verify', 'Verify examples'], ['write', 'Write documentation', 'file.write'],
  ]),
  workflow('build-extension', 'Build Extension', [
    ['preflight', 'Check tool availability', 'tool.detect'], ['build', 'Build extension', 'build.run'], ['verify', 'Verify build output', 'archive.verify'],
  ]),
  workflow('build-release', 'Build Release', [
    ['test', 'Run tests', 'test.run'], ['build', 'Build release', 'build.run'], ['archive', 'Create release archive', 'archive.create'], ['verify', 'Verify archive', 'archive.verify'],
  ]),
  workflow('create-delta', 'Create Delta', [
    ['diff', 'Generate repository diff', 'git.diff'], ['collect', 'Collect changed files'], ['archive', 'Create delta archive', 'archive.create'], ['verify', 'Verify delta archive', 'archive.verify'],
  ]),
  workflow('run-tests', 'Run Tests', [
    ['preflight', 'Detect test tooling', 'tool.detect'], ['test', 'Run tests', 'test.run'], ['report', 'Summarize results'],
  ]),
  workflow('publish-release', 'Publish Release', [
    ['verify', 'Verify release archive', 'archive.verify'], ['push', 'Push release branch', 'git.push'], ['publish', 'Create GitHub release', 'release.create'],
  ]),
]);
