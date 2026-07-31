import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Deep Research context budget ledger", () => {
  it("records actual provider requests through the bridge", () => {
    const bridge = source("src/content/bridge.js");
    expect(bridge).toContain("recordProviderRequestContext");
    expect(bridge).toContain("injectedText: data.injectedText");
    expect(bridge).toContain("userPrompt: data.userPrompt");
  });

  it("does not record speculative managed prompts", () => {
    const deepResearch = source("src/content/deep-research.js");
    expect(deepResearch).not.toContain("recordOutgoingContext");
  });

  it("awaits revision delivery before changing state", () => {
    const deepResearch = source("src/content/deep-research.js");
    const start = deepResearch.indexOf("bds:deep-research-revise");
    const end = deepResearch.indexOf("bds:deep-research-cancel");
    const listener = deepResearch.slice(start, end);
    const sendIndex = listener.indexOf("await injectPureTextAndSend");
    const stateIndex = listener.indexOf("awaiting_revision");

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(listener).toContain("async (event) =>");
    expect(sendIndex).toBeGreaterThan(-1);
    expect(stateIndex).toBeGreaterThan(sendIndex);
  });
});
