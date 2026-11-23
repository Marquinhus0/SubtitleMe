import type {
  SubtitleCue,
  SubtitleDiagnostic,
  SubtitleParseResult,
} from '@subtitleme/shared-types';
import { finalizeParseResult, splitIntoBlocks } from './blocks';
import {
  detectLineEnding,
  normalizeLineEndings,
  normalizeSubtitleText,
  stripBom,
} from './text-normalizer';
import { parseSrtTimestamp } from './timestamp';
import { validateCues } from './validator';

export interface SrtParseOptions {
  /** Discard cues whose normalized text is empty. Defaults to true. */
  dropEmptyCues?: boolean;
  /** Allow cues where start === end. Defaults to false (rejected). */
  allowZeroDuration?: boolean;
}

const ARROW = '-->';

/**
 * Parses SubRip (.srt) content into normalized SubtitleCues with structured diagnostics.
 */
export function parseSrt(content: string, options: SrtParseOptions = {}): SubtitleParseResult {
  const dropEmptyCues = options.dropEmptyCues ?? true;
  const allowZeroDuration = options.allowZeroDuration ?? false;

  const { content: withoutBom, hasBom } = stripBom(content);
  const lineEnding = detectLineEnding(withoutBom);
  const normalized = normalizeLineEndings(withoutBom);
  const blocks = splitIntoBlocks(normalized);

  const diagnostics: SubtitleDiagnostic[] = [];

  if (blocks.length === 0) {
    diagnostics.push({
      code: 'EMPTY_INPUT',
      severity: 'error',
      message: 'SRT input is empty or contains only whitespace.',
      line: 1,
    });
    return finalizeParseResult(
      'srt',
      [],
      diagnostics,
      {
        hasBom,
        lineEnding,
        totalBlocks: 0,
        skippedBlocks: 0,
      },
      true,
    );
  }

  const cues: SubtitleCue[] = [];
  let skippedBlocks = 0;

  for (const block of blocks) {
    const firstLine = block.lines[0]?.trim() ?? '';
    const secondLine = block.lines[1]?.trim();

    let id: string;
    let timingLine: string;
    let timingLineNumber: number;
    let textLines: string[];

    if (firstLine.includes(ARROW)) {
      // Optional cue numbering omitted
      id = String(cues.length + 1);
      timingLine = firstLine;
      timingLineNumber = block.startLine;
      textLines = block.lines.slice(1);
    } else if (secondLine !== undefined && secondLine.includes(ARROW)) {
      id = firstLine || String(cues.length + 1);
      timingLine = secondLine;
      timingLineNumber = block.startLine + 1;
      textLines = block.lines.slice(2);
    } else {
      skippedBlocks += 1;
      diagnostics.push({
        code: 'MALFORMED_CUE_BLOCK',
        severity: 'error',
        message: `Block at line ${block.startLine} does not contain a valid SRT timing line.`,
        line: block.startLine,
      });
      continue;
    }

    const arrowIdx = timingLine.indexOf(ARROW);
    const rawStart = timingLine.slice(0, arrowIdx).trim();
    const afterArrow = timingLine.slice(arrowIdx + ARROW.length).trim();
    // SRT occasionally carries trailing coordinate settings (e.g. X1:..); take first token as end timestamp
    const rawEnd = afterArrow.split(/\s+/)[0] ?? '';

    const start = parseSrtTimestamp(rawStart);
    const end = parseSrtTimestamp(rawEnd);

    if (start === null || end === null) {
      skippedBlocks += 1;
      diagnostics.push({
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
        message: `Invalid SRT timestamp at line ${timingLineNumber}: "${timingLine}".`,
        line: timingLineNumber,
      });
      continue;
    }

    if (end < start) {
      skippedBlocks += 1;
      diagnostics.push({
        code: 'INVALID_TIMESTAMP_ORDER',
        severity: 'error',
        message: `End timestamp (${rawEnd}) precedes start timestamp (${rawStart}) at line ${timingLineNumber}.`,
        line: timingLineNumber,
      });
      continue;
    }

    if (end === start && !allowZeroDuration) {
      skippedBlocks += 1;
      diagnostics.push({
        code: 'ZERO_DURATION_CUE',
        severity: 'error',
        message: `Zero-duration cue (${rawStart} --> ${rawEnd}) rejected at line ${timingLineNumber}.`,
        line: timingLineNumber,
      });
      continue;
    }

    const { text, strippedMarkup } = normalizeSubtitleText(textLines.join('\n'), 'srt');

    if (strippedMarkup) {
      diagnostics.push({
        code: 'UNSUPPORTED_MARKUP_STRIPPED',
        severity: 'info',
        message: `Markup tags normalized to plain text in cue "${id}" at line ${timingLineNumber}.`,
        line: timingLineNumber,
        cueIndex: cues.length,
      });
    }

    if (text.length === 0) {
      diagnostics.push({
        code: 'EMPTY_CUE_TEXT',
        severity: 'warning',
        message: `Cue "${id}" at line ${timingLineNumber} has empty text after normalization.`,
        line: timingLineNumber,
        cueIndex: cues.length,
      });
      if (dropEmptyCues) {
        skippedBlocks += 1;
        continue;
      }
    }

    cues.push({ id, start, end, text });
  }

  const validationDiagnostics = validateCues(cues, { allowZeroDuration });
  for (const diag of validationDiagnostics) {
    // Avoid duplicating EMPTY_CUE_TEXT if dropEmptyCues === false
    if (diag.code === 'EMPTY_CUE_TEXT' && !dropEmptyCues) continue;
    diagnostics.push(diag);
  }

  return finalizeParseResult(
    'srt',
    cues,
    diagnostics,
    {
      hasBom,
      lineEnding,
      totalBlocks: blocks.length,
      skippedBlocks,
    },
    cues.length === 0,
  );
}
