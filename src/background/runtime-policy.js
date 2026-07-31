const TRUSTED_CONTENT_HOSTS = new Set([
  "claude.ai",
  "chatgpt.com",
  "openai.com",
  "chat.openai.com",
  "chat.deepseek.com",
]);

const EXTENSION_PROTOCOLS = new Set([
  "chrome-extension:",
  "moz-extension:",
  "safari-web-extension:",
]);

/**
 * Return true only for messages sent by this extension from an extension-owned
 * page or from a content script running on an explicitly supported AI host.
 *
 * Host-page JavaScript cannot call chrome.runtime.sendMessage as this extension,
 * but validating sender metadata still prevents cross-extension messages and
 * fails closed when a browser supplies incomplete or malformed metadata.
 *
 * @param {chrome.runtime.MessageSender | null | undefined} sender
 * @param {string} runtimeId
 * @returns {boolean}
 */
export function isTrustedRuntimeSender(sender, runtimeId) {
  if (!sender || !runtimeId || sender.id !== runtimeId) {
    return false;
  }

  const rawUrl = sender.url || sender.origin;
  if (!rawUrl) {
    return false;
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (EXTENSION_PROTOCOLS.has(url.protocol)) {
    return true;
  }

  if (url.protocol !== "https:" || !sender.tab) {
    return false;
  }

  return TRUSTED_CONTENT_HOSTS.has(url.hostname);
}
