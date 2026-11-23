<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number;
  }>(),
  {
    size: 28,
  },
);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="30" height="30" rx="7" fill="#151923" stroke="#282F3D" stroke-width="1.5" />
    <rect x="6" y="7" width="20" height="4" rx="2" fill="#1C2230" />
    <rect x="6" y="15" width="20" height="3.5" rx="1.75" fill="#8B7CFF" />
    <rect x="8.5" y="21.5" width="15" height="3.5" rx="1.75" fill="#36CFC9" />
  </svg>
</template>
