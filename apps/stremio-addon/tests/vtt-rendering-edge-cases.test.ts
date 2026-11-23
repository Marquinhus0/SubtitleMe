import { describe, expect, it } from 'vitest';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import {
  SubtitleFileService,
  attachGracefulShutdown,
  checkPortAvailable,
  startStremioAddonServer,
} from '../src/index';

const MULTILINE_EN_SRT = `1
00:00:01,000 --> 00:00:04,000
Line one — English
Line two (multiline)

2
00:00:08,000 --> 00:00:11,000
After an empty interval.
`;

const ACCENTED_PT_VTT = `WEBVTT

1
00:00:02.000 --> 00:00:05.000
Ação, coração & «acentuação» em português!

2
00:00:08.000 --> 00:00:11.000
Depois de um intervalo vazio.
`;

describe('Sprint 11 — Protocol-Level WebVTT Rendering Edge Cases & Companion Lifecycle', () => {
  it('handles simultaneous, overlapping, multiline, accented Portuguese, empty intervals, offsets, and stacking order', () => {
    const service = new SubtitleFileService({ baseUrl: 'http://127.0.0.1:7000' });

    const primary = {
      sourceId: 'en-1',
      language: 'en',
      format: 'srt' as const,
      content: MULTILINE_EN_SRT,
    };
    const secondary = {
      sourceId: 'pt-1',
      language: 'pt-BR',
      format: 'vtt' as const,
      content: ACCENTED_PT_VTT,
    };

    // Primary on top with independent offsets (+500ms primary, -250ms secondary)
    const deliveryPrimaryTop = service.generateCombinedVtt('tt1254207', primary, secondary, {
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: 500,
      secondaryOffsetMs: -250,
      order: 'primary-top',
      bilingualEnabled: true,
    });
    const vttPrimaryTop = service.getVttByToken(deliveryPrimaryTop.token) ?? '';
    expect(vttPrimaryTop.startsWith('WEBVTT')).toBe(true);
    // Output must remain clean plain-text WebVTT without relying on fragile CSS ::cue styles
    expect(vttPrimaryTop).not.toContain('STYLE');

    const parsedPrimaryTop = parseSubtitle(vttPrimaryTop, 'vtt');
    expect(parsedPrimaryTop.status).toBe('success');
    expect(
      parsedPrimaryTop.cues.some(
        (c) =>
          c.text.includes('Line one — English') &&
          c.text.includes('Ação, coração & «acentuação» em português!'),
      ),
    ).toBe(true);

    // Secondary on top reverses vertical stacking order
    const deliverySecondaryTop = service.generateCombinedVtt('tt1254207', primary, secondary, {
      primaryLanguage: 'en',
      secondaryLanguage: 'pt-BR',
      primaryOffsetMs: 0,
      secondaryOffsetMs: 0,
      order: 'secondary-top',
      bilingualEnabled: true,
    });
    const vttSecondaryTop = service.getVttByToken(deliverySecondaryTop.token) ?? '';
    const parsedSecondaryTop = parseSubtitle(vttSecondaryTop, 'vtt');
    const simultaneousCue = parsedSecondaryTop.cues.find(
      (c) =>
        c.text.includes('Depois de um intervalo vazio.') &&
        c.text.includes('After an empty interval.'),
    );
    expect(simultaneousCue).toBeDefined();
    expect(simultaneousCue?.text.startsWith('Depois de um intervalo vazio.')).toBe(true);
  });

  it('detects occupied loopback ports and shuts down gracefully clearing ephemeral VTT cache', async () => {
    const running = await startStremioAddonServer({ port: 0 });
    let shutdownSignal = '';
    const lifecycle = attachGracefulShutdown(running, (signal) => {
      shutdownSignal = signal;
    });

    try {
      // Occupied port is detected with a clear diagnostic reason
      const busy = await checkPortAvailable(running.port, '127.0.0.1');
      expect(busy.available).toBe(false);
      expect(busy.reason).toContain('already in use');

      // Seed cache and invoke graceful shutdown
      running.fileService.getCache().set('a'.repeat(48), 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nHi\n');
      expect(running.fileService.getCache().size()).toBe(1);

      await lifecycle.shutdown('SIGTERM');
      expect(shutdownSignal).toBe('SIGTERM');
      expect(running.fileService.getCache().size()).toBe(0);

      // Port is free again after graceful shutdown
      const freed = await checkPortAvailable(running.port, '127.0.0.1');
      expect(freed.available).toBe(true);
    } finally {
      lifecycle.detach();
    }
  });
});
