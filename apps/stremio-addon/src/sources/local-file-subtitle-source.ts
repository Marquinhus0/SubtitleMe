import type { CompanionSubtitleStore } from '../companion/companion-store';
import { findLanguageDescriptor } from '../config/addon-config';
import type {
  RawSubtitleAsset,
  SubtitleSourceProvider,
  SubtitleSourceQuery,
} from './subtitle-source.interface';

/**
 * First real `SubtitleSourceProvider` backed by the Local Companion store.
 *
 * Explicit content association rules:
 * 1. Matches strictly by normalized `query.videoId` (Stremio/IMDb ID such as
 *    `tt1254207` or `tt0903747:1:1`, or an explicit user-defined identifier).
 * 2. NEVER falls back to matching solely by `query.filename` so subtitles from
 *    different videos are never mixed accidentally.
 * 3. Validates requested language against the supported catalog before lookup.
 */
export class LocalFileSubtitleSource implements SubtitleSourceProvider {
  public readonly name = 'local-file-companion';
  private readonly store: CompanionSubtitleStore;

  public constructor(store: CompanionSubtitleStore) {
    this.store = store;
  }

  public async fetchSubtitle(query: SubtitleSourceQuery): Promise<RawSubtitleAsset | null> {
    const normalizedVideoId = query.videoId.trim();
    if (normalizedVideoId.length === 0) {
      return null;
    }

    const langDescriptor = findLanguageDescriptor(query.language);
    if (!langDescriptor) {
      return null;
    }

    const record = this.store.findByContentAndLanguage(normalizedVideoId, langDescriptor.bcp47);
    if (!record) {
      return null;
    }

    return {
      sourceId: record.id,
      language: record.language,
      format: record.format,
      content: record.content,
    };
  }
}
