# Agent 1 Background Router and Page Fetch Hardening Design

## Purpose

This design defines Agent 1 Pass 2. It hardens the production Manifest V3 background message router and the generic `bds-fetch-url` page-reading bridge without changing Agent 2's Local Bridge scope or Agent 3's workflow/CI ownership.

## Repository Evidence

The production background runtime is `src/background/index.js`. Its message listener handles YouTube transcript retrieval, GitHub ZIP and commit retrieval, generic page fetches, locale update/reset, startup status, and MCP calls.

Every located caller is extension code running in the content-script runtime:

- YouTube reader
- Twitter oEmbed reader
- generic web reader
- search reader
- pricing loader
- GitHub reader and commit reader
- content bridge and settings UI for MCP and locale operations

The listener currently does not validate `sender` for any of those privileged operations.

The generic `bds-fetch-url` callers require only page retrieval:

- web reader: GET with no custom options
- YouTube metadata: GET with no custom options
- Twitter oEmbed: GET with no custom options
- pricing page: GET
- search providers: GET with `Accept`, `Accept-Language`, `Cache-Control`, and `Pragma`, plus no-store cache semantics

No located caller requires caller-supplied POST/PUT/PATCH/DELETE methods, request bodies, cookies, authorization headers, arbitrary redirect modes, or credentialed requests.

## Root Cause

`fetchPageContent(url, options)` was implemented as a generic CORS bypass rather than as the narrow page-reader operation used by its callers. It forwards caller-controlled method, headers, body, cache, credentials, and redirect options under the extension's broad host permissions, reads the complete response into memory, and has no timeout or local-network target checks.

The main background router separately assumes possession of the runtime channel is sufficient trust and does not use the sender policy introduced in Agent 1 Pass 1.

## Security Model

### Background sender gate

The main router will classify its own handled message types before applying sender validation. This avoids responding to messages owned by the separate DeepSeek API-proxy listener.

For every message owned by the main router:

1. require `isTrustedRuntimeSender(sender, chrome.runtime.id)`
2. reject untrusted senders before network, storage, GitHub, locale, YouTube, or MCP work
3. return a response containing both `ok: false` and `success: false` so existing caller conventions remain compatible

### Page fetch contract

`bds-fetch-url` becomes a structured page-read operation:

```text
public HTTP(S) URL
    → validate target
    → force GET
    → filter safe request headers
    → force credentials omit
    → bounded cache mode
    → manual, validated redirects
    → timeout
    → response-size cap
    → charset detection and text decode
```

Supported caller inputs:

- URL
- safe presentation headers:
  - `Accept`
  - `Accept-Language`
  - `Cache-Control`
  - `Pragma`
- cache mode `no-store` when requested

Ignored or rejected capability:

- non-GET methods
- request bodies
- `Authorization`
- `Cookie`
- proxy/authentication headers
- caller-controlled credentials
- caller-controlled redirect policy
- local, loopback, link-local, private, unspecified, multicast, or metadata-service literal targets
- obvious local hostnames such as `localhost` and `.local`
- `file:`, `data:`, `blob:`, extension, FTP, and other non-HTTP(S) protocols

Public HTTP remains supported because the existing URL normalizer and web-reader feature explicitly accept both HTTP and HTTPS. This preserves compatibility while local/private destinations are rejected.

## Redirect Handling

Redirects will be followed manually with a small maximum hop count. Every `Location` target is resolved against the current URL and validated before the next request. This prevents the bridge from blindly following an explicit redirect to an obvious local/private target.

This does not fully solve DNS rebinding because browser JavaScript cannot reliably inspect the resolved remote IP before connection. The limitation must be documented. The repair materially reduces the exposed surface but does not claim complete network-layer SSRF prevention.

## Resource Bounds

Initial defaults:

- timeout: 15 seconds
- maximum redirects: 5
- maximum decoded source bytes: 5 MiB

The response cap is enforced against both `Content-Length` when present and actual streamed bytes. Readers receive a clear error instead of allowing unbounded service-worker memory growth.

## Module Structure

Create `src/background/page-fetch.js` containing pure or dependency-injected functions:

- `normalizePageFetchRequest(url, options)`
- `isBlockedPageFetchHostname(hostname)`
- `readResponseBytes(response, maxBytes)`
- `fetchPageContent(url, options, dependencies?)`

`src/background/index.js` will import and re-export `fetchPageContent` to preserve its existing module interface.

## Compatibility

### Chrome and Firefox

The sender gate uses the existing Agent 1 runtime policy and the exact content-script hosts declared in the manifest. Public page reading, search, Twitter, YouTube metadata, and pricing remain GET-based.

### Android

Android uses its native `WebViewBridge` rather than the desktop Manifest V3 background service worker. This pass does not modify the Android bridge or its tests. Shared callers continue sending the same `bds-fetch-url` message shape.

### MCP and GitHub

This pass adds sender validation to MCP and GitHub message dispatch but does not merge those operations into the generic page-fetch contract. MCP destination/authentication design and GitHub archive limits require their own evidence-driven follow-up.

## Tests

### Page fetch policy tests

Cover:

- public HTTPS and HTTP URLs
- forced GET and omitted credentials
- retained safe search headers
- stripped authorization, cookie, body, and unsafe methods
- no-store cache compatibility
- rejected unsupported protocols
- rejected localhost, `.local`, IPv4 private/reserved ranges, IPv6 loopback/link-local/ULA, and cloud metadata literals
- redirect target validation
- response-size enforcement

### Background router regression tests

Source-level assertions will lock:

- import of `isTrustedRuntimeSender`
- recognized-type classification before sender validation
- rejection before privileged handler dispatch
- use of the bounded `fetchPageContent` module rather than inline arbitrary `fetch()` option forwarding

## Deferred Risks

- DNS rebinding and resolved-IP inspection
- MCP arbitrary server URL and API-key transport policy
- GitHub ZIP size/output limits
- YouTube transcript library response limits
- complete extraction of the monolithic background router
- sandbox generated-code messaging boundary
