<script setup lang="ts">
import { useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    label: string;
    min: number;
    max: number;
    step?: number;
    displayValue?: string;
    disabled?: boolean;
  }>(),
  {
    step: 1,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const inputId = useId();

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  const parsed = Number(target.value);
  if (Number.isFinite(parsed)) {
    emit('update:modelValue', parsed);
  }
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <label :for="inputId" class="text-xs font-medium" style="color: var(--sm-text-secondary)">
        {{ label }}
      </label>
      <span
        class="font-mono text-xs tabular-nums"
        style="color: var(--sm-text-primary)"
      >
        {{ displayValue ?? String(props.modelValue) }}
      </span>
    </div>
    <input
      :id="inputId"
      type="range"
      class="sm-slider"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      :aria-label="label"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="modelValue"
      :aria-valuetext="displayValue ?? String(modelValue)"
      @input="onInput"
    >
  </div>
</template>
