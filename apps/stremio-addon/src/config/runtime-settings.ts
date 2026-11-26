import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const ALLOWED_KEYS = [
  'primaryLanguage',
  'secondaryLanguage',
  'primaryOffsetMs',
  'secondaryOffsetMs',
  'order',
  'bilingualEnabled',
  'primaryColor',
  'secondaryColor',
  'secondaryStyle',
  'verticalPosition',
  'fontSize',
  'backgroundStyle',
  'autoSync',
  'outputFormat',
  'learnSrc',
  'nativeSrc',
  'pairCount',
  'revealMs',
] as const;

/**
 * Live user preferences saved by the /configure Studio. They override the (static) addon
 * install-URL config on every subtitle request, so changing colors/languages/sync never
 * requires reinstalling the addon in Stremio. Contains no secrets (API keys are never stored).
 */
export class RuntimeSettingsStore {
  private raw: Record<string, string> = {};

  public constructor(private readonly filePath?: string) {}

  public load(): void {
    if (!this.filePath || !existsSync(this.filePath)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf-8')) as Record<string, unknown>;
      this.raw = this.sanitize(parsed);
    } catch {
      this.raw = {};
    }
  }

  public isConfigured(): boolean {
    return Object.keys(this.raw).length > 0;
  }

  public get(): Record<string, string> {
    return { ...this.raw };
  }

  public set(input: Record<string, unknown>, persist: boolean): void {
    this.raw = this.sanitize(input);
    if (persist && this.filePath) {
      try {
        mkdirSync(dirname(this.filePath), { recursive: true });
        writeFileSync(this.filePath, JSON.stringify(this.raw, null, 2), 'utf-8');
      } catch {
        // Non-fatal: settings remain active in memory
      }
    }
  }

  private sanitize(input: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of ALLOWED_KEYS) {
      const value = input[key];
      if (typeof value === 'string') out[key] = value;
      else if (typeof value === 'number' || typeof value === 'boolean') out[key] = String(value);
    }
    return out;
  }
}
