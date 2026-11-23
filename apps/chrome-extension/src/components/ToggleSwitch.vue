<script setup lang="ts">
import { useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label: string;
    description?: string;
    disabled?: boolean;
    accent?: 'primary' | 'secondary';
    compact?: boolean;
  }>(),
  {
    disabled: false,
    accent: 'primary',
    compact: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const labelId = useId();
const descId = useId();

function toggle(): void {
  if (props.disabled) return;
  emit('update:modelValue', !props.modelValue);
}
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div v-if="!compact" class="min-w-0 flex-1">
      <span :id="labelId" class="block text-sm font-medium" style="color: var(--sm-text-primary)">
        {{ label }}
      </span>
      <span
        v-if="description"
        :id="descId"
        class="mt-0.5 block text-xs"
        style="color: var(--sm-text-secondary)"
      >
        {{ description }}
      </span>
    </div>

    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="compact ? label : undefined"
      :aria-labelledby="compact ? undefined : labelId"
      :aria-describedby="!compact && description ? descId : undefined"
      :disabled="disabled"
      class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      :style="{
        backgroundColor: modelValue
          ? accent === 'secondary'
            ? 'var(--sm-secondary)'
            : 'var(--sm-primary)'
          : 'var(--sm-surface-elevated)',
        borderColor: modelValue ? 'transparent' : 'var(--sm-border-strong)',
      }"
      @click="toggle"
    >
      <span
        class="pointer-events-none inline-block h-4 w-4 rounded-full transition-transform"
        :style="{
          backgroundColor: modelValue ? '#0B0D12' : '#9299AA',
          transform: modelValue ? 'translateX(22px)' : 'translateX(3px)',
        }"
      />
    </button>
  </div>
</template>
