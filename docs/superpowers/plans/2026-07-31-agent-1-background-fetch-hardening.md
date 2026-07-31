# Agent 1 Background Router and Page Fetch Hardening Plan

**Goal:** Apply the existing runtime sender policy to the main background router and replace the arbitrary `bds-fetch-url` surface with a bounded GET-only page reader.

**Branch:** `agent-1/extension-runtime-platforms`

**Base:** `integration/local-first-repair`

## Task 1 — Page-fetch policy tests

**Create:** `src/background/page-fetch.test.js`

Required cases:

1. public HTTPS and HTTP URLs accepted
2. only GET emitted
3. credentials forced to `omit`
4. safe search headers retained
5. authorization, cookie and unknown headers removed
6. request bodies and unsafe methods rejected
7. no-store cache retained; other values normalized
8. unsupported protocols and URL credentials rejected
9. localhost, `.local`, `.lan`, and metadata hosts rejected
10. IPv4 loopback/private/link-local/unspecified/multicast/documentation/reserved targets rejected
11. IPv6 loopback/link-local/ULA/unspecified/multicast targets rejected
12. excessive `Content-Length` rejected
13. streamed response exceeding byte cap rejected
14. browser-standard redirect following forced
15. public final response URL accepted
16. blocked final response URL rejected before body read
17. timeout abort produces a bounded error

The first test commit preceded production implementation. Do not claim an executed RED/Green cycle until GitHub Actions or another repository checkout runs Vitest.

## Task 2 — Background-router security assertions

**Create:** `tests/background-router-security.test.js`

Read `src/background/index.js` and assert:

- it imports `isTrustedRuntimeSender`
- it imports bounded `fetchPageContent` from `./page-fetch.js`
- it defines the exact main-router message set
- it validates sender before the first privileged handler branch
- the old inline forwarding of method, body, credentials, and redirect options is absent

## Task 3 — Page-fetch module

**Create:** `src/background/page-fetch.js`

Implementation requirements:

- 15-second timeout
- 5 MiB response cap
- HTTP and HTTPS only
- reject URL credentials
- validate initial host literals and obvious local hostnames
- GET only
- safe presentation-header allowlist
- credentials `omit`
- cache `no-store` only when requested, otherwise `default`
- fixed `redirect: "follow"` for browser compatibility
- validate final `response.url` before status processing or body read
- `AbortController` cleanup in `finally`
- `Content-Length` pre-check and actual streamed byte cap
- preserve existing charset detection behaviour
- retain HTTP status on errors where applicable
- inject `fetch` and timer dependencies for deterministic tests

### Redirect correction

Do not use `redirect: "manual"`. The Fetch Standard exposes manual redirects as opaque redirect responses with status `0`, empty headers, and no body, so portable extension code cannot inspect and manually follow `Location` that way.

The final-URL check prevents returning or reading content from an obvious local/private redirected destination. It does not prevent the browser from making the redirect connection and does not solve DNS rebinding.

## Task 4 — Gate the main background router

**Modify:** `src/background/index.js`

- import `isTrustedRuntimeSender`
- import and re-export `fetchPageContent`
- define the message types owned by this router
- return `false` for messages owned by other listeners
- reject untrusted owned messages before any handler
- retain existing asynchronous `return true` behaviour for trusted operations
- remove inline charset/fetch helpers and arbitrary option forwarding

## Task 5 — Caller compatibility review

Reinspect:

- `src/content/files/web-reader.js`
- `src/content/files/search-reader.js`
- `src/content/files/twitter-reader.js`
- `src/content/files/youtube-reader.js`
- `src/lib/pricing.js`

Confirmed requirement: all callers use GET; only search requires the retained safe headers and no-store cache mode.

## Task 6 — Verification

Required when available:

```bash
npx vitest run src/background/page-fetch.test.js tests/background-router-security.test.js src/background/runtime-policy.test.js tests/runtime-trust-boundaries.test.js
npm test
npm run build:chrome
npm run build:firefox
```

Already available as narrow evidence:

- `node --check` on the exact new page-fetch module
- `node --check` on the reconstructed background entry applied to GitHub
- isolated page-fetch behavioural smoke assertions
- GitHub source and diff inspection

These checks do not replace Vitest or browser builds.

## Task 7 — Documentation and review

- append Pass 2 evidence and findings to `docs/agents/agent-1-runtime-report.md`
- update issue #3
- update draft PR #5
- request CodeRabbit review
- leave PR draft until Agent 3 CI and CodeRabbit requirements are satisfied
