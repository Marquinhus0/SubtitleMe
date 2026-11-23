import type {
  SubtitleCue,
  SubtitleDiagnostic,
  SubtitleParseMetadata,
  SubtitleParseResult,
} from '@subtitleme/shared-types';
import { finalizeParseResult, splitIntoBlocks } from './blocks';
import {
  detectLineEnding,
  normalizeLineEndings,
  normalizeSubtitleText,
  stripBom,
} from './text-normalizer';
import { parseVttTimestamp } from './timestamp';
import { validateCues } from './validator';

export interface VttParseOptions {
  /** Discard cues whose normalized text is empty. Defaults to true. */
  dropEmptyCues?: boolean;
  /** Allow cues where start === end. Defaults to false (rejected). */
  allowZeroDuration?: boolean;
}

const ARROW = '-->';
const VTT_HEADER_RE = /^WEBVTT(?:([ \t]+)(.*))?$/;

function parseCueSettings(rawSettings: string): Record<string, string> | undefined {
  const trimmed = rawSettings.trim();
  if (!trimmed) return undefined;

  const settings: Record<string, string> = {};
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    const colonIdx = token.indexOf(':');
    if (colonIdx > 0 && colonIdx < token.length - 1) {
      const key = token.slice(0, colonIdx);
      const value = token.slice(colonIdx + 1);
      settings[key] = value;
    }
  }
  return Object.keys(settings).length > 0 ? settings : undefined;
}

/**
 * Parses WebVTT (.vtt) content into normalized SubtitleCues with structured diagnostics,
 * preserving cue settings, header metadata, STYLE, REGION, and NOTE counts.
 */
export function parseVtt(content: string, options: VttParseOptions = {}): SubtitleParseResult {
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
      message: 'WebVTT input is empty or contains only whitespace.',
      line: 1,
    });
    return finalizeParseResult(
      'vtt',
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

  const headerBlock = blocks[0];
  const headerFirstLine = headerBlock?.lines[0]?.trim() ?? '';
  const headerMatch = VTT_HEADER_RE.exec(headerFirstLine);

  if (!headerMatch) {
    diagnostics.push({
      code: 'MISSING_VTT_HEADER',
      severity: 'error',
      message: 'WebVTT file must start with a valid "WEBVTT" header.',
      line: headerBlock?.startLine ?? 1,
    });
    return finalizeParseResult(
      'vtt',
      [],
      diagnostics,
      {
        hasBom,
        lineEnding,
        totalBlocks: blocks.length,
        skippedBlocks: blocks.length,
      },
      true,
    );
  }

  const headerExtraLines = headerBlock?.lines.slice(1) ?? [];
  const headerInlineMeta = headerMatch[2]?.trim() ?? '';
  const headerParts = [headerInlineMeta, ...headerExtraLines.map((l) => l.trim())].filter(
    (part) => part.length > 0,
  );
  const headerMeta = headerParts.length > 0 ? headerParts.join('\n') : undefined;

  const cues: SubtitleCue[] = [];
  const styles: string[] = [];
  const regions: string[] = [];
  let notesCount = 0;
  let skippedBlocks = 0;

  for (let i = 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!block) continue;

    const firstLine = block.lines[0]?.trim() ?? '';

    if (firstLine === 'NOTE' || firstLine.startsWith('NOTE ') || firstLine.startsWith('NOTE\t')) {
      notesCount += 1;
      continue;
    }

    if (firstLine === 'STYLE') {
      styles.push(block.lines.slice(1).join('\n').trim());
      continue;
    }

    if (firstLine === 'REGION') {
      regions.push(block.lines.slice(1).join('\n').trim());
      continue;
    }

    let id: string;
    let timingLine: string;
    let timingLineNumber: number;
    let textLines: string[];

    const secondLine = block.lines[1]?.trim();

    if (firstLine.includes(ARROW)) {
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
        message: `Block at line ${block.startLine} does not contain a valid WebVTT timing line.`,
        line: block.startLine,
      });
      continue;
    }

    const arrowIdx = timingLine.indexOf(ARROW);
    const rawStart = timingLine.slice(0, arrowIdx).trim();
    const afterArrow = timingLine.slice(arrowIdx + ARROW.length).trim();
    const firstSpaceIdx = afterArrow.search(/\s/);
    const rawEnd = firstSpaceIdx === -1 ? afterArrow : afterArrow.slice(0, firstSpaceIdx);
    const rawSettings = firstSpaceIdx === -1 ? '' : afterArrow.slice(firstSpaceIdx + 1);

    const start = parseVttTimestamp(rawStart);
    const end = parseVttTimestamp(rawEnd);

    if (start === null || end === null) {
      skippedBlocks += 1;
      diagnostics.push({
        code: 'INVALID_TIMESTAMP',
        severity: 'error',
        message: `Invalid WebVTT timestamp at line ${timingLineNumber}: "${timingLine}".`,
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

    const { text, strippedMarkup } = normalizeSubtitleText(textLines.join('\n'), 'vtt');

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

    const settings = parseCueSettings(rawSettings);
    const cue: SubtitleCue = settings ? { id, start, end, text, settings } : { id, start, end, text };
    cues.push(cue);
  }

  const validationDiagnostics = validateCues(cues, { allowZeroDuration });
  for (const diag of validationDiagnostics) {
    if (diag.code === 'EMPTY_CUE_TEXT' && !dropEmptyCues) continue;
    diagnostics.push(diag);
  }

  const metadata: SubtitleParseMetadata = {
    hasBom,
    lineEnding,
    totalBlocks: blocks.length,
    skippedBlocks,
    ...(headerMeta !== undefined ? { header: headerMeta } : {}),
    ...(styles.length > 0 ? { styles } : {}),
    ...(regions.length > 0 ? { regions } : {}),
    ...(notesCount > 0 ? { notesCount } : {}),
  };

  return finalizeParseResult('vtt', cues, diagnostics, metadata, cues.length === 0 && skippedBlocks > 0);
}
