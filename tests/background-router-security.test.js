import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("background router security boundaries", () => {
  it("validates trusted senders before privileged handler dispatch", () => {
    const background = source("src/background/index.js");
    const messageSetIndex = background.indexOf("BACKGROUND_MESSAGE_TYPES");
    const senderGuardIndex = background.indexOf("!isTrustedRuntimeSender(sender");
    const firstHandlerIndex = background.indexOf('message.type === "bds-get-youtube-transcript"');

    expect(background).toContain('import { isTrustedRuntimeSender } from "./runtime-policy.js"');
    expect(messageSetIndex).toBeGreaterThan(-1);
    expect(senderGuardIndex).toBeGreaterThan(messageSetIndex);
    expect(firstHandlerIndex).toBeGreaterThan(senderGuardIndex);
    expect(background).toContain('error: "Untrusted runtime sender."');
  });

  it("uses the bounded page-fetch module", () => {
    const background = source("src/background/index.js");

    expect(background).toContain('import { fetchPageContent } from "./page-fetch.js"');
    expect(background).toContain('export { fetchPageContent } from "./page-fetch.js"');
    expect(background).not.toContain("safeOptions.method");
    expect(background).not.toContain("safeOptions.body");
    expect(background).not.toContain("safeOptions.credentials");
    expect(background).not.toContain("safeOptions.redirect");
  });

  it("classifies every message owned by the main router", () => {
    const background = source("src/background/index.js");

    for (const type of [
      "bds-get-youtube-transcript",
      "bds-fetch-github-zip",
      "bds-fetch-github-commits",
      "bds-fetch-url",
      "BDS_UPDATE_LANGUAGES",
      "BDS_WAIT_FOR_STARTUP",
      "BDS_RESET_LANGUAGES",
      "bds-mcp-list-tools",
      "bds-mcp-call",
    ]) {
      expect(background).toContain(`"${type}"`);
    }
  });
});
