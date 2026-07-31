import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const distPath = resolve(process.cwd(), "dist-android");
const assetOrigin = "https://appassets.androidplatform.net/assets/bds/";

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

test("boots the Android content runtime through the native bridge contract", async ({ page }) => {
  await page.addInitScript(() => {
    const storage = new Map();
    window.AndroidBridge = {
      getStorage(key) {
        return storage.has(key) ? storage.get(key) : "";
      },
      setStorage(key, value) {
        storage.set(key, value);
      },
      removeStorage(key) {
        storage.delete(key);
      },
      fetch() {
        return JSON.stringify({ ok: true, success: true });
      },
      getAssetUrl(path) {
        return `https://appassets.androidplatform.net/assets/bds/${path}`;
      },
      getSystemLocale() {
        return "en";
      },
      downloadBlob() {},
      reportTheme() {},
      pickFiles() {},
    };
  });

  await page.route(`${assetOrigin}**`, async (route) => {
    const relativePath = new URL(route.request().url()).pathname
      .replace("/assets/bds/", "");
    const filePath = resolve(distPath, relativePath);
    const body = await readFile(filePath);
    await route.fulfill({
      status: 200,
      body,
      contentType: contentTypes[extname(filePath)] || "application/octet-stream",
    });
  });

  await page.route("https://chat.deepseek.com/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: `<!doctype html>
      <html>
        <head><meta charset="utf-8"><title>Android Bridge Fixture</title></head>
        <body>
          <main><textarea aria-label="chat input"></textarea></main>
        </body>
      </html>`,
  }));

  await page.goto("https://chat.deepseek.com/");
  await page.addScriptTag({ path: resolve(distPath, "content.js") });

  await expect(page.locator("#bds-root")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => Boolean(
    window.chrome?.__bdsAndroidPolyfill &&
    window.chrome?.runtime?.id === "better-deepseek-android",
  ))).toBe(true);
});
