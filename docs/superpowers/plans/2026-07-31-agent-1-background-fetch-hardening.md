# Agent 1 Background Router and Page Fetch Hardening Plan

**Goal:** Apply the existing runtime sender policy to the main background router and replace the arbitrary `bds-fetch-url` fetch surface with a bounded GET-only page reader.

**Branch:** `agent-1/extension-runtime-platforms`

**Base:** `integration/local-first-repair`

## Task 1 — Commit failing page-fetch policy tests

**Create:** `src/background/page-fetch.test.js`

Test the future exports from `src/background/page-fetch.js`:

- `normalizePageFetchRequest`
- `isBlockedPageFetchHostname`
- `readResponseBytes`
- `fetchPageContent`

Required cases:

1. public HTTPS and HTTP URLs accepted
2. only GET emitted
3. credentials forced to `omit`
4. safe search headers retained
5. authorization, cookie and unknown headers removed
6. request body ignored
7. no-store cache retained; unsafe cache values normalized
8. unsupported protocols rejected
9. localhost and `.local` rejected
10. IPv4 loopback/private/link-local/unspecified/multicast/documentation/reserved targets rejected
11. IPv6 loopback/link-local/ULA/unspecified rejected
12. metadata literals rejected
13. excessive Content-Length rejected
14. streamed response exceeding byte cap rejected
15. public redirect followed after validation
16. redirect to blocked target rejected before second fetch
17. redirect loop/hop overflow rejected
18. timeout abort produces a bounded error

Do not claim RED execution until GitHub Actions or another repository checkout runs the suite.

## Task 2 — Commit failing background-router security assertions

**Create:** `tests/background-router-security.test.js`

Read `src/background/index.js` and assert:

- it imports `isTrustedRuntimeSender`
- it imports bounded `fetchPageContent` from `./page-fetch.js`
- it defines the exact main-router message set
- it validates sender before the first privileged handler branch
- the old inline forwarding of `safeOptions.method`, `safeOptions.body`, `safeOptions.credentials`, and `safeOptions.redirect` is absent

## Task 3 — Implement the page-fetch module

**Create:** `src/background/page-fetch.js`

Implementation requirements:

- constants for 15-second timeout, 5 redirects, 5 MiB response cap
- HTTP and HTTPS only
- public host validation for hostname literals and obvious local hostnames
- GET only
- safe presentation-header allowlist
- credentials `omit`
- cache `no-store` only when requested, otherwise `default`
- manual validated redirects
- `AbortController` cleanup in `finally`
- `Content-Length` pre-check and actual streamed byte cap
- existing charset detection behaviour preserved
- errors retain HTTP status where applicable
- optional injected `fetch` and timer dependencies for deterministic tests

## Task 4 — Gate the main background router

**Modify:** `src/background/index.js`

- import `isTrustedRuntimeSender`
- import and re-export `fetchPageContent`
- define the message types owned by this router
- return `false` for messages owned by other listeners
- reject untrusted owned messages before any handler
- retain existing asynchronous `return true` behaviour for trusted operations
- remove the inline `fetchPageContent`, charset helpers, and arbitrary option forwarding

## Task 5 — Review caller compatibility

Reinspect:

- `src/content/files/web-reader.js`
- `src/content/files/search-reader.js`
- `src/content/files/twitter-reader.js`
- `src/content/files/youtube-reader.js`
- `src/lib/pricing.js`

Confirm no caller depends on stripped capabilities. Update a caller only if repository evidence shows a required compatibility adjustment.

## Task 6 — Verification

Required when available:

```bash
npx vitest run src/background/page-fetch.test.js tests/background-router-security.test.js src/background/runtime-policy.test.js tests/runtime-trust-boundaries.test.js
npm test
npm run build:chrome
npm run build:firefox
```

Also inspect the PR diff for unrelated formatting churn and verify the Agent 1 branch remains based on the integration branch.

No pass/build claim without command evidence.

## Task 7 — Documentation and review

- append Pass 2 evidence and findings to `docs/agents/agent-1-runtime-report.md`
- update issue #3
- update draft PR #5 body/comment with Pass 2 scope
- request CodeRabbit review
- leave PR draft until Agent 3 CI and CodeRabbit requirements are satisfied
