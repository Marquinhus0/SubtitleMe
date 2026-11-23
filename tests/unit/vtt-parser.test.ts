import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  createSubtitleParser,
  detectSubtitleFormat,
  formatTimestamp,
  parseSubtitle,
  parseVtt,
} from '@subtitleme/subtitle-parser';

const currentDir = dirname(fileURLToPath(import.meta.url));
const vttFixturesDir = resolve(currentDir, '../fixtures/vtt');

function readVttFixture(name: string): string {
  return readFileSync(resolve(vttFixturesDir, name), 'utf-8');
}

describe('WebVTT parser, format detection, and performance', () => {
  it('parses standard.vtt including optional hours and cue IDs', () => {
    const result = parseVtt(readVttFixture('standard.vtt'));
    expect(result.status).toBe('success');
    expect(result.format).toBe('vtt');
    expect(result.cues).toEqual([
      { id: '1', start: 1000, end: 3500, text: 'Hello!' },
      { id: '2', start: 4000, end: 6000, text: 'Short timestamp without hours.' },
    ]);
  });

  it('preserves multiline cues and custom identifiers in multiline.vtt', () => {
    const result = parseVtt(readVttFixture('multiline.vtt'));
    expect(result.status).toBe('success');
    expect(result.cues[0]?.id).toBe('intro-1');
    expect(result.cues[0]?.text).toBe('Line one in WebVTT.\nLine two in WebVTT.');
    expect(result.cues[1]?.id).toBe('intro-2');
    expect(result.cues[1]?.text).toBe('- Good morning.\n- Bom dia!');
  });

  it('preserves header metadata, STYLE, REGION, and cue settings in metadata.vtt', () => {
    const result = parseVtt(readVttFixture('metadata.vtt'));
    expect(result.status).toBe('success');
    expect(result.metadata.header).toContain('Sample Metadata Header');
    expect(result.metadata.header).toContain('Language: en');
    expect(result.metadata.styles).toHaveLength(1);
    expect(result.metadata.regions).toHaveLength(1);
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0]?.id).toBe('cue-meta');
    expect(result.cues[0]?.settings).toEqual({
      align: 'start',
      position: '10%',
      line: '85%',
    });
  });

  it('ignores single-line and multi-line NOTE blocks while recording count', () => {
    const result = parseVtt(readVttFixture('note-blocks.vtt'));
    expect(result.status).toBe('success');
    expect(result.metadata.notesCount).toBe(2);
    expect(result.cues).toHaveLength(1);
    expect(result.cues[0]?.text).toBe('Visible cue after NOTE blocks.');
  });

  it('preserves overlapping cues in overlapping.vtt', () => {
    const result = parseVtt(readVttFixture('overlapping.vtt'));
    expect(result.status).toBe('success');
    expect(result.cues).toHaveLength(2);
    expect(result.diagnostics.some((d) => d.code === 'OVERLAPPING_CUES')).toBe(true);
  });

  it('recovers valid cues from malformed.vtt and reports structured errors', () => {
    const result = parseVtt(readVttFixture('malformed.vtt'));
    expect(result.status).toBe('success-with-warnings');
    expect(result.cues).toHaveLength(2);
    expect(result.errors.some((e) => e.code === 'MALFORMED_CUE_BLOCK')).toBe(true);
    expect(result.errors.some((e) => e.code === 'INVALID_TIMESTAMP_ORDER')).toBe(true);
  });

  it('returns fatal error for empty.vtt and missing WEBVTT header', () => {
    const emptyResult = parseVtt(readVttFixture('empty.vtt'));
    expect(emptyResult.status).toBe('error');
    expect(emptyResult.errors[0]?.code).toBe('EMPTY_INPUT');

    const noHeader = parseVtt('00:00:01.000 --> 00:00:02.000\nMissing header');
    expect(noHeader.status).toBe('error');
    expect(noHeader.errors[0]?.code).toBe('MISSING_VTT_HEADER');
  });

  it('sanitizes WebVTT voice/class/timestamp tags and blocks executable markup in formatting.vtt', () => {
    const result = parseVtt(readVttFixture('formatting.vtt'));
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0]?.text).toBe('Hello world!');
    expect(result.cues[1]?.text).toBe('A & B <img src=x onerror=alert(1)> clean');
    expect(result.cues[1]?.text).not.toContain('evil()');
  });

  it('preserves Unicode text across scripts in unicode.vtt', () => {
    const result = parseVtt(readVttFixture('unicode.vtt'));
    expect(result.status).toBe('success');
    expect(result.cues[0]?.text).toBe('Você está pronto? Sim, vamos começar!');
    expect(result.cues[1]?.text).toBe('مرحبا بالعالم — こんにちは — Здравствуйте!');
  });

  it('auto-detects SRT and VTT formats via detectSubtitleFormat and createSubtitleParser', () => {
    const parser = createSubtitleParser();
    expect(parser.supportedFormats).toEqual(['srt', 'vtt']);

    expect(detectSubtitleFormat(readVttFixture('standard.vtt'))).toBe('vtt');
    expect(detectSubtitleFormat('1\n00:00:01,000 --> 00:00:02,000\nHi')).toBe('srt');
    expect(detectSubtitleFormat('unknown content', 'captions.vtt')).toBe('vtt');
    expect(detectSubtitleFormat('unknown content', 'movie.srt')).toBe('srt');
    expect(detectSubtitleFormat('random text with no timestamps')).toBeNull();

    const unknownResult = parseSubtitle('random text with no timestamps');
    expect(unknownResult.status).toBe('error');
    expect(unknownResult.errors[0]?.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('parses a large 5,000-cue subtitle file efficiently in linear time', () => {
    const cueCount = 5000;
    const blocks: string[] = ['WEBVTT'];
    for (let i = 0; i < cueCount; i += 1) {
      const start = i * 2000;
      const end = start + 1500;
      blocks.push(
        `${i + 1}\n${formatTimestamp(start, 'vtt')} --> ${formatTimestamp(end, 'vtt')}\nLine ${i + 1} in English\nLinha ${i + 1} em Português`,
      );
    }
    const largeVtt = blocks.join('\n\n');

    const startedAt = performance.now();
    const result = parseSubtitle(largeVtt);
    const elapsedMs = performance.now() - startedAt;

    expect(result.status).toBe('success');
    expect(result.cues).toHaveLength(cueCount);
    expect(result.cues[cueCount - 1]?.start).toBe((cueCount - 1) * 2000);
    // Generous upper bound for CI stability; typically completes in < 30 ms
    expect(elapsedMs).toBeLessThan(500);
  });
});
