import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSrt, parseSubtitle } from '@subtitleme/subtitle-parser';

const currentDir = dirname(fileURLToPath(import.meta.url));
const srtFixturesDir = resolve(currentDir, '../fixtures/srt');

function readSrtFixture(name: string): string {
  return readFileSync(resolve(srtFixturesDir, name), 'utf-8');
}

describe('SRT parser', () => {
  it('parses standard.srt into normalized cues', () => {
    const result = parseSrt(readSrtFixture('standard.srt'));
    expect(result.status).toBe('success');
    expect(result.format).toBe('srt');
    expect(result.errors).toEqual([]);
    expect(result.cues).toEqual([
      { id: '1', start: 1000, end: 3500, text: 'Hello!' },
      { id: '2', start: 4000, end: 6000, text: "How are you?\nI'm fine." },
    ]);
  });

  it('preserves multiline dialogue in multiline.srt', () => {
    const result = parseSrt(readSrtFixture('multiline.srt'));
    expect(result.status).toBe('success');
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]?.text).toBe(
      'First line of dialogue.\nSecond line of dialogue.\nThird line for emphasis.',
    );
    expect(result.cues[1]?.text).toBe('- Are you ready?\n- Always ready.');
  });

  it('handles UTF-8 BOM in bom.srt', () => {
    const result = parseSrt(readSrtFixture('bom.srt'));
    expect(result.status).toBe('success');
    expect(result.metadata.hasBom).toBe(true);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]?.id).toBe('1');
    expect(result.cues[0]?.text).toBe('UTF-8 BOM header test.');
  });

  it('preserves overlapping cues and emits informational diagnostic', () => {
    const result = parseSrt(readSrtFixture('overlapping.srt'));
    expect(result.status).toBe('success');
    expect(result.cues).toHaveLength(3);
    expect(result.diagnostics.some((d) => d.code === 'OVERLAPPING_CUES')).toBe(true);
  });

  it('recovers valid cues from malformed.srt and reports diagnostics', () => {
    const result = parseSrt(readSrtFixture('malformed.srt'));
    expect(result.status).toBe('success-with-warnings');
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]?.text).toBe('Valid first cue.');
    expect(result.cues[1]?.text).toBe('Recovered valid cue after malformed block.');
    expect(result.errors.some((d) => d.code === 'MALFORMED_CUE_BLOCK')).toBe(true);
    expect(result.metadata.skippedBlocks).toBe(1);
  });

  it('returns fatal error status for empty.srt', () => {
    const result = parseSrt(readSrtFixture('empty.srt'));
    expect(result.status).toBe('error');
    expect(result.cues).toEqual([]);
    expect(result.errors[0]?.code).toBe('EMPTY_INPUT');
  });

  it('rejects invalid timestamps, reverse order, and zero-duration cues in invalid-timestamps.srt', () => {
    const result = parseSrt(readSrtFixture('invalid-timestamps.srt'));
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0]?.id).toBe('5');

    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('INVALID_TIMESTAMP');
    expect(codes).toContain('INVALID_TIMESTAMP_ORDER');
    expect(codes).toContain('ZERO_DURATION_CUE');

    // Explicit opt-in policy allows zero-duration cue with warning
    const allowZero = parseSrt(readSrtFixture('invalid-timestamps.srt'), {
      allowZeroDuration: true,
    });
    expect(allowZero.cues).toHaveLength(2);
    expect(allowZero.warnings.some((w) => w.code === 'ZERO_DURATION_CUE')).toBe(true);
  });

  it('normalizes formatting tags, decodes entities, and strips executable script payloads', () => {
    const result = parseSrt(readSrtFixture('formatting.srt'));
    expect(result.cues).toHaveLength(3);
    expect(result.cues[0]?.text).toBe('Whispered and bold with color.');
    expect(result.cues[1]?.text).toBe('Tom & Jerry — "Classic" <3');
    expect(result.cues[2]?.text).toBe('Safe text  remains clean.');
    expect(result.cues[2]?.text).not.toContain('<script');
    expect(result.cues[2]?.text).not.toContain('alert(');
  });

  it('preserves multilingual Unicode characters and emoji in unicode.srt', () => {
    const result = parseSrt(readSrtFixture('unicode.srt'));
    expect(result.status).toBe('success');
    expect(result.cues[0]?.text).toBe('Olá, São Paulo! Ação, coração e café.');
    expect(result.cues[1]?.text).toBe('日本語の字幕テスト — 한국어 자막 — Привет!');
    expect(result.cues[2]?.text).toBe('Emoji check: 🎬🌍✨');
  });

  it('handles CRLF line endings, optional cue numbering, dot milliseconds, and duplicate IDs', () => {
    const crlfContent =
      '00:00:01.000 --> 00:00:02.500\r\nUnnumbered cue.\r\n\r\n1\r\n00:00:03,000 --> 00:00:04,000\r\nDuplicate ID cue.\r\n';
    const result = parseSubtitle(crlfContent, 'srt');
    expect(result.metadata.lineEnding).toBe('CRLF');
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]?.id).toBe('1');
    expect(result.cues[1]?.id).toBe('1');
    expect(result.warnings.some((w) => w.code === 'DUPLICATE_CUE_ID')).toBe(true);
  });
});
