import {
  DEFAULT_SETTINGS,
  isValidExtensionMessage,
  sanitizeSettings,
  type ExtensionMessageResponse,
} from '@subtitleme/shared-types';
import { SETTINGS_STORAGE_KEY } from '@subtitleme/subtitle-storage';
import { PlayerLifecycleManager } from './player-lifecycle';

const CONTROLLER_SENTINEL = Symbol.for('subtitleme.content.controller');

interface ContentWindow extends Window {
  [CONTROLLER_SENTINEL]?: {
    lifecycle: PlayerLifecycleManager;
    dispose(): void;
  };
}

function bootstrapContentScript(): void {
  const win = window as ContentWindow;

  // Idempotent guard: prevent duplicate observers/listeners after script reinjection
  if (win[CONTROLLER_SENTINEL]) {
    win[CONTROLLER_SENTINEL].lifecycle.refresh();
    return;
  }

  const lifecycle = new PlayerLifecycleManager({
    root: document,
    initialSettings: DEFAULT_SETTINGS,
  });

  // Hydrate settings from chrome.storage.local when available
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    void chrome.storage.local
      .get(SETTINGS_STORAGE_KEY)
      .then((result) => {
        const stored = result[SETTINGS_STORAGE_KEY];
        if (stored) {
          lifecycle.applySettings(sanitizeSettings(stored));
        }
      })
      .catch(() => {
        // Keep safe DEFAULT_SETTINGS on storage read failure
      });
  }

  const onStorageChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') return;
    const change = changes[SETTINGS_STORAGE_KEY];
    if (!change || change.newValue === undefined) return;
    lifecycle.applySettings(sanitizeSettings(change.newValue));
  };

  const onRuntimeMessage = (
    rawMessage: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionMessageResponse) => void,
  ): boolean => {
    if (!isValidExtensionMessage(rawMessage)) {
      sendResponse({
        ok: false,
        error: 'Invalid SubtitleMe message format.',
        errorCode: 'INVALID_MESSAGE',
      });
      return false;
    }

    try {
      const response = lifecycle.handleMessage(rawMessage);
      sendResponse(response);
    } catch (error) {
      sendResponse({
        ok: false,
        ...(rawMessage.requestId !== undefined ? { requestId: rawMessage.requestId } : {}),
        error: error instanceof Error ? error.message : 'Content script command failed.',
        errorCode: 'EXECUTION_FAILED',
      });
    }
    return false;
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener(onStorageChanged);
  }
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener(onRuntimeMessage);
  }

  const dispose = (): void => {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(onStorageChanged);
    }
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    }
    lifecycle.dispose();
    Reflect.deleteProperty(win, CONTROLLER_SENTINEL);
  };

  win.addEventListener('pagehide', dispose, { once: true });
  win[CONTROLLER_SENTINEL] = { lifecycle, dispose };

  lifecycle.start();
}

bootstrapContentScript();
