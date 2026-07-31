const PAGE_FETCH_TIMEOUT_MS = 15_000;
const PAGE_FETCH_MAX_BYTES = 5 * 1024 * 1024;

const SAFE_REQUEST_HEADERS = new Map([
  ["accept", "Accept"],
  ["accept-language", "Accept-Language"],
  ["cache-control", "Cache-Control"],
  ["pragma", "Pragma"],
]);

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

export {
  PAGE_FETCH_TIMEOUT_MS,
  PAGE_FETCH_MAX_BYTES,
};

function normalizeHostname(hostname) {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .split("%", 1)[0];
}

function parseIpv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;

  const octets = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    octets.push(value);
  }
  return octets;
}

function isBlockedIpv4(octets) {
  if (!octets) return false;
  const [a, b, c] = octets;

  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function mappedIpv4FromIpv6(hostname) {
  if (!hostname.includes(":")) return null;

  const dottedTail = hostname.split(":").at(-1);
  const dotted = parseIpv4(dottedTail);
  if (dotted) return dotted;

  if (!hostname.startsWith("::ffff:")) return null;
  const parts = hostname.slice("::ffff:".length).split(":").filter(Boolean);
  if (parts.length < 2) return null;

  const high = Number.parseInt(parts.at(-2), 16);
  const low = Number.parseInt(parts.at(-1), 16);
  if (
    !Number.isInteger(high) ||
    !Number.isInteger(low) ||
    high < 0 ||
    high > 0xffff ||
    low < 0 ||
    low > 0xffff
  ) {
    return null;
  }

  return [
    (high >> 8) & 0xff,
    high & 0xff,
    (low >> 8) & 0xff,
    low & 0xff,
  ];
}

function isBlockedIpv6(hostname) {
  if (!hostname.includes(":")) return false;

  if (hostname === "::" || hostname === "::1") return true;

  const mappedIpv4 = mappedIpv4FromIpv6(hostname);
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);

  const firstPart = hostname.split(":").find(Boolean) || "0";
  const first = Number.parseInt(firstPart, 16);
  if (!Number.isInteger(first)) return true;

  return (
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    hostname.startsWith("2001:db8:")
  );
}

export function isBlockedPageFetchHostname(hostname) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;

  if (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".lan") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".localdomain")
  ) {
    return true;
  }

  const ipv4 = parseIpv4(normalized);
  if (ipv4) return isBlockedIpv4(ipv4);

  return isBlockedIpv6(normalized);
}

function validatePageFetchUrl(input) {
  let url;
  try {
    url = new URL(String(input || ""));
  } catch {
    throw new Error("Page fetch requires a valid HTTP or HTTPS URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Page fetch supports HTTP and HTTPS URLs only.");
  }

  if (url.username || url.password) {
    throw new Error("Page fetch URL credentials are not permitted.");
  }

  if (isBlockedPageFetchHostname(url.hostname)) {
    throw new Error(`Page fetch target is blocked: ${url.hostname}`);
  }

  url.hash = "";
  return url;
}

function filterSafeHeaders(input) {
  const output = {};
  if (!input) return output;

  let headers;
  try {
    headers = new Headers(input);
  } catch {
    return output;
  }

  for (const [name, value] of headers.entries()) {
    const canonicalName = SAFE_REQUEST_HEADERS.get(name.toLowerCase());
    if (!canonicalName) continue;

    const normalizedValue = String(value || "").trim();
    if (
      !normalizedValue ||
      normalizedValue.length > 2048 ||
      /[\r\n]/.test(normalizedValue)
    ) {
      continue;
    }
    output[canonicalName] = normalizedValue;
  }

  return output;
}

export function normalizePageFetchRequest(input, options = {}) {
  const url = validatePageFetchUrl(input);
  const safeOptions =
    options && typeof options === "object" && !Array.isArray(options)
      ? options
      : {};

  const method = String(safeOptions.method || "GET").trim().toUpperCase();
  if (method !== "GET") {
    throw new Error("Page fetch supports GET requests only.");
  }

  if (safeOptions.body !== undefined && safeOptions.body !== null) {
    throw new Error("Page fetch request bodies are not permitted.");
  }

  return {
    url: url.href,
    fetchOptions: {
      method: "GET",
      headers: filterSafeHeaders(safeOptions.headers),
      credentials: "omit",
      cache: safeOptions.cache === "no-store" ? "no-store" : "default",
      redirect: "follow",
    },
  };
}

function responseTooLargeError(maxBytes) {
  return new Error(`Page response is too large; maximum is ${maxBytes} bytes.`);
}

export async function readResponseBytes(response, maxBytes = PAGE_FETCH_MAX_BYTES) {
  const safeMaxBytes = Math.max(1, Number(maxBytes) || PAGE_FETCH_MAX_BYTES);
  const contentLength = Number.parseInt(
    String(response?.headers?.get?.("content-length") || ""),
    10,
  );

  if (Number.isFinite(contentLength) && contentLength > safeMaxBytes) {
    throw responseTooLargeError(safeMaxBytes);
  }

  const reader = response?.body?.getReader?.();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > safeMaxBytes) {
      throw responseTooLargeError(safeMaxBytes);
    }
    return new Uint8Array(buffer);
  }

  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
    totalBytes += chunk.byteLength;
    if (totalBytes > safeMaxBytes) {
      try {
        await reader.cancel();
      } catch {}
      throw responseTooLargeError(safeMaxBytes);
    }
    chunks.push(chunk);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function detectCharsetFromHeaders(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) return null;
  const match = contentType.match(/charset\s*=\s*([^\s;]+)/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

function detectCharsetFromHtml(bytes) {
  const scanView = new TextDecoder("latin1").decode(bytes.slice(0, 10240));

  let match = scanView.match(
    /<meta[\s>][^>]*charset\s*=\s*["']?\s*([a-zA-Z0-9_-]+)\s*["']?[^>]*\/?>/i,
  );
  if (match) return match[1];

  match = scanView.match(
    /<meta\s+http-equiv\s*=\s*["']?\s*Content-Type\s*["']?\s*content\s*=\s*["'][^"']*charset\s*=\s*([a-zA-Z0-9_-]+)/i,
  );
  return match ? match[1] : null;
}

function decodePageBytes(bytes, response) {
  const charset =
    detectCharsetFromHeaders(response) ||
    detectCharsetFromHtml(bytes) ||
    "utf-8";

  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

function createHttpError(response, url) {
  const error = new Error(`Server returned ${response.status} for ${url}`);
  error.status = response.status;
  return error;
}

export async function fetchPageContent(input, options = {}, dependencies = {}) {
  const fetchImpl = dependencies.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("Page fetch is unavailable.");
  }

  const timeoutMs = Math.max(
    1,
    Number(dependencies.timeoutMs) || PAGE_FETCH_TIMEOUT_MS,
  );
  const maxBytes = Math.max(
    1,
    Number(dependencies.maxBytes) || PAGE_FETCH_MAX_BYTES,
  );
  const setTimer = dependencies.setTimeout || globalThis.setTimeout;
  const clearTimer = dependencies.clearTimeout || globalThis.clearTimeout;

  const request = normalizePageFetchRequest(input, options);
  const controller = new AbortController();
  const timer = setTimer(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(request.url, {
      ...request.fetchOptions,
      signal: controller.signal,
    });

    const finalUrl = validatePageFetchUrl(response.url || request.url).href;

    if (!response.ok) {
      throw createHttpError(response, finalUrl);
    }

    const bytes = await readResponseBytes(response, maxBytes);
    return {
      html: decodePageBytes(bytes, response),
      status: response.status,
      url: finalUrl,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Page fetch timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimer(timer);
  }
}
