import { describe, expect, it } from 'vitest';
import {
  formatTimestamp,
  normalizeTimestamp,
  parseSrtTimestamp,
  parseVttTimestamp,
} from '@subtitleme/subtitle-parser';

describe('Timestamp utilities', () => {
  it('parses standard SRT timestamps with comma and dot millisecond separators', () => {
    expect(parseSrtTimestamp('00:00:00,000')).toBe(0);
    expect(parseSrtTimestamp('00:00:01,000')).toBe(1000);
    expect(parseSrtTimestamp('00:00:03,500')).toBe(3500);
    expect(parseSrtTimestamp('01:02:03,456')).toBe(3_723_456);
    expect(parseSrtTimestamp('00:01:30.250')).toBe(90_250);
    expect(parseSrtTimestamp('100:59:59,999')).toBe(363_599_999);
  });

  it('parses standard WebVTT timestamps with and without hours', () => {
    expect(parseVttTimestamp('00:00:01.000')).toBe(1000);
    expect(parseVttTimestamp('00:04.000')).toBe(4000);
    expect(parseVttTimestamp('59:59.999')).toBe(3_599_999);
    expect(parseVttTimestamp('02:15:45.125')).toBe(8_145_125);
  });

  it('rejects invalid, negative, or out-of-range timestamp components', () => {
    expect(parseSrtTimestamp('-00:00:01,000')).toBeNull();
    expect(parseSrtTimestamp('00:60:00,000')).toBeNull();
    expect(parseSrtTimestamp('00:00:60,000')).toBeNull();
    expect(parseSrtTimestamp('00:00:01,1000')).toBeNull();
    expect(parseSrtTimestamp('00:01,000')).toBeNull();
    expect(parseSrtTimestamp('not-a-timestamp')).toBeNull();

    expect(parseVttTimestamp('00:00:01,000')).toBeNull(); // VTT requires dot
    expect(parseVttTimestamp('-00:01.000')).toBeNull();
    expect(parseVttTimestamp('60:00.000')).toBeNull();
    expect(parseVttTimestamp('00:60.000')).toBeNull();
  });

  it('dispatches via normalizeTimestamp and formats canonical SRT and VTT timestamps', () => {
    expect(normalizeTimestamp('00:00:02,345', 'srt')).toBe(2345);
    expect(normalizeTimestamp('00:02.345', 'vtt')).toBe(2345);

    expect(formatTimestamp(0, 'srt')).toBe('00:00:00,000');
    expect(formatTimestamp(3_723_456, 'srt')).toBe('01:02:03,456');
    expect(formatTimestamp(3_723_456, 'vtt')).toBe('01:02:03.456');

    expect(() => formatTimestamp(-1, 'srt')).toThrow(RangeError);
    expect(() => formatTimestamp(Number.NaN, 'vtt')).toThrow(RangeError);
  });
});
