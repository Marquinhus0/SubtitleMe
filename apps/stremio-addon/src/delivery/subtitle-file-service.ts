import { createHash, randomBytes } from 'node:crypto';
import type { SubtitleCue, SubtitleTrack } from '@subtitleme/shared-types';
import { mergeSubtitleTracks, serializeSubtitleCues } from '@subtitleme/subtitle-core';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import type {
  SecondarySubtitleStyle,
  StremioAddonConfig,
  SubtitleBackgroundStyle,
  VerticalSubtitlePosition,
} from '../config/addon-config';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import { alignCuesToAnchor, computeCueSyncPercent } from './auto-sync';
import { GeneratedSubtitleCache } from './generated-subtitle-cache';

export const MAX_SOURCE_SUBTITLE_BYTES = 5 * 1024 * 1024; // 5 MB safety limit
export const OPAQUE_TOKEN_REGEX = /^[a-f0-9]{32,64}$/;

export interface GeneratedSubtitleDelivery {
  token: string;
  url: string;
  cueCount: number;
  fromCache: boolean;
  sessionScope: string;
  autoSyncApplied?: boolean;
  autoSyncOffsetMs?: number;
  syncPercent?: number;
}

export interface SubtitleFileServiceOptions {
  baseUrl: string;
  cache?: GeneratedSubtitleCache;
  maxSourceBytes?: number;
  defaultSessionScope?: string;
}

const VTT_POSITION_SETTING: Record<VerticalSubtitlePosition, string> = {
  bottom: '',
  raised: ' line:84%',
  high: ' line:72%',
  top: ' line:12%',
};

function decorateCueLines(
  cues: readonly SubtitleCue[],
  color: string | undefined,
  style: SecondarySubtitleStyle,
): SubtitleCue[] {
  const hasColor = Boolean(color && color !== 'none');
  if (!hasColor && style === 'none') {
    return [...cues];
  }

  return cues.map((cue) => {
    let text = cue.text.trim();
    if (!text) return cue;

    if (style === 'brackets' || style === 'italic-brackets') {
      text = `[${text}]`;
    }
    if (style === 'italic' || style === 'italic-brackets') {
      text = `<i>${text}</i>`;
    }
    if (hasColor) {
      text = `<font color="${color}">${text}</font>`;
    }

    return {
      ...cue,
      text,
    };
  });
}

function applyOffsetToCues(cues: readonly SubtitleCue[], offsetMs: number): SubtitleCue[] {
  if (offsetMs === 0) return [...cues];
  const out: SubtitleCue[] = [];
  for (const cue of cues) {
    const start = Math.max(0, cue.start + offsetMs);
    const end = cue.end + offsetMs;
    if (end > start) {
      out.push({ ...cue, start, end });
    }
  }
  return out;
}

/**
 * Implements DualSubs's `reveal` learner delay: when a secondary (native) cue overlaps spoken
 * primary (learning) dialogue, splits the secondary cue into `[start, start + delay]` with
 * non-breaking space `\u00A0` placeholder lines (locking vertical position so the top line
 * never jumps!) followed by `[start + delay, end]` with the revealed translation.
 */
export function splitSecondaryCuesForReveal(
  primaryCues: readonly SubtitleCue[],
  styledSecondaryCues: readonly SubtitleCue[],
  revealMs: number,
  secondaryStyle: SecondarySubtitleStyle,
): SubtitleCue[] {
  if (revealMs <= 0 || styledSecondaryCues.length === 0) {
    return [...styledSecondaryCues];
  }

  const useItalicPlaceholder =
    secondaryStyle === 'italic' || secondaryStyle === 'italic-brackets';
  const singlePlaceholderLine = useItalicPlaceholder ? '<i>\u00A0</i>' : '\u00A0';

  const result: SubtitleCue[] = [];
  let j = 0;

  for (const sCue of styledSecondaryCues) {
    while (j < primaryCues.length && (primaryCues[j]?.end ?? 0) <= sCue.start) {
      j += 1;
    }

    let overlapsPrimary = false;
    for (let k = j; k < primaryCues.length; k += 1) {
      const pCue = primaryCues[k];
      if (!pCue || pCue.start >= sCue.end) break;
      if (Math.min(pCue.end, sCue.end) - Math.max(pCue.start, sCue.start) >= 100) {
        overlapsPrimary = true;
        break;
      }
    }

    if (!overlapsPrimary) {
      result.push(sCue);
      continue;
    }

    const duration = sCue.end - sCue.start;
    const effectiveDelay = Math.min(revealMs, Math.floor(duration * 0.6));
    const revealAt = sCue.start + effectiveDelay;

    if (effectiveDelay < 150 || sCue.end - revealAt < 220) {
      result.push(sCue);
      continue;
    }

    const lineCount = Math.max(1, sCue.text.split('\n').length);
    const placeholderText = Array.from({ length: lineCount }, () => singlePlaceholderLine).join(
      '\n',
    );

    result.push({
      id: `${sCue.id}-hide`,
      start: sCue.start,
      end: revealAt,
      text: placeholderText,
    });
    result.push({
      id: `${sCue.id}-show`,
      start: revealAt,
      end: sCue.end,
      text: sCue.text,
    });
  }

  return result;
}

function applyVttVerticalPosition(vttContent: string, pos: VerticalSubtitlePosition | undefined): string {
  const suffix = pos ? VTT_POSITION_SETTING[pos] : '';
  if (!suffix) return vttContent;
  return vttContent.replace(
    /^(\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3})$/gm,
    `$1${suffix}`,
  );
}

const ASS_POSITION: Record<VerticalSubtitlePosition, { align: number; marginV: number }> = {
  bottom: { align: 2, marginV: 40 },
  raised: { align: 2, marginV: 110 },
  high: { align: 2, marginV: 220 },
  top: { align: 8, marginV: 40 },
};

function assTime(h: string, m: string, s: string, ms: string): string {
  return `${Number(h)}:${m}:${s}.${ms.slice(0, 2)}`;
}

function vttTextToAss(text: string): string {
  return text
    .replace(/[{}]/g, '')
    .replace(/<font color="#([0-9A-Fa-f]{6})">/g, (_m, hex: string) => {
      return `{\\c&H${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&}`;
    })
    .replace(/<\/font>/g, '{\\c&HFFFFFF&}')
    .replace(/<i>/g, '{\\i1}')
    .replace(/<\/i>/g, '{\\i0}')
    .replace(/<[^>]+>/g, '')
    .replace(/\n/g, '\\N');
}

/** Converts the merged WebVTT (with <i>/<font> tags) into an Advanced SubStation Alpha track. */
export function convertVttToAss(
  vtt: string,
  position: VerticalSubtitlePosition,
  fontSize: number = 46,
  backgroundStyle: SubtitleBackgroundStyle = 'outline',
): string {
  const pos = ASS_POSITION[position];
  const clampedFont = Math.max(24, Math.min(80, Math.round(fontSize)));
  // BorderStyle=3 renders an opaque/semi-transparent box; BorderStyle=1 renders outline + shadow
  const styleLine =
    backgroundStyle === 'box'
      ? `Style: Default,Arial,${clampedFont},&H00FFFFFF,&H000000FF,&H550B0D14,&H550B0D14,0,0,0,0,100,100,0,0,3,10,0,${pos.align},40,40,${pos.marginV},1`
      : backgroundStyle === 'clean'
        ? `Style: Default,Arial,${clampedFont},&H00FFFFFF,&H000000FF,&H00000000,&H90000000,0,0,0,0,100,100,0,0,1,1.4,0.5,${pos.align},40,40,${pos.marginV},1`
        : `Style: Default,Arial,${clampedFont},&H00FFFFFF,&H000000FF,&H00000000,&H75000000,0,0,0,0,100,100,0,0,1,2.6,1.2,${pos.align},40,40,${pos.marginV},1`;

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1280',
    'PlayResY: 720',
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    styleLine,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const events: string[] = [];
  for (const block of vtt.replace(/\r/g, '').split(/\n\n+/)) {
    const lines = block.split('\n');
    const idx = lines.findIndex((l) => l.includes('-->'));
    if (idx === -1) continue;
    const m =
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(lines[idx] ?? '');
    if (!m) continue;
    const text = vttTextToAss(lines.slice(idx + 1).join('\n'));
    if (!text) continue;
    events.push(
      `Dialogue: 0,${assTime(m[1] ?? '0', m[2] ?? '00', m[3] ?? '00', m[4] ?? '000')},${assTime(m[5] ?? '0', m[6] ?? '00', m[7] ?? '00', m[8] ?? '000')},Default,,0,0,0,,${text}`,
    );
  }
  return `${[...header, ...events].join('\n')}\n`;
}

export function convertVttToSrt(vttContent: string): string {
  const normalized = vttContent
    .replace(/^\uFEFF?WEBVTT(?:[^\r\n]*)\r?\n+/, '')
    .trim();
  if (!normalized) return '';
  return `${normalized.replace(
    /(\d{2}:\d{2}:\d{2})\.(\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2})\.(\d{3})(?:[^\r\n]*)/g,
    '$1,$2 --> $3,$4',
  )}\n`;
}

function buildContentFingerprint(
  videoId: string,
  primary: RawSubtitleAsset,
  secondary: RawSubtitleAsset,
  config: StremioAddonConfig,
): string {
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify({
      videoId,
      primaryId: primary.sourceId,
      primaryContentHash: createHash('sha256').update(primary.content).digest('hex'),
      secondaryId: secondary.sourceId,
      secondaryContentHash: createHash('sha256').update(secondary.content).digest('hex'),
      primaryLanguage: config.primaryLanguage,
      secondaryLanguage: config.secondaryLanguage,
      primaryOffsetMs: config.primaryOffsetMs,
      secondaryOffsetMs: config.secondaryOffsetMs,
      order: config.order,
      primaryColor: config.primaryColor ?? 'none',
      secondaryColor: config.secondaryColor ?? 'none',
      secondaryStyle: config.secondaryStyle ?? 'none',
      verticalPosition: config.verticalPosition ?? 'bottom',
      fontSize: config.fontSize ?? 46,
      backgroundStyle: config.backgroundStyle ?? 'outline',
      autoSync: config.autoSync === true,
      outputFormat: config.outputFormat ?? 'vtt',
      revealMs: config.revealMs ?? 0,
    }),
  );
  return hash.digest('hex');
}

function generateOpaqueAccessToken(): string {
  return randomBytes(24).toString('hex'); // 48 hex chars (192 bits of cryptographic entropy)
}

/**
 * Parses two raw subtitle assets using `@subtitleme/subtitle-parser`, optionally auto-aligns
 * secondary timing to primary dialogue anchors, applies user visual styling, merges them via
 * `mergeSubtitleTracks`, and caches the output behind an opaque session-scoped delivery URL.
 */
export class SubtitleFileService {
  private readonly baseUrl: string;
  private readonly cache: GeneratedSubtitleCache;
  private readonly maxSourceBytes: number;
  private readonly defaultSessionScope: string;

  public constructor(options: SubtitleFileServiceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.cache = options.cache ?? new GeneratedSubtitleCache();
    this.maxSourceBytes = options.maxSourceBytes ?? MAX_SOURCE_SUBTITLE_BYTES;
    this.defaultSessionScope = options.defaultSessionScope ?? 'default';
  }

  public getCache(): GeneratedSubtitleCache {
    return this.cache;
  }

  public getVttByToken(token: string, expectedSessionScope?: string): string | null {
    if (!OPAQUE_TOKEN_REGEX.test(token)) {
      return null;
    }
    return this.cache.get(token, expectedSessionScope)?.vttContent ?? null;
  }

  public getSrtByToken(token: string, expectedSessionScope?: string): string | null {
    const vtt = this.getVttByToken(token, expectedSessionScope);
    if (vtt === null) return null;
    return convertVttToSrt(vtt);
  }

  public invalidateBySourceId(sourceId: string): number {
    return this.cache.invalidateBySourceId(sourceId);
  }

  public invalidateBySession(sessionScope: string): number {
    return this.cache.invalidateBySession(sessionScope);
  }

  public generateNoticeSrt(
    noticeKey: string,
    message: string,
    sessionScope: string = this.defaultSessionScope,
  ): GeneratedSubtitleDelivery {
    const fingerprint = `notice:${createHash('sha256').update(`${noticeKey}:${message}`).digest('hex')}`;
    const cached = this.cache.getByFingerprint(sessionScope, fingerprint);
    if (cached) {
      return {
        token: cached.token,
        url: `${this.baseUrl}/generated/${cached.token}.srt`,
        cueCount: cached.cueCount,
        fromCache: true,
        sessionScope,
      };
    }

    const safeText = message.replace(/\r/g, '').trim();
    const vttContent = [
      'WEBVTT',
      '',
      '1',
      '00:00:01.000 --> 00:00:13.000',
      safeText,
      '',
      '2',
      '00:01:01.000 --> 00:01:13.000',
      safeText,
      '',
    ].join('\n');

    const token = generateOpaqueAccessToken();
    this.cache.set(token, vttContent, {
      sessionScope,
      fingerprint,
      sourceIds: [],
      cueCount: 2,
    });

    return {
      token,
      url: `${this.baseUrl}/generated/${token}.srt`,
      cueCount: 2,
      fromCache: false,
      sessionScope,
    };
  }

  public generateCombinedVtt(
    videoId: string,
    primaryAsset: RawSubtitleAsset,
    secondaryAsset: RawSubtitleAsset,
    config: StremioAddonConfig,
    sessionScope: string = this.defaultSessionScope,
    syncAnchor: 'primary' | 'secondary' = 'primary',
  ): GeneratedSubtitleDelivery {
    if (
      Buffer.byteLength(primaryAsset.content, 'utf-8') > this.maxSourceBytes ||
      Buffer.byteLength(secondaryAsset.content, 'utf-8') > this.maxSourceBytes
    ) {
      throw new Error('Source subtitle exceeds maximum permitted byte size.');
    }

    const fingerprint = `${buildContentFingerprint(videoId, primaryAsset, secondaryAsset, config)}:${syncAnchor}`;

    if (config.outputFormat === 'ass') {
      const cachedAss = this.cache.getByFingerprint(sessionScope, fingerprint);
      if (cachedAss) {
        return {
          token: cachedAss.token,
          url: `${this.baseUrl}/generated/${cachedAss.token}.ass`,
          cueCount: cachedAss.cueCount,
          fromCache: true,
          sessionScope,
          ...(cachedAss.syncPercent !== undefined ? { syncPercent: cachedAss.syncPercent } : {}),
        };
      }
      const base = this.generateCombinedVtt(
        videoId,
        primaryAsset,
        secondaryAsset,
        { ...config, outputFormat: 'vtt' },
        sessionScope,
        syncAnchor,
      );
      const baseVtt = this.cache.get(base.token, sessionScope)?.vttContent ?? '';
      const assContent = convertVttToAss(
        baseVtt,
        config.verticalPosition ?? 'bottom',
        config.fontSize ?? 46,
        config.backgroundStyle ?? 'outline',
      );
      const assToken = generateOpaqueAccessToken();
      this.cache.set(assToken, assContent, {
        sessionScope,
        fingerprint,
        sourceIds: [primaryAsset.sourceId, secondaryAsset.sourceId],
        cueCount: base.cueCount,
        ...(base.syncPercent !== undefined ? { syncPercent: base.syncPercent } : {}),
      });
      return {
        token: assToken,
        url: `${this.baseUrl}/generated/${assToken}.ass`,
        cueCount: base.cueCount,
        fromCache: false,
        sessionScope,
        ...(base.autoSyncApplied !== undefined ? { autoSyncApplied: base.autoSyncApplied } : {}),
        ...(base.autoSyncOffsetMs !== undefined ? { autoSyncOffsetMs: base.autoSyncOffsetMs } : {}),
        ...(base.syncPercent !== undefined ? { syncPercent: base.syncPercent } : {}),
      };
    }

    const ext = config.outputFormat === 'srt' ? 'srt' : 'vtt';
    const cached = this.cache.getByFingerprint(sessionScope, fingerprint);
    if (cached) {
      return {
        token: cached.token,
        url: `${this.baseUrl}/generated/${cached.token}.${ext}`,
        cueCount: cached.cueCount,
        fromCache: true,
        sessionScope,
        ...(cached.syncPercent !== undefined ? { syncPercent: cached.syncPercent } : {}),
      };
    }

    const parsedPrimary = parseSubtitle(primaryAsset.content, primaryAsset.format);
    if (parsedPrimary.status === 'error' || parsedPrimary.cues.length === 0) {
      throw new Error('Failed to parse primary subtitle track.');
    }

    const parsedSecondary = parseSubtitle(secondaryAsset.content, secondaryAsset.format);
    if (parsedSecondary.status === 'error' || parsedSecondary.cues.length === 0) {
      throw new Error('Failed to parse secondary subtitle track.');
    }

    let primaryBaseCues = parsedPrimary.cues;
    let secondaryBaseCues = parsedSecondary.cues;
    let autoSyncApplied = false;
    let autoSyncOffsetMs = 0;
    let syncPercent: number;

    if (config.autoSync === true) {
      // Align whichever track is NOT locked to the video onto the stronger video-synced anchor!
      if (syncAnchor === 'secondary') {
        const aligned = alignCuesToAnchor(parsedSecondary.cues, parsedPrimary.cues);
        primaryBaseCues = aligned.cues;
        autoSyncApplied = aligned.applied;
        autoSyncOffsetMs = aligned.offsetMs;
        syncPercent = aligned.syncPercent;
      } else {
        const aligned = alignCuesToAnchor(parsedPrimary.cues, parsedSecondary.cues);
        secondaryBaseCues = aligned.cues;
        autoSyncApplied = aligned.applied;
        autoSyncOffsetMs = aligned.offsetMs;
        syncPercent = aligned.syncPercent;
      }
    } else {
      syncPercent = computeCueSyncPercent(parsedPrimary.cues, parsedSecondary.cues);
    }

    const styledPrimary = decorateCueLines(primaryBaseCues, config.primaryColor, 'none');
    const styledSecondary = decorateCueLines(
      secondaryBaseCues,
      config.secondaryColor,
      config.secondaryStyle ?? 'none',
    );

    const revealMs = config.revealMs ?? 0;
    let finalPrimaryCues = styledPrimary;
    let finalSecondaryCues = styledSecondary;
    let trackPrimaryOffset = config.primaryOffsetMs;
    let trackSecondaryOffset = config.secondaryOffsetMs;

    if (revealMs > 0) {
      finalPrimaryCues = applyOffsetToCues(styledPrimary, config.primaryOffsetMs);
      const shiftedSec = applyOffsetToCues(styledSecondary, config.secondaryOffsetMs);
      finalSecondaryCues = splitSecondaryCuesForReveal(
        finalPrimaryCues,
        shiftedSec,
        revealMs,
        config.secondaryStyle ?? 'none',
      );
      trackPrimaryOffset = 0;
      trackSecondaryOffset = 0;
    }

    const primaryTrack: SubtitleTrack = {
      id: primaryAsset.sourceId,
      language: primaryAsset.language,
      label: primaryAsset.language,
      source: 'local',
      cues: finalPrimaryCues,
      offset: trackPrimaryOffset,
      enabled: true,
    };

    const secondaryTrack: SubtitleTrack = {
      id: secondaryAsset.sourceId,
      language: secondaryAsset.language,
      label: secondaryAsset.language,
      source: 'local',
      cues: finalSecondaryCues,
      offset: trackSecondaryOffset,
      enabled: true,
    };

    const mergedCues = mergeSubtitleTracks(primaryTrack, secondaryTrack, {
      order: config.order,
    });
    const rawVtt = serializeSubtitleCues(mergedCues, 'vtt');
    const vttContent = applyVttVerticalPosition(rawVtt, config.verticalPosition);
    const token = generateOpaqueAccessToken();

    this.cache.set(token, vttContent, {
      sessionScope,
      fingerprint,
      sourceIds: [primaryAsset.sourceId, secondaryAsset.sourceId],
      cueCount: mergedCues.length,
      syncPercent,
    });

    return {
      token,
      url: `${this.baseUrl}/generated/${token}.${ext}`,
      cueCount: mergedCues.length,
      fromCache: false,
      sessionScope,
      autoSyncApplied,
      autoSyncOffsetMs,
      syncPercent,
    };
  }
}
