export type DetectedEncoding =
  | 'utf-8'
  | 'utf-8-bom'
  | 'utf-16le'
  | 'utf-16be'
  | 'windows-1252'
  | 'utf-8-lossy';

export interface DecodedSubtitleText {
  text: string;
  encoding: DetectedEncoding;
  hadBom: boolean;
  warning?: string;
}

/**
 * Decodes raw subtitle file bytes into normalized UTF-16 JS string text.
 * Supports UTF-8, UTF-8 BOM, UTF-16 LE/BE BOM, and graceful fallback to
 * Windows-1252 (covering Western European / Portuguese / Spanish legacy files)
 * when strict UTF-8 decoding fails, emitting a clear warning.
 */
export function decodeSubtitleBytes(bytes: Uint8Array): DecodedSubtitleText {
  if (bytes.byteLength === 0) {
    return { text: '', encoding: 'utf-8', hadBom: false };
  }

  // UTF-8 BOM: EF BB BF
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
        bytes.subarray(3),
      );
      return { text, encoding: 'utf-8-bom', hadBom: true };
    } catch {
      // Fall through to fallback decoders if bytes after BOM are malformed UTF-8
    }
  }

  // UTF-16 LE BOM: FF FE
  if (bytes.byteLength >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = new TextDecoder('utf-16le', { fatal: false }).decode(bytes.subarray(2));
    return { text, encoding: 'utf-16le', hadBom: true };
  }

  // UTF-16 BE BOM: FE FF
  if (bytes.byteLength >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const text = new TextDecoder('utf-16be', { fatal: false }).decode(bytes.subarray(2));
    return { text, encoding: 'utf-16be', hadBom: true };
  }

  // Strict UTF-8 first — avoids silently corrupting invalid byte sequences
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, encoding: 'utf-8', hadBom: false };
  } catch {
    // Fallback to Windows-1252 (common for legacy Portuguese/Spanish/European SRT files)
    try {
      const text = new TextDecoder('windows-1252', { fatal: false }).decode(bytes);
      return {
        text,
        encoding: 'windows-1252',
        hadBom: false,
        warning:
          'File is not valid UTF-8; decoded using Windows-1252 fallback. Please verify accented characters in the preview.',
      };
    } catch {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      return {
        text,
        encoding: 'utf-8-lossy',
        hadBom: false,
        warning:
          'Unable to reliably determine text encoding; decoded with replacement characters.',
      };
    }
  }
}
