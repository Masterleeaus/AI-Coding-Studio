import { afterEach, describe, expect, it } from "vitest";
import { Builder, Browser } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import { resolve } from "node:path";

let driver = null;

afterEach(async () => {
  if (driver) {
    await driver.quit();
    driver = null;
  }
});

describe("Firefox extension package", () => {
  it("installs and uninstalls as a temporary WebExtension", async () => {
    const options = new firefox.Options().addArguments("-headless");
    if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);

    driver = await new Builder()
      .forBrowser(Browser.FIREFOX)
      .setFirefoxOptions(options)
      .build();

    const archive = resolve(process.cwd(), "better-deepseek-firefox.zip");
    const addonId = await driver.installAddon(archive, true);

    expect(addonId).toBeTypeOf("string");
    expect(addonId.length).toBeGreaterThan(0);

    await driver.uninstallAddon(addonId);
  }, 90_000);
});
