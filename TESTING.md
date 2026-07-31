# Testing

## Test stack

AI Coding Studio uses:

- Vitest for unit, integration and shared workflow-contract tests;
- JSDOM for DOM-bound unit tests;
- Playwright Chromium for Chrome-target Manifest V3 smoke testing;
- Selenium WebDriver and Firefox for temporary WebExtension installation testing;
- Playwright for Android WebView JavaScript parity testing;
- Gradle for Android APK assembly and Kotlin/JVM tests;
- GitHub Actions for reproducible builds and verification.

## Commands

```bash
npm run check-locales
npm run test:contracts
npm run test:unit
npm run build:chrome
npm run build:firefox
npm run build:android
npm run test:e2e
npm run test:e2e:firefox
npm run test:e2e:android
npm run android:assemble:debug
npm run android:test
```

The aggregate `npm test` and `npm run test:ci*` scripts execute broader combinations. Use the smallest relevant command while developing, then run the affected platform lane before completion.

## Suite layout

- Co-located `*.test.js` files cover pure and source-owned modules.
- `src/workflows/*.test.js` covers the shared workflow, approval and message contracts.
- `tests/setup.js` provides the shared Vitest browser/extension environment.
- `tests/helpers/` contains reusable test-state helpers.
- `tests/integration/` contains cross-module integration tests.
- `tests/e2e/` contains the Chromium extension startup smoke test.
- `tests/e2e-firefox/` contains the Firefox temporary-install smoke test.
- `tests/e2e-android/` contains the Android WebView bridge startup smoke test.

## Current browser smoke coverage

### Chrome-target Chromium

`tests/e2e/extension-smoke.spec.js` loads `dist-chrome/` as an unpacked extension in a persistent Playwright Chromium context. It verifies that:

- the Manifest V3 service worker starts;
- the runtime has an extension ID;
- the generated manifest is MV3;
- the extension name and background entry are correct.

This is an install/startup smoke test, not full provider-page coverage.

### Firefox

`tests/e2e-firefox/extension-install.spec.js` launches headless Firefox through Selenium, installs `better-deepseek-firefox.zip` temporarily, verifies that Firefox returns an add-on ID, and uninstalls it cleanly.

This verifies package installability. It does not yet exercise ChatGPT, Claude or DeepSeek DOM adapters.

### Android

`tests/e2e-android/android-webview-smoke.spec.js` serves the generated `dist-android/` files through the Android app-assets origin, provides a mock native bridge, injects the real content bundle and verifies the Android Chrome polyfill and root UI mount.

The native Android workflow separately assembles the debug APK and runs Gradle tests. Android CI is path-scoped so unrelated browser-only changes do not wait for the native lane.

## GitHub Actions

### `.github/workflows/verify.yml`

Runs for pull requests targeting `main` or `integration/local-first-repair`, and for pushes to the integration branch. It includes:

- Gitleaks secret scanning;
- locale parity;
- shared workflow-contract tests;
- unit tests with coverage;
- Chrome and Firefox builds;
- archive integrity checks;
- Chromium extension startup smoke testing;
- Firefox temporary-install smoke testing;
- high-severity npm dependency auditing.

### `.github/workflows/android-verify.yml`

Runs when Android/shared-platform paths change or when manually dispatched. It includes:

- Android JavaScript build;
- debug APK assembly;
- Android WebView smoke testing;
- Gradle tests;
- uploaded Gradle diagnostic logs and build reports.

## Honest verification rules

- Do not claim a check passed unless its GitHub Actions job or another available execution environment completed successfully.
- A passing browser build does not prove provider DOM compatibility.
- A passing smoke test does not replace workflow-level or provider-level E2E testing.
- Missing or skipped Android checks must be reported separately from Chrome and Firefox results.
- Dependency-audit failures remain release blockers until the dependency is upgraded, replaced, isolated or explicitly accepted with evidence.

## Adding tests

- Add pure-behaviour tests beside the source module.
- Extend `tests/setup.js` instead of creating incompatible one-off Chrome mocks.
- Add shared workflow behaviours under `src/workflows/`.
- Add platform smoke coverage only when it executes the real generated artefact.
- Keep destructive operations and unrestricted shell strings outside test fixtures as well as production contracts.
