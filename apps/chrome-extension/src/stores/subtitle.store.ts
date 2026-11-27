import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  DEFAULT_SETTINGS,
  type PlayerStatusSnapshot,
  type SubtitleMeSettings,
  type SubtitleSlot,
} from '@subtitleme/shared-types';
import type { TrackManager } from '@subtitleme/subtitle-core';
import {
  SubtitleStorageError,
  type LocalSubtitleRecord,
  type LocalSubtitleRepository,
  type StorageErrorCode,
  type SubtitleStorageUsage,
} from '@subtitleme/subtitle-storage';
import { createExtensionSubtitleRepository } from '../services/subtitle-storage';
import {
  buildLocalSubtitleRecord,
  type PendingSubtitleImport,
} from '../services/subtitle-import';
import { syncLocalRecordsToTrackManager } from '../services/track-bridge';
import { sendActiveTabCommand } from '../services/tab-messaging';

export type ConnectionState = 'idle' | 'checking' | 'ready' | 'unavailable-page';

let repository: LocalSubtitleRepository = createExtensionSubtitleRepository();

export function setSubtitleRepository(customRepository: LocalSubtitleRepository): void {
  repository = customRepository;
}

export function resetSubtitleRepository(): void {
  repository = createExtensionSubtitleRepository();
}

export const useSubtitleStore = defineStore('subtitle', () => {
  const records = ref<LocalSubtitleRecord[]>([]);
  const primaryRecordId = ref<string | null>(null);
  const secondaryRecordId = ref<string | null>(null);
  const playerStatus = ref<PlayerStatusSnapshot | null>(null);
  const connectionState = ref<ConnectionState>('idle');
  const loading = ref(false);
  const saving = ref(false);
  const errorCode = ref<StorageErrorCode | null>(null);
  const storageUsage = ref<SubtitleStorageUsage>({
    recordCount: 0,
    totalCues: 0,
    estimatedBytes: 0,
  });

  let activeManager: TrackManager | null = null;
  let lastSettings: SubtitleMeSettings = DEFAULT_SETTINGS;

  const existingHashes = computed(() => new Set(records.value.map((r) => r.contentHash)));

  const primaryRecord = computed(
    () => records.value.find((r) => r.id === primaryRecordId.value) ?? null,
  );

  const secondaryRecord = computed(
    () => records.value.find((r) => r.id === secondaryRecordId.value) ?? null,
  );

  function syncRuntimeManager(): void {
    if (!activeManager) return;
    syncLocalRecordsToTrackManager(
      activeManager,
      records.value,
      {
        primaryRecordId: primaryRecordId.value,
        secondaryRecordId: secondaryRecordId.value,
      },
      lastSettings,
    );
  }

  async function refreshStorageUsage(): Promise<void> {
    try {
      storageUsage.value = await repository.getStorageUsage();
    } catch {
      // Keep previous usage snapshot if calculation fails
    }
  }

  function captureStorageError(error: unknown, fallback: StorageErrorCode): void {
    if (error instanceof SubtitleStorageError) {
      errorCode.value = error.code;
    } else {
      errorCode.value = fallback;
    }
  }

  async function loadSubtitles(): Promise<void> {
    loading.value = true;
    errorCode.value = null;
    try {
      const loaded = await repository.getAllSubtitles();
      records.value = loaded;

      // Clear stale selections that no longer exist in IndexedDB
      const idSet = new Set(loaded.map((r) => r.id));
      if (primaryRecordId.value && !idSet.has(primaryRecordId.value)) {
        primaryRecordId.value = null;
      }
      if (secondaryRecordId.value && !idSet.has(secondaryRecordId.value)) {
        secondaryRecordId.value = null;
      }

      await refreshStorageUsage();
      syncRuntimeManager();
    } catch (error) {
      captureStorageError(error, 'READ_FAILED');
    } finally {
      loading.value = false;
    }
  }

  async function confirmImport(
    pending: PendingSubtitleImport,
    language: string,
    assignSlot?: SubtitleSlot,
  ): Promise<LocalSubtitleRecord | null> {
    if (pending.isDuplicate || existingHashes.value.has(pending.contentHash)) {
      errorCode.value = 'DUPLICATE_IMPORT';
      return null;
    }

    saving.value = true;
    errorCode.value = null;
    try {
      const candidate = buildLocalSubtitleRecord(pending, language);
      const saved = await repository.saveSubtitle(candidate);
      records.value = [saved, ...records.value];

      if (assignSlot === 'primary') {
        primaryRecordId.value = saved.id;
      } else if (assignSlot === 'secondary') {
        secondaryRecordId.value = saved.id;
      }

      await refreshStorageUsage();
      syncRuntimeManager();
      return saved;
    } catch (error) {
      captureStorageError(error, 'WRITE_FAILED');
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateLanguage(id: string, language: string): Promise<boolean> {
    saving.value = true;
    errorCode.value = null;
    try {
      const updated = await repository.updateSubtitle(id, { language });
      records.value = records.value.map((r) => (r.id === id ? updated : r));
      syncRuntimeManager();
      return true;
    } catch (error) {
      captureStorageError(error, 'WRITE_FAILED');
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function removeSubtitle(id: string): Promise<boolean> {
    saving.value = true;
    errorCode.value = null;
    try {
      const removed = await repository.deleteSubtitle(id);
      if (removed) {
        records.value = records.value.filter((r) => r.id !== id);
        if (primaryRecordId.value === id) primaryRecordId.value = null;
        if (secondaryRecordId.value === id) secondaryRecordId.value = null;
        await refreshStorageUsage();
        syncRuntimeManager();
      }
      return removed;
    } catch (error) {
      captureStorageError(error, 'DELETE_FAILED');
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function clearAllSubtitles(): Promise<boolean> {
    saving.value = true;
    errorCode.value = null;
    try {
      await repository.clearAllSubtitles();
      records.value = [];
      primaryRecordId.value = null;
      secondaryRecordId.value = null;
      storageUsage.value = { recordCount: 0, totalCues: 0, estimatedBytes: 0 };
      syncRuntimeManager();
      return true;
    } catch (error) {
      captureStorageError(error, 'DELETE_FAILED');
      return false;
    } finally {
      saving.value = false;
    }
  }

  function selectRecordForSlot(slot: SubtitleSlot, recordId: string | null): boolean {
    if (recordId !== null && !records.value.some((r) => r.id === recordId)) {
      return false;
    }
    if (slot === 'primary') {
      primaryRecordId.value = recordId;
    } else {
      secondaryRecordId.value = recordId;
    }
    syncRuntimeManager();
    return true;
  }

  function detachSlot(slot: SubtitleSlot): void {
    selectRecordForSlot(slot, null);
  }

  function attachTrackManager(manager: TrackManager, settings: SubtitleMeSettings): void {
    activeManager = manager;
    lastSettings = settings;
    syncRuntimeManager();
  }

  function syncSettingsToManager(settings: SubtitleMeSettings): void {
    lastSettings = settings;
    syncRuntimeManager();
  }

  function detachTrackManager(): void {
    activeManager = null;
  }

  function getSlotSource(slot: SubtitleSlot): 'local' | 'player' | 'none' {
    const selected = slot === 'primary' ? primaryRecord.value : secondaryRecord.value;
    if (selected) return 'local';
    const status = playerStatus.value;
    if (!status || status.nativeTracks.length === 0) return 'none';
    const selectedTrackId =
      slot === 'primary' ? status.selectedPrimaryTrackId : status.selectedSecondaryTrackId;
    if (selectedTrackId && !selectedTrackId.startsWith('runtime:')) {
      return 'player';
    }
    return 'none';
  }

  function setPlayerStatus(snapshot: PlayerStatusSnapshot | null): void {
    playerStatus.value = snapshot;
    connectionState.value = snapshot ? 'ready' : 'idle';
  }

  function clearError(): void {
    errorCode.value = null;
  }

  /**
   * Queries the active tab's content script for genuine HTML5 player status
   * using activeTab on-demand injection via sendActiveTabCommand.
   */
  async function refreshPlayerStatus(): Promise<void> {
    connectionState.value = 'checking';
    const response = await sendActiveTabCommand({ type: 'GET_PLAYER_STATUS' });

    if (response.ok && 'type' in response && response.type === 'PLAYER_STATUS') {
      playerStatus.value = response.payload;
      connectionState.value = 'ready';
      return;
    }

    playerStatus.value = null;
    if (!response.ok && response.errorCode === 'RESTRICTED_PAGE') {
      connectionState.value = 'unavailable-page';
    } else {
      connectionState.value = 'idle';
    }
  }

  /**
   * Pushes persisted local tracks and current primary/secondary selection to
   * the active tab's content script so the live Shadow DOM overlay updates.
   */
  async function pushLocalTracksToActiveTab(): Promise<boolean> {
    const tracks = records.value.map((rec) => ({
      id: rec.id,
      language: rec.language,
      label: rec.fileName,
      source: 'local' as const,
      cues: rec.cues,
      offset: 0,
      enabled: true,
    }));

    const response = await sendActiveTabCommand({
      type: 'SYNC_LOCAL_TRACKS',
      payload: {
        tracks,
        primaryTrackId: primaryRecordId.value,
        secondaryTrackId: secondaryRecordId.value,
      },
    });
    return response.ok;
  }

  return {
    records,
    primaryRecordId,
    secondaryRecordId,
    primaryRecord,
    secondaryRecord,
    existingHashes,
    playerStatus,
    connectionState,
    loading,
    saving,
    errorCode,
    storageUsage,
    loadSubtitles,
    confirmImport,
    updateLanguage,
    removeSubtitle,
    clearAllSubtitles,
    selectRecordForSlot,
    detachSlot,
    attachTrackManager,
    syncSettingsToManager,
    detachTrackManager,
    getSlotSource,
    setPlayerStatus,
    clearError,
    refreshPlayerStatus,
    pushLocalTracksToActiveTab,
  };
});
