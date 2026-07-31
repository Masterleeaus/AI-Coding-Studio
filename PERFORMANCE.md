# Performance Status

## Pass 02 Effects

- Removed 30 unreachable JavaScript files and six stale documentation files.
- The removed JavaScript was outside the production entry graph, so no bundle-size reduction is claimed.
- Runtime Kernel startup loads immutable definitions only.
- No local tool detection runs when a bridge is unavailable.
- Local command timeouts are defined centrally.
- Tool discovery is designed as one handshake rather than repeated executable probing in content scripts.

## Remaining Performance Work

- centralize and dispose MutationObservers;
- remove permanent high-frequency polling;
- recover background/local-bridge connections after MV3 suspension;
- persist workflow progress without excessive storage writes;
- stream and bound companion output;
- benchmark provider page scanning and Svelte mounting;
- measure extension bundles after dependency installation is available.
