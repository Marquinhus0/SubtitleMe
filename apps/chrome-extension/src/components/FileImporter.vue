<script setup lang="ts">
import { ref, useId } from 'vue';
import { SUBTITLE_LANGUAGES } from '@subtitleme/shared-types';
import { formatTimestamp } from '@subtitleme/subtitle-parser';
import {
  DEFAULT_MAX_SUBTITLE_FILE_BYTES,
  formatDurationMs,
  prepareSubtitleImport,
  type ImportErrorCode,
  type PendingSubtitleImport,
} from '../services/subtitle-import';
import { useI18n } from '../i18n';

export interface ConfirmedSubtitleImport {
  pending: PendingSubtitleImport;
  language: string;
}

const props = withDefaults(
  defineProps<{
    maxSizeBytes?: number;
    disabled?: boolean;
    compact?: boolean;
    buttonLabel?: string;
    defaultLanguage?: string;
    existingHashes?: ReadonlySet<string>;
    saving?: boolean;
  }>(),
  {
    maxSizeBytes: DEFAULT_MAX_SUBTITLE_FILE_BYTES,
    disabled: false,
    compact: false,
    defaultLanguage: 'en',
    saving: false,
  },
);

const emit = defineEmits<{
  confirm: [payload: ConfirmedSubtitleImport];
  error: [message: string];
}>();

const { t } = useI18n();
const inputId = useId();
const langSelectId = useId();
const inputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const status = ref<'idle' | 'processing' | 'preview' | 'error'>('idle');
const errorMessage = ref<string | null>(null);
const pendingImport = ref<PendingSubtitleImport | null>(null);
const selectedLanguage = ref<string>(props.defaultLanguage);

const maxMb = Math.round((props.maxSizeBytes / (1024 * 1024)) * 10) / 10;

function mapImportError(code: ImportErrorCode): string {
  switch (code) {
    case 'UNSUPPORTED_EXTENSION':
    case 'INVALID_FORMAT':
      return t('importer.invalidFormat');
    case 'FILE_TOO_LARGE':
      return t('importer.fileTooLarge', { maxMb });
    case 'EMPTY_FILE':
      return t('importer.emptyFile');
    case 'INVALID_CONTENT':
      return t('importer.invalidContent');
    case 'DUPLICATE_IMPORT':
      return t('importer.duplicateFile');
    case 'READ_FAILED':
      return t('importer.readFailed');
  }
}

async function handleFile(file: File | undefined): Promise<void> {
  if (!file || props.disabled) return;

  status.value = 'processing';
  errorMessage.value = null;
  pendingImport.value = null;

  const result = await prepareSubtitleImport(file, {
    maxSizeBytes: props.maxSizeBytes,
    ...(props.existingHashes ? { existingHashes: props.existingHashes } : {}),
  });

  if (!result.ok) {
    const localized = mapImportError(result.code);
    status.value = 'error';
    errorMessage.value = localized;
    emit('error', localized);
    return;
  }

  if (result.pending.isDuplicate) {
    const localized = t('importer.duplicateFile');
    status.value = 'error';
    errorMessage.value = localized;
    emit('error', localized);
    return;
  }

  selectedLanguage.value = props.defaultLanguage;
  pendingImport.value = result.pending;
  status.value = 'preview';
}

function confirmImport(): void {
  if (!pendingImport.value || props.saving) return;
  const payload: ConfirmedSubtitleImport = {
    pending: pendingImport.value,
    language: selectedLanguage.value,
  };
  emit('confirm', payload);
  pendingImport.value = null;
  status.value = 'idle';
}

function cancelImport(): void {
  pendingImport.value = null;
  errorMessage.value = null;
  status.value = 'idle';
}

function onInputChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  void handleFile(input.files?.[0]);
  input.value = '';
}

function onDragOver(event: DragEvent): void {
  if (props.disabled) return;
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave(): void {
  isDragging.value = false;
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  isDragging.value = false;
  if (props.disabled) return;
  void handleFile(event.dataTransfer?.files?.[0]);
}

function openPicker(): void {
  if (props.disabled) return;
  inputRef.value?.click();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <template v-if="compact">
      <button
        type="button"
        class="sm-btn sm-btn-secondary w-full"
        :disabled="disabled || saving"
        @click="openPicker"
      >
        {{ buttonLabel ?? t('common.importFile') }}
      </button>
      <input
        :id="inputId"
        ref="inputRef"
        type="file"
        accept=".srt,.vtt"
        class="sr-only"
        :disabled="disabled || saving"
        @change="onInputChange"
      >
    </template>

    <template v-else>
      <div
        role="button"
        tabindex="0"
        :aria-disabled="disabled || saving"
        :aria-label="t('importer.dropPrompt')"
        class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors"
        :style="{
          backgroundColor: isDragging ? 'var(--sm-primary-muted)' : 'var(--sm-surface-elevated)',
          borderColor: isDragging ? 'var(--sm-primary)' : 'var(--sm-border-strong)',
          opacity: disabled || saving ? 0.5 : 1,
        }"
        @click="openPicker"
        @keydown.enter.prevent="openPicker"
        @keydown.space.prevent="openPicker"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <p class="text-sm font-medium" style="color: var(--sm-text-primary)">
          {{ status === 'processing' ? t('importer.processing') : t('importer.dropPrompt') }}
        </p>
        <p class="text-xs" style="color: var(--sm-text-secondary)">
          {{ t('importer.formatsHint', { maxMb }) }}
        </p>
        <span class="sm-btn sm-btn-secondary mt-1">{{ t('importer.browse') }}</span>
      </div>
      <input
        :id="inputId"
        ref="inputRef"
        type="file"
        accept=".srt,.vtt"
        class="sr-only"
        :disabled="disabled || saving"
        @change="onInputChange"
      >
    </template>

    <p v-if="errorMessage && status === 'error'" role="alert" class="sm-alert sm-alert-error">
      {{ errorMessage }}
    </p>

    <!-- Real Parsed Import Preview (requires explicit confirmation before saving) -->
    <div
      v-if="pendingImport && status === 'preview'"
      data-testid="import-preview-card"
      class="sm-card-elevated flex flex-col gap-3 p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5" style="border-color: var(--sm-border)">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide" style="color: var(--sm-primary)">
            {{ t('importer.previewTitle') }}
          </p>
          <p class="truncate text-sm font-medium" style="color: var(--sm-text-primary)">
            {{ pendingImport.fileName }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="sm-badge sm-badge-primary uppercase">{{ pendingImport.format }}</span>
          <span class="sm-badge">{{ t('importer.cueCount', { count: pendingImport.cueCount }) }}</span>
          <span class="sm-badge">
            {{ t('importer.duration', { duration: formatDurationMs(pendingImport.durationMs) }) }}
          </span>
        </div>
      </div>

      <p v-if="pendingImport.encodingWarning" role="status" class="sm-alert sm-alert-info">
        {{ pendingImport.encodingWarning }}
      </p>

      <div
        v-if="pendingImport.warnings.length > 0 || pendingImport.errors.length > 0"
        class="flex flex-wrap gap-2 text-xs"
      >
        <span v-if="pendingImport.warnings.length > 0" class="sm-badge sm-badge-warning">
          {{ t('importer.warningsTitle', { count: pendingImport.warnings.length }) }}
        </span>
        <span v-if="pendingImport.errors.length > 0" class="sm-badge sm-badge-warning">
          {{ t('importer.errorsTitle', { count: pendingImport.errors.length }) }}
        </span>
      </div>

      <!-- First cues preview (rendered strictly as text interpolation, never v-html) -->
      <div
        class="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-md border p-2.5 text-xs"
        style="background-color: var(--sm-bg); border-color: var(--sm-border)"
      >
        <div
          v-for="cue in pendingImport.previewCues"
          :key="`${cue.id}-${cue.start}`"
          class="flex flex-col gap-0.5 border-b pb-1.5 last:border-b-0 last:pb-0"
          style="border-color: var(--sm-border)"
        >
          <span class="font-mono text-[10px]" style="color: var(--sm-text-muted)">
            {{ formatTimestamp(cue.start, pendingImport.format) }} →
            {{ formatTimestamp(cue.end, pendingImport.format) }}
          </span>
          <p class="m-0 whitespace-pre-line" style="color: var(--sm-text-primary)">
            {{ cue.text }}
          </p>
        </div>
      </div>

      <!-- Language assignment -->
      <div class="flex flex-col gap-1.5">
        <label :for="langSelectId" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
          {{ t('importer.assignLanguage') }}
        </label>
        <select
          :id="langSelectId"
          v-model="selectedLanguage"
          data-testid="import-language-select"
          class="sm-select"
        >
          <option value="und">{{ t('importer.unknownLanguage') }}</option>
          <option v-for="lang in SUBTITLE_LANGUAGES" :key="lang.code" :value="lang.code">
            {{ lang.nativeLabel }} ({{ lang.code }})
          </option>
        </select>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          data-testid="cancel-import-button"
          class="sm-btn sm-btn-ghost"
          :disabled="saving"
          @click="cancelImport"
        >
          {{ t('importer.cancelImport') }}
        </button>
        <button
          type="button"
          data-testid="confirm-import-button"
          class="sm-btn sm-btn-primary"
          :disabled="saving"
          @click="confirmImport"
        >
          {{ saving ? t('importer.saving') : t('importer.confirmImport') }}
        </button>
      </div>
    </div>
  </div>
</template>
