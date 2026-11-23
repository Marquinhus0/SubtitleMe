<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { SubtitleSlot } from '@subtitleme/shared-types';
import type { StorageErrorCode } from '@subtitleme/subtitle-storage';
import { useSettingsStore } from '../stores/settings.store';
import { useSubtitleStore } from '../stores/subtitle.store';
import { useI18n, type TranslationKey } from '../i18n';
import BrandLogo from '../components/BrandLogo.vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import VideoStatus from '../components/VideoStatus.vue';
import LanguageSelector from '../components/LanguageSelector.vue';
import FileImporter, { type ConfirmedSubtitleImport } from '../components/FileImporter.vue';
import SubtitlePreview from '../components/SubtitlePreview.vue';
import SubtitleControls from '../components/SubtitleControls.vue';

const settingsStore = useSettingsStore();
const subtitleStore = useSubtitleStore();
const { t } = useI18n();

const extensionEnabled = computed(() => settingsStore.settings.general.enabled);

function storageErrorText(code: StorageErrorCode): string {
  return t(`storage.error.${code}` as TranslationKey);
}

function sourceLabel(slot: SubtitleSlot): string {
  const source = subtitleStore.getSlotSource(slot);
  if (source === 'local') return t('common.localFile');
  if (source === 'player') return t('common.nativeTrack');
  return t('common.none');
}

async function handleFileConfirm(
  slot: SubtitleSlot,
  payload: ConfirmedSubtitleImport,
): Promise<void> {
  const saved = await subtitleStore.confirmImport(payload.pending, payload.language, slot);
  if (saved) {
    await subtitleStore.pushLocalTracksToActiveTab();
    await subtitleStore.refreshPlayerStatus();
  }
}

async function onSelectLocalRecord(slot: SubtitleSlot, event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value;
  subtitleStore.selectRecordForSlot(slot, value || null);
  await subtitleStore.pushLocalTracksToActiveTab();
  await subtitleStore.refreshPlayerStatus();
}

function openOptions(): void {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
}

onMounted(async () => {
  await Promise.all([
    settingsStore.initialize(),
    subtitleStore.loadSubtitles(),
    subtitleStore.refreshPlayerStatus(),
  ]);
});
</script>

<template>
  <main
    class="flex w-[380px] max-w-full min-w-[300px] flex-col gap-3 p-4"
    style="background-color: var(--sm-bg); color: var(--sm-text-primary)"
  >
    <!-- Header -->
    <header class="flex items-center justify-between gap-2 pb-1">
      <div class="flex items-center gap-2.5">
        <BrandLogo :size="30" />
        <div>
          <h1 class="text-sm font-semibold tracking-tight" style="color: var(--sm-text-primary)">
            {{ t('app.name') }}
          </h1>
          <p class="text-[11px]" style="color: var(--sm-text-secondary)">
            {{ t('app.tagline') }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <ToggleSwitch
          :model-value="extensionEnabled"
          :label="t('popup.extensionToggle')"
          compact
          @update:model-value="settingsStore.setEnabled"
        />
        <button
          type="button"
          class="sm-btn sm-btn-secondary px-2.5 py-1.5 text-xs"
          :aria-label="t('common.settings')"
          @click="openOptions"
        >
          {{ t('common.settings') }}
        </button>
      </div>
    </header>

    <!-- Storage errors if any -->
    <p v-if="settingsStore.storageError" role="alert" class="sm-alert sm-alert-error">
      {{ t('common.storageError') }}
    </p>
    <p v-if="subtitleStore.errorCode" role="alert" class="sm-alert sm-alert-error">
      {{ storageErrorText(subtitleStore.errorCode) }}
    </p>

    <!-- Player Status -->
    <VideoStatus
      :snapshot="subtitleStore.playerStatus"
      :connection-state="subtitleStore.connectionState"
      :extension-enabled="extensionEnabled"
      @refresh="subtitleStore.refreshPlayerStatus"
    />

    <!-- Primary Subtitle Card -->
    <section class="sm-card flex flex-col gap-2.5 p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" style="background-color: var(--sm-primary)" />
          <h2 class="text-xs font-semibold" style="color: var(--sm-text-primary)">
            {{ t('popup.primarySubtitle') }}
          </h2>
        </div>
        <ToggleSwitch
          :model-value="settingsStore.settings.general.primaryEnabled"
          :label="t('popup.primarySubtitle')"
          :disabled="!extensionEnabled"
          compact
          @update:model-value="settingsStore.setTrackEnabled('primary', $event)"
        />
      </div>

      <LanguageSelector
        :label="t('popup.primaryLanguage')"
        :model-value="settingsStore.settings.general.defaultPrimaryLanguage"
        :disabled="!extensionEnabled || !settingsStore.settings.general.primaryEnabled"
        @update:model-value="settingsStore.updateGeneral({ defaultPrimaryLanguage: $event })"
      />

      <div v-if="subtitleStore.records.length > 0" class="flex flex-col gap-1">
        <label class="text-[11px] font-medium" style="color: var(--sm-text-secondary)">
          {{ t('popup.selectLocalFile') }}
          <select
            data-testid="popup-primary-record-select"
            class="sm-select mt-1 text-xs"
            :disabled="!extensionEnabled"
            :value="subtitleStore.primaryRecordId ?? ''"
            @change="onSelectLocalRecord('primary', $event)"
          >
            <option value="">{{ t('popup.noLocalAssigned') }}</option>
            <option v-for="rec in subtitleStore.records" :key="rec.id" :value="rec.id">
              {{ rec.fileName }} ({{ rec.language }} • {{ rec.format.toUpperCase() }})
            </option>
          </select>
        </label>
      </div>

      <div class="flex items-center justify-between gap-2 text-xs">
        <span style="color: var(--sm-text-secondary)">
          {{ t('common.source') }}:
          <strong style="color: var(--sm-text-primary)">{{ sourceLabel('primary') }}</strong>
        </span>
      </div>

      <FileImporter
        compact
        :disabled="!extensionEnabled"
        :saving="subtitleStore.saving"
        :default-language="settingsStore.settings.general.defaultPrimaryLanguage"
        :existing-hashes="subtitleStore.existingHashes"
        :button-label="t('common.importFile')"
        @confirm="handleFileConfirm('primary', $event)"
      />
    </section>

    <!-- Secondary Subtitle Card -->
    <section class="sm-card flex flex-col gap-2.5 p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" style="background-color: var(--sm-secondary)" />
          <h2 class="text-xs font-semibold" style="color: var(--sm-text-primary)">
            {{ t('popup.secondarySubtitle') }}
          </h2>
        </div>
        <ToggleSwitch
          :model-value="settingsStore.settings.general.secondaryEnabled"
          :label="t('popup.secondarySubtitle')"
          accent="secondary"
          :disabled="!extensionEnabled"
          compact
          @update:model-value="settingsStore.setTrackEnabled('secondary', $event)"
        />
      </div>

      <LanguageSelector
        :label="t('popup.secondaryLanguage')"
        :model-value="settingsStore.settings.general.defaultSecondaryLanguage"
        :disabled="!extensionEnabled || !settingsStore.settings.general.secondaryEnabled"
        @update:model-value="settingsStore.updateGeneral({ defaultSecondaryLanguage: $event })"
      />

      <div v-if="subtitleStore.records.length > 0" class="flex flex-col gap-1">
        <label class="text-[11px] font-medium" style="color: var(--sm-text-secondary)">
          {{ t('popup.selectLocalFile') }}
          <select
            data-testid="popup-secondary-record-select"
            class="sm-select mt-1 text-xs"
            :disabled="!extensionEnabled"
            :value="subtitleStore.secondaryRecordId ?? ''"
            @change="onSelectLocalRecord('secondary', $event)"
          >
            <option value="">{{ t('popup.noLocalAssigned') }}</option>
            <option v-for="rec in subtitleStore.records" :key="rec.id" :value="rec.id">
              {{ rec.fileName }} ({{ rec.language }} • {{ rec.format.toUpperCase() }})
            </option>
          </select>
        </label>
      </div>

      <div class="flex items-center justify-between gap-2 text-xs">
        <span style="color: var(--sm-text-secondary)">
          {{ t('common.source') }}:
          <strong style="color: var(--sm-text-primary)">{{ sourceLabel('secondary') }}</strong>
        </span>
      </div>

      <FileImporter
        compact
        :disabled="!extensionEnabled"
        :saving="subtitleStore.saving"
        :default-language="settingsStore.settings.general.defaultSecondaryLanguage"
        :existing-hashes="subtitleStore.existingHashes"
        :button-label="t('common.importFile')"
        @confirm="handleFileConfirm('secondary', $event)"
      />
    </section>

    <p
      v-if="!subtitleStore.loading && subtitleStore.records.length === 0"
      class="sm-alert sm-alert-info text-[11px]"
    >
      {{ t('popup.noLocalLibrary') }}
    </p>

    <!-- Live Compact Preview -->
    <SubtitlePreview
      compact
      :appearance="settingsStore.settings.appearance"
      :order="settingsStore.settings.general.subtitleOrder"
      :primary-visible="extensionEnabled && settingsStore.settings.general.primaryEnabled"
      :secondary-visible="extensionEnabled && settingsStore.settings.general.secondaryEnabled"
    />

    <!-- Quick Controls -->
    <SubtitleControls
      :font-size="settingsStore.settings.appearance.fontSize"
      :primary-visible="settingsStore.settings.general.primaryEnabled"
      :secondary-visible="settingsStore.settings.general.secondaryEnabled"
      :primary-offset-ms="settingsStore.settings.sync.primaryOffsetMs"
      :secondary-offset-ms="settingsStore.settings.sync.secondaryOffsetMs"
      :disabled="!extensionEnabled"
      @update:font-size="settingsStore.updateAppearance({ fontSize: $event })"
      @toggle:visibility="settingsStore.setTrackEnabled"
      @adjust:offset="settingsStore.adjustOffset"
      @reset:offset="settingsStore.resetOffset"
    />

    <!-- Footer -->
    <footer class="flex flex-col gap-2 pt-1">
      <button type="button" class="sm-btn sm-btn-primary w-full py-2" @click="openOptions">
        {{ t('common.openSettings') }}
      </button>
      <p class="text-center text-[11px]" style="color: var(--sm-text-muted)">
        {{ t('popup.sprintNotice') }}
      </p>
    </footer>
  </main>
</template>
