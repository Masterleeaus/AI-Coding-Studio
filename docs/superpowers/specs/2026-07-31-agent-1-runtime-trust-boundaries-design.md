# Agent 1 Runtime Trust-Boundary Repair Design

## Purpose

This design narrows the first Agent 1 implementation batch under the approved three-agent repair workflow. It addresses confirmed browser-extension trust-boundary defects without replacing the production runtime, activating disconnected module scaffolding, or changing Agent 2 and Agent 3 ownership.

## Evidence

The production build enters through `src/content/index.js`, `src/background/index.js`, `src/injected/index.js`, and `src/sandbox/index.js`. Neither `src/core/bootstrap.js` nor `src/core/bootstrap-enhanced.js` is imported by the production entry points.

The current production runtime exposes a MAIN-world `window.__BDS_CONFIG__` API. Its CustomEvent bridge reaches isolated-world code that can apply, replace, and reset remote configuration and operate storage probes. Any script executing in the host page shares the MAIN world and can call this API.

The DeepSeek API proxy registers a privileged `chrome.runtime.onMessage` listener without validating `sender.id` or the sender URL. The larger background router has the same missing validation and also contains an arbitrary-URL fetch proxy; that larger router requires a separate follow-up because it is a long multi-responsibility file and its fetch call sites must be migrated carefully.

`vitest.config.js` declares `tests/setup.js`, but that file is absent.

## Scope

### Included in this batch

1. Remove the page-global remote-config debug bridge from production content and injected entry points.
2. Stop mounting the mutable debug panel into host-page DOM.
3. Delete the now-unreachable debug panel component after confirming its only production import.
4. Add a pure runtime sender policy for extension messages.
5. Apply sender validation to the DeepSeek API proxy listener.
6. Add unit and architecture regression tests before implementation.
7. Restore the missing Vitest setup entry.
8. Update Agent 1 documentation and the coordination issue.

### Deferred to the next Agent 1 batch

1. Refactor `src/background/index.js` into testable routers and apply sender validation to every privileged handler.
2. Replace the unrestricted `bds-fetch-url` request options with a bounded GET-only fetch policy, response limits, timeouts, private-network protection, and safe-header filtering.
3. Rework sandbox document generation behind an extension-owned host or authenticated MessageChannel boundary.
4. Consolidate or retire the disconnected module bootstrap trees after all dynamic and build references are traced.
5. Standardise provider adapters and repair continuation/handoff state.

## Architecture

### Page-world debug removal

The MAIN-world injected script will no longer export `window.__BDS_CONFIG__` or dispatch `bds:debug-api-request`. The isolated content script will no longer listen for that event or execute remote-config mutation methods on behalf of the page.

The current `ConfigDebugPanel.svelte` is also removed from `mountUi()`. Leaving the panel mounted but hidden is not sufficient because host-page JavaScript can access injected DOM and dispatch the toggle event or synthesize clicks. A future debug interface must live on an extension-owned page, DevTools panel, side panel, or closed extension-controlled boundary.

### Runtime sender policy

A new pure module, `src/background/runtime-policy.js`, will expose:

```js
isTrustedRuntimeSender(sender, runtimeId)
```

The function will fail closed unless:

- `sender.id` exactly matches the active extension runtime ID; and
- the sender is either an extension-owned URL (`chrome-extension:`, `moz-extension:`, or `safari-web-extension:`) or a content script running on one of the explicitly supported AI hosts.

The host allowlist is limited to:

- `claude.ai`
- `chatgpt.com`
- `openai.com`
- `chat.openai.com`
- `chat.deepseek.com`

The API proxy listener will return a structured rejection and will not call `proxyApiRequest` for an untrusted sender.

## Error Handling

Untrusted API-proxy messages return:

```js
{
  ok: false,
  error: "Untrusted runtime sender.",
  status: 0
}
```

Malformed or missing sender URLs fail closed. URL parsing errors do not throw out of the message listener.

## Compatibility

- Chrome and Chromium: content-script and extension-page senders remain accepted when `sender.id` matches.
- Firefox: `moz-extension:` pages remain accepted; supported host-page senders remain accepted by exact hostname.
- Android: the background service worker and API proxy are not built for the Android target, so this policy does not alter the Android JavaScript bridge.
- Svelte 5: the main application mount is preserved; only the mutable debug component is removed.

## Testing

### Unit tests

`src/background/runtime-policy.test.js` will cover:

- trusted Chrome extension page
- trusted Firefox extension page
- trusted supported content-script host
- rejected mismatched extension ID
- rejected unsupported host
- rejected missing sender metadata
- rejected malformed URL

### Architecture regression tests

`tests/runtime-trust-boundaries.test.js` will read source files and assert that production entry points no longer contain:

- `window.__BDS_CONFIG__`
- `bds:debug-api-request`
- a `ConfigDebugPanel` import or mount

It will also assert that the API proxy imports and calls `isTrustedRuntimeSender`.

## Verification Constraints

The connected GitHub repository is authoritative. The local sandbox cannot resolve GitHub, so no local clone, npm install, Vitest, Playwright, Chrome, Firefox, or Android command is claimed. Tests will be committed and must be executed by a safe GitHub Actions workflow supplied by Agent 3. Until that workflow runs, the changes remain draft and unverified at execution level.
