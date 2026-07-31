/**
 * Progress Documentation Generator
 * Auto-generates markdown files documenting agent work and repository state
 */

function formatTimestamp(ms) {
  return new Date(ms).toISOString();
}

function formatDuration(ms) {
  if (!ms) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function createProgressDocumentation() {
  return Object.freeze({
    /**
     * Generate progress report from agent log
     */
    generateProgressReport(agentLog, repositoryStatus = null) {
      const summary = agentLog.summary();
      const latest = agentLog.latest(20);

      let md = '# Agent Progress Report\n\n';
      md += `**Generated:** ${formatTimestamp(Date.now())}\n\n`;

      // Summary section
      md += '## Summary\n\n';
      md += `- **Total Activities:** ${summary.totalEntries}\n`;
      md += `- **Completed:** ${summary.byStatus.completed}\n`;
      md += `- **Failed:** ${summary.byStatus.failed}\n`;
      md += `- **In Progress:** ${summary.byStatus.in_progress}\n`;
      md += `- **Unique Agents:** ${summary.uniqueAgents}\n`;
      md += `- **Total Duration:** ${formatDuration(summary.totalDurationMs)}\n\n`;

      // By agent breakdown
      if (Object.keys(summary.byAgent).length > 0) {
        md += '## Activity by Agent\n\n';
        md += '| Agent | Count |\n';
        md += '|-------|-------|\n';
        for (const [agent, count] of Object.entries(summary.byAgent)) {
          md += `| ${agent} | ${count} |\n`;
        }
        md += '\n';
      }

      // Recent activities
      if (latest.length > 0) {
        md += '## Recent Activities\n\n';
        md += '| Agent | Action | Status | Duration | Time |\n';
        md += '|-------|--------|--------|----------|------|\n';
        for (const entry of latest) {
          const duration = entry.durationMs ? formatDuration(entry.durationMs) : '—';
          const time = formatTimestamp(entry.startedAt).slice(11, 19);
          md += `| ${entry.agentName} | ${entry.action} | ${entry.status} | ${duration} | ${time} |\n`;
        }
        md += '\n';
      }

      // Repository status if available
      if (repositoryStatus) {
        md += '## Repository Status\n\n';
        md += `- **Repository:** \`${repositoryStatus.repository}\`\n`;
        md += `- **Branch:** ${repositoryStatus.branch || 'unknown'}\n`;
        md += `- **Status:** ${repositoryStatus.status || 'unknown'}\n`;
        if (repositoryStatus.commits && repositoryStatus.commits.length > 0) {
          md += '- **Latest Commits:**\n';
          for (const commit of repositoryStatus.commits.slice(0, 3)) {
            md += `  - \`${commit.hash?.slice(0, 7) || ''}\` ${commit.message || ''}\n`;
          }
        }
        md += '\n';
      }

      return md;
    },

    /**
     * Generate workflow status report
     */
    generateWorkflowReport(workflow) {
      if (!workflow || typeof workflow !== 'object') {
        return '# Workflow Report\n\nNo workflow data available.\n';
      }

      let md = '# Workflow Status Report\n\n';
      md += `**Workflow ID:** ${workflow.id}\n`;
      md += `**Type:** ${workflow.type}\n`;
      md += `**State:** ${workflow.state}\n`;
      md += `**Repository:** ${workflow.repository}\n`;
      md += `**Branch:** ${workflow.branch}\n\n`;

      // Phases and steps
      if (workflow.currentPhase) {
        md += `## Current Phase\n\n${workflow.currentPhase}\n\n`;
      }

      if (workflow.activeStep) {
        md += `## Active Step\n\n${workflow.activeStep}\n\n`;
      }

      // Completed steps
      if (workflow.completedSteps && workflow.completedSteps.length > 0) {
        md += '## Completed Steps\n\n';
        for (const step of workflow.completedSteps) {
          md += `- [x] ${step}\n`;
        }
        md += '\n';
      }

      // Findings
      if (workflow.findings && workflow.findings.length > 0) {
        md += '## Findings\n\n';
        for (const finding of workflow.findings) {
          md += `- ${finding}\n`;
        }
        md += '\n';
      }

      // Test runs
      if (workflow.testRuns && workflow.testRuns.length > 0) {
        md += '## Test Results\n\n';
        for (const test of workflow.testRuns) {
          const status = test.passed ? '✅' : '❌';
          md += `- ${status} ${test.name}\n`;
        }
        md += '\n';
      }

      // Errors
      if (workflow.errors && workflow.errors.length > 0) {
        md += '## Errors\n\n';
        for (const error of workflow.errors) {
          md += `- ${error}\n`;
        }
        md += '\n';
      }

      // Timeline
      md += '## Timeline\n\n';
      md += `- **Created:** ${formatTimestamp(workflow.createdAt)}\n`;
      md += `- **Updated:** ${formatTimestamp(workflow.updatedAt)}\n`;

      return md;
    },

    /**
     * Generate repository overview
     */
    generateRepositoryOverview(repositories = [], agentLog = null) {
      let md = '# Repository Overview\n\n';
      md += `**Generated:** ${formatTimestamp(Date.now())}\n\n`;

      if (!repositories || repositories.length === 0) {
        md += 'No repositories tracked.\n';
        return md;
      }

      md += '## Tracked Repositories\n\n';
      md += '| Repository | Branch | Status | Recent Activity |\n';
      md += '|------------|--------|--------|------------------|\n';

      for (const repo of repositories) {
        const recentOps = agentLog ? agentLog.list({ since: Date.now() - 3600000 }).length : 0;
        md += `| ${repo.path || repo.name} | ${repo.branch || '—'} | ${repo.status || '—'} | ${recentOps} in 1h |\n`;
      }
      md += '\n';

      return md;
    },

    /**
     * Generate agent activity timeline
     */
    generateActivityTimeline(agentLog) {
      const entries = agentLog.list();
      if (entries.length === 0) {
        return '# Activity Timeline\n\nNo activities recorded.\n';
      }

      let md = '# Activity Timeline\n\n';

      // Group by date
      const byDate = {};
      for (const entry of entries) {
        const date = new Date(entry.startedAt).toLocaleDateString();
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(entry);
      }

      // Generate timeline
      for (const [date, dayEntries] of Object.entries(byDate).reverse()) {
        md += `## ${date}\n\n`;
        for (const entry of dayEntries) {
          const time = new Date(entry.startedAt).toLocaleTimeString();
          const icon =
            entry.status === 'completed'
              ? '✅'
              : entry.status === 'failed'
                ? '❌'
                : entry.status === 'in_progress'
                  ? '⏳'
                  : '⏭️';
          const duration = entry.durationMs ? ` (${formatDuration(entry.durationMs)})` : '';
          md += `- ${time} ${icon} **${entry.agentName}**: ${entry.action}${duration}\n`;
          if (entry.details) {
            md += `  - ${entry.details}\n`;
          }
          if (entry.error) {
            md += `  - Error: ${entry.error}\n`;
          }
        }
        md += '\n';
      }

      return md;
    },

    /**
     * Generate index/table of contents
     */
    generateIndex(files = []) {
      let md = '# Progress Documentation Index\n\n';
      md += `**Last Updated:** ${formatTimestamp(Date.now())}\n\n`;

      if (!files || files.length === 0) {
        md += 'No documentation files available.\n';
        return md;
      }

      md += '## Documentation Files\n\n';
      for (const file of files) {
        md += `- [${file.title}](./${file.filename})\n`;
        if (file.description) md += `  - ${file.description}\n`;
      }
      md += '\n';

      return md;
    },

    /**
     * Format entry details for markdown
     */
    formatEntry(entry) {
      let md = `### ${entry.agentName}: ${entry.action}\n\n`;
      md += `**Status:** ${entry.status}\n`;
      md += `**Started:** ${formatTimestamp(entry.startedAt)}\n`;
      if (entry.completedAt) md += `**Completed:** ${formatTimestamp(entry.completedAt)}\n`;
      if (entry.durationMs) md += `**Duration:** ${formatDuration(entry.durationMs)}\n`;
      if (entry.details) md += `**Details:** ${entry.details}\n`;
      if (entry.error) md += `**Error:** ${entry.error}\n`;
      if (Object.keys(entry.metadata).length > 0) {
        md += '**Metadata:**\n';
        for (const [key, value] of Object.entries(entry.metadata)) {
          md += `- ${key}: ${JSON.stringify(value)}\n`;
        }
      }
      md += '\n';

      return md;
    },
  });
}
