import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  prepareSubtitleImport,
} from '../../apps/chrome-extension/src/services/subtitle-import';

describe('Local subtitle import pipeline', () => {
  it('parses valid SRT and VTT files and generates preview metadata', async () => {
    const srtText = `1
00:00:01,000 --> 00:00:03,000
Hello world!

2
00:00:04,000 --> 00:00:07,500
Second cue.`;
    const srtFile = new File([srtText], 'english.srt', { type: 'text/plain' });
    const srtRes = await prepareSubtitleImport(srtFile);

    expect(srtRes.ok).toBe(true);
    if (srtRes.ok) {
      expect(srtRes.pending.format).toBe('srt');
      expect(srtRes.pending.cueCount).toBe(2);
      expect(srtRes.pending.durationMs).toBe(7500);
      expect(srtRes.pending.previewCues).toHaveLength(2);
      expect(srtRes.pending.isDuplicate).toBe(false);
    }

    const vttText = `WEBVTT

00:00:01.000 --> 00:00:03.000
Olá mundo!`;
    const vttFile = new File([vttText], 'pt.vtt', { type: 'text/vtt' });
    const vttRes = await prepareSubtitleImport(vttFile);
    expect(vttRes.ok).toBe(true);
    if (vttRes.ok) {
      expect(vttRes.pending.format).toBe('vtt');
      expect(vttRes.pending.cueCount).toBe(1);
    }
  });

  it('rejects spoofed extensions, empty files, oversized files, and flags duplicates', async () => {
    // Spoofed .srt containing plain text (does not trust extension alone)
    const spoofed = new File(['This is just a random text file'], 'fake.srt');
    const spoofRes = await prepareSubtitleImport(spoofed);
    expect(spoofRes.ok).toBe(false);
    if (!spoofRes.ok) {
      expect(spoofRes.code).toBe('INVALID_FORMAT');
    }

    // Empty file
    const empty = new File([''], 'empty.srt');
    const emptyRes = await prepareSubtitleImport(empty);
    expect(emptyRes.ok).toBe(false);
    if (!emptyRes.ok) {
      expect(emptyRes.code).toBe('EMPTY_FILE');
    }

    // Oversized file rejected before reading
    const big = new File(['1\n00:00:01,000 --> 00:00:02,000\nHi'], 'big.srt');
    const bigRes = await prepareSubtitleImport(big, { maxSizeBytes: 10 });
    expect(bigRes.ok).toBe(false);
    if (!bigRes.ok) {
      expect(bigRes.code).toBe('FILE_TOO_LARGE');
    }

    // Duplicate detection
    const body = '1\n00:00:01,000 --> 00:00:02,000\nDup test';
    const dupFile = new File([body], 'dup.srt');
    const dupRes = await prepareSubtitleImport(dupFile, {
      existingHashes: new Set([computeContentHash(body)]),
    });
    expect(dupRes.ok).toBe(true);
    if (dupRes.ok) {
      expect(dupRes.pending.isDuplicate).toBe(true);
    }
  });
});
