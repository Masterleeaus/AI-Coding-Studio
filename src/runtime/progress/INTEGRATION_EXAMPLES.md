# Progress Tracking Integration Examples

Complete examples showing how to integrate progress tracking into your agent handlers and workflows.

## Quick Start

Every agent has access to `kernel.progress` through the RuntimeKernel singleton.

```javascript
import { getRuntimeKernel } from '../../runtime/singleton.js';

const kernel = getRuntimeKernel();

// Log a simple action
kernel.progress.logStart('my-agent', 'analyze-code', 'Analyzing repository structure');
const analysis = await analyzeRepository();
kernel.progress.logComplete('my-agent', 'analyze-code', 'Found 50 files', 2500);
```

---

## Pattern 1: Simple Action Logging

For one-off actions that don't follow a workflow structure.

```javascript
// Example: Dependency scanner agent

async function scanDependencies(repository) {
  const kernel = getRuntimeKernel();
  
  kernel.progress.logStart('agent-dependencies', 'scan-vulnerabilities', 'Scanning npm packages');
  
  try {
    const vulnerabilities = await runSecurityAudit(repository);
    const count = vulnerabilities.length;
    
    kernel.progress.logComplete(
      'agent-dependencies',
      'scan-vulnerabilities',
      `Found ${count} vulnerabilities`,
      2500
    );
    
    return { success: true, vulnerabilities };
  } catch (error) {
    kernel.progress.logFail('agent-dependencies', 'scan-vulnerabilities', error.message);
    throw error;
  }
}
```

---

## Pattern 2: Multi-Step Workflow with WorkflowExecutor

For complex, multi-phase work that should be tracked as a workflow.

```javascript
// Example: Deep audit agent

import { getRuntimeKernel } from '../../runtime/singleton.js';
import { createWorkflowExecutor } from '../workflow/WorkflowExecutor.js';

async function performDeepAudit(repository, branch) {
  const kernel = getRuntimeKernel();
  const executor = createWorkflowExecutor({
    kernel,
    agentName: 'agent-audit',
  });

  const steps = [
    {
      id: 'inventory',
      title: 'Inventory Repository',
      handler: async () => {
        const files = await scanRepository(repository);
        return {
          message: `Found ${files.length} files`,
          findings: identifyStructure(files),
        };
      },
    },
    {
      id: 'analyze',
      title: 'Analyze Architecture',
      handler: async () => {
        const issues = await analyzeArchitecture(repository);
        return {
          message: `Found ${issues.length} architectural issues`,
          findings: issues,
        };
      },
    },
    {
      id: 'verify',
      title: 'Verify Findings',
      handler: async () => {
        const verified = await verifyFindings(repository);
        return {
          message: `Verified ${verified.length} findings`,
          findings: verified,
        };
      },
    },
    {
      id: 'report',
      title: 'Generate Report',
      handler: async () => {
        const report = await generateAuditReport(repository);
        return {
          message: 'Audit report generated',
        };
      },
    },
  ];

  const result = await executor.executeWorkflow(
    'DEEP_AUDIT',
    repository,
    branch,
    steps
  );

  // Now result contains:
  // - workflowId: unique ID
  // - state: 'COMPLETED' or 'FAILED'
  // - completedSteps: array of successful step IDs
  // - findings: aggregated findings from all steps
  // - errors: any step errors that caused failure

  return result;
}
```

---

## Pattern 3: Manual Step Execution with ExecuteStep

For finer control over step execution while still getting progress logging.

```javascript
// Example: Code review agent

import { createWorkflowExecutor } from '../workflow/WorkflowExecutor.js';

async function reviewCode(repository, pullRequest) {
  const kernel = getRuntimeKernel();
  const executor = createWorkflowExecutor({
    kernel,
    agentName: 'agent-review',
  });

  // Step 1: Read the diff
  const diffResult = await executor.executeStep(
    'read-diff',
    'Read Pull Request Changes',
    async () => {
      const diff = await getDiffForPR(pullRequest);
      return {
        message: `Read ${diff.files.length} changed files`,
        files: diff.files,
      };
    }
  );

  if (!diffResult.success) {
    console.error('Failed to read diff:', diffResult.error);
    return { success: false };
  }

  // Step 2: Analyze correctness
  const analysisResult = await executor.executeStep(
    'analyze-correctness',
    'Review Code Correctness',
    async () => {
      const issues = await analyzeCodeQuality(diffResult.data.files);
      return {
        message: `Found ${issues.length} potential issues`,
        issues,
      };
    }
  );

  if (!analysisResult.success) {
    console.error('Analysis failed:', analysisResult.error);
    return { success: false };
  }

  // Step 3: Run tests
  const testResult = await executor.executeStep(
    'run-tests',
    'Run Relevant Tests',
    async () => {
      const results = await runTestsForChangedFiles(diffResult.data.files);
      return {
        message: `${results.passed}/${results.total} tests passed`,
        results,
      };
    }
  );

  // Return aggregated results
  return {
    success: true,
    issues: analysisResult.data?.issues || [],
    testResults: testResult.data?.results,
    progressReport: executor.generateProgressReport(),
  };
}
```

---

## Pattern 4: Conditional Workflow Execution

Dynamically choose workflow steps based on conditions.

```javascript
// Example: Build agent with conditional steps

async function buildProject(repository, target) {
  const kernel = getRuntimeKernel();
  const executor = createWorkflowExecutor({
    kernel,
    agentName: 'agent-build',
  });

  const steps = [
    {
      id: 'preflight',
      title: 'Preflight Checks',
      handler: async () => {
        const available = await checkToolAvailability(target);
        return { message: 'Tools verified', tools: available };
      },
    },
  ];

  // Add build step if not custom build
  if (target !== 'custom') {
    steps.push({
      id: 'build',
      title: 'Build Project',
      handler: async () => {
        const output = await runBuild(repository, target);
        return { message: `Build completed: ${output}` };
      },
    });
  }

  // Always verify
  steps.push({
    id: 'verify',
    title: 'Verify Output',
    handler: async () => {
      const valid = await verifyBuildOutput(repository);
      return { message: valid ? 'Output valid' : 'Output invalid' };
    },
  });

  return executor.executeWorkflow('BUILD', repository, 'main', steps);
}
```

---

## Pattern 5: Parallel Execution Tracking

Multiple agents working in parallel, each tracking their own progress.

```javascript
// Example: Multi-agent system

async function auditWithMultipleAgents(repository) {
  const kernel = getRuntimeKernel();

  // Agent 1: Dependency scan
  const depPromise = (async () => {
    kernel.progress.logStart('agent-deps', 'scan', 'Scanning dependencies');
    const vulns = await scanDependencies(repository);
    kernel.progress.logComplete('agent-deps', 'scan', `Found ${vulns.length} vulnerabilities`);
    return vulns;
  })();

  // Agent 2: Code quality
  const qualityPromise = (async () => {
    kernel.progress.logStart('agent-quality', 'analyze', 'Analyzing code quality');
    const issues = await analyzeQuality(repository);
    kernel.progress.logComplete('agent-quality', 'analyze', `Found ${issues.length} issues`);
    return issues;
  })();

  // Agent 3: Security scan
  const securityPromise = (async () => {
    kernel.progress.logStart('agent-security', 'scan', 'Running security scan');
    const findings = await runSecurityScan(repository);
    kernel.progress.logComplete('agent-security', 'scan', `Found ${findings.length} findings`);
    return findings;
  })();

  // Wait for all
  const [dependencies, quality, security] = await Promise.all([
    depPromise,
    qualityPromise,
    securityPromise,
  ]);

  // Get unified progress report
  const summary = kernel.progress.getProgressSummary();
  console.log(`All agents completed: ${summary.totalEntries} total actions`);
  console.log(`Success rate: ${summary.byStatus.completed}/${summary.totalEntries}`);

  return { dependencies, quality, security };
}
```

---

## Pattern 6: Real-time Dashboard Updates

Periodically publish progress to a dashboard or UI.

```javascript
// Example: Long-running audit with dashboard updates

async function auditWithDashboard(repository) {
  const kernel = getRuntimeKernel();
  const executor = createWorkflowExecutor({
    kernel,
    agentName: 'agent-audit',
  });

  // Update dashboard every 2 seconds
  const dashboardInterval = setInterval(() => {
    const summary = kernel.progress.getProgressSummary();
    const report = executor.generateProgressReport();

    // Send to dashboard/UI
    window.postMessage({
      type: 'PROGRESS_UPDATE',
      summary,
      report,
    });
  }, 2000);

  try {
    const result = await executor.executeWorkflow(
      'DEEP_AUDIT',
      repository,
      'main',
      [
        // ... workflow steps ...
      ]
    );

    return result;
  } finally {
    clearInterval(dashboardInterval);

    // Send final report
    window.postMessage({
      type: 'AUDIT_COMPLETE',
      result: result,
    });
  }
}
```

---

## Pattern 7: Error Recovery with Progress Tracking

Handle errors while maintaining progress history.

```javascript
// Example: Agent with retry logic and error tracking

async function robustScan(repository) {
  const kernel = getRuntimeKernel();
  const executor = createWorkflowExecutor({
    kernel,
    agentName: 'agent-scan',
  });

  const MAX_RETRIES = 3;

  const scanStep = {
    id: 'scan',
    title: 'Scan Repository',
    handler: async () => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await runScan(repository);
          return { message: `Scan completed on attempt ${attempt}` };
        } catch (error) {
          if (attempt === MAX_RETRIES) {
            throw error; // Give up after max retries
          }

          // Log retry attempt
          kernel.progress.logStart(
            'agent-scan',
            'scan-retry',
            `Retry attempt ${attempt} (${error.message})`
          );

          // Wait before retry
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    },
  };

  const result = await executor.executeWorkflow(
    'SCAN',
    repository,
    'main',
    [scanStep]
  );

  return result;
}
```

---

## Accessing Progress Data

### Get Summary Statistics

```javascript
const kernel = getRuntimeKernel();
const summary = kernel.progress.getProgressSummary();

console.log(`Total activities: ${summary.totalEntries}`);
console.log(`Completed: ${summary.byStatus.completed}`);
console.log(`Failed: ${summary.byStatus.failed}`);
console.log(`By agent:`, summary.byAgent);
```

### Get Agent-Specific Progress

```javascript
const agentEntries = kernel.progress.getAgentProgress('agent-audit');
console.log(`Agent audit actions:`, agentEntries.length);
```

### Generate Reports

```javascript
// Progress summary
const report = kernel.progress.generateProgressReport();
console.log(report); // Markdown report

// Workflow state
const workflow = await kernel.progress.getWorkflow(workflowId);
const workflowReport = kernel.progress.generateWorkflowReport(workflow);

// Activity timeline
const timeline = kernel.progress.generateActivityTimeline();
```

---

## Best Practices

1. **Always log start and completion**: Helps identify stuck processes
2. **Use descriptive action names**: e.g., 'scan-dependencies' not 'scan'
3. **Include details in completion**: Message should say what was found/done
4. **Use WorkflowExecutor for multi-step work**: Provides automatic state management
5. **Log failures immediately**: Don't wait for a later completion call
6. **Generate reports periodically**: For long-running operations, update dashboards
7. **Use agentName consistently**: Makes it easy to filter by agent

---

## Error Handling

All logging methods are safe:
- `logStart`, `logComplete`, `logFail` never throw
- Missing kernel.progress is handled gracefully
- Storage failures don't stop agent execution

However, WorkflowStore failures will throw. Handle them in your workflow:

```javascript
try {
  const workflow = await kernel.progress.startWorkflow('TYPE', repo, branch);
  // ... continue workflow ...
} catch (error) {
  console.error('Workflow tracking unavailable:', error);
  // Continue without progress tracking or exit
}
```

---

## Integration Checklist

- [ ] Import `getRuntimeKernel` from singleton
- [ ] Create executor or call `kernel.progress.log*()`
- [ ] Log action start with descriptive details
- [ ] Execute the actual work
- [ ] Log completion or failure with results
- [ ] Use WorkflowExecutor for multi-step workflows
- [ ] Generate reports for long-running operations
- [ ] Handle workflow tracking unavailable gracefully
