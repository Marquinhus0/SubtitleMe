// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  DEFAULT_SETTINGS,
  isValidExtensionMessage,
  type SubtitleTrack,
} from '@subtitleme/shared-types';
import { createTrackManager } from '@subtitleme/subtitle-core';
import {
  PlayerDetector,
  scoreVideoCandidate,
} from '../../apps/chrome-extension/src/content/player-detector';
import { Html5VideoAdapter } from '../../apps/chrome-extension/src/content/player-adapter';
import { NativeSubtitleObserver } from '../../apps/chrome-extension/src/content/subtitle-observer';
import { OverlayManager } from '../../apps/chrome-extension/src/content/overlay-manager';
import { PlayerLifecycleManager } from '../../apps/chrome-extension/src/content/player-lifecycle';
import { isRestrictedTabUrl } from '../../apps/chrome-extension/src/services/tab-messaging';
import { useSubtitleStore } from '../../apps/chrome-extension/src/stores/subtitle.store';

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

describe('Sprint 22.5 — Native Dual Track Assignment & Regression (DEF-01..DEF-06)', () => {
  function createHarnessVideo(options?: {
    enMode?: TextTrackMode;
    ptMode?: TextTrackMode;
    enId?: string;
    ptId?: string;
  }) {
    const container = document.createElement('div');
    const video = document.createElement('video');
    setRect(video, 720, 405);
    container.appendChild(video);
    document.body.appendChild(container);

    const enTrack = createMockTextTrack({
      id: options?.enId ?? 'en-track',
      language: 'en',
      label: 'English',
      mode: options?.enMode ?? 'disabled',
      cues: [
        { id: '1', startTime: 0.1, endTime: 1.4, text: 'Two languages. One experience.' },
        { id: '2', startTime: 1.6, endTime: 3.0, text: 'Synchronized dual subtitles in Chrome.' },
      ],
    });
    const ptTrack = createMockTextTrack({
      id: options?.ptId ?? 'pt-track',
      language: 'pt-BR',
      label: 'Português (Brasil)',
      mode: options?.ptMode ?? 'disabled',
      cues: [
        { id: '1', startTime: 0.1, endTime: 1.4, text: 'Dois idiomas. Uma experiência.' },
        { id: '2', startTime: 1.6, endTime: 3.0, text: 'Legendas duplas sincronizadas no Chrome.' },
      ],
    });

    attachMockTextTracks(video, [enTrack, ptTrack]);
    return { container, video, enTrack, ptTrack };
  }

  it('assigns English to primary and pt-BR to secondary with strict text isolation at 0.5s, 2.0s, 2x speed, pause, and ended', () => {
    const { video, enTrack, ptTrack } = createHarnessVideo({
      enMode: 'showing',
      ptMode: 'disabled',
    });

    const lifecycle = new PlayerLifecycleManager({
      root: document,
      initialSettings: DEFAULT_SETTINGS,
    });
    lifecycle.start();

    const session = lifecycle.getActiveSession();
    expect(session).not.toBeNull();

    // DEF-01: initially 'showing' track is suppressed to 'hidden' while overlay is active
    expect(enTrack.mode).toBe('hidden');
    expect(ptTrack.mode).toBe('hidden');

    const shadow = session?.overlayManager.getHostElement()?.shadowRoot;

    // Seek 0.5s -> exact harness strings in separate slots
    video.currentTime = 0.5;
    video.dispatchEvent(new Event('seeked'));
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe(
      'Two languages. One experience.',
    );
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe(
      'Dois idiomas. Uma experiência.',
    );

    // Seek 2.0s -> second cue pair strictly isolated
    video.currentTime = 2.0;
    video.dispatchEvent(new Event('seeked'));
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe(
      'Synchronized dual subtitles in Chrome.',
    );
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe(
      'Legendas duplas sincronizadas no Chrome.',
    );

    // Playback speed 2x + play/pause/ended
    Object.defineProperty(video, 'playbackRate', { configurable: true, value: 2 });
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    video.dispatchEvent(new Event('ratechange'));
    video.dispatchEvent(new Event('play'));
    expect(session?.syncController.isRunning()).toBe(true);

    Object.defineProperty(video, 'paused', { configurable: true, value: true });
    video.dispatchEvent(new Event('pause'));
    expect(session?.syncController.isRunning()).toBe(false);

    Object.defineProperty(video, 'ended', { configurable: true, value: true });
    video.dispatchEvent(new Event('ended'));
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe('');
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe('');

    // DEF-01: disabling extension restores originally 'showing' native track
    lifecycle.applySettings({
      ...DEFAULT_SETTINGS,
      general: { ...DEFAULT_SETTINGS.general, enabled: false },
    });
    expect(enTrack.mode).toBe('showing');
    expect(ptTrack.mode).toBe('hidden');

    // Re-enabling suppresses again; dispose restores both original modes ('showing' & 'disabled')
    lifecycle.applySettings(DEFAULT_SETTINGS);
    expect(enTrack.mode).toBe('hidden');

    lifecycle.dispose();
    expect(enTrack.mode).toBe('showing');
    expect(ptTrack.mode).toBe('disabled');
  });

  it('DEF-02: re-evaluates native tracks on dynamic language change while preserving local tracks and manual selections', () => {
    const { video } = createHarnessVideo();
    const lifecycle = new PlayerLifecycleManager({
      root: document,
      initialSettings: DEFAULT_SETTINGS,
    });
    lifecycle.start();

    const session = lifecycle.getActiveSession();
    const shadow = session?.overlayManager.getHostElement()?.shadowRoot;

    video.currentTime = 0.5;
    video.dispatchEvent(new Event('seeked'));
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe(
      'Two languages. One experience.',
    );
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe(
      'Dois idiomas. Uma experiência.',
    );

    // Swap defaultPrimaryLanguage <-> defaultSecondaryLanguage dynamically
    lifecycle.applySettings({
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        defaultPrimaryLanguage: 'pt-BR',
        defaultSecondaryLanguage: 'en',
      },
    });
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe(
      'Dois idiomas. Uma experiência.',
    );
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe(
      'Two languages. One experience.',
    );

    // Explicit manual selection on primary must NOT be overwritten by subsequent language change
    const enTrackId = session?.trackManager.listTracks().find((t) => t.language === 'en')?.id ?? null;
    expect(enTrackId).not.toBeNull();
    // Clear secondary first so enTrackId is free for primary
    lifecycle.handleMessage({
      type: 'SELECT_TRACK',
      payload: { slot: 'secondary', trackId: null },
    });
    lifecycle.handleMessage({
      type: 'SELECT_TRACK',
      payload: { slot: 'primary', trackId: enTrackId },
    });
    lifecycle.applySettings({
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        defaultPrimaryLanguage: 'pt-BR',
        defaultSecondaryLanguage: 'pt-BR',
      },
    });
    expect(session?.trackManager.getSelectedTrack('primary')?.id).toBe(enTrackId);

    // Local track assigned to secondary must be preserved across default language changes
    lifecycle.syncLocalTracks(
      [
        {
          id: 'local-es',
          language: 'es',
          label: 'local-es.srt',
          source: 'local',
          offset: 0,
          enabled: true,
          cues: [{ id: '1', start: 100, end: 1400, text: 'Subtítulo local español' }],
        },
      ],
      null,
      'local-es',
    );
    lifecycle.applySettings({
      ...DEFAULT_SETTINGS,
      general: {
        ...DEFAULT_SETTINGS.general,
        defaultPrimaryLanguage: 'en',
        defaultSecondaryLanguage: 'pt-BR',
      },
    });
    expect(session?.trackManager.getSelectedTrack('secondary')?.source).toBe('local');
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe(
      'Subtítulo local español',
    );

    lifecycle.dispose();
  });

  it('DEF-04 & DEF-05: handles duplicate native TextTrack IDs and prevents assigning the same track to both slots with independent offsets', () => {
    createHarnessVideo({ enId: 'dup-id', ptId: 'dup-id' });
    const lifecycle = new PlayerLifecycleManager({
      root: document,
      initialSettings: DEFAULT_SETTINGS,
    });
    lifecycle.start();

    const session = lifecycle.getActiveSession();
    const tracks = session?.trackManager.listTracks() ?? [];
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.id).not.toBe(tracks[1]?.id);

    // DEF-05: TrackManager rejects assigning the same trackId to both primary and secondary
    const tm = createTrackManager('isolation-test');
    tm.registerTrack({
      id: 't1',
      language: 'en',
      label: 'EN',
      source: 'player',
      offset: 0,
      enabled: true,
      cues: [{ id: 'c1', start: 1000, end: 2000, text: 'English cue' }],
    });
    tm.registerTrack({
      id: 't2',
      language: 'pt-BR',
      label: 'PT',
      source: 'player',
      offset: 0,
      enabled: true,
      cues: [{ id: 'c1', start: 1000, end: 2000, text: 'Portuguese cue' }],
    });

    expect(tm.selectTrack('primary', 't1')).toBe(true);
    expect(tm.selectTrack('secondary', 't1')).toBe(false);
    expect(tm.getSelectedTrack('secondary')).toBeNull();
    expect(tm.selectTrack('secondary', 't2')).toBe(true);

    // Independent offset & enabled per slot
    tm.setTrackOffset('primary', 500);
    tm.setTrackOffset('secondary', -500);
    expect(tm.getActiveCuesAt(1200).primary).toBeNull(); // 1200 - 500 = 700 (before 1000)
    expect(tm.getActiveCuesAt(1200).secondary?.text).toBe('Portuguese cue'); // 1200 - (-500) = 1700

    tm.setTrackEnabled('primary', false);
    expect(tm.getSelectedTrack('secondary')?.enabled).toBe(true);

    lifecycle.dispose();
  });

  it('DEF-06: updates snapshot when <track> fires load event and cleans up listeners on dispose', () => {
    const video = document.createElement('video');
    const trackEl = document.createElement('track');
    video.appendChild(trackEl);
    document.body.appendChild(video);

    const cues: Array<{ id: string; startTime: number; endTime: number; text: string }> = [];
    const track = createMockTextTrack({
      id: 'async-en',
      language: 'en',
      label: 'English',
      mode: 'disabled',
      cues,
    });
    attachMockTextTracks(video, [track]);

    let snapshots = 0;
    let lastCueCount = 0;
    const observer = new NativeSubtitleObserver(video, new Html5VideoAdapter(), 'p-load', (u) => {
      snapshots += 1;
      lastCueCount = u.tracks[0]?.cues.length ?? 0;
    });

    observer.start();
    expect(lastCueCount).toBe(0);

    // Simulate async WebVTT cues finishing load and <track> firing 'load'
    cues.push({ id: '1', startTime: 0.1, endTime: 1.4, text: 'Loaded after VTT fetch' });
    trackEl.dispatchEvent(new Event('load'));
    expect(lastCueCount).toBe(1);

    const beforeDispose = snapshots;
    observer.dispose();
    trackEl.dispatchEvent(new Event('load'));
    expect(snapshots).toBe(beforeDispose);
  });

  it('DEF-03: getSlotSource reports player only when slot actually has a native track bound', () => {
    setActivePinia(createPinia());
    const store = useSubtitleStore();

    store.setPlayerStatus({
      status: 'detected',
      videoCount: 1,
      activeVideoIndex: 0,
      activePlayerId: 'player-1',
      extensionEnabled: true,
      isFullscreen: false,
      playbackRate: 1,
      currentTimeMs: 500,
      durationMs: 3000,
      paused: false,
      nativeTracks: [{ id: 'en-0', language: 'en', label: 'English', kind: 'subtitles', mode: 'hidden' }],
      localTrackCount: 0,
      selectedPrimaryTrackId: 'native:player-1:en-0',
      selectedSecondaryTrackId: null,
      hostname: '127.0.0.1',
    });

    expect(store.getSlotSource('primary')).toBe('player');
    expect(store.getSlotSource('secondary')).toBe('none');
  });
});
