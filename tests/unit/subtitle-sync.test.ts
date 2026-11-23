import { describe, expect, it, vi } from 'vitest';
import type { ActiveCueSnapshot, SubtitleTrack } from '@subtitleme/shared-types';
import { createTrackManager } from '@subtitleme/subtitle-core';
import {
  createMediaSyncController,
  createSyncEngine,
  type MediaElementLike,
  type RafProvider,
} from '@subtitleme/subtitle-sync';

class FakeMediaElement implements MediaElementLike {
  public currentTime = 0;
  public duration = 60;
  public playbackRate = 1;
  public paused = true;
  public ended = false;
  private readonly listeners = new Map<string, Set<() => void>>();

  public addEventListener(type: string, listener: () => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  public removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }

  public listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

function createFakeRaf() {
  let nextHandle = 1;
  const callbacks = new Map<number, (ts: number) => void>();

  const provider: RafProvider = {
    requestAnimationFrame(cb) {
      const id = nextHandle++;
      callbacks.set(id, cb);
      return id;
    },
    cancelAnimationFrame(id) {
      callbacks.delete(id);
    },
  };

  function stepFrame(ts = 16): void {
    const pending = Array.from(callbacks.entries());
    callbacks.clear();
    for (const [, cb] of pending) {
      cb(ts);
    }
  }

  return {
    provider,
    stepFrame,
    pendingCount: () => callbacks.size,
  };
}

function createSampleManager(playerId = 'p1') {
  const manager = createTrackManager(playerId);
  const primary: SubtitleTrack = {
    id: 'en',
    language: 'en',
    label: 'English',
    source: 'local',
    offset: 0,
    enabled: true,
    cues: [
      { id: '1', start: 1000, end: 3000, text: 'Hello' },
      { id: '2', start: 5000, end: 7000, text: 'World' },
    ],
  };
  const secondary: SubtitleTrack = {
    id: 'pt',
    language: 'pt-BR',
    label: 'Portuguese',
    source: 'local',
    offset: 500,
    enabled: true,
    cues: [{ id: '1', start: 1000, end: 3000, text: 'Olá' }],
  };
  manager.registerTrack(primary);
  manager.registerTrack(secondary);
  manager.selectTrack('primary', 'en');
  manager.selectTrack('secondary', 'pt');
  return manager;
}

describe('Subtitle Sync — Browser-independent SyncEngine', () => {
  it('suppresses duplicate updates and responds to offset changes and track replacement', () => {
    const manager = createSampleManager();
    let timeMs = 1200;
    const engine = createSyncEngine(manager, {
      getCurrentTimeMs: () => timeMs,
      getPlaybackRate: () => 1,
      isPaused: () => false,
    });

    const snapshots: ActiveCueSnapshot[] = [];
    engine.subscribe((s) => snapshots.push(s));

    engine.tick();
    engine.tick(); // unchanged -> should not re-emit
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.primary?.text).toBe('Hello');
    expect(snapshots[0]?.secondary).toBeNull(); // offset +500 -> starts at 1500

    timeMs = 1600;
    engine.tick();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]?.secondary?.text).toBe('Olá');

    // Replace track manager
    const replacement = createTrackManager('p2');
    engine.setTrackManager(replacement);
    expect(snapshots).toHaveLength(3);
    expect(snapshots[2]?.primary).toBeNull();
    expect(snapshots[2]?.secondary).toBeNull();
  });
});

describe('Subtitle Sync — rAF MediaSyncController', () => {
  it('manages play/pause rAF loop, seeking, playback speed, ended state, and disposal cleanly', () => {
    const media = new FakeMediaElement();
    const raf = createFakeRaf();
    const manager = createSampleManager();
    const controller = createMediaSyncController(media, manager, raf.provider);

    const listener = vi.fn<(snapshot: ActiveCueSnapshot) => void>();
    controller.subscribe(listener);

    controller.start();
    // Paused initially -> no rAF loop running
    expect(controller.isRunning()).toBe(false);
    expect(raf.pendingCount()).toBe(0);

    // Seek while paused updates immediately
    media.currentTime = 2.0;
    media.emit('seeked');
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        primary: expect.objectContaining({ text: 'Hello' }),
        secondary: expect.objectContaining({ text: 'Olá' }),
      }),
    );

    // Start playback -> single rAF loop
    media.paused = false;
    media.emit('play');
    media.emit('playing'); // duplicate play event must not create second loop
    expect(controller.isRunning()).toBe(true);
    expect(raf.pendingCount()).toBe(1);

    // Playback speed change + advance time
    media.playbackRate = 2.0;
    media.emit('ratechange');
    media.currentTime = 5.5;
    raf.stepFrame();
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        primary: expect.objectContaining({ text: 'World' }),
        secondary: null,
      }),
    );

    // Pause cancels rAF loop immediately
    media.paused = true;
    media.emit('pause');
    expect(controller.isRunning()).toBe(false);
    expect(raf.pendingCount()).toBe(0);

    // Ended clears active cues
    media.ended = true;
    media.emit('ended');
    expect(listener).toHaveBeenLastCalledWith({ primary: null, secondary: null });

    // Dispose cleans up all listeners
    controller.dispose();
    expect(media.listenerCount('play')).toBe(0);
    expect(media.listenerCount('seeked')).toBe(0);
    expect(media.listenerCount('ended')).toBe(0);
  });

  it('isolates two concurrent video playback sessions without state leakage', () => {
    const mediaA = new FakeMediaElement();
    const mediaB = new FakeMediaElement();
    const raf = createFakeRaf();

    const managerA = createSampleManager('video-A');
    const managerB = createTrackManager('video-B');
    managerB.registerTrack({
      id: 'es',
      language: 'es',
      label: 'Spanish',
      source: 'local',
      offset: 0,
      enabled: true,
      cues: [{ id: '1', start: 1000, end: 4000, text: 'Hola Mundo' }],
    });
    managerB.selectTrack('primary', 'es');

    const ctrlA = createMediaSyncController(mediaA, managerA, raf.provider);
    const ctrlB = createMediaSyncController(mediaB, managerB, raf.provider);

    let lastA: ActiveCueSnapshot = { primary: null, secondary: null };
    let lastB: ActiveCueSnapshot = { primary: null, secondary: null };
    ctrlA.subscribe((s) => {
      lastA = s;
    });
    ctrlB.subscribe((s) => {
      lastB = s;
    });

    ctrlA.start();
    ctrlB.start();

    mediaA.currentTime = 2.0;
    mediaA.emit('seeked');
    mediaB.currentTime = 2.0;
    mediaB.emit('seeked');

    expect(lastA.primary?.text).toBe('Hello');
    expect(lastB.primary?.text).toBe('Hola Mundo');

    ctrlA.dispose();
    ctrlB.dispose();
  });
});
