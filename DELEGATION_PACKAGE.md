# Delegation Package - Ready for Agent Execution

Complete package of prompts, instructions, and code for delegating all remaining work to agents.

---

## What's Included

### 1. **AGENT_PROMPTS.md** (12 KB)
Complete delegation prompts for 6 major tasks:

- **TASK 1**: Wire ProgressRuntime into all background handlers (1-2 hrs)
- **TASK 2**: Create real-time progress dashboard UI (2-4 hrs)
- **TASK 3**: Fix local-bridge test failures (1-2 hrs)
- **TASK 4**: Add persistent session cleanup (30 mins)
- **TASK 5**: Implement extracted features - Phase 1 (1-1.5 hrs, optional)
- **TASK 6**: Fix OpenBrowser security vulnerabilities (30 mins)

Each prompt is:
- Self-contained and ready to copy/paste to an Agent
- Includes success criteria and testing steps
- References relevant files and patterns
- Specifies commit message and branch

**Total effort**: ~10-14 hours spread across 6 parallel tasks

---

### 2. **EXTENSION_INTEGRATION_PROMPT.md** (16 KB)
Detailed integration guide for 8 extracted browser extension patterns:

1. **WXT Framework** - Multi-browser build system
2. **Radix UI** - Accessible component library  
3. **Macro Recording** - Record/replay user interactions
4. **Provider Abstraction** - Support multiple LLMs (Claude, ChatGPT, Gemini)
5. **Storage Patterns** - Unified storage interface (local/sync/indexed-db)
6. **Server Bridge** - Native server communication
7. **Side Panel** - Persistent browser panel UI
8. **Content Script Injection** - Page integration

Each pattern includes:
- Code examples
- Installation instructions
- Integration steps
- File structure guidance
- Testing approach

**Total features**: 8 patterns with clear implementation roadmap

---

### 3. **usable-extensions.zip** (19 KB)
Ready-to-use code extracted from 5 analyzed browser extensions:

```
usable-extensions/
├── README.md                     # Feature matrix and quick start
├── 1-wxt-framework/
│   ├── wxt.config.ts            # Multi-browser build config
│   └── package.json             # Build scripts
├── 2-radix-ui-components/
│   ├── Button.jsx               # Component wrapper
│   └── theme.css                # CSS variables & dark mode
├── 3-macro-recording/
│   ├── recorder.js              # Record events
│   └── player.js                # Replay events
├── 4-provider-abstraction/
│   ├── base-provider.js         # Provider interface
│   ├── claude-provider.js       # Claude implementation
│   ├── openai-provider.js       # ChatGPT implementation
│   └── provider-registry.js     # Provider management
├── 5-storage-patterns/
│   └── storage-adapter.js       # Unified storage interface
├── 6-side-panel/
│   ├── side-panel.html          # Panel markup
│   ├── side-panel.jsx           # Panel component
│   └── manifest-config.json     # Manifest updates needed
├── 7-content-script-injection/
│   ├── content-script.js        # Page communication
│   └── manifest-config.json     # Manifest updates needed
└── 8-server-bridge/
    └── bridge-client.js         # Server communication client
```

All files are:
- Production-ready with proper error handling
- Type-safe with JSDoc comments
- Tested patterns from real extensions
- Ready to copy into src/ directory

---

## How to Use This Package

### For Immediate Execution

1. **Copy prompts to agents**:
   ```bash
   # Delegate Task 1
   cat AGENT_PROMPTS.md | grep -A 50 "TASK 1"
   # → Copy to Agent tool

   # Delegate Task 2
   cat AGENT_PROMPTS.md | grep -A 50 "TASK 2"
   # → Copy to Agent tool
   
   # Continue for remaining tasks...
   ```

2. **For extension patterns**:
   ```bash
   # Unzip patterns
   unzip usable-extensions.zip -d temp/
   
   # Reference during integration
   cat EXTENSION_INTEGRATION_PROMPT.md
   ```

### Sequential Execution

**Phase 1 (High Priority - 3-5 hours)**:
1. Task 1: Wire handlers (blocks testing)
2. Task 2: Dashboard UI (provides visibility)
3. Task 3: Fix tests (improves quality)

**Phase 2 (Maintenance - 1 hour)**:
4. Task 4: Session cleanup (prevents bloat)

**Phase 3 (Optional Enhancement - 4-6 hours)**:
5. Task 5: Extract features (Phase 1 only)
6. Task 6: Security fixes (if applicable)

### Parallel Execution

Tasks 1-4 are **independent** and can run in parallel:
- Task 1 doesn't depend on others
- Task 2 reads progress data (works even if Task 1 incomplete)
- Task 3 is test-only
- Task 4 is optional maintenance

---

## Feature Coverage

### What These Tasks Deliver

| Feature | Task | Status |
|---------|------|--------|
| Progress in all handlers | 1 | Ready |
| Real-time dashboard | 2 | Ready |
| Test suite passing | 3 | Ready |
| Auto cleanup | 4 | Ready |
| WXT builds | 5 | Ready |
| Radix UI components | 5 | Ready |
| Macro recording | 5 | Ready |
| Multi-LLM support | 5 | Ready |
| Server bridge | Extensions | Ready |
| Side panel | Extensions | Ready |
| Content scripts | Extensions | Ready |

---

## Estimated Timeline

| Task | Hours | Difficulty | Priority |
|------|-------|-----------|----------|
| Task 1 | 1-2 | Medium | High |
| Task 2 | 2-4 | Medium | High |
| Task 3 | 1-2 | Low | High |
| Task 4 | 0.5 | Low | Medium |
| Task 5 | 1-1.5 | Medium | Optional |
| Task 6 | 0.5 | Low | Optional |
| **Total** | **6-11** | — | — |

---

## Git Configuration

All work targets this branch:
```
claude/repo-branch-merge-audit-5rr1f0
```

**Push after each task**:
```bash
git push -u origin claude/repo-branch-merge-audit-5rr1f0
```

**Commit format**:
```
<type>: <description>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Examples:
- `feat: add progress tracking to all background service handlers`
- `feat: add real-time progress dashboard UI`
- `fix: resolve local-bridge test failures`

---

## Quick Reference

### Task Difficulties

**Easy** (30 mins - 1 hr):
- Task 4: Session cleanup
- Task 6: Security fixes

**Medium** (1-2 hrs):
- Task 1: Wire handlers
- Task 3: Fix tests

**Complex** (2-4 hrs):
- Task 2: Dashboard UI
- Task 5 Phase 1: Infrastructure

### Testing Checklist

Each task should verify:
- [ ] Code compiles/transpiles
- [ ] Tests pass (if applicable)
- [ ] No console errors
- [ ] Relevant features work
- [ ] Commit message clear
- [ ] Push successful

### Success Criteria

**Task 1 Complete** when:
- All 7 handlers wrapped with trackProgress()
- Messages still receive responses
- Progress data flows to kernel.progress

**Task 2 Complete** when:
- Dashboard renders without errors
- Real-time updates work (refresh every 1s)
- Color coding shows status correctly
- Exports markdown report

**Task 3 Complete** when:
- All test files pass
- No test regressions
- Coverage maintained

**Task 4 Complete** when:
- Old sessions deleted after 24 hours
- Cleanup runs every 6 hours
- No errors in logs

**Task 5 Complete** when:
- WXT builds successfully
- Radix UI components render
- Dark mode works
- No build warnings

**Task 6 Complete** when:
- Rate limits enforced
- Chunk validation works
- Regex escaping fixed
- Session cleanup added

---

## Dependencies Added

Tasks require installing:

```bash
# Task 2 (Dashboard)
npm install @radix-ui/react-button @radix-ui/react-dialog \
            @radix-ui/react-tabs @tanstack/react-query

# Task 5 Phase 1
npm install wxt

# Task 4 (already have)
# Already in codebase

# Task 6 (already have)
# Already in codebase
```

---

## Troubleshooting

### "Task 1: Handler not found"
- Check src/background/index.js exists
- Verify message.type exists in current code
- Look for sendResponse() pattern

### "Task 2: kernel not available"
- Verify RuntimeKernel initialized in background
- Check kernel.progress API exists
- Look for chrome.runtime errors in console

### "Task 3: Still failing tests"
- Run: `npm test -- src/runtime/local-bridge/`
- Check test output for root cause
- May need to investigate pre-existing issues

### "Task 4: Storage not working"
- Verify chrome.storage.local available
- Check for permission in manifest.json
- Confirm storage API not rate-limited

### "Task 5: Build fails"
- Install wxt: `npm install wxt`
- Check wxt.config.ts syntax
- Verify manifest.json valid JSON

### "Task 6: Rate limiting broken"
- Verify Map object initialized
- Check timeout logic
- Test with multiple rapid requests

---

## Next Steps After Completion

Once all tasks complete:

1. **Merge branch** to main (create PR if needed)
2. **Update README** with new features
3. **Write release notes** for version bump
4. **Test in actual browser** (Chrome and Firefox if using WXT)
5. **Plan Phase 2** if implementing Phase 2+ of features

---

## Files Reference

| File | Purpose | Size |
|------|---------|------|
| AGENT_PROMPTS.md | Task delegation | 12 KB |
| EXTENSION_INTEGRATION_PROMPT.md | Pattern integration | 16 KB |
| usable-extensions.zip | Source code | 19 KB |
| EXTENSION_ANALYSIS.md | Original analysis | 7.8 KB |
| EXTRACTED_PATTERNS.md | Pattern details | 8.9 KB |
| PROGRESS_INTEGRATION.md | Background service guide | 11 KB |

**Total documentation**: ~75 KB

---

## Support & Questions

For each task, if blocked:
1. Check task's "Troubleshooting" section (in AGENT_PROMPTS.md)
2. Review referenced files (paths are absolute)
3. Check if dependencies are installed
4. Look at EXTRACTED_PATTERNS.md or EXTENSION_INTEGRATION_PROMPT.md for context
5. Ask for specific error message investigation

---

## Summary

You now have:
- ✅ 6 independent tasks ready for agents
- ✅ 8 extractable patterns with code
- ✅ Complete integration guides
- ✅ All dependencies documented
- ✅ Clear success criteria
- ✅ Estimated timelines

**Ready to delegate.**
