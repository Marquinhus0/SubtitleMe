import type { TrackManager } from '@subtitleme/subtitle-core';
import {
  createSyncEngine,
  type PlaybackClock,
  type SyncListener,
} from './sync-engine';

export interface MediaElementLike {
  readonly currentTime: number;
  readonly duration: number;
  readonly playbackRate: number;
  readonly paused: boolean;
  readonly ended: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface RafProvider {
  requestAnimationFrame(callback: (timestamp: number) => void): number;
  cancelAnimationFrame(handle: number): void;
}

export interface SyncController {
  start(): void;
  stop(): void;
  forceSync(): void;
  isRunning(): boolean;
  setTrackManager(trackManager: TrackManager): void;
  subscribe(listener: SyncListener): () => void;
  dispose(): void;
}

function getDefaultRafProvider(): RafProvider {
  const g = globalThis as unknown as Partial<RafProvider>;
  const req = g.requestAnimationFrame;
  const cancel = g.cancelAnimationFrame;
  if (typeof req === 'function' && typeof cancel === 'function') {
    return {
      requestAnimationFrame: (cb) => req.call(globalThis, cb),
      cancelAnimationFrame: (id) => cancel.call(globalThis, id),
    };
  }
  // Safe fallback for non-browser environments without rAF
  return {
    requestAnimationFrame: (cb) => Number(setTimeout(() => cb(Date.now()), 16)),
    cancelAnimationFrame: (id) => clearTimeout(id),
  };
}

export function createMediaPlaybackClock(media: MediaElementLike): PlaybackClock {
  return {
    getCurrentTimeMs(): number {
      const seconds = media.currentTime;
      return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : 0;
    },
    getPlaybackRate(): number {
      return Number.isFinite(media.playbackRate) && media.playbackRate > 0 ? media.playbackRate : 1;
    },
    isPaused(): boolean {
      return media.paused;
    },
    isEnded(): boolean {
      return media.ended;
    },
    getDurationMs(): number {
      return Number.isFinite(media.duration) && media.duration >= 0
        ? Math.round(media.duration * 1000)
        : 0;
    },
  };
}

/**
 * Browser-facing requestAnimationFrame synchronization controller bound to an
 * HTMLMediaElement-compatible object. Only runs an animation loop while actively
 * playing and cancels immediately on pause, ended, stop, or dispose.
 */
export function createMediaSyncController(
  media: MediaElementLike,
  trackManager: TrackManager,
  rafProvider: RafProvider = getDefaultRafProvider(),
): SyncController {
  const clock = createMediaPlaybackClock(media);
  const engine = createSyncEngine(trackManager, clock);

  let started = false;
  let disposed = false;
  let rafHandle: number | null = null;

  function cancelLoop(): void {
    if (rafHandle !== null) {
      rafProvider.cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }

  function scheduleFrame(): void {
    if (!started || disposed || rafHandle !== null) {
      return;
    }
    if (media.paused || media.ended) {
      return;
    }
    rafHandle = rafProvider.requestAnimationFrame(() => {
      rafHandle = null;
      if (!started || disposed) return;
      engine.tick();
      if (!media.paused && !media.ended) {
        scheduleFrame();
      }
    });
  }

  const onPlay = (): void => {
    if (!started || disposed) return;
    engine.tick();
    scheduleFrame();
  };

  const onPause = (): void => {
    cancelLoop();
    if (!started || disposed) return;
    engine.tick();
  };

  const onSeek = (): void => {
    if (!started || disposed) return;
    engine.forceSync();
  };

  const onRateOrDurationChange = (): void => {
    if (!started || disposed) return;
    engine.tick();
  };

  const onEnded = (): void => {
    cancelLoop();
    if (!started || disposed) return;
    engine.handleEnded();
  };

  function attachListeners(): void {
    media.addEventListener('play', onPlay);
    media.addEventListener('playing', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('seeking', onSeek);
    media.addEventListener('seeked', onSeek);
    media.addEventListener('ratechange', onRateOrDurationChange);
    media.addEventListener('durationchange', onRateOrDurationChange);
    media.addEventListener('loadedmetadata', onRateOrDurationChange);
    media.addEventListener('ended', onEnded);
  }

  function detachListeners(): void {
    media.removeEventListener('play', onPlay);
    media.removeEventListener('playing', onPlay);
    media.removeEventListener('pause', onPause);
    media.removeEventListener('seeking', onSeek);
    media.removeEventListener('seeked', onSeek);
    media.removeEventListener('ratechange', onRateOrDurationChange);
    media.removeEventListener('durationchange', onRateOrDurationChange);
    media.removeEventListener('loadedmetadata', onRateOrDurationChange);
    media.removeEventListener('ended', onEnded);
  }

  return {
    start(): void {
      if (disposed || started) return;
      started = true;
      attachListeners();
      engine.forceSync();
      if (!media.paused && !media.ended) {
        scheduleFrame();
      }
    },

    stop(): void {
      if (!started) return;
      started = false;
      cancelLoop();
      detachListeners();
    },

    forceSync(): void {
      if (disposed) return;
      engine.forceSync();
    },

    isRunning(): boolean {
      return rafHandle !== null;
    },

    setTrackManager(nextTrackManager: TrackManager): void {
      if (disposed) return;
      engine.setTrackManager(nextTrackManager);
    },

    subscribe(listener: SyncListener): () => void {
      return engine.subscribe(listener);
    },

    dispose(): void {
      if (disposed) return;
      this.stop();
      disposed = true;
      engine.dispose();
    },
  };
}
