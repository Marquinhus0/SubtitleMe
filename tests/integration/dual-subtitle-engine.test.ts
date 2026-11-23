// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import { createTrackManager } from '@subtitleme/subtitle-core';
import { createMediaSyncController, type MediaElementLike } from '@subtitleme/subtitle-sync';
import { createShadowSubtitleRenderer } from '@subtitleme/subtitle-renderer';

describe('Integration — Dual Subtitle Engine (Parser + Core + Sync + Shadow Renderer)', () => {
  it('parses two independent subtitle files, synchronizes them with offsets, and renders both in Shadow DOM', () => {
    const enSrt = `1
00:00:01,000 --> 00:00:04,000
Two languages.

2
00:00:05,000 --> 00:00:08,000
One experience.
`;
    const ptVtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Dois idiomas.

2
00:00:05.000 --> 00:00:08.000
Uma experiência.
`;

    const parsedEn = parseSubtitle(enSrt, 'srt');
    const parsedPt = parseSubtitle(ptVtt, 'vtt');
    expect(parsedEn.status).toBe('success');
    expect(parsedPt.status).toBe('success');

    const trackManager = createTrackManager('integration-player');
    trackManager.registerTrack({
      id: 'en-track',
      language: 'en',
      label: 'English',
      source: 'local',
      cues: parsedEn.cues,
      offset: 0,
      enabled: true,
    });
    trackManager.registerTrack({
      id: 'pt-track',
      language: 'pt-BR',
      label: 'Português (Brasil)',
      source: 'local',
      cues: parsedPt.cues,
      offset: 500, // Portuguese delayed by +500 ms
      enabled: true,
    });
    trackManager.selectTrack('primary', 'en-track');
    trackManager.selectTrack('secondary', 'pt-track');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const renderer = createShadowSubtitleRenderer({ playerId: 'integration-player' });
    renderer.mount(container);

    const listeners = new Map<string, Set<() => void>>();
    const media: MediaElementLike & { currentTime: number; emit(type: string): void } = {
      currentTime: 0,
      duration: 20,
      playbackRate: 1,
      paused: true,
      ended: false,
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)?.add(fn);
      },
      removeEventListener(type, fn) {
        listeners.get(type)?.delete(fn);
      },
      emit(type) {
        for (const fn of listeners.get(type) ?? []) fn();
      },
    };

    const controller = createMediaSyncController(media, trackManager);
    controller.subscribe((snapshot) => {
      renderer.render(snapshot, {
        appearance: DEFAULT_SETTINGS.appearance,
        order: 'primary-top',
        visible: true,
      });
    });

    controller.start();

    const shadow = renderer.getHostElement()?.shadowRoot;
    const primaryEl = shadow?.querySelector('[data-slot="primary"]') as HTMLElement;
    const secondaryEl = shadow?.querySelector('[data-slot="secondary"]') as HTMLElement;

    // At 1.2s: English active, Portuguese not yet active (+500ms offset)
    media.currentTime = 1.2;
    media.emit('seeked');
    expect(primaryEl.textContent).toBe('Two languages.');
    expect(secondaryEl.textContent).toBe('');

    // At 2.0s: Both active simultaneously
    media.currentTime = 2.0;
    media.emit('seeked');
    expect(primaryEl.textContent).toBe('Two languages.');
    expect(secondaryEl.textContent).toBe('Dois idiomas.');

    // At 6.0s: Second cue pair active simultaneously
    media.currentTime = 6.0;
    media.emit('seeked');
    expect(primaryEl.textContent).toBe('One experience.');
    expect(secondaryEl.textContent).toBe('Uma experiência.');

    controller.dispose();
    renderer.unmount();
    container.remove();
  });
});
