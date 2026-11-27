<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  SETTINGS_CONSTRAINTS,
  SUBTITLE_FONT_FAMILIES,
  SUBTITLE_LANGUAGES,
  type InterfaceLanguage,
  type SubtitleOrder,
  type SubtitlePosition,
  type SyncMode,
} from '@subtitleme/shared-types';
import { formatTimestamp } from '@subtitleme/subtitle-parser';
import type { StorageErrorCode } from '@subtitleme/subtitle-storage';
import { useSettingsStore } from '../stores/settings.store';
import { useSubtitleStore } from '../stores/subtitle.store';
import { useI18n, type TranslationKey } from '../i18n';
import { formatDurationMs } from '../services/subtitle-import';
import BrandLogo from '../components/BrandLogo.vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import RangeSlider from '../components/RangeSlider.vue';
import LanguageSelector from '../components/LanguageSelector.vue';
import SubtitlePreview from '../components/SubtitlePreview.vue';
import FileImporter, { type ConfirmedSubtitleImport } from '../components/FileImporter.vue';

type SettingsSectionId =
  | 'general'
  | 'languages'
  | 'appearance'
  | 'synchronization'
  | 'localFiles'
  | 'shortcuts'
  | 'privacy'
  | 'about';

interface NavItem {
  id: SettingsSectionId;
  labelKey: TranslationKey;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'general', labelKey: 'settings.nav.general' },
  { id: 'languages', labelKey: 'settings.nav.languages' },
  { id: 'appearance', labelKey: 'settings.nav.appearance' },
  { id: 'synchronization', labelKey: 'settings.nav.synchronization' },
  { id: 'localFiles', labelKey: 'settings.nav.localFiles' },
  { id: 'shortcuts', labelKey: 'settings.nav.shortcuts' },
  { id: 'privacy', labelKey: 'settings.nav.privacy' },
  { id: 'about', labelKey: 'settings.nav.about' },
];

const settingsStore = useSettingsStore();
const subtitleStore = useSubtitleStore();
const { t } = useI18n();

const activeSection = ref<SettingsSectionId>('general');
const confirmReset = ref(false);
const resetFeedback = ref(false);
const clearDataFeedback = ref(false);
const importSuccessMessage = ref<string | null>(null);
const previewRecordId = ref<string | null>(null);
const confirmRemoveId = ref<string | null>(null);
const confirmClearSubtitles = ref(false);
const clearedSubtitlesFeedback = ref(false);

const shortcutRows = computed(() => [
  {
    action: t('settings.shortcuts.toggleExtension'),
    keys: settingsStore.settings.shortcuts.toggleExtension,
  },
  {
    action: t('settings.shortcuts.togglePrimary'),
    keys: settingsStore.settings.shortcuts.togglePrimary,
  },
  {
    action: t('settings.shortcuts.toggleSecondary'),
    keys: settingsStore.settings.shortcuts.toggleSecondary,
  },
  {
    action: t('settings.shortcuts.increaseFontSize'),
    keys: settingsStore.settings.shortcuts.increaseFontSize,
  },
  {
    action: t('settings.shortcuts.decreaseFontSize'),
    keys: settingsStore.settings.shortcuts.decreaseFontSize,
  },
  {
    action: t('settings.shortcuts.adjustSyncForward'),
    keys: settingsStore.settings.shortcuts.adjustSyncForward,
  },
  {
    action: t('settings.shortcuts.adjustSyncBackward'),
    keys: settingsStore.settings.shortcuts.adjustSyncBackward,
  },
]);

function storageErrorText(code: StorageErrorCode): string {
  return t(`storage.error.${code}` as TranslationKey);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatOffset(ms: number): string {
  if (ms === 0) return '0 ms';
  return `${ms > 0 ? '+' : ''}${ms} ms`;
}

function onUiLanguageChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as InterfaceLanguage;
  void settingsStore.setUiLanguage(value);
}

function onSubtitleOrderChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as SubtitleOrder;
  void settingsStore.updateGeneral({ subtitleOrder: value });
}

function onFontFamilyChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  void settingsStore.updateAppearance({ fontFamily: value });
}

function onPositionChange(position: SubtitlePosition): void {
  void settingsStore.updateAppearance({ position });
}

function onSyncModeChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as SyncMode;
  void settingsStore.updateSync({ syncMode: value });
}

function onColorInput(field: 'primaryColor' | 'secondaryColor', event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  void settingsStore.updateAppearance({ [field]: value });
}

async function handleLocalImportConfirm(payload: ConfirmedSubtitleImport): Promise<void> {
  importSuccessMessage.value = null;
  clearedSubtitlesFeedback.value = false;
  const saved = await subtitleStore.confirmImport(payload.pending, payload.language);
  if (saved) {
    importSuccessMessage.value = t('importer.success', {
      fileName: saved.fileName,
      cues: saved.cueCount,
    });
  }
}

async function handleRemoveRecord(id: string): Promise<void> {
  if (confirmRemoveId.value !== id) {
    confirmRemoveId.value = id;
    return;
  }
  await subtitleStore.removeSubtitle(id);
  confirmRemoveId.value = null;
  if (previewRecordId.value === id) {
    previewRecordId.value = null;
  }
}

async function handleClearAllSubtitles(): Promise<void> {
  if (!confirmClearSubtitles.value) {
    confirmClearSubtitles.value = true;
    clearedSubtitlesFeedback.value = false;
    return;
  }
  const ok = await subtitleStore.clearAllSubtitles();
  confirmClearSubtitles.value = false;
  previewRecordId.value = null;
  importSuccessMessage.value = null;
  if (ok) {
    clearedSubtitlesFeedback.value = true;
  }
}

async function handleResetClick(): Promise<void> {
  if (!confirmReset.value) {
    confirmReset.value = true;
    resetFeedback.value = false;
    return;
  }
  await settingsStore.resetToDefaults();
  confirmReset.value = false;
  resetFeedback.value = true;
}

async function handleClearAllData(): Promise<void> {
  await settingsStore.clearAllData();
  await subtitleStore.clearAllSubtitles();
  clearDataFeedback.value = true;
}

onMounted(async () => {
  await Promise.all([settingsStore.initialize(), subtitleStore.loadSubtitles()]);
});
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--sm-bg); color: var(--sm-text-primary)">
    <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:px-8 md:py-8">
      <!-- Sidebar Navigation -->
      <aside class="w-full shrink-0 md:w-60">
        <div class="sm-card sticky top-6 flex flex-col gap-4 p-4">
          <div class="flex items-center gap-3 border-b pb-3" style="border-color: var(--sm-border)">
            <BrandLogo :size="32" />
            <div>
              <h1 class="text-base font-semibold tracking-tight" style="color: var(--sm-text-primary)">
                {{ t('app.name') }}
              </h1>
              <p class="text-[11px]" style="color: var(--sm-text-secondary)">
                {{ t('app.tagline') }}
              </p>
            </div>
          </div>

          <nav :aria-label="t('settings.title')" class="flex flex-row gap-1 overflow-x-auto md:flex-col">
            <button
              v-for="item in NAV_ITEMS"
              :key="item.id"
              type="button"
              :data-testid="`settings-nav-${item.id}`"
              :aria-current="activeSection === item.id ? 'page' : undefined"
              class="shrink-0 rounded-md px-3 py-2 text-left text-xs font-medium transition-colors"
              :style="{
                backgroundColor:
                  activeSection === item.id ? 'var(--sm-primary-muted)' : 'transparent',
                color:
                  activeSection === item.id ? 'var(--sm-primary-text)' : 'var(--sm-text-secondary)',
              }"
              @click="activeSection = item.id"
            >
              {{ t(item.labelKey) }}
            </button>
          </nav>

          <div class="hidden border-t pt-3 text-[11px] md:block" style="border-color: var(--sm-border); color: var(--sm-text-muted)">
            {{ t('app.version', { version: '1.0.0' }) }}
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex min-w-0 flex-1 flex-col gap-5">
        <p v-if="settingsStore.storageError" role="alert" class="sm-alert sm-alert-error">
          {{ t('common.storageError') }}
        </p>

        <!-- 1. GENERAL -->
        <section
          v-if="activeSection === 'general'"
          data-testid="section-general"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="border-b pb-4" style="border-color: var(--sm-border)">
            <h2 class="text-lg font-semibold">{{ t('settings.general.title') }}</h2>
            <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.general.description') }}
            </p>
          </header>

          <ToggleSwitch
            :model-value="settingsStore.settings.general.enabled"
            :label="t('settings.general.enableLabel')"
            :description="t('settings.general.enableDesc')"
            @update:model-value="settingsStore.setEnabled"
          />

          <div class="flex flex-col gap-1.5 border-t pt-4" style="border-color: var(--sm-border)">
            <label for="ui-language-select" class="text-sm font-medium">
              {{ t('settings.general.uiLanguageLabel') }}
            </label>
            <p class="text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.general.uiLanguageDesc') }}
            </p>
            <select
              id="ui-language-select"
              data-testid="ui-language-select"
              class="sm-select mt-1 max-w-xs"
              :value="settingsStore.settings.general.uiLanguage"
              @change="onUiLanguageChange"
            >
              <option value="en">English (en)</option>
              <option value="pt-BR">Português (Brasil) (pt-BR)</option>
            </select>
          </div>

          <div class="border-t pt-4" style="border-color: var(--sm-border)">
            <ToggleSwitch
              :model-value="settingsStore.settings.general.rememberPreferences"
              :label="t('settings.general.rememberLabel')"
              :description="t('settings.general.rememberDesc')"
              @update:model-value="settingsStore.updateGeneral({ rememberPreferences: $event })"
            />
          </div>

          <div class="flex flex-col gap-3 border-t pt-4" style="border-color: var(--sm-border)">
            <div>
              <h3 class="text-sm font-medium">{{ t('settings.general.resetTitle') }}</h3>
              <p class="mt-0.5 text-xs" style="color: var(--sm-text-secondary)">
                {{ t('settings.general.resetDesc') }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-testid="reset-settings-button"
                class="sm-btn sm-btn-danger"
                @click="handleResetClick"
              >
                {{ confirmReset ? t('settings.general.resetConfirm') : t('settings.general.resetButton') }}
              </button>
              <button
                v-if="confirmReset"
                type="button"
                class="sm-btn sm-btn-ghost"
                @click="confirmReset = false"
              >
                {{ t('importer.cancelImport') }}
              </button>
            </div>
            <p v-if="resetFeedback" role="status" class="sm-alert sm-alert-success">
              {{ t('settings.general.resetDone') }}
            </p>
          </div>
        </section>

        <!-- 2. LANGUAGES -->
        <section
          v-if="activeSection === 'languages'"
          data-testid="section-languages"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="border-b pb-4" style="border-color: var(--sm-border)">
            <h2 class="text-lg font-semibold">{{ t('settings.languages.title') }}</h2>
            <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.languages.description') }}
            </p>
          </header>

          <div class="grid gap-4 sm:grid-cols-2">
            <LanguageSelector
              :label="t('settings.languages.primaryLabel')"
              :model-value="settingsStore.settings.general.defaultPrimaryLanguage"
              @update:model-value="settingsStore.updateGeneral({ defaultPrimaryLanguage: $event })"
            />
            <LanguageSelector
              :label="t('settings.languages.secondaryLabel')"
              :model-value="settingsStore.settings.general.defaultSecondaryLanguage"
              @update:model-value="settingsStore.updateGeneral({ defaultSecondaryLanguage: $event })"
            />
          </div>

          <div>
            <button
              type="button"
              class="sm-btn sm-btn-secondary"
              @click="settingsStore.swapLanguages"
            >
              {{ t('settings.languages.swapButton') }}
            </button>
          </div>

          <div class="flex flex-col gap-1.5 border-t pt-4" style="border-color: var(--sm-border)">
            <label for="subtitle-order-select" class="text-sm font-medium">
              {{ t('settings.languages.orderLabel') }}
            </label>
            <select
              id="subtitle-order-select"
              class="sm-select max-w-sm"
              :value="settingsStore.settings.general.subtitleOrder"
              @change="onSubtitleOrderChange"
            >
              <option value="primary-top">{{ t('settings.languages.orderPrimaryTop') }}</option>
              <option value="secondary-top">{{ t('settings.languages.orderSecondaryTop') }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-3 border-t pt-4" style="border-color: var(--sm-border)">
            <ToggleSwitch
              :model-value="settingsStore.settings.general.primaryEnabled"
              :label="t('settings.languages.primaryVisibility')"
              @update:model-value="settingsStore.setTrackEnabled('primary', $event)"
            />
            <ToggleSwitch
              :model-value="settingsStore.settings.general.secondaryEnabled"
              :label="t('settings.languages.secondaryVisibility')"
              accent="secondary"
              @update:model-value="settingsStore.setTrackEnabled('secondary', $event)"
            />
          </div>
        </section>

        <!-- 3. APPEARANCE -->
        <section
          v-if="activeSection === 'appearance'"
          data-testid="section-appearance"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="border-b pb-4" style="border-color: var(--sm-border)">
            <h2 class="text-lg font-semibold">{{ t('settings.appearance.title') }}</h2>
            <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.appearance.description') }}
            </p>
          </header>

          <!-- Live Subtitle Preview -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wide" style="color: var(--sm-text-secondary)">
                {{ t('preview.title') }}
              </span>
              <span class="text-[11px]" style="color: var(--sm-text-muted)">
                {{ t('preview.subtitle') }}
              </span>
            </div>
            <SubtitlePreview
              :appearance="settingsStore.settings.appearance"
              :order="settingsStore.settings.general.subtitleOrder"
              :primary-visible="settingsStore.settings.general.primaryEnabled"
              :secondary-visible="settingsStore.settings.general.secondaryEnabled"
            />
          </div>

          <!-- Typography & Position -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="font-family-select" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
                {{ t('settings.appearance.fontFamily') }}
              </label>
              <select
                id="font-family-select"
                class="sm-select"
                :value="settingsStore.settings.appearance.fontFamily"
                @change="onFontFamilyChange"
              >
                <option
                  v-for="font in SUBTITLE_FONT_FAMILIES"
                  :key="font.id"
                  :value="font.stack"
                >
                  {{ font.label }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <span id="appearance-position-label" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
                {{ t('settings.appearance.position') }}
              </span>
              <div role="group" aria-labelledby="appearance-position-label" class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="sm-btn"
                  :class="
                    settingsStore.settings.appearance.position === 'bottom'
                      ? 'sm-btn-primary'
                      : 'sm-btn-secondary'
                  "
                  :aria-pressed="settingsStore.settings.appearance.position === 'bottom'"
                  @click="onPositionChange('bottom')"
                >
                  {{ t('preview.positionBottom') }}
                </button>
                <button
                  type="button"
                  class="sm-btn"
                  :class="
                    settingsStore.settings.appearance.position === 'top'
                      ? 'sm-btn-primary'
                      : 'sm-btn-secondary'
                  "
                  :aria-pressed="settingsStore.settings.appearance.position === 'top'"
                  @click="onPositionChange('top')"
                >
                  {{ t('preview.positionTop') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Sliders -->
          <div class="grid gap-4 sm:grid-cols-3">
            <RangeSlider
              :model-value="settingsStore.settings.appearance.fontSize"
              :label="t('settings.appearance.fontSize')"
              :min="SETTINGS_CONSTRAINTS.fontSize.min"
              :max="SETTINGS_CONSTRAINTS.fontSize.max"
              :step="SETTINGS_CONSTRAINTS.fontSize.step"
              :display-value="`${settingsStore.settings.appearance.fontSize} px`"
              @update:model-value="settingsStore.updateAppearance({ fontSize: $event })"
            />

            <RangeSlider
              :model-value="settingsStore.settings.appearance.backgroundOpacity"
              :label="t('settings.appearance.backgroundOpacity')"
              :min="SETTINGS_CONSTRAINTS.backgroundOpacity.min"
              :max="SETTINGS_CONSTRAINTS.backgroundOpacity.max"
              :step="SETTINGS_CONSTRAINTS.backgroundOpacity.step"
              :display-value="`${Math.round(settingsStore.settings.appearance.backgroundOpacity * 100)}%`"
              @update:model-value="settingsStore.updateAppearance({ backgroundOpacity: $event })"
            />

            <RangeSlider
              :model-value="settingsStore.settings.appearance.lineSpacing"
              :label="t('settings.appearance.lineSpacing')"
              :min="SETTINGS_CONSTRAINTS.lineSpacing.min"
              :max="SETTINGS_CONSTRAINTS.lineSpacing.max"
              :step="SETTINGS_CONSTRAINTS.lineSpacing.step"
              :display-value="settingsStore.settings.appearance.lineSpacing.toFixed(2)"
              @update:model-value="settingsStore.updateAppearance({ lineSpacing: $event })"
            />
          </div>

          <!-- Colors -->
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="sm-card-elevated flex items-center justify-between gap-3 p-3">
              <span class="text-xs font-medium" style="color: var(--sm-text-primary)">
                {{ t('settings.appearance.primaryColor') }}
              </span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs" style="color: var(--sm-text-secondary)">
                  {{ settingsStore.settings.appearance.primaryColor }}
                </span>
                <input
                  type="color"
                  class="h-7 w-9 cursor-pointer rounded border bg-transparent"
                  :value="settingsStore.settings.appearance.primaryColor"
                  :aria-label="t('settings.appearance.primaryColor')"
                  @input="onColorInput('primaryColor', $event)"
                >
              </div>
            </label>

            <label class="sm-card-elevated flex items-center justify-between gap-3 p-3">
              <span class="text-xs font-medium" style="color: var(--sm-text-primary)">
                {{ t('settings.appearance.secondaryColor') }}
              </span>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs" style="color: var(--sm-text-secondary)">
                  {{ settingsStore.settings.appearance.secondaryColor }}
                </span>
                <input
                  type="color"
                  class="h-7 w-9 cursor-pointer rounded border bg-transparent"
                  :value="settingsStore.settings.appearance.secondaryColor"
                  :aria-label="t('settings.appearance.secondaryColor')"
                  @input="onColorInput('secondaryColor', $event)"
                >
              </div>
            </label>
          </div>

          <!-- Outline & Shadow -->
          <div class="flex flex-col gap-3 border-t pt-4" style="border-color: var(--sm-border)">
            <ToggleSwitch
              :model-value="settingsStore.settings.appearance.textOutline"
              :label="t('settings.appearance.textOutline')"
              :description="t('settings.appearance.textOutlineDesc')"
              @update:model-value="settingsStore.updateAppearance({ textOutline: $event })"
            />
            <ToggleSwitch
              :model-value="settingsStore.settings.appearance.textShadow"
              :label="t('settings.appearance.textShadow')"
              :description="t('settings.appearance.textShadowDesc')"
              @update:model-value="settingsStore.updateAppearance({ textShadow: $event })"
            />
          </div>
        </section>

        <!-- 4. SYNCHRONIZATION -->
        <section
          v-if="activeSection === 'synchronization'"
          data-testid="section-synchronization"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="border-b pb-4" style="border-color: var(--sm-border)">
            <h2 class="text-lg font-semibold">{{ t('settings.sync.title') }}</h2>
            <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.sync.description') }}
            </p>
          </header>

          <p class="sm-alert sm-alert-info">{{ t('settings.sync.offsetHelp') }}</p>

          <!-- Primary offset -->
          <div class="sm-card-elevated flex flex-col gap-3 p-4">
            <RangeSlider
              :model-value="settingsStore.settings.sync.primaryOffsetMs"
              :label="t('settings.sync.primaryOffset')"
              :min="SETTINGS_CONSTRAINTS.offsetMs.min"
              :max="SETTINGS_CONSTRAINTS.offsetMs.max"
              :step="SETTINGS_CONSTRAINTS.offsetMs.step"
              :display-value="formatOffset(settingsStore.settings.sync.primaryOffsetMs)"
              @update:model-value="settingsStore.updateSync({ primaryOffsetMs: $event })"
            />
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.primaryOffset')} -500 ms`"
                @click="settingsStore.adjustOffset('primary', -500)"
              >
                -500 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.primaryOffset')} -100 ms`"
                @click="settingsStore.adjustOffset('primary', -100)"
              >
                -100 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.primaryOffset')} +100 ms`"
                @click="settingsStore.adjustOffset('primary', 100)"
              >
                +100 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.primaryOffset')} +500 ms`"
                @click="settingsStore.adjustOffset('primary', 500)"
              >
                +500 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-ghost ml-auto"
                :aria-label="`${t('settings.sync.resetOffset')} (${t('settings.sync.primaryOffset')})`"
                :disabled="settingsStore.settings.sync.primaryOffsetMs === 0"
                @click="settingsStore.resetOffset('primary')"
              >
                {{ t('settings.sync.resetOffset') }}
              </button>
            </div>
          </div>

          <!-- Secondary offset -->
          <div class="sm-card-elevated flex flex-col gap-3 p-4">
            <RangeSlider
              :model-value="settingsStore.settings.sync.secondaryOffsetMs"
              :label="t('settings.sync.secondaryOffset')"
              :min="SETTINGS_CONSTRAINTS.offsetMs.min"
              :max="SETTINGS_CONSTRAINTS.offsetMs.max"
              :step="SETTINGS_CONSTRAINTS.offsetMs.step"
              :display-value="formatOffset(settingsStore.settings.sync.secondaryOffsetMs)"
              @update:model-value="settingsStore.updateSync({ secondaryOffsetMs: $event })"
            />
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.secondaryOffset')} -500 ms`"
                @click="settingsStore.adjustOffset('secondary', -500)"
              >
                -500 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.secondaryOffset')} -100 ms`"
                @click="settingsStore.adjustOffset('secondary', -100)"
              >
                -100 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.secondaryOffset')} +100 ms`"
                @click="settingsStore.adjustOffset('secondary', 100)"
              >
                +100 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-secondary"
                :aria-label="`${t('settings.sync.secondaryOffset')} +500 ms`"
                @click="settingsStore.adjustOffset('secondary', 500)"
              >
                +500 ms
              </button>
              <button
                type="button"
                class="sm-btn sm-btn-ghost ml-auto"
                :aria-label="`${t('settings.sync.resetOffset')} (${t('settings.sync.secondaryOffset')})`"
                :disabled="settingsStore.settings.sync.secondaryOffsetMs === 0"
                @click="settingsStore.resetOffset('secondary')"
              >
                {{ t('settings.sync.resetOffset') }}
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-end justify-between gap-4 border-t pt-4" style="border-color: var(--sm-border)">
            <div class="flex flex-col gap-1.5">
              <label for="sync-mode-select" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
                {{ t('settings.sync.modeLabel') }}
              </label>
              <select
                id="sync-mode-select"
                class="sm-select max-w-xs"
                :value="settingsStore.settings.sync.syncMode"
                @change="onSyncModeChange"
              >
                <option value="raf">{{ t('settings.sync.modeRaf') }}</option>
                <option value="timeupdate">{{ t('settings.sync.modeTimeupdate') }}</option>
              </select>
            </div>

            <button
              type="button"
              class="sm-btn sm-btn-secondary"
              :disabled="
                settingsStore.settings.sync.primaryOffsetMs === 0 &&
                  settingsStore.settings.sync.secondaryOffsetMs === 0
              "
              @click="settingsStore.resetAllOffsets"
            >
              {{ t('settings.sync.resetAll') }}
            </button>
          </div>
        </section>

        <!-- 5. LOCAL FILES -->
        <section
          v-if="activeSection === 'localFiles'"
          data-testid="section-localFiles"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="flex flex-wrap items-start justify-between gap-2 border-b pb-4" style="border-color: var(--sm-border)">
            <div>
              <h2 class="text-lg font-semibold">{{ t('settings.localFiles.title') }}</h2>
              <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
                {{ t('settings.localFiles.description') }}
              </p>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px]" style="color: var(--sm-text-secondary)">
                {{ t('settings.localFiles.supportedFormats') }}:
              </span>
              <span class="sm-badge sm-badge-primary">.srt</span>
              <span class="sm-badge sm-badge-secondary">.vtt</span>
            </div>
          </header>

          <FileImporter
            :saving="subtitleStore.saving"
            :default-language="settingsStore.settings.general.defaultPrimaryLanguage"
            :existing-hashes="subtitleStore.existingHashes"
            @confirm="handleLocalImportConfirm"
          />

          <p v-if="importSuccessMessage" role="status" class="sm-alert sm-alert-success">
            {{ importSuccessMessage }}
          </p>
          <p v-if="subtitleStore.errorCode" role="alert" class="sm-alert sm-alert-error">
            {{ storageErrorText(subtitleStore.errorCode) }}
          </p>
          <p v-if="clearedSubtitlesFeedback" role="status" class="sm-alert sm-alert-success">
            {{ t('settings.localFiles.clearedDone') }}
          </p>

          <div class="flex flex-wrap items-center justify-between gap-2 text-xs" style="color: var(--sm-text-secondary)">
            <span>
              {{
                t('settings.localFiles.storageUsage', {
                  files: subtitleStore.storageUsage.recordCount,
                  cues: subtitleStore.storageUsage.totalCues,
                  size: formatBytes(subtitleStore.storageUsage.estimatedBytes),
                })
              }}
            </span>
          </div>

          <p class="sm-alert sm-alert-info">{{ t('importer.stagedNotice') }}</p>

          <div
            v-if="subtitleStore.loading"
            class="rounded-lg border p-6 text-center text-xs"
            style="border-color: var(--sm-border); color: var(--sm-text-secondary)"
          >
            {{ t('settings.localFiles.loading') }}
          </div>

          <div
            v-else-if="subtitleStore.records.length === 0"
            class="rounded-lg border p-6 text-center text-xs"
            style="border-color: var(--sm-border); color: var(--sm-text-muted)"
          >
            {{ t('settings.localFiles.empty') }}
          </div>

          <div v-else class="flex flex-col gap-3">
            <article
              v-for="item in subtitleStore.records"
              :key="item.id"
              class="sm-card-elevated flex flex-col gap-3 p-3.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{{ item.fileName }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px]" style="color: var(--sm-text-secondary)">
                    <span class="sm-badge uppercase">{{ item.format }}</span>
                    <span>{{ formatBytes(item.fileSize) }}</span>
                    <span>•</span>
                    <span>{{ t('importer.cueCount', { count: item.cueCount }) }}</span>
                    <span>•</span>
                    <span>{{ formatDurationMs(item.durationMs) }}</span>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <select
                    class="sm-select w-40 py-1 text-xs"
                    :aria-label="t('settings.localFiles.fileLanguage')"
                    :value="item.language"
                    @change="
                      subtitleStore.updateLanguage(
                        item.id,
                        ($event.target as HTMLSelectElement).value,
                      )
                    "
                  >
                    <option value="und">{{ t('importer.unknownLanguage') }}</option>
                    <option v-for="lang in SUBTITLE_LANGUAGES" :key="lang.code" :value="lang.code">
                      {{ lang.nativeLabel }}
                    </option>
                  </select>

                  <button
                    type="button"
                    class="sm-btn sm-btn-secondary"
                    :aria-expanded="previewRecordId === item.id"
                    :aria-label="`${previewRecordId === item.id ? t('settings.localFiles.hidePreview') : t('settings.localFiles.preview')} — ${item.fileName}`"
                    @click="previewRecordId = previewRecordId === item.id ? null : item.id"
                  >
                    {{
                      previewRecordId === item.id
                        ? t('settings.localFiles.hidePreview')
                        : t('settings.localFiles.preview')
                    }}
                  </button>

                  <button
                    v-if="subtitleStore.primaryRecordId === item.id"
                    type="button"
                    class="sm-btn sm-btn-ghost"
                    @click="subtitleStore.detachSlot('primary')"
                  >
                    {{ t('settings.localFiles.detachPlayer') }} ({{ t('common.primary') }})
                  </button>
                  <button
                    v-if="subtitleStore.secondaryRecordId === item.id"
                    type="button"
                    class="sm-btn sm-btn-ghost"
                    @click="subtitleStore.detachSlot('secondary')"
                  >
                    {{ t('settings.localFiles.detachPlayer') }} ({{ t('common.secondary') }})
                  </button>

                  <button
                    type="button"
                    class="sm-btn sm-btn-danger"
                    :aria-label="`${confirmRemoveId === item.id ? t('settings.localFiles.confirmRemove') : t('common.remove')} — ${item.fileName}`"
                    @click="handleRemoveRecord(item.id)"
                  >
                    {{
                      confirmRemoveId === item.id
                        ? t('settings.localFiles.confirmRemove')
                        : t('common.remove')
                    }}
                  </button>
                </div>
              </div>

              <!-- Safe text-only inline cue preview -->
              <div
                v-if="previewRecordId === item.id"
                class="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border p-2.5 text-xs"
                style="background-color: var(--sm-bg); border-color: var(--sm-border)"
              >
                <div
                  v-for="cue in item.cues.slice(0, 6)"
                  :key="`${cue.id}-${cue.start}`"
                  class="flex flex-col gap-0.5 border-b pb-1.5 last:border-b-0 last:pb-0"
                  style="border-color: var(--sm-border)"
                >
                  <span class="font-mono text-[10px]" style="color: var(--sm-text-muted)">
                    {{ formatTimestamp(cue.start, item.format) }} →
                    {{ formatTimestamp(cue.end, item.format) }}
                  </span>
                  <p class="m-0 whitespace-pre-line" style="color: var(--sm-text-primary)">
                    {{ cue.text }}
                  </p>
                </div>
              </div>
            </article>

            <div class="flex items-center gap-2 pt-1">
              <button
                type="button"
                data-testid="clear-subtitles-button"
                class="sm-btn sm-btn-danger"
                @click="handleClearAllSubtitles"
              >
                {{
                  confirmClearSubtitles
                    ? t('settings.localFiles.confirmClearAll')
                    : t('settings.localFiles.clearAll')
                }}
              </button>
              <button
                v-if="confirmClearSubtitles"
                type="button"
                class="sm-btn sm-btn-ghost"
                @click="confirmClearSubtitles = false"
              >
                {{ t('importer.cancelImport') }}
              </button>
            </div>
          </div>
        </section>

        <!-- 6. KEYBOARD SHORTCUTS -->
        <section
          v-if="activeSection === 'shortcuts'"
          data-testid="section-shortcuts"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="border-b pb-4" style="border-color: var(--sm-border)">
            <h2 class="text-lg font-semibold">{{ t('settings.shortcuts.title') }}</h2>
            <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.shortcuts.description') }}
            </p>
          </header>

          <p class="sm-alert sm-alert-info">
            {{ t('settings.shortcuts.notRegisteredNotice') }}
          </p>

          <div class="overflow-hidden rounded-lg border" style="border-color: var(--sm-border)">
            <table class="w-full border-collapse text-left text-xs">
              <thead>
                <tr style="background-color: var(--sm-surface-elevated); color: var(--sm-text-secondary)">
                  <th scope="col" class="px-4 py-2.5 font-medium">{{ t('settings.shortcuts.actionHeader') }}</th>
                  <th scope="col" class="px-4 py-2.5 text-right font-medium">{{ t('settings.shortcuts.keysHeader') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in shortcutRows"
                  :key="row.action"
                  class="border-t"
                  style="border-color: var(--sm-border)"
                >
                  <td class="px-4 py-3 text-sm" style="color: var(--sm-text-primary)">
                    {{ row.action }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <kbd class="sm-kbd">{{ row.keys }}</kbd>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 7. PRIVACY -->
        <section
          v-if="activeSection === 'privacy'"
          data-testid="section-privacy"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="border-b pb-4" style="border-color: var(--sm-border)">
            <h2 class="text-lg font-semibold">{{ t('settings.privacy.title') }}</h2>
            <p class="mt-1 text-xs" style="color: var(--sm-text-secondary)">
              {{ t('settings.privacy.description') }}
            </p>
          </header>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="sm-card-elevated p-4">
              <h3 class="text-sm font-semibold">{{ t('settings.privacy.localStorageTitle') }}</h3>
              <p class="mt-1.5 text-xs leading-relaxed" style="color: var(--sm-text-secondary)">
                {{ t('settings.privacy.localStorageBody') }}
              </p>
            </article>

            <article class="sm-card-elevated p-4">
              <h3 class="text-sm font-semibold">{{ t('settings.privacy.fileHandlingTitle') }}</h3>
              <p class="mt-1.5 text-xs leading-relaxed" style="color: var(--sm-text-secondary)">
                {{ t('settings.privacy.fileHandlingBody') }}
              </p>
            </article>

            <article class="sm-card-elevated p-4">
              <h3 class="text-sm font-semibold">{{ t('settings.privacy.permissionsTitle') }}</h3>
              <p class="mt-1.5 text-xs leading-relaxed" style="color: var(--sm-text-secondary)">
                {{ t('settings.privacy.permissionsBody') }}
              </p>
            </article>

            <article class="sm-card-elevated p-4">
              <h3 class="text-sm font-semibold">{{ t('settings.privacy.zeroTelemetryTitle') }}</h3>
              <p class="mt-1.5 text-xs leading-relaxed" style="color: var(--sm-text-secondary)">
                {{ t('settings.privacy.zeroTelemetryBody') }}
              </p>
            </article>
          </div>

          <div class="flex flex-col gap-3 border-t pt-4" style="border-color: var(--sm-border)">
            <h3 class="text-sm font-medium">{{ t('settings.privacy.dataControlsTitle') }}</h3>
            <div>
              <button
                type="button"
                data-testid="clear-all-data-button"
                class="sm-btn sm-btn-danger"
                @click="handleClearAllData"
              >
                {{ t('settings.privacy.clearDataButton') }}
              </button>
            </div>
            <p v-if="clearDataFeedback" role="status" class="sm-alert sm-alert-success">
              {{ t('settings.privacy.clearDataDone') }}
            </p>
          </div>
        </section>

        <!-- 8. ABOUT -->
        <section
          v-if="activeSection === 'about'"
          data-testid="section-about"
          class="sm-card flex flex-col gap-5 p-6"
        >
          <header class="flex items-center gap-3.5 border-b pb-4" style="border-color: var(--sm-border)">
            <BrandLogo :size="40" />
            <div>
              <h2 class="text-lg font-semibold">{{ t('settings.about.title') }}</h2>
              <p class="text-xs" style="color: var(--sm-text-secondary)">
                {{ t('app.tagline') }} • {{ t('app.version', { version: '1.0.0' }) }}
              </p>
            </div>
          </header>

          <p class="text-sm leading-relaxed" style="color: var(--sm-text-secondary)">
            {{ t('settings.about.description') }}
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="sm-card-elevated p-4">
              <h3 class="text-sm font-semibold">{{ t('settings.about.supportedFormatsTitle') }}</h3>
              <ul class="mt-2 flex flex-col gap-1 text-xs" style="color: var(--sm-text-secondary)">
                <li>{{ t('settings.about.v1Formats') }}</li>
                <li>{{ t('settings.about.futureFormats') }}</li>
              </ul>
            </div>

            <div class="sm-card-elevated p-4">
              <h3 class="text-sm font-semibold">{{ t('settings.about.docsTitle') }}</h3>
              <p class="mt-2 text-xs leading-relaxed" style="color: var(--sm-text-secondary)">
                {{ t('settings.about.docsNote') }}
              </p>
              <div class="mt-2.5 flex flex-wrap gap-1.5">
                <span class="sm-badge">ARCHITECTURE.md</span>
                <span class="sm-badge">SECURITY.md</span>
                <span class="sm-badge">TESTING.md</span>
                <span class="sm-badge">COMPATIBILITY.md</span>
              </div>
            </div>
          </div>

          <p class="border-t pt-4 text-xs" style="border-color: var(--sm-border); color: var(--sm-text-muted)">
            {{ t('settings.about.licenseNote') }}
          </p>
        </section>
      </main>
    </div>
  </div>
</template>
