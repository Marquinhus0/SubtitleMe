import type {
  SubtitleCue,
  SubtitleDiagnostic,
  SubtitleFormat,
  SubtitleParseMetadata,
  SubtitleParseResult,
  SubtitleParseStatus,
} from '@subtitleme/shared-types';

export interface TextBlock {
  startLine: number;
  lines: string[];
}

/**
 * Splits LF-normalized subtitle text into non-empty blocks separated by one or
 * more blank lines, preserving 1-based line numbers for diagnostics.
 */
export function splitIntoBlocks(normalized: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const lines = normalized.split('\n');

  let currentLines: string[] = [];
  let blockStartLine = 1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.trim().length === 0) {
      if (currentLines.length > 0) {
        blocks.push({ startLine: blockStartLine, lines: currentLines });
        currentLines = [];
      }
    } else {
      if (currentLines.length === 0) {
        blockStartLine = i + 1;
      }
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    blocks.push({ startLine: blockStartLine, lines: currentLines });
  }

  return blocks;
}

export function finalizeParseResult(
  format: SubtitleFormat | null,
  cues: SubtitleCue[],
  diagnostics: SubtitleDiagnostic[],
  metadata: SubtitleParseMetadata,
  forceError = false,
): SubtitleParseResult {
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const errors = diagnostics.filter((d) => d.severity === 'error');

  let status: SubtitleParseStatus;
  if (forceError || (cues.length === 0 && errors.length > 0)) {
    status = 'error';
  } else if (warnings.length > 0 || errors.length > 0) {
    status = 'success-with-warnings';
  } else {
    status = 'success';
  }

  return {
    status,
    format,
    cues,
    diagnostics,
    warnings,
    errors,
    metadata,
  };
}
