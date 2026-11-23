<script setup lang="ts">
import { useId } from 'vue';
import { SUBTITLE_LANGUAGES, type LanguageOption } from '@subtitleme/shared-types';

withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    options?: readonly LanguageOption[];
    disabled?: boolean;
    hint?: string;
  }>(),
  {
    options: () => SUBTITLE_LANGUAGES,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const selectId = useId();

function onChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="selectId" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
      {{ label }}
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :disabled="disabled"
      class="sm-select"
      @change="onChange"
    >
      <option v-for="option in options" :key="option.code" :value="option.code">
        {{ option.nativeLabel }} ({{ option.code }})
      </option>
    </select>
    <span v-if="hint" class="text-[11px]" style="color: var(--sm-text-muted)">
      {{ hint }}
    </span>
  </div>
</template>
