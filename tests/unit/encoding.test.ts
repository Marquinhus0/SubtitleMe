import { describe, expect, it } from 'vitest';
import { decodeSubtitleBytes } from '@subtitleme/subtitle-parser';

describe('Encoding detection and normalization', () => {
  it('decodes standard UTF-8 with multilingual text cleanly without warnings', () => {
    const sample = 'Olá São Paulo! ¿Cómo estás? 日本語 🎬';
    const bytes = new TextEncoder().encode(sample);
    const result = decodeSubtitleBytes(bytes);

    expect(result.encoding).toBe('utf-8');
    expect(result.hadBom).toBe(false);
    expect(result.warning).toBeUndefined();
    expect(result.text).toBe(sample);
  });

  it('detects and strips UTF-8 BOM', () => {
    const body = new TextEncoder().encode('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nAção!');
    const withBom = new Uint8Array(3 + body.length);
    withBom.set([0xef, 0xbb, 0xbf], 0);
    withBom.set(body, 3);

    const result = decodeSubtitleBytes(withBom);
    expect(result.encoding).toBe('utf-8-bom');
    expect(result.hadBom).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(result.text.startsWith('WEBVTT')).toBe(true);
    expect(result.text).toContain('Ação!');
  });

  it('falls back to Windows-1252 with warning for legacy Portuguese and Spanish bytes', () => {
    // Windows-1252 bytes for "Ação & Niño" -> 0x41 0xE7 0xE3 0x6F 0x20 0x26 0x20 0x4E 0x69 0xF1 0x6F
    const legacyBytes = new Uint8Array([
      0x41, 0xe7, 0xe3, 0x6f, 0x20, 0x26, 0x20, 0x4e, 0x69, 0xf1, 0x6f,
    ]);

    const result = decodeSubtitleBytes(legacyBytes);
    expect(result.encoding).toBe('windows-1252');
    expect(result.text).toBe('Ação & Niño');
    expect(result.warning).toBeDefined();
  });
});
