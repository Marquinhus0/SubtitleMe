import type { CompanionPersistence } from '../companion/companion-persistence';

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

export const SETTINGS_ENCRYPTED_FILENAME = 'settings.enc.json';
export const SETTINGS_LEGACY_FILENAME = 'settings.json';
const SETTINGS_PURPOSE = 'settings';

/**
 * Live user preferences saved by the /configure Studio. They override the (static) addon
 * install-URL config on every subtitle request, so changing colors/languages/sync never
 * requires reinstalling the addon in Stremio.
 *
 * When local persistence is enabled, settings are encrypted at rest via `CompanionPersistence`
 * (AES-256-GCM + OS key vault) and legacy plaintext `settings.json` files are migrated safely.
 */
export class RuntimeSettingsStore {
  private raw: Record<string, string> = {};

  public constructor(private readonly persistence?: CompanionPersistence) {}

  public load(): void {
    if (!this.persistence || !this.persistence.isEnabled()) return;
    try {
      // Safely migrate legacy plaintext settings.json -> settings.enc.json if present
      const migration = this.persistence.migrateLegacyJsonFile<Record<string, string>>(
        SETTINGS_LEGACY_FILENAME,
        SETTINGS_ENCRYPTED_FILENAME,
        SETTINGS_PURPOSE,
        (parsed) => this.sanitize(parsed),
      );
      if (migration.migrated && migration.data) {
        this.raw = this.sanitize(migration.data);
        return;
      }

      const loaded = this.persistence.readEncryptedJsonFile<Record<string, unknown>>(
        SETTINGS_ENCRYPTED_FILENAME,
        SETTINGS_PURPOSE,
      );
      if (loaded && typeof loaded === 'object') {
        this.raw = this.sanitize(loaded);
      }
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
    if (persist && this.persistence && this.persistence.isEnabled()) {
      // Fail-closed: propagates vault/encryption errors instead of writing plaintext
      this.persistence.writeEncryptedJsonFile(
        SETTINGS_ENCRYPTED_FILENAME,
        SETTINGS_PURPOSE,
        this.raw,
      );
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
