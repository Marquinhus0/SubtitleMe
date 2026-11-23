// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { IDBFactory } from 'fake-indexeddb';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import { createTrackManager } from '@subtitleme/subtitle-core';
import { createShadowSubtitleRenderer } from '@subtitleme/subtitle-renderer';
import {
  createIndexedDbSubtitleRepository,
  createMemoryStorageAdapter,
  createSettingsRepository,
} from '@subtitleme/subtitle-storage';
import { prepareSubtitleImport } from '../../apps/chrome-extension/src/services/subtitle-import';
import {
  setSubtitleRepository,
  useSubtitleStore,
} from '../../apps/chrome-extension/src/stores/subtitle.store';
import {
  setSettingsRepository,
  useSettingsStore,
} from '../../apps/chrome-extension/src/stores/settings.store';

describe('Integration — Local Files -> IndexedDB -> Pinia -> TrackManager -> Shadow Renderer', () => {
  it('imports two files, survives restart, rebuilds runtime tracks, renders both, and clears subtitles without erasing settings', async () => {
    const idbFactory = new IDBFactory();
    const settingsAdapter = createMemoryStorageAdapter();
    setSettingsRepository(createSettingsRepository(settingsAdapter));

    const repo1 = createIndexedDbSubtitleRepository({ idbFactory, dbName: 'integration-s5-db' });
    setSubtitleRepository(repo1);
    setActivePinia(createPinia());

    const settingsStore = useSettingsStore();
    await settingsStore.initialize();
    await settingsStore.setUiLanguage('pt-BR');
    await settingsStore.updateSync({ primaryOffsetMs: 0, secondaryOffsetMs: 500 });

    const subtitleStore = useSubtitleStore();
    await subtitleStore.loadSubtitles();

    const enFile = new File(
      ['1\n00:00:01,000 --> 00:00:04,000\nTwo languages.\n'],
      'movie-en.srt',
      { type: 'text/plain' },
    );
    const ptFile = new File(
      ['WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nDois idiomas.\n'],
      'movie-pt.vtt',
      { type: 'text/vtt' },
    );

    const prepEn = await prepareSubtitleImport(enFile);
    const prepPt = await prepareSubtitleImport(ptFile);
    expect(prepEn.ok && prepPt.ok).toBe(true);
    if (!prepEn.ok || !prepPt.ok) return;

    const savedEn = await subtitleStore.confirmImport(prepEn.pending, 'en', 'primary');
    const savedPt = await subtitleStore.confirmImport(prepPt.pending, 'pt-BR', 'secondary');
    expect(savedEn).not.toBeNull();
    expect(savedPt).not.toBeNull();
    repo1.close();

    // Simulate browser / extension restart with fresh Pinia & reopened IndexedDB
    const repo2 = createIndexedDbSubtitleRepository({ idbFactory, dbName: 'integration-s5-db' });
    setSubtitleRepository(repo2);
    setActivePinia(createPinia());

    const restartedSettings = useSettingsStore();
    await restartedSettings.initialize();
    const restartedSubtitles = useSubtitleStore();
    await restartedSubtitles.loadSubtitles();

    expect(restartedSubtitles.records).toHaveLength(2);
    const enRec = restartedSubtitles.records.find((r) => r.fileName === 'movie-en.srt');
    const ptRec = restartedSubtitles.records.find((r) => r.fileName === 'movie-pt.vtt');
    expect(enRec).toBeDefined();
    expect(ptRec).toBeDefined();

    // Connect to a fresh runtime TrackManager and Shadow DOM renderer
    const manager = createTrackManager('video-session-1');
    restartedSubtitles.attachTrackManager(manager, restartedSettings.settings);
    restartedSubtitles.selectRecordForSlot('primary', enRec?.id ?? null);
    restartedSubtitles.selectRecordForSlot('secondary', ptRec?.id ?? null);

    // Runtime IDs are distinct from persistent IndexedDB IDs
    expect(manager.getSelectedTrack('primary')?.id).not.toBe(enRec?.id);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const renderer = createShadowSubtitleRenderer({ playerId: 'video-session-1' });
    renderer.mount(container);

    // At 2000ms: both English (offset 0) and Portuguese (offset +500ms -> 1500..4500) are active
    const snapshot = manager.getActiveCuesAt(2000);
    renderer.render(snapshot, {
      appearance: DEFAULT_SETTINGS.appearance,
      order: 'primary-top',
      visible: true,
    });

    const shadow = renderer.getHostElement()?.shadowRoot;
    expect(shadow?.querySelector('[data-slot="primary"]')?.textContent).toBe('Two languages.');
    expect(shadow?.querySelector('[data-slot="secondary"]')?.textContent).toBe('Dois idiomas.');

    // Clearing all local subtitles must NOT erase unrelated extension settings
    await restartedSubtitles.clearAllSubtitles();
    expect(restartedSubtitles.records).toHaveLength(0);
    expect(restartedSettings.settings.general.uiLanguage).toBe('pt-BR');

    renderer.unmount();
    container.remove();
    repo2.close();
  });
});
