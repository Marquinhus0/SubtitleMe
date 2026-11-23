import type { ActiveCueSnapshot, SubtitleCue } from '@subtitleme/shared-types';
import type { TrackManager } from '@subtitleme/subtitle-core';

export interface PlaybackClock {
  getCurrentTimeMs(): number;
  getPlaybackRate(): number;
  isPaused(): boolean;
  isEnded?(): boolean;
  getDurationMs?(): number;
}

export type SyncListener = (snapshot: ActiveCueSnapshot) => void;

export interface SyncEngine {
  tick(): ActiveCueSnapshot;
  forceSync(): ActiveCueSnapshot;
  handleEnded(): ActiveCueSnapshot;
  setTrackManager(nextTrackManager: TrackManager): ActiveCueSnapshot;
  getLastSnapshot(): ActiveCueSnapshot;
  subscribe(listener: SyncListener): () => void;
  dispose(): void;
}

function cueSignature(cue: SubtitleCue | null): string {
  if (!cue) return '';
  return `${cue.id}\u0000${cue.start}\u0000${cue.end}\u0000${cue.text}`;
}

function snapshotsEqual(a: ActiveCueSnapshot, b: ActiveCueSnapshot): boolean {
  return cueSignature(a.primary) === cueSignature(b.primary) &&
    cueSignature(a.secondary) === cueSignature(b.secondary);
}

const EMPTY_SNAPSHOT: ActiveCueSnapshot = {
  primary: null,
  secondary: null,
};

/**
 * Browser-independent synchronization engine that maps a PlaybackClock to active
 * primary and secondary subtitle cues while suppressing redundant updates.
 */
export function createSyncEngine(
  initialTrackManager: TrackManager,
  clock: PlaybackClock,
): SyncEngine {
  let trackManager = initialTrackManager;
  let lastSnapshot: ActiveCueSnapshot = EMPTY_SNAPSHOT;
  let disposed = false;
  const listeners = new Set<SyncListener>();

  function emit(snapshot: ActiveCueSnapshot): void {
    lastSnapshot = snapshot;
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function evaluate(forceEmit: boolean): ActiveCueSnapshot {
    if (disposed) {
      return EMPTY_SNAPSHOT;
    }

    if (clock.isEnded?.()) {
      if (forceEmit || !snapshotsEqual(lastSnapshot, EMPTY_SNAPSHOT)) {
        emit(EMPTY_SNAPSHOT);
      }
      return EMPTY_SNAPSHOT;
    }

    const currentTimeMs = clock.getCurrentTimeMs();
    const nextSnapshot = trackManager.getActiveCuesAt(currentTimeMs);

    if (forceEmit || !snapshotsEqual(lastSnapshot, nextSnapshot)) {
      emit(nextSnapshot);
    }

    return nextSnapshot;
  }

  return {
    tick(): ActiveCueSnapshot {
      return evaluate(false);
    },

    forceSync(): ActiveCueSnapshot {
      return evaluate(true);
    },

    handleEnded(): ActiveCueSnapshot {
      if (disposed) return EMPTY_SNAPSHOT;
      if (!snapshotsEqual(lastSnapshot, EMPTY_SNAPSHOT)) {
        emit(EMPTY_SNAPSHOT);
      }
      return EMPTY_SNAPSHOT;
    },

    setTrackManager(nextTrackManager: TrackManager): ActiveCueSnapshot {
      trackManager = nextTrackManager;
      return evaluate(true);
    },

    getLastSnapshot(): ActiveCueSnapshot {
      return lastSnapshot;
    },

    subscribe(listener: SyncListener): () => void {
      if (disposed) {
        return () => undefined;
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose(): void {
      disposed = true;
      listeners.clear();
      lastSnapshot = EMPTY_SNAPSHOT;
    },
  };
}
