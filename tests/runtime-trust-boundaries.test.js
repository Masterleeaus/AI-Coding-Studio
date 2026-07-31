import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("production runtime trust boundaries", () => {
  it("does not expose the remote-config debug bridge to the page world", () => {
    const injected = source("src/injected/index.js");
    const content = source("src/content/index.js");

    expect(injected).not.toContain("__BDS_CONFIG__");
    expect(injected).not.toContain("bds:debug-api-request");
    expect(content).not.toContain("bds:debug-api-request");
    expect(content).not.toContain('case "applyRemote"');
    expect(content).not.toContain('case "replaceRemote"');
    expect(content).not.toContain('case "resetToBuiltin"');
  });

  it("does not mount the mutable config debug panel into the host page", () => {
    const mount = source("src/content/ui/mount.js");

    expect(mount).not.toContain("ConfigDebugPanel");
    expect(mount).not.toContain("bds-config-debug");
  });

  it("validates senders before executing API proxy requests", () => {
    const proxy = source("src/background/api-proxy.js");

    expect(proxy).toContain("isTrustedRuntimeSender");
    expect(proxy).toMatch(/if\s*\(\s*!isTrustedRuntimeSender\(sender/);
  });

  it("emits the network-state event consumed by the content bridge", () => {
    const injected = source("src/injected/index.js");
    const constants = source("src/lib/constants.js");

    expect(constants).toContain('networkState: "bds:network-state"');
    expect(injected).toContain('networkState: "bds:network-state"');
    expect(injected).toContain("new CustomEvent(EVENTS.networkState");
  });
});
