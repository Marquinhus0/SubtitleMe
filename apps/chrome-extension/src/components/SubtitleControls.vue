<script setup lang="ts">
import { useId } from 'vue';
import { SETTINGS_CONSTRAINTS, type SubtitleSlot } from '@subtitleme/shared-types';
import { useI18n } from '../i18n';
import RangeSlider from './RangeSlider.vue';

withDefaults(
  defineProps<{
    fontSize: number;
    primaryVisible: boolean;
    secondaryVisible: boolean;
    primaryOffsetMs: number;
    secondaryOffsetMs: number;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:fontSize': [value: number];
  'toggle:visibility': [slot: SubtitleSlot, visible: boolean];
  'adjust:offset': [slot: SubtitleSlot, deltaMs: number];
  'reset:offset': [slot: SubtitleSlot];
}>();

const { t } = useI18n();
const visibilityLabelId = useId();

function formatOffset(ms: number): string {
  if (ms === 0) return '0 ms';
  return `${ms > 0 ? '+' : ''}${ms} ms`;
}
</script>

<template>
  <section class="sm-card flex flex-col gap-3 p-3">
    <h2 class="text-xs font-semibold tracking-wide uppercase" style="color: var(--sm-text-secondary)">
      {{ t('popup.quickControls') }}
    </h2>

    <!-- Track visibility pills -->
    <div class="flex flex-col gap-1.5">
      <span :id="visibilityLabelId" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
        {{ t('popup.visibility') }}
      </span>
      <div role="group" :aria-labelledby="visibilityLabelId" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="sm-btn"
          :class="primaryVisible ? 'sm-btn-primary' : 'sm-btn-secondary'"
          :aria-pressed="primaryVisible"
          :disabled="disabled"
          @click="emit('toggle:visibility', 'primary', !primaryVisible)"
        >
          {{ t('common.primary') }}
        </button>
        <button
          type="button"
          class="sm-btn"
          :class="secondaryVisible ? 'sm-btn-secondary' : 'sm-btn-ghost'"
          :style="
            secondaryVisible
              ? {
                backgroundColor: 'var(--sm-secondary)',
                color: '#0B0D12',
                borderColor: 'transparent',
                fontWeight: '600',
              }
              : {}
          "
          :aria-pressed="secondaryVisible"
          :disabled="disabled"
          @click="emit('toggle:visibility', 'secondary', !secondaryVisible)"
        >
          {{ t('common.secondary') }}
        </button>
      </div>
    </div>

    <!-- Font size slider -->
    <RangeSlider
      :model-value="fontSize"
      :label="t('popup.fontSize')"
      :min="SETTINGS_CONSTRAINTS.fontSize.min"
      :max="SETTINGS_CONSTRAINTS.fontSize.max"
      :step="SETTINGS_CONSTRAINTS.fontSize.step"
      :display-value="`${fontSize} px`"
      :disabled="disabled"
      @update:model-value="emit('update:fontSize', $event)"
    />

    <!-- Quick sync offset steppers -->
    <div class="flex flex-col gap-2 border-t pt-2.5" style="border-color: var(--sm-border)">
      <span class="text-xs font-medium" style="color: var(--sm-text-secondary)">
        {{ t('popup.quickSync') }}
      </span>

      <div class="flex items-center justify-between gap-2">
        <span class="text-xs" style="color: var(--sm-text-primary)">{{ t('common.primary') }}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="sm-btn sm-btn-secondary px-2 py-1 text-[11px]"
            :disabled="disabled"
            :aria-label="`${t('popup.primaryOffset')} -100ms`"
            @click="emit('adjust:offset', 'primary', -100)"
          >
            -100
          </button>
          <button
            type="button"
            class="sm-btn sm-btn-ghost min-w-[62px] px-1.5 py-1 font-mono text-[11px] tabular-nums"
            :disabled="disabled || primaryOffsetMs === 0"
            :title="t('settings.sync.resetOffset')"
            :aria-label="`${t('settings.sync.resetOffset')} (${t('popup.primaryOffset')}: ${formatOffset(primaryOffsetMs)})`"
            @click="emit('reset:offset', 'primary')"
          >
            {{ formatOffset(primaryOffsetMs) }}
          </button>
          <button
            type="button"
            class="sm-btn sm-btn-secondary px-2 py-1 text-[11px]"
            :disabled="disabled"
            :aria-label="`${t('popup.primaryOffset')} +100ms`"
            @click="emit('adjust:offset', 'primary', 100)"
          >
            +100
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <span class="text-xs" style="color: var(--sm-text-primary)">{{ t('common.secondary') }}</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="sm-btn sm-btn-secondary px-2 py-1 text-[11px]"
            :disabled="disabled"
            :aria-label="`${t('popup.secondaryOffset')} -100ms`"
            @click="emit('adjust:offset', 'secondary', -100)"
          >
            -100
          </button>
          <button
            type="button"
            class="sm-btn sm-btn-ghost min-w-[62px] px-1.5 py-1 font-mono text-[11px] tabular-nums"
            :disabled="disabled || secondaryOffsetMs === 0"
            :title="t('settings.sync.resetOffset')"
            :aria-label="`${t('settings.sync.resetOffset')} (${t('popup.secondaryOffset')}: ${formatOffset(secondaryOffsetMs)})`"
            @click="emit('reset:offset', 'secondary')"
          >
            {{ formatOffset(secondaryOffsetMs) }}
          </button>
          <button
            type="button"
            class="sm-btn sm-btn-secondary px-2 py-1 text-[11px]"
            :disabled="disabled"
            :aria-label="`${t('popup.secondaryOffset')} +100ms`"
            @click="emit('adjust:offset', 'secondary', 100)"
          >
            +100
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
