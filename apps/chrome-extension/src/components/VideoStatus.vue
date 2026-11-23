<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerStatusSnapshot } from '@subtitleme/shared-types';
import type { ConnectionState } from '../stores/subtitle.store';
import { useI18n } from '../i18n';

const props = withDefaults(
  defineProps<{
    snapshot: PlayerStatusSnapshot | null;
    connectionState?: ConnectionState;
    extensionEnabled?: boolean;
    showRefresh?: boolean;
  }>(),
  {
    connectionState: 'idle',
    extensionEnabled: true,
    showRefresh: true,
  },
);

const emit = defineEmits<{
  refresh: [];
}>();

const { t } = useI18n();

const badge = computed(() => {
  if (!props.extensionEnabled) {
    return { label: t('player.badgeDisabled'), className: 'sm-badge' };
  }
  if (props.connectionState === 'checking') {
    return { label: t('player.badgeIdle'), className: 'sm-badge' };
  }
  if (props.snapshot?.status === 'detected') {
    return { label: t('player.badgeConnected'), className: 'sm-badge sm-badge-success' };
  }
  if (props.snapshot?.status === 'tracks-unavailable') {
    return { label: t('player.badgeNoTracks'), className: 'sm-badge sm-badge-warning' };
  }
  if (props.snapshot?.status === 'no-video') {
    return { label: t('player.badgeNoVideo'), className: 'sm-badge' };
  }
  return { label: t('player.badgeIdle'), className: 'sm-badge' };
});

const statusMessage = computed(() => {
  if (props.connectionState === 'checking') {
    return t('player.checking');
  }
  if (props.connectionState === 'unavailable-page') {
    return t('player.unavailablePage');
  }
  if (props.snapshot?.status === 'detected') {
    return t('player.detected', {
      host: props.snapshot.hostname || 'page',
      count: props.snapshot.nativeTracks.length,
    });
  }
  if (props.snapshot?.status === 'tracks-unavailable') {
    return t('player.tracksUnavailable', {
      host: props.snapshot.hostname || 'page',
    });
  }
  if (props.snapshot?.status === 'no-video') {
    return t('player.noVideo');
  }
  return t('player.idle');
});

const hasActiveVideo = computed(
  () =>
    props.snapshot !== null &&
    (props.snapshot.status === 'detected' || props.snapshot.status === 'tracks-unavailable'),
);
</script>

<template>
  <section class="sm-card p-3" aria-live="polite">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold tracking-wide uppercase" style="color: var(--sm-text-secondary)">
          {{ t('player.statusTitle') }}
        </span>
        <span :class="badge.className">{{ badge.label }}</span>
      </div>

      <button
        v-if="showRefresh"
        type="button"
        class="sm-btn sm-btn-ghost px-2 py-1 text-[11px]"
        :disabled="connectionState === 'checking'"
        @click="emit('refresh')"
      >
        {{ t('common.refresh') }}
      </button>
    </div>

    <p class="mt-2 text-xs leading-relaxed" style="color: var(--sm-text-secondary)">
      {{ statusMessage }}
    </p>

    <!-- Honest live telemetry chips when an HTML5 video player is connected -->
    <div v-if="hasActiveVideo && snapshot" class="mt-2 flex flex-wrap items-center gap-1.5">
      <span class="sm-badge">
        {{ snapshot.paused ? t('player.badgePaused') : t('player.badgePlaying') }}
      </span>
      <span v-if="snapshot.isFullscreen" class="sm-badge sm-badge-primary">
        {{ t('player.badgeFullscreen') }}
      </span>
      <span v-if="snapshot.videoCount > 1" class="sm-badge">
        {{ t('player.badgeVideos', { count: snapshot.videoCount }) }}
      </span>
      <span v-if="snapshot.nativeTracks.length > 0" class="sm-badge sm-badge-primary">
        {{ t('player.badgeNativeCount', { count: snapshot.nativeTracks.length }) }}
      </span>
      <span v-if="(snapshot.localTrackCount ?? 0) > 0" class="sm-badge sm-badge-secondary">
        {{ t('player.badgeLocalCount', { count: snapshot.localTrackCount ?? 0 }) }}
      </span>
    </div>
  </section>
</template>
