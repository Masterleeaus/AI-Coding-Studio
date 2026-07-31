# Agent 1 Context Budget Ledger Repair Plan

**Goal:** Count each actual DeepSeek request once and prevent failed or nonexistent managed prompts from consuming context budget.

**Branch:** `agent-1/extension-runtime-platforms`

**Base:** `integration/local-first-repair`

## Task 1 — Unit tests for provider-request accounting

**Modify:** `src/content/context-budget.js`

**Create:** `src/content/context-budget.test.js`

Specify a new function:

```js
recordProviderRequestContext({
  conversationId,
  injectedText,
  userPrompt,
  label,
})
```

Required behaviour:

1. visible prompt is recorded once
2. hidden and visible text are combined once
3. empty request data does not change the ledger
4. separate conversations remain isolated
5. `clearConversationBudget()` resets the estimate

Commit tests before production implementation. Do not claim an executed RED cycle until Vitest runs.

## Task 2 — Architecture tests for single-source accounting

**Create:** `tests/deep-research-budget-ledger.test.js`

Assert:

- `src/content/bridge.js` imports and calls `recordProviderRequestContext`
- `src/content/deep-research.js` does not import or call `recordOutgoingContext`
- managed approval does not record `buildApprovalMessage`
- the revision event listener is async
- revision awaits `injectPureTextAndSend`
- `awaiting_revision` occurs after the awaited send expression

## Task 3 — Implement provider-request accounting

**Modify:** `src/content/context-budget.js`

- add `recordProviderRequestContext`
- combine non-empty hidden and visible text with a stable separator
- delegate to the existing `recordOutgoingContext`
- preserve conversation isolation and existing server calibration

## Task 4 — Make the bridge authoritative

**Modify:** `src/content/bridge.js`

- import `recordProviderRequestContext`
- replace the direct combined-text `recordOutgoingContext` call
- retain the exact mutation event and conversation ID behaviour

## Task 5 — Remove speculative/pre-send budget commits

**Modify:** `src/content/deep-research.js`

- remove `recordOutgoingContext` import
- remove approval accounting for unsent `buildApprovalMessage`
- remove pre-send commits in `sendStepForAnalysis`
- remove pre-send commits in `requestFinalReport`
- remove revision pre-send commit
- make revision listener async and await the send result
- transition to `awaiting_revision` only after a successful send

Budget threshold projection remains before send and continues using the candidate prompt/file token estimate.

## Task 6 — Verification

When CI is available:

```bash
npx vitest run src/content/context-budget.test.js tests/deep-research-budget-ledger.test.js
npx vitest run src/background/runtime-policy.test.js src/background/page-fetch.test.js tests/runtime-trust-boundaries.test.js tests/background-router-security.test.js
npm test
npm run build:chrome
npm run build:firefox
```

Narrow local checks may include exact JavaScript syntax and pure budget-function smoke tests, but they do not replace Vitest or browser builds.

## Task 7 — Documentation and review

- append Pass 3 findings to `docs/agents/agent-1-runtime-report.md`
- update issue #3 and PR #5
- ask CodeRabbit to re-review the new budget changes
- keep PR draft until exact-head CI and review complete
