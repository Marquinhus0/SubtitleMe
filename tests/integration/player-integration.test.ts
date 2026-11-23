// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isValidExtensionMessage,
  type SubtitleTrack,
} from '@subtitleme/shared-types';
import {
  PlayerDetector,
  scoreVideoCandidate,
} from '../../apps/chrome-extension/src/content/player-detector';
import { Html5VideoAdapter } from '../../apps/chrome-extension/src/content/player-adapter';
import { NativeSubtitleObserver } from '../../apps/chrome-extension/src/content/subtitle-observer';
import { OverlayManager } from '../../apps/chrome-extension/src/content/overlay-manager';
import { PlayerLifecycleManager } from '../../apps/chrome-extension/src/content/player-lifecycle';
import { isRestrictedTabUrl } from '../../apps/chrome-extension/src/services/tab-messaging';

function setRect(el: Element, width: number, height: number): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
}

function createMockTextTrack(config: {
  id: string;
  language: string;
  label: string;
  mode?: TextTrackMode;
  cues?: Array<{ id: string; startTime: number; endTime: number; text: string }>;
}): TextTrack {
  const listeners = new Map<string, Set<() => void>>();
  let mode: TextTrackMode = config.mode ?? 'disabled';
  const rawCues = config.cues ?? [];

  const track = {
    id: config.id,
    kind: 'subtitles',
    language: config.language,
    label: config.label,
    get mode() {
      return mode;
    },
    set mode(next: TextTrackMode) {
      mode = next;
    },
    get cues() {
      // Simulate Chromium: cues only exposed when mode !== 'disabled'
      if (mode === 'disabled') return null;
      return rawCues as unknown as TextTrackCueList;
    },
    addEventListener(type: string, fn: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn);
    },
  };

  return track as unknown as TextTrack;
}

function attachMockTextTracks(video: HTMLVideoElement, tracks: TextTrack[]): void {
  const list = Object.assign([...tracks], {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  Object.defineProperty(video, 'textTracks', {
    configurable: true,
    value: list,
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: null,
  });
});

describe('Sprint 06 — Player Detection & Ranking', () => {
  it('ranks visible playing videos above hidden or tiny ad videos and gives fullscreen top priority', () => {
    const adVideo = document.createElement('video');
    const mainVideo = document.createElement('video');
    document.body.append(adVideo, mainVideo);

    setRect(adVideo, 80, 60); // tiny ad
    setRect(mainVideo, 800, 450); // main player
    Object.defineProperty(mainVideo, 'paused', { configurable: true, value: false });
    Object.defineProperty(adVideo, 'paused', { configurable: true, value: true });

    const ctx = {
      fullscreenElement: null,
      lastInteractionTimestamps: new Map<HTMLVideoElement, number>(),
      now: Date.now(),
      viewportWidth: 1280,
      viewportHeight: 720,
    };

    expect(scoreVideoCandidate(mainVideo, ctx)).toBeGreaterThan(scoreVideoCandidate(adVideo, ctx));

    // Fullscreen on adVideo overrides even paused state
    const fsScore = scoreVideoCandidate(adVideo, { ...ctx, fullscreenElement: adVideo });
    expect(fsScore).toBeGreaterThan(scoreVideoCandidate(mainVideo, ctx));
  });

  it('detects dynamically inserted and removed videos via debounced MutationObserver', async () => {
    const added: HTMLVideoElement[] = [];
    const removed: HTMLVideoElement[] = [];

    const detector = new PlayerDetector(
      {
        onVideoAdded: (v) => added.push(v),
        onVideoRemoved: (v) => removed.push(v),
        onActiveCandidateChanged: () => undefined,
      },
      { root: document, debounceMs: 10 },
    );

    detector.start();
    expect(added).toHaveLength(0);

    const dynamicVideo = document.createElement('video');
    setRect(dynamicVideo, 640, 360);
    document.body.appendChild(dynamicVideo);

    await new Promise((r) => setTimeout(r, 40));
    expect(added).toEqual([dynamicVideo]);

    dynamicVideo.remove();
    await new Promise((r) => setTimeout(r, 40));
    expect(removed).toEqual([dynamicVideo]);

    detector.dispose();
  });
});

describe('Sprint 06 — Native TextTrack Observer & Non-Destructive Mode Restoration', () => {
  it('reads accessible cues, sanitizes untrusted text, and restores original TextTrack.mode on dispose', () => {
    const video = document.createElement('video');
    document.body.appendChild(video);

    const enTrack = createMockTextTrack({
      id: 'en-native',
      language: 'en',
      label: 'English',
      mode: 'disabled',
      cues: [
        {
          id: 'c1',
          startTime: 1.0,
          endTime: 3.5,
          text: '<i>Hello</i> <script>evil()</script>world',
        },
      ],
    });
    attachMockTextTracks(video, [enTrack]);

    let latestTracks: SubtitleTrack[] = [];
    const observer = new NativeSubtitleObserver(
      video,
      new Html5VideoAdapter(),
      'player-1',
      (update) => {
        latestTracks = update.tracks;
      },
    );

    observer.start();
    // Mode switched temporarily from 'disabled' -> 'hidden' to access cues
    expect(enTrack.mode).toBe('hidden');
    expect(latestTracks).toHaveLength(1);
    expect(latestTracks[0]?.cues[0]?.text).toBe('Hello world');
    expect(latestTracks[0]?.cues[0]?.start).toBe(1000);
    expect(latestTracks[0]?.cues[0]?.end).toBe(3500);

    // Original 'disabled' mode restored cleanly on dispose
    observer.dispose();
    expect(enTrack.mode).toBe('disabled');
  });
});

describe('Sprint 06 — Fullscreen Overlay Re-parenting', () => {
  it('re-parents Shadow DOM overlay into fullscreen container and restores on fullscreen exit', () => {
    const wrapper = document.createElement('div');
    const inner = document.createElement('div');
    const video = document.createElement('video');
    inner.appendChild(video);
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    const manager = new OverlayManager('fs-player');
    manager.attachToVideo(video, new Html5VideoAdapter());
    expect(manager.getMountedContainer()).toBe(inner);

    // Enter fullscreen on outer wrapper
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: wrapper,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(manager.getMountedContainer()).toBe(wrapper);

    // Exit fullscreen -> restored back to inner container
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(manager.getMountedContainer()).toBe(inner);

    manager.dispose();
    expect(manager.isMounted()).toBe(false);
  });
});

describe('Sprint 06 — PlayerLifecycleManager, Multi-Video Isolation & Messaging', () => {
  it('isolates multiple videos, renders dual native + local subtitles, handles commands, and promotes next player on removal', () => {
    const container1 = document.createElement('div');
    const video1 = document.createElement('video');
    setRect(video1, 800, 450);
    container1.appendChild(video1);

    const container2 = document.createElement('div');
    const video2 = document.createElement('video');
    setRect(video2, 640, 360);
    container2.appendChild(video2);

    document.body.append(container1, container2);

    attachMockTextTracks(video1, [
      createMockTextTrack({
        id: 'en-1',
        language: 'en',
        label: 'English',
        cues: [{ id: '1', startTime: 1, endTime: 4, text: 'Native English' }],
      }),
    ]);
    attachMockTextTracks(video2, []);

    const lifecycle = new PlayerLifecycleManager({
      root: document,
      initialSettings: DEFAULT_SETTINGS,
    });
    lifecycle.start();

    expect(lifecycle.listSessions()).toHaveLength(2);
    const activeBefore = lifecycle.getActiveSession();
    expect(activeBefore?.video).toBe(video1);

    // Sync a local Portuguese track into active sessions
    const syncRes = lifecycle.handleMessage({
      type: 'SYNC_LOCAL_TRACKS',
      requestId: 'req-1',
      payload: {
        tracks: [
          {
            id: 'local-pt',
            language: 'pt-BR',
            label: 'movie-pt.vtt',
            source: 'local',
            offset: 0,
            enabled: true,
            cues: [{ id: '1', start: 1000, end: 4000, text: 'Local Português' }],
          },
        ],
        primaryTrackId: null,
        secondaryTrackId: 'local-pt',
      },
    });
    expect(syncRes.ok).toBe(true);

    // Seek video1 to 2.0s -> Shadow DOM renders BOTH native English & local Portuguese
    video1.currentTime = 2.0;
    video1.dispatchEvent(new Event('seeked'));

    const shadow = activeBefore?.overlayManager.getHostElement()?.shadowRoot;
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe('Native English');
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe('Local Português');

    // Query status & available tracks via validated commands
    const statusRes = lifecycle.handleMessage({ type: 'GET_PLAYER_STATUS', requestId: 'req-2' });
    expect(statusRes.ok).toBe(true);
    if (statusRes.ok && statusRes.type === 'PLAYER_STATUS') {
      expect(statusRes.payload.videoCount).toBe(2);
      expect(statusRes.payload.nativeTracks).toHaveLength(1);
      expect(statusRes.payload.localTrackCount).toBe(1);
    }

    const tracksRes = lifecycle.handleMessage({ type: 'GET_AVAILABLE_TRACKS', requestId: 'req-3' });
    expect(tracksRes.ok).toBe(true);
    if (tracksRes.ok && tracksRes.type === 'AVAILABLE_TRACKS') {
      expect(tracksRes.payload.length).toBeGreaterThanOrEqual(2);
    }

    // Stale player ID rejected with structured error
    const staleRes = lifecycle.handleMessage({
      type: 'SET_PRIMARY_TRACK',
      playerId: 'player-999',
      payload: { trackId: null },
    });
    expect(staleRes.ok).toBe(false);
    if (!staleRes.ok) {
      expect(staleRes.errorCode).toBe('STALE_PLAYER_ID');
    }

    // Removing video1 disposes its session and promotes video2
    lifecycle.unregisterVideo(video1);
    expect(lifecycle.listSessions()).toHaveLength(1);
    expect(lifecycle.getActiveSession()?.video).toBe(video2);

    lifecycle.dispose();
  });

  it('validates extension messages and identifies restricted browser URLs', () => {
    expect(isValidExtensionMessage({ type: 'GET_PLAYER_STATUS', requestId: 'r1' })).toBe(true);
    expect(
      isValidExtensionMessage({
        type: 'SET_TRACK_OFFSET',
        payload: { slot: 'primary', offsetMs: 250 },
      }),
    ).toBe(true);
    expect(isValidExtensionMessage({ type: 'UNKNOWN_CMD' })).toBe(false);
    expect(isValidExtensionMessage({ type: 'SET_TRACK_OFFSET', payload: { slot: 'bad' } })).toBe(
      false,
    );

    expect(isRestrictedTabUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedTabUrl('chrome-extension://abc/popup.html')).toBe(true);
    expect(isRestrictedTabUrl('https://chromewebstore.google.com/detail/xyz')).toBe(true);
    expect(isRestrictedTabUrl('https://example.com/watch')).toBe(false);
  });
});
