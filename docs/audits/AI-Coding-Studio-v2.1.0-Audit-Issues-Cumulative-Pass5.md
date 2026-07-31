# AI Coding Studio v2.1.0 Audit Issues (Cumulative)

## Status
Cumulative findings after Pass 5 (structural, MV3, lifecycle and startup audits).

## High Priority
1. Review/remove dynamic code execution (`eval()` / `new Function()`).
2. Reduce `<all_urls>` to least-privilege host permissions.
3. Audit event listener lifecycle (many addEventListener calls vs comparatively few removals).
4. Verify all `chrome.runtime.sendMessage()` calls have receivers and robust `runtime.lastError` handling.
5. Verify manifest startup path matches packaged build artifacts (background/service worker output).

## Medium Priority
6. Synchronize extension versions (`manifest-multiplatform.json` vs `package.json`).
7. Gate or remove production `console.log()` statements.
8. Audit all `innerHTML` usage for XSS risk.
9. Ensure every `MutationObserver` is disconnected during teardown where appropriate.
10. Audit timer lifecycle (`setInterval` / `clearInterval`) for MV3 restart safety.
11. Review remaining TODO/FIXME markers before release.
12. Consider clearer naming for duplicated infrastructure filenames.
13. Verify source tree and packaged build remain synchronized.
14. Add automated release validation to ensure every manifest asset exists.

## New Findings – Pass 5

### Startup & Registration
15. Verify every core subsystem is registered exactly once:
   - Browser Automation
   - Tool Runtime
   - MCP Integration
   - Auto Continue
   - Provider Adapters
   - Prompt Library
   - Memory
   - Command Registry

16. Confirm initialization order dependencies are explicit rather than relying on import side effects.

17. Add startup diagnostics that report which modules initialized successfully and which failed.

### Runtime Hardening
18. Add timeout handling to all long-running async initialization tasks.

19. Ensure failed subsystem initialization degrades gracefully instead of preventing the remainder of the extension from starting.

20. Add duplicate-registration guards around singleton services.

## Remaining Deep Audit
- Dependency graph
- Dead/orphaned code
- Circular imports
- Browser Automation execution flow
- Auto Continue state machine
- Provider Adapter robustness
- MCP runtime
- Tool Runtime concurrency
- IndexedDB migrations
- Memory lifecycle
- Security hardening
- Performance profiling

## Current Assessment
Architecture remains strong. Most remaining risk appears concentrated around runtime initialization, release engineering, and lifecycle robustness rather than overall design.
