import {
  DEFAULT_SETTINGS,
  isValidExtensionMessage,
  type ExtensionMessageResponse,
} from '@subtitleme/shared-types';
import { SETTINGS_STORAGE_KEY } from '@subtitleme/subtitle-storage';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  if (!existing[SETTINGS_STORAGE_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener(
  (
    rawMessage: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ) => {
    if (!isValidExtensionMessage(rawMessage)) {
      sendResponse({
        ok: false,
        error: 'Invalid message payload.',
        errorCode: 'INVALID_MESSAGE',
      });
      return false;
    }

    if (rawMessage.type === 'PING') {
      sendResponse({
        ok: true,
        ...(rawMessage.requestId !== undefined ? { requestId: rawMessage.requestId } : {}),
        type: 'PONG',
      });
      return false;
    }

    sendResponse({
      ok: false,
      ...(rawMessage.requestId !== undefined ? { requestId: rawMessage.requestId } : {}),
      error: `Unhandled background message type: ${rawMessage.type}`,
      errorCode: 'INVALID_MESSAGE',
    });
    return false;
  },
);
