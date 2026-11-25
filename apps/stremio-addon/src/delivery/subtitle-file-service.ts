import { createHash, randomBytes } from 'node:crypto';
import type { SubtitleCue, SubtitleTrack } from '@subtitleme/shared-types';
import { mergeSubtitleTracks, serializeSubtitleCues } from '@subtitleme/subtitle-core';
import { parseSubtitle } from '@subtitleme/subtitle-parser';
import type {
  SecondarySubtitleStyle,
  StremioAddonConfig,
  VerticalSubtitlePosition,
} from '../config/addon-config';
import type { RawSubtitleAsset } from '../sources/subtitle-source.interface';
import { alignSecondaryCuesToPrimary } from './auto-sync';
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
export function convertVttToAss(vtt: string, position: VerticalSubtitlePosition): string {
  const pos = ASS_POSITION[position];
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
    `Style: Default,Arial,44,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2.4,1,${pos.align},40,40,${pos.marginV},1`,
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
      autoSync: config.autoSync === true,
      outputFormat: config.outputFormat ?? 'vtt',
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

  public generateCombinedVtt(
    videoId: string,
    primaryAsset: RawSubtitleAsset,
    secondaryAsset: RawSubtitleAsset,
    config: StremioAddonConfig,
    sessionScope: string = this.defaultSessionScope,
  ): GeneratedSubtitleDelivery {
    if (
      Buffer.byteLength(primaryAsset.content, 'utf-8') > this.maxSourceBytes ||
      Buffer.byteLength(secondaryAsset.content, 'utf-8') > this.maxSourceBytes
    ) {
      throw new Error('Source subtitle exceeds maximum permitted byte size.');
    }

    const fingerprint = buildContentFingerprint(videoId, primaryAsset, secondaryAsset, config);

    if (config.outputFormat === 'ass') {
      const cachedAss = this.cache.getByFingerprint(sessionScope, fingerprint);
      if (cachedAss) {
        return {
          token: cachedAss.token,
          url: `${this.baseUrl}/generated/${cachedAss.token}.ass`,
          cueCount: cachedAss.cueCount,
          fromCache: true,
          sessionScope,
        };
      }
      const base = this.generateCombinedVtt(
        videoId,
        primaryAsset,
        secondaryAsset,
        { ...config, outputFormat: 'vtt' },
        sessionScope,
      );
      const baseVtt = this.cache.get(base.token, sessionScope)?.vttContent ?? '';
      const assContent = convertVttToAss(baseVtt, config.verticalPosition ?? 'bottom');
      const assToken = generateOpaqueAccessToken();
      this.cache.set(assToken, assContent, {
        sessionScope,
        fingerprint,
        sourceIds: [primaryAsset.sourceId, secondaryAsset.sourceId],
        cueCount: base.cueCount,
      });
      return {
        token: assToken,
        url: `${this.baseUrl}/generated/${assToken}.ass`,
        cueCount: base.cueCount,
        fromCache: false,
        sessionScope,
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

    let secondaryBaseCues = parsedSecondary.cues;
    let autoSyncApplied = false;
    let autoSyncOffsetMs = 0;

    if (config.autoSync === true) {
      const aligned = alignSecondaryCuesToPrimary(parsedPrimary.cues, parsedSecondary.cues);
      secondaryBaseCues = aligned.cues;
      autoSyncApplied = aligned.applied;
      autoSyncOffsetMs = aligned.offsetMs;
    }

    const styledPrimary = decorateCueLines(parsedPrimary.cues, config.primaryColor, 'none');
    const styledSecondary = decorateCueLines(
      secondaryBaseCues,
      config.secondaryColor,
      config.secondaryStyle ?? 'none',
    );

    const primaryTrack: SubtitleTrack = {
      id: primaryAsset.sourceId,
      language: primaryAsset.language,
      label: primaryAsset.language,
      source: 'local',
      cues: styledPrimary,
      offset: config.primaryOffsetMs,
      enabled: true,
    };

    const secondaryTrack: SubtitleTrack = {
      id: secondaryAsset.sourceId,
      language: secondaryAsset.language,
      label: secondaryAsset.language,
      source: 'local',
      cues: styledSecondary,
      offset: config.secondaryOffsetMs,
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
    });

    return {
      token,
      url: `${this.baseUrl}/generated/${token}.${ext}`,
      cueCount: mergedCues.length,
      fromCache: false,
      sessionScope,
      autoSyncApplied,
      autoSyncOffsetMs,
    };
  }
}
