/**
 * Repository Status - Aggregated view of repository state
 * Shows: current branch, recent commits, test status, recent operations
 */

export class RepositoryStatusError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RepositoryStatusError';
    this.code = code;
  }
}

/**
 * Create a repository status aggregator
 * Pulls together current state from various sources
 */
export function createRepositoryStatus(options = {}) {
  const bridge = options.bridge || null;
  const operationLog = options.operationLog || null;

  if (!bridge) {
    throw new RepositoryStatusError('MISSING_BRIDGE', 'LocalBridgeClient is required');
  }

  return Object.freeze({
    /**
     * Get comprehensive status for a repository
     */
    async getStatus(repositoryPath) {
      if (typeof repositoryPath !== 'string' || !repositoryPath.trim()) {
        throw new RepositoryStatusError('INVALID_PATH', 'Repository path is required');
      }

      const startedAt = Date.now();
      const status = {
        repository: repositoryPath,
        timestamp: startedAt,
        branch: null,
        commits: [],
        uncommitted: [],
        status: null,
        tests: {
          lastRun: null,
          passed: false,
        },
        recent_operations: [],
      };

      try {
        // Get current branch and uncommitted changes
        const gitStatus = await bridge.execute('git.status', {
          repository: repositoryPath,
        });
        if (gitStatus.ok && gitStatus.data) {
          status.status = gitStatus.data;
          // Parse branch from git status output
          const lines = (gitStatus.data.output || '').split('\n');
          if (lines[0]) {
            const branchMatch = lines[0].match(/^\s*##\s+([^\s.]+)/);
            if (branchMatch) status.branch = branchMatch[1];
          }
        }

        // Get recent commits (if available)
        const history = await bridge.execute('git.history', {
          repository: repositoryPath,
        }).catch(() => null);
        if (history && history.ok && history.data) {
          status.commits = (history.data.commits || []).slice(0, 5);
        }

        // Get recent operations from log
        if (operationLog) {
          const allOps = operationLog.list();
          status.recent_operations = allOps
            .filter((op) => op.repositoryId === repositoryPath || op.parameters?.repository === repositoryPath)
            .slice(-10)
            .map((op) => ({
              command: op.command,
              status: op.outcome,
              timestamp: op.timestamp,
              durationMs: op.durationMs,
            }));
        }
      } catch (error) {
        status.error = error instanceof Error ? error.message : String(error);
      }

      status.durationMs = Date.now() - startedAt;
      return status;
    },

    /**
     * Get quick status (branch + test status only)
     */
    async getQuickStatus(repositoryPath) {
      if (typeof repositoryPath !== 'string' || !repositoryPath.trim()) {
        throw new RepositoryStatusError('INVALID_PATH', 'Repository path is required');
      }

      const gitStatus = await bridge.execute('git.status', {
        repository: repositoryPath,
      }).catch(() => ({ ok: false, data: null }));

      if (!gitStatus.ok) {
        return { repository: repositoryPath, status: 'unavailable', branch: null };
      }

      const lines = (gitStatus.data?.output || '').split('\n');
      const branchLine = lines[0] || '';
      const branchMatch = branchLine.match(/^\s*##\s+([^\s.]+)/);
      const branch = branchMatch ? branchMatch[1] : 'unknown';

      const hasChanges = lines.some((line) => line.trim().startsWith('M ') || line.trim().startsWith('?? '));

      return {
        repository: repositoryPath,
        status: hasChanges ? 'dirty' : 'clean',
        branch,
        hasUncommittedChanges: hasChanges,
      };
    },

    /**
     * Get recent operations for a repository
     */
    getRecentOperations(repositoryPath, limit = 20) {
      if (!operationLog) return [];

      return operationLog
        .list()
        .filter((op) => op.repositoryId === repositoryPath || op.parameters?.repository === repositoryPath)
        .slice(-limit)
        .map((op) => ({
          requestId: op.requestId,
          command: op.command,
          outcome: op.outcome,
          timestamp: op.timestamp,
          durationMs: op.durationMs,
          error: op.error,
        }));
    },

    /**
     * Check if repository is dirty (has uncommitted changes)
     */
    async isDirty(repositoryPath) {
      const quick = await this.getQuickStatus(repositoryPath);
      return quick.status === 'dirty';
    },

    /**
     * Get current branch
     */
    async getCurrentBranch(repositoryPath) {
      const quick = await this.getQuickStatus(repositoryPath);
      return quick.branch;
    },
  });
}
