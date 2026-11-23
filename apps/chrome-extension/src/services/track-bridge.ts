import type { SubtitleMeSettings, SubtitleTrack } from '@subtitleme/shared-types';
import type { TrackManager } from '@subtitleme/subtitle-core';
import type { LocalSubtitleRecord } from '@subtitleme/subtitle-storage';

export interface ActiveTrackSelection {
  primaryRecordId: string | null;
  secondaryRecordId: string | null;
}

/**
 * Generates a runtime player-scoped track ID distinct from the persistent
 * IndexedDB record ID, preventing state collisions across player sessions.
 */
export function getRuntimeTrackId(playerId: string, recordId: string): string {
  return `runtime:${playerId}:local:${recordId}`;
}

export function localRecordToSubtitleTrack(
  record: LocalSubtitleRecord,
  playerId: string,
  options: { offset?: number; enabled?: boolean } = {},
): SubtitleTrack {
  return {
    id: getRuntimeTrackId(playerId, record.id),
    language: record.language,
    label: record.fileName,
    source: 'local',
    cues: record.cues,
    offset: options.offset ?? 0,
    enabled: options.enabled ?? true,
  };
}

/**
 * Synchronizes persisted LocalSubtitleRecords and user selection into a live
 * runtime TrackManager without creating duplicate registrations or leaking
 * deleted tracks.
 */
export function syncLocalRecordsToTrackManager(
  manager: TrackManager,
  records: readonly LocalSubtitleRecord[],
  selection: ActiveTrackSelection,
  settings: SubtitleMeSettings,
): void {
  const validRuntimeIds = new Set<string>();

  for (const record of records) {
    const runtimeId = getRuntimeTrackId(manager.playerId, record.id);
    validRuntimeIds.add(runtimeId);

    const isPrimary = selection.primaryRecordId === record.id;
    const isSecondary = selection.secondaryRecordId === record.id;
    const offset = isPrimary
      ? settings.sync.primaryOffsetMs
      : isSecondary
        ? settings.sync.secondaryOffsetMs
        : 0;
    const enabled = isPrimary
      ? settings.general.enabled && settings.general.primaryEnabled
      : isSecondary
        ? settings.general.enabled && settings.general.secondaryEnabled
        : true;

    const existing = manager.getTrack(runtimeId);
    if (!existing) {
      manager.registerTrack(localRecordToSubtitleTrack(record, manager.playerId, { offset, enabled }));
    } else {
      manager.updateTrack(runtimeId, {
        language: record.language,
        label: record.fileName,
        offset,
        enabled,
      });
    }
  }

  // Remove stale local tracks that were deleted from IndexedDB
  for (const track of manager.listTracks()) {
    if (track.source === 'local' && !validRuntimeIds.has(track.id)) {
      manager.removeTrack(track.id);
    }
  }

  manager.setOrder(settings.general.subtitleOrder);

  const primaryRuntimeId =
    selection.primaryRecordId !== null
      ? getRuntimeTrackId(manager.playerId, selection.primaryRecordId)
      : null;
  const secondaryRuntimeId =
    selection.secondaryRecordId !== null
      ? getRuntimeTrackId(manager.playerId, selection.secondaryRecordId)
      : null;

  manager.selectTrack(
    'primary',
    primaryRuntimeId && validRuntimeIds.has(primaryRuntimeId) ? primaryRuntimeId : null,
  );
  manager.selectTrack(
    'secondary',
    secondaryRuntimeId && validRuntimeIds.has(secondaryRuntimeId) ? secondaryRuntimeId : null,
  );
}
