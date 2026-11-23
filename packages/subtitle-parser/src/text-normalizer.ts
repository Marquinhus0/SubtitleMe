import type { LineEndingStyle, SubtitleFormat } from '@subtitleme/shared-types';

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

const SCRIPT_OR_STYLE_BLOCK_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const SUBTITLE_TAG_RE = /<\/?[a-zA-Z][a-zA-Z0-9._-]*(?:\s+[^<>]*)?\/?>/g;
const VTT_INLINE_TIMESTAMP_RE = /<\d{1,3}:\d{2}(?::\d{2})?\.\d{3}>/g;
const ASS_OVERRIDE_TAG_RE = /\{\\[^}]*\}/g;
const HTML_ENTITY_RE = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g;

export interface BomResult {
  content: string;
  hasBom: boolean;
}

export interface NormalizedTextResult {
  text: string;
  strippedMarkup: boolean;
}

export function stripBom(raw: string): BomResult {
  if (raw.charCodeAt(0) === 0xfeff) {
    return { content: raw.slice(1), hasBom: true };
  }
  return { content: raw, hasBom: false };
}

export function detectLineEnding(raw: string): LineEndingStyle {
  let hasCrlf = false;
  let hasLf = false;
  let hasCr = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charCodeAt(i);
    if (ch === 13) {
      if (raw.charCodeAt(i + 1) === 10) {
        hasCrlf = true;
        i += 1;
      } else {
        hasCr = true;
      }
    } else if (ch === 10) {
      hasLf = true;
    }
  }

  const count = Number(hasCrlf) + Number(hasLf) + Number(hasCr);
  if (count === 0) return 'NONE';
  if (count > 1) return 'MIXED';
  if (hasCrlf) return 'CRLF';
  if (hasLf) return 'LF';
  return 'CR';
}

export function normalizeLineEndings(raw: string): string {
  return raw.replace(/\r\n?/g, '\n');
}

/**
 * Decodes standard named and numeric HTML entities safely into plain Unicode text.
 * Rejects surrogate code points, out-of-range values, and null characters.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input.includes('&')) return input;

  return input.replace(HTML_ENTITY_RE, (fullMatch, token: string) => {
    if (token.startsWith('#x') || token.startsWith('#X')) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      if (isSafeCodePoint(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
      return fullMatch;
    }

    if (token.startsWith('#')) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      if (isSafeCodePoint(codePoint)) {
        return String.fromCodePoint(codePoint);
      }
      return fullMatch;
    }

    const mapped = NAMED_HTML_ENTITIES[token.toLowerCase()];
    return mapped ?? fullMatch;
  });
}

function isSafeCodePoint(codePoint: number): boolean {
  if (!Number.isInteger(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
    return false;
  }
  // Reject UTF-16 surrogate range
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
    return false;
  }
  return true;
}

/**
 * Normalizes raw subtitle cue text into safe plain text:
 * 1. Strips executable `<script>` / `<style>` blocks including their contents.
 * 2. Strips formatting tags (`<i>`, `<b>`, `<u>`, `<font>`, `<v>`, `<c>`, VTT inline timestamps, ASS overrides)
 *    while preserving all inner human-readable text.
 * 3. Decodes supported HTML entities after tag removal so escaped tags stay plain text.
 * 4. Preserves intentional multiline breaks and Unicode characters.
 */
export function normalizeSubtitleText(rawText: string, _format: SubtitleFormat): NormalizedTextResult {
  let working = normalizeLineEndings(rawText);
  let strippedMarkup = false;

  const withoutDangerousBlocks = working.replace(SCRIPT_OR_STYLE_BLOCK_RE, '');
  if (withoutDangerousBlocks !== working) {
    strippedMarkup = true;
    working = withoutDangerousBlocks;
  }

  const withoutVttTimestamps = working.replace(VTT_INLINE_TIMESTAMP_RE, '');
  if (withoutVttTimestamps !== working) {
    strippedMarkup = true;
    working = withoutVttTimestamps;
  }

  const withoutTags = working.replace(SUBTITLE_TAG_RE, '');
  if (withoutTags !== working) {
    strippedMarkup = true;
    working = withoutTags;
  }

  const withoutAssOverrides = working.replace(ASS_OVERRIDE_TAG_RE, '');
  if (withoutAssOverrides !== working) {
    strippedMarkup = true;
    working = withoutAssOverrides;
  }

  const decoded = decodeHtmlEntities(working);

  // Trim trailing horizontal spaces per line while preserving intentional line breaks
  const lines = decoded.split('\n').map((line) => line.replace(/[ \t]+$/g, '').replace(/^[ \t]+/g, ''));

  // Trim leading and trailing empty lines
  while (lines.length > 0 && lines[0] === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return {
    text: lines.join('\n'),
    strippedMarkup,
  };
}
