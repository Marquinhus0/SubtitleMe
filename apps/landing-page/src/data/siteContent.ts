import { buildSupportChannels, type SupportChannel } from '../config/supportConfig';

export const REPO_URL = 'https://github.com/Marquinhus0/SubtitleMe';

export const RELEASE_INFO = {
  version: '1.0.1',
  tag: 'v1.0.1',
  tarball: 'subtitleme-stremio-v1.0.1.tar.gz',
  sha256: 'ae0c27694b609c9585266af4a8f72f55a9e1412e78a58a1be2c6061a08b40e5d',
  releaseUrl: `${REPO_URL}/releases/tag/v1.0.1`,
  downloadUrl: `${REPO_URL}/releases/download/v1.0.1/subtitleme-stremio-v1.0.1.tar.gz`,
  checksumUrl: `${REPO_URL}/releases/download/v1.0.1/subtitleme-stremio-v1.0.1.sha256`,
  studioUrl: 'http://127.0.0.1:7000/configure',
  manifestUrl: 'http://127.0.0.1:7000/manifest.json',
} as const;

export const DOC_LINKS = {
  repo: REPO_URL,
  installation: `${REPO_URL}/blob/main/docs/INSTALLATION.md`,
  userGuide: `${REPO_URL}/blob/main/docs/USER_GUIDE.md`,
  privacy: `${REPO_URL}/blob/main/docs/PRIVACY_AND_SECURITY.md`,
  faq: `${REPO_URL}/blob/main/docs/FAQ.md`,
  brandIdentity: `${REPO_URL}/blob/main/docs/BRAND_IDENTITY.md`,
  supportPolicy: `${REPO_URL}/blob/main/docs/SUPPORT_AND_DONATIONS.md`,
  license: `${REPO_URL}/blob/main/LICENSE`,
  changelog: `${REPO_URL}/blob/main/docs/CHANGELOG.md`,
  issues: `${REPO_URL}/issues`,
} as const;

export type { SupportChannel };

export const SUPPORT_CHANNELS: SupportChannel[] = buildSupportChannels({
  VITE_GITHUB_SPONSORS_URL: import.meta.env.VITE_GITHUB_SPONSORS_URL,
  VITE_KOFI_URL: import.meta.env.VITE_KOFI_URL,
});

export interface StepItem {
  number: string;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: StepItem[] = [
  {
    number: '01',
    title: 'Inicie o Local Companion',
    description:
      'Extraia o pacote standalone v1.0.1 e execute o launcher local. O servidor sobe apenas em 127.0.0.1:7000 no seu computador.',
  },
  {
    number: '02',
    title: 'Escolha seus dois idiomas no Studio',
    description:
      'Abra 127.0.0.1:7000/configure para definir idioma principal, idioma de apoio, formato (ASS, SRT ou VTT) e Modo Reveal.',
  },
  {
    number: '03',
    title: 'Conecte ao Stremio Desktop',
    description:
      'Clique em Instalar no Stremio ou cole http://127.0.0.1:7000/manifest.json na área de complementos do Stremio Desktop.',
  },
  {
    number: '04',
    title: 'Selecione a faixa Dual no player',
    description:
      'Reproduza qualquer filme ou série e escolha uma das 1 a 5 opções bilíngues ranqueadas diretamente no menu de legendas.',
  },
];

export interface FeatureItem {
  title: string;
  description: string;
  meta: string;
}

export const FEATURES: FeatureItem[] = [
  {
    title: '37 idiomas suportados',
    description:
      'Mapeamento completo BCP-47, ISO 639-2 e aliases nativos do Stremio — incluindo Inglês, Português (BR/PT), Espanhol, Francês, Alemão, Japonês e Coreano.',
    meta: 'BCP-47 · ISO 639-2',
  },
  {
    title: '1 a 5 pares bilíngues ranqueados',
    description:
      'Cada opção é pontuada pela sobreposição real de tempo e similaridade de release, permitindo alternar rapidamente se uma legenda estiver fora de sincronia.',
    meta: 'Ex.: Dual EN+PT-BR 1 · 96%',
  },
  {
    title: 'Motor multi-fonte configurável',
    description:
      'Prioriza arquivos locais (.srt/.vtt) enviados no Companion e integra OpenSubtitles v3 (padrão sem chave), Subtitle Sync e OpenSubtitles REST API v1 opcionais.',
    meta: 'Local + Provedores opcionais',
  },
  {
    title: 'Auto-Sync e trava anti-flicker',
    description:
      'Ancoragem bidirecional, correção de drift de FPS, janela anti-flicker de 380ms e offsets independentes de até ±30 segundos por idioma.',
    meta: 'Anti-flicker 380ms',
  },
  {
    title: 'Modo Reveal para escuta ativa',
    description:
      'Atrasa a legenda de apoio entre 0s e 2s enquanto reserva a altura vertical com espaço inquebrável — a linha principal nunca salta na tela.',
    meta: 'Delay 0s a 2s',
  },
  {
    title: 'ASS estilizado, Branco SRT e VTT',
    description:
      'Personalize cores, escala (28–68px) e fundo no SubtitleMe Studio em tempo real, ou use Branco SRT para controle nativo de tamanho pelo player.',
    meta: 'Aplicação ao vivo sem reinstalar',
  },
];

export interface DemoScene {
  timestamp: string;
  pairs: Record<string, { primary: string; secondary: string }>;
}

export interface LanguagePairOption {
  id: string;
  label: string;
  primaryTag: string;
  secondaryTag: string;
}

export const DEMO_LANGUAGE_PAIRS: LanguagePairOption[] = [
  { id: 'en-pt', label: 'EN + PT-BR', primaryTag: 'EN', secondaryTag: 'PT-BR' },
  { id: 'en-es', label: 'EN + ES', primaryTag: 'EN', secondaryTag: 'ES' },
  { id: 'ja-en', label: 'JA + EN', primaryTag: 'JA', secondaryTag: 'EN' },
  { id: 'de-pt', label: 'DE + PT-BR', primaryTag: 'DE', secondaryTag: 'PT-BR' },
];

export const DEMO_SCENES: DemoScene[] = [
  {
    timestamp: '00:14:22',
    pairs: {
      'en-pt': {
        primary: 'The train to Oslo leaves in four minutes.',
        secondary: 'O trem para Oslo parte em quatro minutos.',
      },
      'en-es': {
        primary: 'The train to Oslo leaves in four minutes.',
        secondary: 'El tren hacia Oslo sale en cuatro minutos.',
      },
      'ja-en': {
        primary: 'オスロ行きの列車はあと4分で出発する。',
        secondary: 'The train to Oslo leaves in four minutes.',
      },
      'de-pt': {
        primary: 'Der Zug nach Oslo fährt in vier Minuten ab.',
        secondary: 'O trem para Oslo parte em quatro minutos.',
      },
    },
  },
  {
    timestamp: '00:14:27',
    pairs: {
      'en-pt': {
        primary: 'If we stay on this platform, they will find us.',
        secondary: 'Se ficarmos nesta plataforma, eles vão nos encontrar.',
      },
      'en-es': {
        primary: 'If we stay on this platform, they will find us.',
        secondary: 'Si nos quedamos en este andén, nos encontrarán.',
      },
      'ja-en': {
        primary: 'このホームに留まれば、彼らに見つかってしまう。',
        secondary: 'If we stay on this platform, they will find us.',
      },
      'de-pt': {
        primary: 'Wenn wir auf diesem Bahnsteig bleiben, finden sie uns.',
        secondary: 'Se ficarmos nesta plataforma, eles vão nos encontrar.',
      },
    },
  },
  {
    timestamp: '00:14:33',
    pairs: {
      'en-pt': {
        primary: 'Keep your eyes on the second carriage.',
        secondary: 'Mantenha os olhos no segundo vagão.',
      },
      'en-es': {
        primary: 'Keep your eyes on the second carriage.',
        secondary: 'Mantén la vista en el segundo vagón.',
      },
      'ja-en': {
        primary: '二両目の車両から目を離すな。',
        secondary: 'Keep your eyes on the second carriage.',
      },
      'de-pt': {
        primary: 'Behalte den zweiten Wagen im Auge.',
        secondary: 'Mantenha os olhos no segundo vagão.',
      },
    },
  },
];

export interface PrivacyPillar {
  title: string;
  description: string;
}

export const PRIVACY_PILLARS: PrivacyPillar[] = [
  {
    title: 'Bind exclusivo em 127.0.0.1',
    description:
      'O Companion recusa 0.0.0.0, :: e IPs da rede local. Nenhum outro dispositivo na sua rede consegue acessar o serviço.',
  },
  {
    title: 'Zero telemetria e zero contas',
    description:
      'Sem analytics, sem pixels de rastreamento, sem cadastro e sem envio de arquivos locais de legenda para servidores externos.',
  },
  {
    title: 'Proteção contra DNS Rebinding e CSRF',
    description:
      'Validação estrita de Host/Origin, token efêmero de sessão de 256 bits (timingSafeEqual, TTL 12h) e cabeçalho X-SubtitleMe-CSRF: 1.',
  },
  {
    title: 'Memória por padrão, persistência transparente',
    description:
      'Legendas geradas expiram automaticamente em memória (TTL 15 min, tokens 192-bit). Persistência em disco é desativada por padrão e opt-in.',
  },
];

export interface CompatibilityRow {
  platform: string;
  status: 'valid' | 'partial' | 'unsupported';
  label: string;
  notes: string;
}

export const COMPATIBILITY_ROWS: CompatibilityRow[] = [
  {
    platform: 'Windows 11 X64 + Stremio Desktop 5.0.28',
    status: 'valid',
    label: 'Validado (GA v1.0.1)',
    notes: 'Plataforma primária validada ponta a ponta com Node.js 22+ (testado em v24.19.0).',
  },
  {
    platform: 'Linux (x64, Node.js 22+)',
    status: 'partial',
    label: 'CLI validado',
    notes: 'Instalação limpa do Companion validada; player Stremio Desktop Linux não validado visualmente.',
  },
  {
    platform: 'macOS',
    status: 'partial',
    label: 'Não validado',
    notes: 'Ainda não testado em hardware macOS na v1.0.1.',
  },
  {
    platform: 'Android, Android TV, iOS e Smart TVs',
    status: 'unsupported',
    label: 'Não suportado',
    notes: 'Arquitetura local-only em 127.0.0.1 impede acesso remoto por TVs ou celulares.',
  },
  {
    platform: 'Extensão Chrome (Manifest V3)',
    status: 'partial',
    label: 'v1.0.0 RC (não publicada)',
    notes: 'Disponível no repositório como Release Candidate; ainda não publicada na Chrome Web Store.',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'O SubtitleMe precisa de conta ou assinatura?',
    answer:
      'Não. O SubtitleMe é totalmente gratuito, roda localmente no seu computador e não exige cadastro, login ou assinatura. Todas as funcionalidades estão liberadas para todos os usuários.',
  },
  {
    question: 'Por que as cores das legendas ASS não apareceram no Stremio?',
    answer:
      'No Stremio Desktop, abra Configurações → Reprodutor e ative a opção "Estilizar legendas ASS". Se preferir controlar o tamanho diretamente pelo player, selecione o modo Branco SRT no SubtitleMe Studio.',
  },
  {
    question: 'A porta 7000 já está em uso no meu computador. O que fazer?',
    answer:
      'Defina outra porta antes de iniciar o Companion (ex.: PORT=7001) e instale o manifest correspondente em http://127.0.0.1:7001/manifest.json.',
  },
  {
    question: 'Meus arquivos .srt/.vtt locais são enviados para a internet?',
    answer:
      'Nunca. Arquivos enviados para o Local Companion Store permanecem exclusivamente na memória (ou no diretório local se você ativar SUBTITLEME_PERSISTENCE=1). Provedores externos recebem apenas o identificador do título/episódio quando habilitados.',
  },
  {
    question: 'Funciona no Android TV, Fire Stick, iPhone ou Smart TV?',
    answer:
      'Não. Por decisão de segurança e privacidade, o Local Companion aceita conexões apenas em 127.0.0.1 (o mesmo computador onde o Stremio Desktop está rodando).',
  },
  {
    question: 'A legenda ficou fora de sincronia. Como corrigir rápido?',
    answer:
      'Primeiro, selecione outra opção ranqueada no menu de legendas do Stremio (ex.: Dual 2 ou Dual 3). Você também pode ativar o Subtitle Sync ou ajustar os offsets independentes em 127.0.0.1:7000/configure.',
  },
  {
    question: 'Qual é o status da Extensão Chrome do SubtitleMe?',
    answer:
      'A Extensão Chrome (Manifest V3) está em estágio v1.0.0 RC no monorepo e ainda não foi publicada oficialmente na Chrome Web Store. O lançamento público atual foca no Stremio Addon v1.0.1.',
  },
];
