# Cumulative Fixes

## Fixed in Pass 02

### Disconnected architecture removed

The unused `ModuleManager`, both unused bootstrap files, 25 module wrappers, and their stale operational documentation were deleted. This removes no-op modules and simulated terminal/tool/MCP success paths without changing the shipped entry graph.

### Local operations fail closed

The Runtime Kernel leaves every local tool unavailable until a Local Bridge transport reports successful discovery. Unknown commands are privileged and denied by default. No unrestricted shell command exists.

### Structured command contract

All future Local Bridge operations now share one immutable result shape with operation ID, command, status, data, artifacts, warnings, normalized error, timestamps, and duration.

### Explicit approval levels

Commands are classified as read, execute, write, destructive, or privileged. Only read operations may be auto-approved by the default personal policy.

### Version drift corrected

`package.json`, root lockfile metadata, `static/manifest.json`, and `manifest-multiplatform.json` now identify version `2.1.0`.

### Broken test support repaired

The missing Vitest setup and state-reset helper were added. Repository-wide relative-import validation now passes.

### Locale drift corrected

Russian and Simplified Chinese now contain the three tip/settings keys present in the English base locale.

## Still Open

See `AUDIT.md` and `docs/reports/PASS02_TECHNICAL_DEBT.md` for unresolved trust-boundary, Local Bridge, provider, build, and test work.
