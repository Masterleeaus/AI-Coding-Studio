# Agent 1 Context Budget Ledger Repair Design

## Purpose

This design defines Agent 1 Pass 3. It repairs the production Deep Research context-budget ledger without introducing a speculative ChatGPT/Claude adapter layer or activating the disconnected modular runtime.

## Runtime Evidence

The production managed Deep Research loop is implemented in:

- `src/content/deep-research.js`
- `src/content/context-budget.js`
- `src/content/bridge.js`
- `src/injected/payload-mutator.js`
- `src/injected/fetch-patch.js`
- `src/injected/xhr-patch.js`
- `src/content/message-processor.svelte.js`

The actual provider request path is:

```text
managed Deep Research prompt
    → composer send
    → DeepSeek request interception
    → payload mutation
    → bds:mutation-applied
    → content bridge
    → context budget ledger
```

`payload-mutator.js` emits `bds:mutation-applied` for the actual outgoing request and includes:

- `conversationId`
- `injectedText`
- `userPrompt`

The event therefore provides the most reliable available application-layer evidence that a provider request is being built, and it contains the visible prompt plus hidden extension context exactly once.

## Confirmed Defects

### Duplicate prompt accounting

`deep-research.js` records managed prompts before composer send. The network mutation event then records the same `userPrompt` again with hidden context.

Because server calibration uses the maximum of local estimate and server usage plus margin, an inflated local estimate is never corrected downward. This can trigger an early budget stop.

### Failed sends consume budget

Step-result and final-report prompts are recorded before the send result is known. A failed composer send therefore consumes budget despite no provider request.

### Approval records text that is not sent

The approval event records `buildApprovalMessage(run)`, but the managed approval handler does not send that message. It immediately begins executing the first managed step. The ledger therefore counts nonexistent context.

### Revision send Promise is compared synchronously

`injectPureTextAndSend()` is async. The revision listener assigns its Promise to `sent` and compares `sent === false`, which can never detect an eventual false result. The run transitions to `awaiting_revision` and records budget even when the composer send fails.

## Target Accounting Model

### Single source of truth

Only the provider-request mutation event records outgoing request context.

The bridge combines:

```text
hidden injected context
+
visible user prompt
```

and records the request once.

Managed Deep Research code may still estimate a candidate prompt before sending for threshold checks, but it must not commit that candidate to the ledger. A successful network request commits through `bds:mutation-applied`; an unsuccessful composer send commits nothing.

### Revision state transition

The revision listener becomes async and awaits `injectPureTextAndSend()`.

- send succeeds: transition to `awaiting_revision`
- send fails: preserve the current planning state, show the existing error toast, and do not record context

### Approval accounting

The managed approval click is an internal UI action. Since `buildApprovalMessage(run)` is not sent in the managed path, it is not recorded.

## Compatibility

- DeepSeek production runtime: corrected accounting and failed-send behaviour.
- Chrome/Firefox: no new browser API; existing fetch/XHR mutation event remains authoritative.
- Android: no background/provider request interception changes.
- ChatGPT/Claude: no production support claim is added. The manifest currently grants host coverage, but the live network interception, message selectors, model pricing and conversation IDs remain DeepSeek-specific.

## Tests

### Context budget unit tests

Add `recordProviderRequestContext()` and test:

- visible prompt recorded once
- hidden and visible text combined once
- empty request ignored
- conversation isolation
- clear operation resets the ledger

### Architecture regression tests

Assert:

- `bridge.js` uses `recordProviderRequestContext`
- `deep-research.js` does not directly call `recordOutgoingContext`
- approval handler does not record `buildApprovalMessage`
- revision listener is async and awaits the send result before `awaiting_revision`
- step/final prompt functions contain no pre-send ledger commit

## Deferred Provider Work

The following are documented but not repaired in this pass:

- ChatGPT and Claude production adapters
- provider-specific message/role selectors
- provider-specific stop/completion detection
- provider-specific conversation IDs
- provider-specific model/token pricing
- provider handoff and resumable state
- cancellation of in-flight search/fetch operations

Those require an explicit adapter contract and rendered browser verification, not selector guessing.
