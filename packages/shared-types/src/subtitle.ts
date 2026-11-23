export type SubtitleSource = 'player' | 'local';

export type SubtitleFormat = 'srt' | 'vtt';

export type SubtitleSlot = 'primary' | 'secondary';

export interface SubtitleCue {
  /** Unique identifier for the cue within its track. */
  id: string;
  /** Start timestamp in integer milliseconds. */
  start: number;
  /** End timestamp in integer milliseconds. */
  end: number;
  /** Normalized plain text content of the cue (never executable HTML). */
  text: string;
  /** Optional WebVTT cue settings (e.g., align, position, line, size). */
  settings?: Record<string, string>;
}

export interface SubtitleTrack {
  id: string;
  /** BCP-47 language tag (e.g. 'en', 'pt-BR'). */
  language: string;
  /** Human-readable label shown in UI selectors. */
  label: string;
  source: SubtitleSource;
  cues: SubtitleCue[];
  /** Independent timing offset in milliseconds. */
  offset: number;
  enabled: boolean;
}

export type SubtitleDiagnosticSeverity = 'info' | 'warning' | 'error';

export type SubtitleDiagnosticCode =
  | 'EMPTY_INPUT'
  | 'UNSUPPORTED_FORMAT'
  | 'MISSING_VTT_HEADER'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_TIMESTAMP_ORDER'
  | 'ZERO_DURATION_CUE'
  | 'MALFORMED_CUE_BLOCK'
  | 'EMPTY_CUE_TEXT'
  | 'DUPLICATE_CUE_ID'
  | 'OVERLAPPING_CUES'
  | 'UNSUPPORTED_MARKUP_STRIPPED';

export interface SubtitleDiagnostic {
  code: SubtitleDiagnosticCode;
  severity: SubtitleDiagnosticSeverity;
  message: string;
  line?: number;
  cueIndex?: number;
}

/** @deprecated Use SubtitleDiagnostic instead. Retained for backward compatibility. */
export type SubtitleParseWarning = SubtitleDiagnostic;

export type SubtitleParseStatus = 'success' | 'success-with-warnings' | 'error';

export type LineEndingStyle = 'LF' | 'CRLF' | 'CR' | 'MIXED' | 'NONE';

export interface SubtitleParseMetadata {
  hasBom: boolean;
  lineEnding: LineEndingStyle;
  totalBlocks: number;
  skippedBlocks: number;
  header?: string;
  styles?: string[];
  regions?: string[];
  notesCount?: number;
}

export interface SubtitleParseResult {
  status: SubtitleParseStatus;
  format: SubtitleFormat | null;
  cues: SubtitleCue[];
  diagnostics: SubtitleDiagnostic[];
  warnings: SubtitleDiagnostic[];
  errors: SubtitleDiagnostic[];
  metadata: SubtitleParseMetadata;
}

export interface ActiveCueSnapshot {
  primary: SubtitleCue | null;
  secondary: SubtitleCue | null;
}
