import type { SubtitleSource } from './subtitle';

export type PlayerDetectionStatus = 'idle' | 'detected' | 'no-video' | 'tracks-unavailable';

export interface NativeTrackSummary {
  id: string;
  language: string;
  label: string;
  kind: string;
  mode: 'disabled' | 'hidden' | 'showing';
}

export interface AvailableTrackSummary {
  id: string;
  language: string;
  label: string;
  source: SubtitleSource;
  cueCount: number;
  enabled: boolean;
  offset: number;
}

export interface PlayerStatusSnapshot {
  status: PlayerDetectionStatus;
  videoCount: number;
  activeVideoIndex: number;
  activePlayerId?: string | null;
  extensionEnabled?: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  currentTimeMs: number;
  durationMs: number;
  paused: boolean;
  nativeTracks: NativeTrackSummary[];
  localTrackCount?: number;
  selectedPrimaryTrackId?: string | null;
  selectedSecondaryTrackId?: string | null;
  hostname: string;
}
