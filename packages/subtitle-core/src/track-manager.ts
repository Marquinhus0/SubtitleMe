import type {
  ActiveCueSnapshot,
  SubtitleCue,
  SubtitleOrder,
  SubtitleSlot,
  SubtitleTrack,
} from '@subtitleme/shared-types';
import {
  buildCueIndex,
  findActiveCues,
  resolveDisplayCue,
  type CueIndex,
} from './cue-index';

export interface ActiveCueListsSnapshot {
  primary: SubtitleCue[];
  secondary: SubtitleCue[];
}

export interface TrackUpdatePatch {
  language?: string;
  label?: string;
  cues?: SubtitleCue[];
  offset?: number;
  enabled?: boolean;
}

export interface TrackManager {
  readonly playerId: string;
  registerTrack(track: SubtitleTrack): void;
  updateTrack(trackId: string, patch: TrackUpdatePatch): boolean;
  removeTrack(trackId: string): boolean;
  getTrack(trackId: string): SubtitleTrack | undefined;
  listTracks(): readonly SubtitleTrack[];
  selectTrack(slot: SubtitleSlot, trackId: string | null): boolean;
  getSelectedTrack(slot: SubtitleSlot): SubtitleTrack | null;
  setTrackOffset(slot: SubtitleSlot, offsetMs: number): boolean;
  setTrackEnabled(slot: SubtitleSlot, enabled: boolean): boolean;
  setOrder(order: SubtitleOrder): void;
  getOrder(): SubtitleOrder;
  getActiveCuesAt(timeMs: number): ActiveCueSnapshot;
  getActiveCueListsAt(timeMs: number): ActiveCueListsSnapshot;
  clear(): void;
}

interface IndexedTrackEntry {
  track: SubtitleTrack;
  index: CueIndex;
}

/**
 * Creates an isolated TrackManager instance bound to a player session.
 * Manages up to two simultaneously selected display slots (`primary` and `secondary`)
 * with independent languages, visibility flags, and timing offsets.
 */
export function createTrackManager(playerId = 'default'): TrackManager {
  const entries = new Map<string, IndexedTrackEntry>();
  const selectedIds: Record<SubtitleSlot, string | null> = {
    primary: null,
    secondary: null,
  };
  let order: SubtitleOrder = 'primary-top';

  function getSelectedEntry(slot: SubtitleSlot): IndexedTrackEntry | null {
    const id = selectedIds[slot];
    if (id === null) return null;
    return entries.get(id) ?? null;
  }

  function lookupActiveForSlot(slot: SubtitleSlot, timeMs: number): SubtitleCue[] {
    const entry = getSelectedEntry(slot);
    if (!entry || !entry.track.enabled) {
      return [];
    }
    // Positive offset delays subtitles: at video time `t`, cue time is `t - offset`.
    const adjustedTimeMs = Math.round(timeMs) - entry.track.offset;
    return findActiveCues(entry.index, adjustedTimeMs);
  }

  return {
    playerId,

    registerTrack(track: SubtitleTrack): void {
      const normalizedTrack: SubtitleTrack = {
        ...track,
        offset: Number.isFinite(track.offset) ? Math.round(track.offset) : 0,
        cues: [...track.cues],
      };
      entries.set(normalizedTrack.id, {
        track: normalizedTrack,
        index: buildCueIndex(normalizedTrack.cues),
      });
    },

    updateTrack(trackId: string, patch: TrackUpdatePatch): boolean {
      const existing = entries.get(trackId);
      if (!existing) return false;

      const updatedTrack: SubtitleTrack = {
        ...existing.track,
        ...(patch.language !== undefined ? { language: patch.language } : {}),
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.offset !== undefined && Number.isFinite(patch.offset)
          ? { offset: Math.round(patch.offset) }
          : {}),
        ...(patch.cues !== undefined ? { cues: [...patch.cues] } : {}),
      };

      const nextIndex = patch.cues !== undefined ? buildCueIndex(updatedTrack.cues) : existing.index;
      entries.set(trackId, { track: updatedTrack, index: nextIndex });
      return true;
    },

    removeTrack(trackId: string): boolean {
      const existed = entries.delete(trackId);
      if (!existed) return false;
      if (selectedIds.primary === trackId) selectedIds.primary = null;
      if (selectedIds.secondary === trackId) selectedIds.secondary = null;
      return true;
    },

    getTrack(trackId: string): SubtitleTrack | undefined {
      return entries.get(trackId)?.track;
    },

    listTracks(): readonly SubtitleTrack[] {
      return Array.from(entries.values(), (entry) => entry.track);
    },

    selectTrack(slot: SubtitleSlot, trackId: string | null): boolean {
      if (trackId === null) {
        selectedIds[slot] = null;
        return true;
      }
      if (!entries.has(trackId)) {
        return false;
      }
      const otherSlot: SubtitleSlot = slot === 'primary' ? 'secondary' : 'primary';
      if (selectedIds[otherSlot] === trackId) {
        return false;
      }
      selectedIds[slot] = trackId;
      return true;
    },

    getSelectedTrack(slot: SubtitleSlot): SubtitleTrack | null {
      return getSelectedEntry(slot)?.track ?? null;
    },

    setTrackOffset(slot: SubtitleSlot, offsetMs: number): boolean {
      const entry = getSelectedEntry(slot);
      if (!entry || !Number.isFinite(offsetMs)) return false;
      entry.track = { ...entry.track, offset: Math.round(offsetMs) };
      return true;
    },

    setTrackEnabled(slot: SubtitleSlot, enabled: boolean): boolean {
      const entry = getSelectedEntry(slot);
      if (!entry) return false;
      entry.track = { ...entry.track, enabled };
      return true;
    },

    setOrder(nextOrder: SubtitleOrder): void {
      order = nextOrder;
    },

    getOrder(): SubtitleOrder {
      return order;
    },

    getActiveCueListsAt(timeMs: number): ActiveCueListsSnapshot {
      return {
        primary: lookupActiveForSlot('primary', timeMs),
        secondary: lookupActiveForSlot('secondary', timeMs),
      };
    },

    getActiveCuesAt(timeMs: number): ActiveCueSnapshot {
      const lists = this.getActiveCueListsAt(timeMs);
      return {
        primary: resolveDisplayCue(lists.primary),
        secondary: resolveDisplayCue(lists.secondary),
      };
    },

    clear(): void {
      entries.clear();
      selectedIds.primary = null;
      selectedIds.secondary = null;
    },
  };
}
