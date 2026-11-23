import type { ExtensionMessage, ExtensionMessageResponse } from '@subtitleme/shared-types';

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'view-source:',
  'https://chromewebstore.google.com',
  'https://chrome.google.com/webstore',
];

let requestCounter = 1;

function nextRequestId(): string {
  return `req-${Date.now()}-${requestCounter++}`;
}

export function isRestrictedTabUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return RESTRICTED_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

async function injectContentScript(tabId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.scripting?.executeScript) {
    return false;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/index.js'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends a strongly typed, requestId-tracked command to the active browser tab's
 * content script. Uses activeTab + chrome.scripting for on-demand injection
 * without requesting broad permanent host permissions.
 */
export async function sendActiveTabCommand(
  message: ExtensionMessage,
): Promise<ExtensionMessageResponse> {
  const requestId = message.requestId ?? nextRequestId();
  const envelope: ExtensionMessage = { ...message, requestId };

  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return {
      ok: false,
      requestId,
      error: 'Browser tabs API unavailable in this environment.',
      errorCode: 'CONTENT_SCRIPT_UNAVAILABLE',
    };
  }

  let activeTab: chrome.tabs.Tab | undefined;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];
  } catch {
    return {
      ok: false,
      requestId,
      error: 'Unable to query active browser tab.',
      errorCode: 'NO_ACTIVE_TAB',
    };
  }

  if (!activeTab || activeTab.id === undefined) {
    return {
      ok: false,
      requestId,
      error: 'No active tab found.',
      errorCode: 'NO_ACTIVE_TAB',
    };
  }

  if (isRestrictedTabUrl(activeTab.url)) {
    return {
      ok: false,
      requestId,
      error: 'Restricted browser pages cannot be inspected.',
      errorCode: 'RESTRICTED_PAGE',
    };
  }

  const tabId = activeTab.id;

  const attemptSend = async (): Promise<ExtensionMessageResponse | null> => {
    try {
      const response = (await chrome.tabs.sendMessage(tabId, envelope)) as
        | ExtensionMessageResponse
        | undefined;
      return response ?? null;
    } catch {
      return null;
    }
  };

  let response = await attemptSend();

  // If content script is not injected yet, inject on-demand via activeTab + scripting and retry once
  if (!response) {
    const injected = await injectContentScript(tabId);
    if (injected) {
      response = await attemptSend();
    }
  }

  if (!response) {
    return {
      ok: false,
      requestId,
      error: 'Content script could not connect to the active tab.',
      errorCode: 'CONTENT_SCRIPT_UNAVAILABLE',
    };
  }

  return response;
}
