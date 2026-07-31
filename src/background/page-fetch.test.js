import { describe, expect, it, vi } from "vitest";
import {
  PAGE_FETCH_MAX_BYTES,
  fetchPageContent,
  isBlockedPageFetchHostname,
  normalizePageFetchRequest,
  readResponseBytes,
} from "./page-fetch.js";

function textResponse(text, init = {}) {
  return new Response(text, {
    status: init.status || 200,
    headers: init.headers || { "content-type": "text/html; charset=utf-8" },
  });
}

describe("normalizePageFetchRequest", () => {
  it.each([
    "https://example.com/article",
    "http://example.com/article",
  ])("accepts a public page URL %s", (url) => {
    const request = normalizePageFetchRequest(url);

    expect(request.url).toBe(url);
    expect(request.fetchOptions).toMatchObject({
      method: "GET",
      credentials: "omit",
      cache: "default",
      redirect: "manual",
    });
  });

  it("retains only safe presentation headers and no-store cache", () => {
    const request = normalizePageFetchRequest("https://html.duckduckgo.com/html/?q=test", {
      method: "GET",
      headers: {
        Accept: "text/html",
        "Accept-Language": "en-AU,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Authorization: "Bearer secret",
        Cookie: "session=secret",
        "X-Unsafe": "value",
      },
      cache: "no-store",
      credentials: "include",
      redirect: "follow",
    });

    expect(request.fetchOptions.headers).toEqual({
      Accept: "text/html",
      "Accept-Language": "en-AU,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    });
    expect(request.fetchOptions.cache).toBe("no-store");
    expect(request.fetchOptions.credentials).toBe("omit");
    expect(request.fetchOptions.redirect).toBe("manual");
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "rejects caller-controlled %s requests",
    (method) => {
      expect(() => normalizePageFetchRequest("https://example.com/", { method }))
        .toThrow(/GET/i);
    },
  );

  it("rejects caller-controlled request bodies", () => {
    expect(() => normalizePageFetchRequest("https://example.com/", {
      body: "secret",
    })).toThrow(/body/i);
  });

  it.each([
    "file:///etc/passwd",
    "data:text/plain,hello",
    "blob:https://example.com/id",
    "ftp://example.com/file",
    "chrome-extension://extension-id/page.html",
  ])("rejects unsupported protocol URL %s", (url) => {
    expect(() => normalizePageFetchRequest(url)).toThrow(/HTTP/i);
  });

  it("rejects credentials embedded in a URL", () => {
    expect(() => normalizePageFetchRequest("https://user:pass@example.com/"))
      .toThrow(/credentials/i);
  });
});

describe("isBlockedPageFetchHostname", () => {
  it.each([
    "localhost",
    "api.localhost",
    "printer.local",
    "router.lan",
    "metadata.google.internal",
    "169.254.169.254",
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
  ])("blocks local/private/reserved hostname %s", (hostname) => {
    expect(isBlockedPageFetchHostname(hostname)).toBe(true);
  });

  it.each([
    "example.com",
    "www.youtube.com",
    "publish.twitter.com",
    "html.duckduckgo.com",
    "8.8.8.8",
    "2606:4700:4700::1111",
  ])("allows public hostname %s", (hostname) => {
    expect(isBlockedPageFetchHostname(hostname)).toBe(false);
  });
});

describe("readResponseBytes", () => {
  it("rejects an excessive Content-Length before reading", async () => {
    const response = textResponse("small", {
      headers: {
        "content-type": "text/plain",
        "content-length": String(PAGE_FETCH_MAX_BYTES + 1),
      },
    });

    await expect(readResponseBytes(response, PAGE_FETCH_MAX_BYTES))
      .rejects.toThrow(/too large/i);
  });

  it("rejects a streamed response that exceeds the byte cap", async () => {
    const response = textResponse("1234567890");

    await expect(readResponseBytes(response, 5)).rejects.toThrow(/too large/i);
  });

  it("returns bytes within the cap", async () => {
    const response = textResponse("hello");
    const bytes = await readResponseBytes(response, 5);

    expect(new TextDecoder().decode(bytes)).toBe("hello");
  });
});

describe("fetchPageContent", () => {
  it("fetches and decodes a bounded public page", async () => {
    const fetchImpl = vi.fn(async () => textResponse("<h1>Hello</h1>"));

    const result = await fetchPageContent("https://example.com/", {}, { fetch: fetchImpl });

    expect(result).toMatchObject({
      html: "<h1>Hello</h1>",
      status: 200,
      url: "https://example.com/",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.com/",
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
        redirect: "manual",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("follows a validated public redirect", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "https://www.example.com/final" },
      }))
      .mockResolvedValueOnce(textResponse("final"));

    const result = await fetchPageContent("https://example.com/start", {}, { fetch: fetchImpl });

    expect(result.url).toBe("https://www.example.com/final");
    expect(result.html).toBe("final");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects a redirect to a blocked target before a second fetch", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: "http://127.0.0.1/admin" },
    }));

    await expect(fetchPageContent("https://example.com/start", {}, { fetch: fetchImpl }))
      .rejects.toThrow(/blocked/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects redirect chains over the configured limit", async () => {
    const fetchImpl = vi.fn(async (url) => {
      const current = new URL(url);
      const hop = Number(current.searchParams.get("hop") || 0);
      return new Response(null, {
        status: 302,
        headers: { Location: `https://example.com/?hop=${hop + 1}` },
      });
    });

    await expect(fetchPageContent("https://example.com/?hop=0", {}, {
      fetch: fetchImpl,
      maxRedirects: 2,
    })).rejects.toThrow(/redirect/i);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("aborts a page fetch after the configured timeout", async () => {
    const fetchImpl = vi.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    }));

    await expect(fetchPageContent("https://example.com/", {}, {
      fetch: fetchImpl,
      timeoutMs: 1,
    })).rejects.toThrow(/timed out/i);
  });
});
