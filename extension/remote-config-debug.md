# Remote Config Debug Bridge — Retired

## Status

The production page-world remote-config debug bridge was retired during the Agent 1 runtime trust-boundary repair.

The following surfaces are no longer mounted or exposed:

- `window.__BDS_CONFIG__`
- `bds:debug-api-request`
- `bds:debug-api-response`
- page-triggered remote-config replacement and reset
- page-triggered storage probes
- the mutable `ConfigDebugPanel` host-page mount

## Why It Was Removed

The injected script runs in the host page's MAIN JavaScript world. A global object or `CustomEvent` channel in that world is available to other scripts executing on the same page and is not a privileged extension boundary.

The former bridge could ask isolated-world code to:

- inspect complete remote configuration
- apply or replace remote overrides
- reset configuration to built-in values
- operate storage probes
- toggle a privileged-looking configuration panel

The panel was also mounted into host-page DOM. Hidden DOM is not access control: host-page code can inspect elements, dispatch events, and synthesize interaction.

## Preserved Behaviour

Normal extension behaviour remains unchanged:

- built-in and remotely persisted configuration still loads through the existing extension runtime
- `REMOTE_CONFIG_EVENT` still synchronizes content-script state
- ordinary feature settings remain available through the main extension UI
- configuration is still sent to the injected network adapter through the existing one-way production config event
- Chrome, Firefox, and Android target structure remains unchanged

## Replacement Boundary

Any future mutable configuration debugger must live on an extension-owned surface, such as:

- an extension options page
- an extension side panel
- a browser DevTools extension panel
- another extension document with explicit runtime sender validation

A future implementation must not expose privileged mutation through host-page globals, host-page DOM, wildcard messaging, or unauthenticated `CustomEvent` request channels.

## Migration Note

DevTools commands using `window.__BDS_CONFIG__` no longer work by design. Do not restore that global as a compatibility shortcut. Use the ordinary settings interface until an extension-owned diagnostic surface is implemented.
