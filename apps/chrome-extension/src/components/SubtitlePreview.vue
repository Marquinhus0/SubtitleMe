<script setup lang="ts">
import { computed } from 'vue';
import type { SubtitleAppearanceSettings, SubtitleOrder } from '@subtitleme/shared-types';
import { useI18n } from '../i18n';

const props = withDefaults(
  defineProps<{
    appearance: SubtitleAppearanceSettings;
    order?: SubtitleOrder;
    primaryVisible?: boolean;
    secondaryVisible?: boolean;
    primaryText?: string;
    secondaryText?: string;
    compact?: boolean;
  }>(),
  {
    order: 'primary-top',
    primaryVisible: true,
    secondaryVisible: true,
    compact: false,
  },
);

const { t } = useI18n();

const resolvedPrimaryText = computed(() => props.primaryText ?? t('preview.samplePrimary'));
const resolvedSecondaryText = computed(() => props.secondaryText ?? t('preview.sampleSecondary'));

const lines = computed(() => {
  const primaryLine = {
    id: 'primary',
    visible: props.primaryVisible,
    text: resolvedPrimaryText.value,
    color: props.appearance.primaryColor,
    scale: 1,
  };
  const secondaryLine = {
    id: 'secondary',
    visible: props.secondaryVisible,
    text: resolvedSecondaryText.value,
    color: props.appearance.secondaryColor,
    scale: 0.9,
  };

  const ordered =
    props.order === 'secondary-top' ? [secondaryLine, primaryLine] : [primaryLine, secondaryLine];
  return ordered.filter((line) => line.visible);
});

const textShadowValue = computed(() => {
  const layers: string[] = [];
  if (props.appearance.textOutline) {
    layers.push(
      '-1px -1px 0 rgba(0, 0, 0, 0.92)',
      '1px -1px 0 rgba(0, 0, 0, 0.92)',
      '-1px 1px 0 rgba(0, 0, 0, 0.92)',
      '1px 1px 0 rgba(0, 0, 0, 0.92)',
    );
  }
  if (props.appearance.textShadow) {
    layers.push('0 2px 8px rgba(0, 0, 0, 0.85)');
  }
  return layers.length > 0 ? layers.join(', ') : 'none';
});

const containerStyle = computed(() => ({
  backgroundColor: `rgba(11, 13, 18, ${props.appearance.backgroundOpacity})`,
  fontFamily: props.appearance.fontFamily,
  lineHeight: String(props.appearance.lineSpacing),
}));

const scaledFontSize = (scale: number): string => {
  const maxPx = props.compact ? 22 : 48;
  const computedPx = Math.round(props.appearance.fontSize * scale);
  return `${Math.min(computedPx, maxPx)}px`;
};
</script>

<template>
  <div
    data-testid="subtitle-preview-stage"
    class="relative flex w-full flex-col overflow-hidden rounded-lg border"
    :class="[
      compact ? 'min-h-[124px] px-3 py-3' : 'min-h-[210px] px-6 py-5',
      appearance.position === 'top' ? 'justify-start' : 'justify-end',
    ]"
    style="
      background: radial-gradient(circle at 50% 30%, #1c2230 0%, #0e1118 65%, #080a0e 100%);
      border-color: var(--sm-border);
    "
  >
    <div
      class="pointer-events-none absolute top-2.5 right-3 flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase"
      style="color: var(--sm-text-muted)"
    >
      <span>{{ appearance.position === 'top' ? t('preview.positionTop') : t('preview.positionBottom') }}</span>
      <span>•</span>
      <span>{{ appearance.fontSize }}px</span>
    </div>

    <div
      v-if="lines.length > 0"
      data-testid="subtitle-preview-box"
      class="mx-auto max-w-[92%] rounded-md px-3.5 py-2 text-center transition-all"
      :style="containerStyle"
    >
      <p
        v-for="line in lines"
        :key="line.id"
        :data-testid="`subtitle-preview-${line.id}`"
        class="m-0 font-medium break-words"
        :style="{
          color: line.color,
          fontSize: scaledFontSize(line.scale),
          textShadow: textShadowValue,
        }"
      >
        {{ line.text }}
      </p>
    </div>

    <p
      v-else
      data-testid="subtitle-preview-empty"
      class="mx-auto my-auto text-xs"
      style="color: var(--sm-text-muted)"
    >
      {{ t('preview.hiddenNotice') }}
    </p>
  </div>
</template>
