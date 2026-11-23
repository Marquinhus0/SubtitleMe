import {
  createIndexedDbSubtitleRepository,
  createMemorySubtitleRepository,
  type LocalSubtitleRepository,
} from '@subtitleme/subtitle-storage';

export function createExtensionSubtitleRepository(): LocalSubtitleRepository {
  if (typeof indexedDB !== 'undefined') {
    return createIndexedDbSubtitleRepository();
  }
  return createMemorySubtitleRepository();
}
