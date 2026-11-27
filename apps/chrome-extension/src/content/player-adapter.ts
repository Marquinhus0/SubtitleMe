import type { NativeTrackSummary, SubtitleCue, SubtitleTrack } from '@subtitleme/shared-types';
import { normalizeSubtitleText } from '@subtitleme/subtitle-parser';

/**
 * Adapter boundary isolating site-specific or player-specific video/track access
 * from the shared SubtitleMe engine.
 */
export interface PlayerAdapter {
  readonly id: string;
  matches(video: HTMLVideoElement): boolean;
  getOverlayContainer(video: HTMLVideoElement): HTMLElement;
  getNativeTracks(video: HTMLVideoElement): NativeTrackSummary[];
  extractSubtitleTrack(
    textTrack: TextTrack,
    index: number,
    playerId: string,
  ): SubtitleTrack;
}

function getCueRawText(cue: TextTrackCue): string {
  const maybeVtt = cue as TextTrackCue & { text?: unknown };
  return typeof maybeVtt.text === 'string' ? maybeVtt.text : '';
}

/**
 * Converts a browser TextTrack and its currently accessible cues into a
 * normalized SubtitleMe SubtitleTrack. Never trusts page-provided cue text.
 */
export function convertNativeTrackToSubtitleTrack(
  textTrack: TextTrack,
  index: number,
  playerId: string,
): SubtitleTrack {
  const rawId = textTrack.id?.trim();
  const uniqueSuffix = rawId ? `${rawId}-${index}` : `track-${index}`;
  const trackId = `native:${playerId}:${uniqueSuffix}`;
  const language = textTrack.language?.trim() || 'und';
  const label = textTrack.label?.trim() || `Track ${index + 1}`;

  const cues: SubtitleCue[] = [];
  const rawCues = textTrack.cues;
  if (rawCues) {
    for (let i = 0; i < rawCues.length; i += 1) {
      const rawCue = rawCues[i];
      if (!rawCue) continue;

      const start = Number.isFinite(rawCue.startTime)
        ? Math.max(0, Math.round(rawCue.startTime * 1000))
        : -1;
      const end = Number.isFinite(rawCue.endTime)
        ? Math.max(0, Math.round(rawCue.endTime * 1000))
        : -1;

      if (start < 0 || end <= start) continue;

      const { text } = normalizeSubtitleText(getCueRawText(rawCue), 'vtt');
      if (text.length === 0) continue;

      cues.push({
        id: rawCue.id || `${trackId}-cue-${i + 1}`,
        start,
        end,
        text,
      });
    }
  }

  cues.sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end));

  return {
    id: trackId,
    language,
    label,
    source: 'player',
    cues,
    offset: 0,
    enabled: true,
  };
}

export class Html5VideoAdapter implements PlayerAdapter {
  public readonly id = 'html5-generic';

  public matches(video: HTMLVideoElement): boolean {
    return video instanceof HTMLVideoElement;
  }

  public getOverlayContainer(video: HTMLVideoElement): HTMLElement {
    return video.parentElement ?? document.body;
  }

  public getNativeTracks(video: HTMLVideoElement): NativeTrackSummary[] {
    const tracks: NativeTrackSummary[] = [];
    const list = video.textTracks;
    if (!list) return tracks;

    for (let i = 0; i < list.length; i += 1) {
      const track = list[i];
      if (!track) continue;
      if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
      const rawId = track.id?.trim();
      tracks.push({
        id: rawId ? `${rawId}-${i}` : `track-${i}`,
        language: track.language?.trim() || 'und',
        label: track.label?.trim() || `Track ${i + 1}`,
        kind: track.kind,
        mode: track.mode,
      });
    }
    return tracks;
  }

  public extractSubtitleTrack(
    textTrack: TextTrack,
    index: number,
    playerId: string,
  ): SubtitleTrack {
    return convertNativeTrackToSubtitleTrack(textTrack, index, playerId);
  }
}
