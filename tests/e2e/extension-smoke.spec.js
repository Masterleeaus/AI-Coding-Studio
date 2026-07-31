import { chromium, expect, test } from "@playwright/test";
import { resolve } from "node:path";

const extensionPath = resolve(process.cwd(), "dist-chrome");

test("loads the Chrome MV3 service worker and manifest", async ({}, testInfo) => {
  const context = await chromium.launchPersistentContext(
    testInfo.outputPath("chromium-profile"),
    {
      channel: "chromium",
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    },
  );

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", {
        timeout: 30_000,
      });
    }

    const runtime = await serviceWorker.evaluate(() => ({
      id: chrome.runtime.id,
      manifest: chrome.runtime.getManifest(),
    }));

    expect(runtime.id).toBeTruthy();
    expect(runtime.manifest.manifest_version).toBe(3);
    expect(runtime.manifest.name).toBe("AI Coding Studio");
    expect(runtime.manifest.background.service_worker).toBe("background.js");
  } finally {
    await context.close();
  }
});
