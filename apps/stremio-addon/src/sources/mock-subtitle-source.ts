import type {
  RawSubtitleAsset,
  SubtitleSourceProvider,
  SubtitleSourceQuery,
} from './subtitle-source.interface';

const FIXTURE_EN_SRT = `1
00:00:01,000 --> 00:00:04,000
Hello! Welcome to SubtitleMe.

2
00:00:05,000 --> 00:00:08,500
Two languages.
One seamless experience.
`;

const FIXTURE_PT_VTT = `WEBVTT

1
00:00:02.000 --> 00:00:05.000
Olá! Bem-vindo ao SubtitleMe.

2
00:00:05.000 --> 00:00:09.000
Dois idiomas.
Uma experiência contínua.
`;

const FIXTURE_ES_VTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
¡Hola! Bienvenido a SubtitleMe.

2
00:00:05.000 --> 00:00:08.500
Dos idiomas.
Una experiencia continua.
`;

const SUPPORTED_POC_IDS = new Set(['sm_poc_demo', 'tt1254207']);

/**
 * Authorial fixture-only subtitle source used strictly for Sprint 09 local PoC
 * and automated testing. Does not contact any external service or scrape websites.
 */
export class MockFixtureSubtitleSource implements SubtitleSourceProvider {
  public readonly name = 'authorial-poc-fixtures';

  public async fetchSubtitle(query: SubtitleSourceQuery): Promise<RawSubtitleAsset | null> {
    if (!SUPPORTED_POC_IDS.has(query.videoId)) {
      return null;
    }

    const lang = query.language.toLowerCase();
    if (lang === 'en' || lang === 'eng') {
      return {
        sourceId: `fixture-${query.videoId}-en`,
        language: 'en',
        format: 'srt',
        content: FIXTURE_EN_SRT,
      };
    }

    if (lang === 'pt-br' || lang === 'por') {
      return {
        sourceId: `fixture-${query.videoId}-pt-BR`,
        language: 'pt-BR',
        format: 'vtt',
        content: FIXTURE_PT_VTT,
      };
    }

    if (lang === 'es' || lang === 'spa') {
      return {
        sourceId: `fixture-${query.videoId}-es`,
        language: 'es',
        format: 'vtt',
        content: FIXTURE_ES_VTT,
      };
    }

    return null;
  }
}
