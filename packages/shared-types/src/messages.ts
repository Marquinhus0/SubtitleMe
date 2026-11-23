import type { AvailableTrackSummary, PlayerStatusSnapshot } from './player';
import type { SubtitleMeSettings, SubtitleOrder } from './settings';
import type { SubtitleSlot, SubtitleTrack } from './subtitle';

export interface MessageEnvelopeBase {
  requestId?: string;
  playerId?: string;
}

export type ExtensionMessage =
  | (MessageEnvelopeBase & { type: 'PING' })
  | (MessageEnvelopeBase & { type: 'GET_PLAYER_STATUS' })
  | (MessageEnvelopeBase & { type: 'GET_AVAILABLE_TRACKS' })
  | (MessageEnvelopeBase & { type: 'GET_ACTIVE_PLAYER' })
  | (MessageEnvelopeBase & { type: 'REFRESH_PLAYER' })
  | (MessageEnvelopeBase & { type: 'SET_EXTENSION_ENABLED'; payload: { enabled: boolean } })
  | (MessageEnvelopeBase & { type: 'SET_PRIMARY_TRACK'; payload: { trackId: string | null } })
  | (MessageEnvelopeBase & { type: 'SET_SECONDARY_TRACK'; payload: { trackId: string | null } })
  | (MessageEnvelopeBase & { type: 'TOGGLE_PRIMARY'; payload: { enabled: boolean } })
  | (MessageEnvelopeBase & { type: 'TOGGLE_SECONDARY'; payload: { enabled: boolean } })
  | (MessageEnvelopeBase & {
      type: 'SET_TRACK_OFFSET';
      payload: { slot: SubtitleSlot; offsetMs: number };
    })
  | (MessageEnvelopeBase & { type: 'SET_SUBTITLE_ORDER'; payload: { order: SubtitleOrder } })
  | (MessageEnvelopeBase & { type: 'SETTINGS_UPDATED'; payload: SubtitleMeSettings })
  | (MessageEnvelopeBase & {
      type: 'SYNC_LOCAL_TRACKS';
      payload: {
        tracks: SubtitleTrack[];
        primaryTrackId: string | null;
        secondaryTrackId: string | null;
      };
    })
  | (MessageEnvelopeBase & {
      type: 'SELECT_TRACK';
      payload: { slot: SubtitleSlot; trackId: string | null };
    })
  | (MessageEnvelopeBase & {
      type: 'IMPORT_LOCAL_TRACK';
      payload: { slot: SubtitleSlot; track: SubtitleTrack };
    })
  | (MessageEnvelopeBase & { type: 'REMOVE_LOCAL_TRACK'; payload: { trackId: string } })
  | (MessageEnvelopeBase & {
      type: 'UPDATE_TRACK_OFFSET';
      payload: { slot: SubtitleSlot; offsetMs: number };
    });

export type MessagingErrorCode =
  | 'INVALID_MESSAGE'
  | 'NO_ACTIVE_TAB'
  | 'RESTRICTED_PAGE'
  | 'CONTENT_SCRIPT_UNAVAILABLE'
  | 'STALE_PLAYER_ID'
  | 'EXECUTION_FAILED';

export type ExtensionMessageResponse =
  | { ok: true; requestId?: string; type: 'PONG' }
  | { ok: true; requestId?: string; type: 'PLAYER_STATUS'; payload: PlayerStatusSnapshot }
  | { ok: true; requestId?: string; type: 'AVAILABLE_TRACKS'; payload: AvailableTrackSummary[] }
  | {
      ok: true;
      requestId?: string;
      type: 'ACTIVE_PLAYER';
      payload: { playerId: string | null; videoCount: number };
    }
  | { ok: true; requestId?: string; type?: 'ACK' }
  | { ok: false; requestId?: string; error: string; errorCode?: MessagingErrorCode };

const VALID_MESSAGE_TYPES = new Set<string>([
  'PING',
  'GET_PLAYER_STATUS',
  'GET_AVAILABLE_TRACKS',
  'GET_ACTIVE_PLAYER',
  'REFRESH_PLAYER',
  'SET_EXTENSION_ENABLED',
  'SET_PRIMARY_TRACK',
  'SET_SECONDARY_TRACK',
  'TOGGLE_PRIMARY',
  'TOGGLE_SECONDARY',
  'SET_TRACK_OFFSET',
  'SET_SUBTITLE_ORDER',
  'SETTINGS_UPDATED',
  'SYNC_LOCAL_TRACKS',
  'SELECT_TRACK',
  'IMPORT_LOCAL_TRACK',
  'REMOVE_LOCAL_TRACK',
  'UPDATE_TRACK_OFFSET',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Runtime guard validating incoming extension messages before execution.
 */
export function isValidExtensionMessage(input: unknown): input is ExtensionMessage {
  if (!isRecord(input)) return false;
  if (typeof input.type !== 'string' || !VALID_MESSAGE_TYPES.has(input.type)) {
    return false;
  }
  if (input.requestId !== undefined && typeof input.requestId !== 'string') {
    return false;
  }
  if (input.playerId !== undefined && typeof input.playerId !== 'string') {
    return false;
  }

  switch (input.type) {
    case 'PING':
    case 'GET_PLAYER_STATUS':
    case 'GET_AVAILABLE_TRACKS':
    case 'GET_ACTIVE_PLAYER':
    case 'REFRESH_PLAYER':
      return true;
    case 'SET_EXTENSION_ENABLED':
    case 'TOGGLE_PRIMARY':
    case 'TOGGLE_SECONDARY':
      return isRecord(input.payload) && typeof input.payload.enabled === 'boolean';
    case 'SET_PRIMARY_TRACK':
    case 'SET_SECONDARY_TRACK':
      return (
        isRecord(input.payload) &&
        (input.payload.trackId === null || typeof input.payload.trackId === 'string')
      );
    case 'SET_TRACK_OFFSET':
    case 'UPDATE_TRACK_OFFSET':
      return (
        isRecord(input.payload) &&
        (input.payload.slot === 'primary' || input.payload.slot === 'secondary') &&
        typeof input.payload.offsetMs === 'number' &&
        Number.isFinite(input.payload.offsetMs)
      );
    case 'SET_SUBTITLE_ORDER':
      return (
        isRecord(input.payload) &&
        (input.payload.order === 'primary-top' || input.payload.order === 'secondary-top')
      );
    case 'SETTINGS_UPDATED':
      return isRecord(input.payload);
    case 'SYNC_LOCAL_TRACKS':
      return (
        isRecord(input.payload) &&
        Array.isArray(input.payload.tracks) &&
        (input.payload.primaryTrackId === null || typeof input.payload.primaryTrackId === 'string') &&
        (input.payload.secondaryTrackId === null ||
          typeof input.payload.secondaryTrackId === 'string')
      );
    case 'SELECT_TRACK':
      return (
        isRecord(input.payload) &&
        (input.payload.slot === 'primary' || input.payload.slot === 'secondary') &&
        (input.payload.trackId === null || typeof input.payload.trackId === 'string')
      );
    case 'IMPORT_LOCAL_TRACK':
      return (
        isRecord(input.payload) &&
        (input.payload.slot === 'primary' || input.payload.slot === 'secondary') &&
        isRecord(input.payload.track)
      );
    case 'REMOVE_LOCAL_TRACK':
      return isRecord(input.payload) && typeof input.payload.trackId === 'string';
    default:
      return false;
  }
}
