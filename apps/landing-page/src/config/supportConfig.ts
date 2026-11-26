export type SupportPlatformId = 'github-sponsors' | 'kofi';

export interface SupportChannel {
  id: SupportPlatformId;
  name: string;
  description: string;
  ctaLabel: string;
  url: string | null;
  statusLabel: string;
}

const ALLOWED_PREFIXES: Record<SupportPlatformId, string> = {
  'github-sponsors': 'https://github.com/sponsors/',
  kofi: 'https://ko-fi.com/',
};

/**
 * Validates an optional build-time donation URL against strict HTTPS allowlists.
 * Returns null if unset, empty, or outside the official platform origin so no
 * unverified or invented donation link is ever rendered.
 */
export function resolveOfficialSupportUrl(
  platform: SupportPlatformId,
  rawValue: string | undefined,
): string | null {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const expectedPrefix = ALLOWED_PREFIXES[platform];
  if (!trimmed.startsWith(expectedPrefix)) return null;

  try {
    const parsed = new URL(trimmed);
    const slug = parsed.pathname.slice(new URL(expectedPrefix).pathname.length).replace(/\/+$/, '');
    if (parsed.protocol !== 'https:' || slug.length < 2) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildSupportChannels(env: {
  VITE_GITHUB_SPONSORS_URL?: string;
  VITE_KOFI_URL?: string;
}): SupportChannel[] {
  const sponsorsUrl = resolveOfficialSupportUrl('github-sponsors', env.VITE_GITHUB_SPONSORS_URL);
  const kofiUrl = resolveOfficialSupportUrl('kofi', env.VITE_KOFI_URL);

  return [
    {
      id: 'github-sponsors',
      name: 'GitHub Sponsors',
      description:
        'Apoio pontual ou recorrente diretamente pelo ecossistema GitHub, ideal para desenvolvedores e membros da comunidade open-source.',
      ctaLabel: 'Apoiar via GitHub Sponsors',
      url: sponsorsUrl,
      statusLabel: sponsorsUrl ? 'Canal oficial ativo' : 'Aguardando ativação oficial',
    },
    {
      id: 'kofi',
      name: 'Ko-fi',
      description:
        'Contribuição voluntária pontual sem exigir conta no GitHub — simples, opcional e sem vantagens exclusivas.',
      ctaLabel: 'Apoiar via Ko-fi',
      url: kofiUrl,
      statusLabel: kofiUrl ? 'Canal oficial ativo' : 'Aguardando ativação oficial',
    },
  ];
}
