import { describe, expect, it } from "vitest";
import { isTrustedRuntimeSender } from "./runtime-policy.js";

const RUNTIME_ID = "extension-id";

describe("isTrustedRuntimeSender", () => {
  it("accepts a Chrome extension page from the same extension", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: `chrome-extension://${RUNTIME_ID}/settings.html`,
    }, RUNTIME_ID)).toBe(true);
  });

  it("accepts a Firefox extension page from the same extension", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: "moz-extension://generated-uuid/settings.html",
    }, RUNTIME_ID)).toBe(true);
  });

  it.each([
    "https://claude.ai/chat/1",
    "https://chatgpt.com/c/1",
    "https://openai.com/",
    "https://chat.openai.com/c/1",
    "https://chat.deepseek.com/a/chat/s/1",
  ])("accepts supported content-script URL %s", (url) => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url,
      tab: { id: 1 },
    }, RUNTIME_ID)).toBe(true);
  });

  it("rejects a sender from another extension", () => {
    expect(isTrustedRuntimeSender({
      id: "other-extension",
      url: "chrome-extension://other-extension/page.html",
    }, RUNTIME_ID)).toBe(false);
  });

  it.each([
    "https://example.com/",
    "https://openai.com.evil.example/",
  ])("rejects unsupported or look-alike host %s", (url) => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url,
      tab: { id: 1 },
    }, RUNTIME_ID)).toBe(false);
  });

  it("rejects a supported host over insecure HTTP", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: "http://chat.deepseek.com/",
      tab: { id: 1 },
    }, RUNTIME_ID)).toBe(false);
  });

  it("rejects a host-page URL without content-script tab context", () => {
    expect(isTrustedRuntimeSender({
      id: RUNTIME_ID,
      url: "https://chat.deepseek.com/",
    }, RUNTIME_ID)).toBe(false);
  });

  it.each([
    null,
    {},
    { id: RUNTIME_ID },
    { id: RUNTIME_ID, url: "not a url" },
  ])("rejects incomplete or malformed sender metadata", (sender) => {
    expect(isTrustedRuntimeSender(sender, RUNTIME_ID)).toBe(false);
  });
});
