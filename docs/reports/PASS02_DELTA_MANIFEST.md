# Pass 02 Delta Manifest

This manifest describes the source delta from Pass 01 Revision 2 to Pass 02. Deleted files must be removed when applying the delta; copying only added/modified files is insufficient.

## Added (37)

- `AUDIT.md`
- `CHANGELOG.md`
- `FIXES.md`
- `PERFORMANCE.md`
- `SECURITY.md`
- `docs/architecture/LOCAL_AI_DEVELOPMENT_OS.md`
- `docs/reports/PASS02_ARCHITECTURE_SIMPLIFICATION.md`
- `docs/reports/PASS02_DEAD_CODE_REPORT.md`
- `docs/reports/PASS02_DELTA_MANIFEST.md`
- `docs/reports/PASS02_GITHUB_CLI_INTEGRATION.md`
- `docs/reports/PASS02_LOCAL_BRIDGE_SPEC.md`
- `docs/reports/PASS02_TECHNICAL_DEBT.md`
- `docs/reports/PASS02_VSCODE_INTEGRATION.md`
- `scripts/check-relative-imports.js`
- `scripts/check-runtime-architecture.js`
- `src/runtime/RuntimeKernel.js`
- `src/runtime/RuntimeKernel.test.js`
- `src/runtime/contracts/command-result.js`
- `src/runtime/contracts/command-result.test.js`
- `src/runtime/index.js`
- `src/runtime/local-bridge/LocalBridgeClient.js`
- `src/runtime/local-bridge/command-catalog.js`
- `src/runtime/local-bridge/local-bridge.test.js`
- `src/runtime/local-bridge/protocol.js`
- `src/runtime/repository/RepositoryRuntime.js`
- `src/runtime/repository/RepositoryRuntime.test.js`
- `src/runtime/safety/approval-policy.js`
- `src/runtime/safety/approval-policy.test.js`
- `src/runtime/singleton.js`
- `src/runtime/tool-registry/ToolRegistry.js`
- `src/runtime/tool-registry/ToolRegistry.test.js`
- `src/runtime/tool-registry/tool-definitions.js`
- `src/runtime/workflow/WorkflowRegistry.js`
- `src/runtime/workflow/WorkflowRegistry.test.js`
- `src/runtime/workflow/workflow-definitions.js`
- `tests/helpers/app-state.js`
- `tests/setup.js`

## Modified (11)

- `MULTIPLATFORM_GUIDE.md`
- `README.md`
- `docs/plans/AI-Coding-Studio-Pass02-Local-AI-Development-OS-Plan.md`
- `docs/plans/AI-Coding-Studio-Remediation-Plan-Pass1.md`
- `manifest-multiplatform.json`
- `package-lock.json`
- `package.json`
- `src/content/index.js`
- `src/locales/ru.json`
- `src/locales/zh-cn.json`
- `static/manifest.json`

## Deleted (36)

- `COMPLETE_MODULE_INTEGRATION.md`
- `MODULE_INTEGRATION_MANIFEST.md`
- `MODULE_INTEGRATION_MANIFEST_v2.1.md`
- `QUICK_REFERENCE.md`
- `README-AI-CODING-STUDIO.md`
- `README-MODULAR.md`
- `src/core/EventEmitter.js`
- `src/core/ModuleInterface.js`
- `src/core/ModuleManager.js`
- `src/core/bootstrap-enhanced.js`
- `src/core/bootstrap.js`
- `src/modules/config/LocalizationModule.js`
- `src/modules/config/RemoteConfigModule.js`
- `src/modules/core/BridgeModule.js`
- `src/modules/core/EventBusModule.js`
- `src/modules/core/StateModule.js`
- `src/modules/core/StorageModule.js`
- `src/modules/features/AutoCodeModule.js`
- `src/modules/features/AutoContinueModule.js`
- `src/modules/features/BrowserAutomationModule.js`
- `src/modules/features/CommandsModule.js`
- `src/modules/features/ContextBudgetModule.js`
- `src/modules/features/DeepResearchModule.js`
- `src/modules/features/FileReaderModule.js`
- `src/modules/features/HandoffModule.js`
- `src/modules/features/MarkdownSkillsModule.js`
- `src/modules/features/McpIntegrationModule.js`
- `src/modules/features/MemoryModule.js`
- `src/modules/features/PromptLibraryModule.js`
- `src/modules/features/RetrievalContextModule.js`
- `src/modules/features/TerminalRuntimeModule.js`
- `src/modules/features/ToolRuntimeModule.js`
- `src/modules/features/ToolsModule.js`
- `src/modules/ui/MessageOverlayModule.js`
- `src/modules/ui/SettingsPanelModule.js`
- `src/modules/ui/UiModule.js`

## Renamed (0)

- None
