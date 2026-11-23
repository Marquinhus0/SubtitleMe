import type { NativeTrackSummary, SubtitleTrack } from '@subtitleme/shared-types';
import type { PlayerAdapter } from './player-adapter';

export interface NativeTracksUpdate {
  summaries: NativeTrackSummary[];
  tracks: SubtitleTrack[];
}

export type NativeTracksListener = (update: NativeTracksUpdate) => void;

export function inspectNativeTracks(
  video: HTMLVideoElement,
  adapter: PlayerAdapter,
): NativeTrackSummary[] {
  return adapter.getNativeTracks(video);
}

/**
 * Observes native HTMLMediaElement TextTrack additions, removals, mode changes,
 * and cue updates without permanently mutating the host player's subtitle state.
 *
 * Technical note on TextTrack.mode:
 * Chromium only populates `track.cues` when `track.mode` is `'hidden'` or
 * `'showing'`. When `enableCueInspection` is true and a subtitle/caption track
 * is `'disabled'`, we record its original mode in `originalModes`, switch it
 * once to `'hidden'` (so native browser captions stay hidden while cues become
 * readable), and restore the original mode unconditionally on `dispose()`.
 */
export class NativeSubtitleObserver {
  private readonly video: HTMLVideoElement;
  private readonly adapter: PlayerAdapter;
  private readonly playerId: string;
  private readonly listener: NativeTracksListener;
  private readonly enableCueInspection: boolean;

  private readonly originalModes = new WeakMap<TextTrack, TextTrackMode>();
  private readonly trackedTracks = new Set<TextTrack>();
  private disposed = false;

  private readonly handleTrackListChange = (): void => {
    if (this.disposed) return;
    this.syncBindings();
    this.emitSnapshot();
  };

  private readonly handleCueChange = (): void => {
    if (this.disposed) return;
    this.emitSnapshot();
  };

  public constructor(
    video: HTMLVideoElement,
    adapter: PlayerAdapter,
    playerId: string,
    listener: NativeTracksListener,
    options: { enableCueInspection?: boolean } = {},
  ) {
    this.video = video;
    this.adapter = adapter;
    this.playerId = playerId;
    this.listener = listener;
    this.enableCueInspection = options.enableCueInspection ?? true;
  }

  public start(): void {
    if (this.disposed) return;
    const list = this.video.textTracks;
    if (list && typeof list.addEventListener === 'function') {
      list.addEventListener('addtrack', this.handleTrackListChange);
      list.addEventListener('removetrack', this.handleTrackListChange);
      list.addEventListener('change', this.handleTrackListChange);
    }
    this.syncBindings();
    this.emitSnapshot();
  }

  public refresh(): void {
    if (this.disposed) return;
    this.syncBindings();
    this.emitSnapshot();
  }

  public getSnapshot(): NativeTracksUpdate {
    const summaries = this.adapter.getNativeTracks(this.video);
    const tracks: SubtitleTrack[] = [];
    const list = this.video.textTracks;

    if (list) {
      for (let i = 0; i < list.length; i += 1) {
        const track = list[i];
        if (!track) continue;
        if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
        tracks.push(this.adapter.extractSubtitleTrack(track, i, this.playerId));
      }
    }

    return { summaries, tracks };
  }

  private syncBindings(): void {
    const list = this.video.textTracks;
    const currentTracks = new Set<TextTrack>();

    if (list) {
      for (let i = 0; i < list.length; i += 1) {
        const track = list[i];
        if (!track) continue;
        if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;

        currentTracks.add(track);

        if (!this.trackedTracks.has(track)) {
          this.trackedTracks.add(track);
          if (typeof track.addEventListener === 'function') {
            track.addEventListener('cuechange', this.handleCueChange);
          }

          // Switch 'disabled' -> 'hidden' once to let Chromium load accessible cues
          if (this.enableCueInspection && track.mode === 'disabled') {
            this.originalModes.set(track, 'disabled');
            try {
              track.mode = 'hidden';
            } catch {
              // Ignore read-only/restricted track implementations
            }
          }
        }
      }
    }

    // Detach listeners and restore modes for removed tracks
    for (const oldTrack of Array.from(this.trackedTracks)) {
      if (!currentTracks.has(oldTrack)) {
        this.releaseTrack(oldTrack);
      }
    }
  }

  private releaseTrack(track: TextTrack): void {
    if (typeof track.removeEventListener === 'function') {
      track.removeEventListener('cuechange', this.handleCueChange);
    }
    const originalMode = this.originalModes.get(track);
    if (originalMode !== undefined) {
      try {
        track.mode = originalMode;
      } catch {
        // Ignore if track is no longer writable
      }
      this.originalModes.delete(track);
    }
    this.trackedTracks.delete(track);
  }

  private emitSnapshot(): void {
    this.listener(this.getSnapshot());
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    const list = this.video.textTracks;
    if (list && typeof list.removeEventListener === 'function') {
      list.removeEventListener('addtrack', this.handleTrackListChange);
      list.removeEventListener('removetrack', this.handleTrackListChange);
      list.removeEventListener('change', this.handleTrackListChange);
    }

    for (const track of Array.from(this.trackedTracks)) {
      this.releaseTrack(track);
    }
  }
}
