// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import { OverlayManager } from '../../apps/chrome-extension/src/content/overlay-manager';
import { Html5VideoAdapter } from '../../apps/chrome-extension/src/content/player-adapter';
import { PlayerLifecycleManager } from '../../apps/chrome-extension/src/content/player-lifecycle';

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.slice(0, 2), 16) / 255;
  const g = Number.parseInt(clean.slice(2, 4), 16) / 255;
  const b = Number.parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Sprint 07 QA — Accessibility Contrast & Resilience', () => {
  it('meets WCAG 2.2 AA (>= 4.5:1) contrast for primary, secondary, and muted text on dark surfaces', () => {
    const surfaces = ['#0B0D12', '#151923', '#1C2230'];
    const textTokens = ['#F4F5FA', '#9299AA', '#8991A5'];

    for (const bg of surfaces) {
      for (const fg of textTokens) {
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('recovers gracefully if primary container rejects Shadow DOM attachment', () => {
    const container = document.createElement('div');
    const video = document.createElement('video');
    container.appendChild(video);
    document.body.appendChild(container);

    // Simulate a hostile container whose appendChild throws
    const brokenAdapter = new Html5VideoAdapter();
    container.appendChild = (() => {
      throw new Error('Host container blocked append');
    }) as typeof container.appendChild;

    const manager = new OverlayManager('resilient-player');
    expect(() => manager.attachToVideo(video, brokenAdapter)).not.toThrow();
    // Fell back safely to document.body
    expect(manager.getMountedContainer()).toBe(document.body);

    manager.dispose();
    document.body.innerHTML = '';
  });

  it('handles rapid fullscreen toggling and 5-player lifecycle without leaking sessions or overlays', () => {
    const wrapper = document.createElement('div');
    const videos: HTMLVideoElement[] = [];

    for (let i = 0; i < 5; i += 1) {
      const box = document.createElement('div');
      const v = document.createElement('video');
      box.appendChild(v);
      wrapper.appendChild(box);
      videos.push(v);
    }
    document.body.appendChild(wrapper);

    const lifecycle = new PlayerLifecycleManager({
      root: document,
      initialSettings: DEFAULT_SETTINGS,
    });
    lifecycle.start();

    expect(lifecycle.listSessions()).toHaveLength(5);
    expect(document.querySelectorAll('[data-subtitleme-overlay]')).toHaveLength(5);

    // Rapid fullscreen toggles
    for (let cycle = 0; cycle < 5; cycle += 1) {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: cycle % 2 === 0 ? wrapper : null,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    }

    // Remove all 5 videos one by one and confirm zero leaks
    for (const v of videos) {
      lifecycle.unregisterVideo(v);
      v.parentElement?.remove();
    }

    expect(lifecycle.listSessions()).toHaveLength(0);
    expect(lifecycle.getActiveSession()).toBeNull();
    expect(document.querySelectorAll('[data-subtitleme-overlay]')).toHaveLength(0);

    lifecycle.dispose();
    document.body.innerHTML = '';
  });
});
