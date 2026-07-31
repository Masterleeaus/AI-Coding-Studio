import { COMMANDS, RISK_LEVELS } from './protocol.js';

const READ = RISK_LEVELS.READ;
const EXECUTE = RISK_LEVELS.SAFE_EXECUTION;
const WRITE = RISK_LEVELS.WRITE;
const PUBLISH = RISK_LEVELS.PUBLISH;

const definitions = [
  [COMMANDS.SYSTEM_HEALTH, READ, false],
  [COMMANDS.TOOLS_LIST, READ, false],
  [COMMANDS.REPOSITORIES_DISCOVER, READ, false],
  [COMMANDS.REPOSITORIES_LIST_GITHUB, READ, false],
  [COMMANDS.REPOSITORIES_CLONE, WRITE, false],
  [COMMANDS.FILES_LIST, READ, true],
  [COMMANDS.FILES_READ, READ, true],
  [COMMANDS.FILES_WRITE, WRITE, true],
  [COMMANDS.FILES_HASH, READ, true],
  [COMMANDS.SEARCH_TEXT, READ, true],
  [COMMANDS.SEARCH_FILES, READ, true],
  [COMMANDS.PATCH_PREVIEW, READ, true],
  [COMMANDS.PATCH_APPLY, WRITE, true],
  [COMMANDS.GIT_STATUS, READ, true],
  [COMMANDS.GIT_DIFF, READ, true],
  [COMMANDS.GIT_LOG, READ, true],
  [COMMANDS.GIT_BRANCH_CREATE, WRITE, true],
  [COMMANDS.GIT_BRANCH_SWITCH, WRITE, true],
  [COMMANDS.GIT_FETCH, WRITE, true],
  [COMMANDS.GIT_PULL, WRITE, true],
  [COMMANDS.GIT_COMMIT, WRITE, true],
  [COMMANDS.GIT_PUSH, PUBLISH, true],
  [COMMANDS.GITHUB_PR_CREATE, PUBLISH, true],
  [COMMANDS.GITHUB_PR_VIEW, READ, true],
  [COMMANDS.GITHUB_PR_CHECKS, READ, true],
  [COMMANDS.VSCODE_OPEN_REPOSITORY, EXECUTE, true],
  [COMMANDS.VSCODE_OPEN_FILE, EXECUTE, true],
  [COMMANDS.TESTS_DETECT, READ, true],
  [COMMANDS.TESTS_RUN, EXECUTE, true],
  [COMMANDS.BUILD_DETECT, READ, true],
  [COMMANDS.BUILD_RUN, EXECUTE, true],
  [COMMANDS.ARCHIVE_INSPECT, READ, true],
  [COMMANDS.ARCHIVE_EXTRACT, WRITE, true],
  [COMMANDS.ARCHIVE_CREATE, WRITE, true],
  [COMMANDS.ARCHIVE_DELTA, WRITE, true],
];

export const COMMAND_CATALOG = Object.freeze(Object.fromEntries(
  definitions.map(([command, riskLevel, repositoryRequired]) => [command, Object.freeze({
    command,
    riskLevel,
    repositoryRequired,
  })]),
));

export function getCommandDefinition(command) {
  return COMMAND_CATALOG[command] || null;
}

export function listCommandDefinitions() {
  return Object.values(COMMAND_CATALOG);
}
