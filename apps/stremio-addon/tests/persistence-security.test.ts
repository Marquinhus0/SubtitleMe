import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CompanionPersistence,
  CompanionSubtitleStore,
  CryptoIntegrityError,
  InMemoryKeyVault,
  LinuxSecretServiceVault,
  MacOsKeychainVault,
  PersistenceKeyManager,
  UnsupportedOsKeyVault,
  VaultOperationError,
  VaultPermissionError,
  VaultUnavailableError,
  WindowsCredentialVault,
  createOsKeyVault,
  decryptJson,
  decryptText,
  encryptJson,
  encryptText,
  isEncryptedEnvelope,
  startStremioAddonServer,
  validateCompanionUpload,
} from '../src/index';
import { RuntimeSettingsStore } from '../src/config/runtime-settings';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'subtitleme-s21-5-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('Sprint 21.5 (AUD-05) — Authenticated Encryption (AES-256-GCM)', () => {
  it('encrypts and decrypts text/JSON validly with unique random IV per operation', () => {
    const key = randomBytes(32);
    const payload = { v1ApiKey: 'fixture-key-not-real', subtitleSyncUrl: 'https://example.test/fixture/manifest.json' };

    const enc1 = encryptJson(payload, key, 'providers');
    const enc2 = encryptJson(payload, key, 'providers');

    expect(isEncryptedEnvelope(enc1)).toBe(true);
    expect(enc1).not.toContain('fixture-key-not-real');
    expect(enc1).not.toContain('example.test');

    const parsed1 = JSON.parse(enc1) as { iv: string; ciphertext: string };
    const parsed2 = JSON.parse(enc2) as { iv: string; ciphertext: string };
    expect(parsed1.iv).not.toBe(parsed2.iv);
    expect(parsed1.ciphertext).not.toBe(parsed2.ciphertext);

    expect(decryptJson(enc1, key, 'providers')).toEqual(payload);
    expect(decryptJson(enc2, key, 'providers')).toEqual(payload);
  });

  it('rejects tampered ciphertext, wrong key, wrong purpose AAD, truncated data, and invalid format', () => {
    const key = randomBytes(32);
    const wrongKey = randomBytes(32);
    const enc = encryptText('Sensitive fixture subtitle line.', key, 'subtitle:local-12345678');

    // Wrong key
    expect(() => decryptText(enc, wrongKey, 'subtitle:local-12345678')).toThrow(CryptoIntegrityError);

    // Wrong purpose (file-swap defense via AAD)
    expect(() => decryptText(enc, key, 'providers')).toThrow(CryptoIntegrityError);

    // Tampered ciphertext
    const obj = JSON.parse(enc) as { ciphertext: string; tag: string; iv: string; format: string; alg: string; purpose: string };
    const ctBuf = Buffer.from(obj.ciphertext, 'base64');
    ctBuf[0] = (ctBuf[0] ?? 0) ^ 0xff;
    const tampered = JSON.stringify({ ...obj, ciphertext: ctBuf.toString('base64') });
    expect(() => decryptText(tampered, key, 'subtitle:local-12345678')).toThrow(CryptoIntegrityError);

    // Truncated envelope
    const truncated = enc.slice(0, Math.floor(enc.length / 2));
    expect(() => decryptText(truncated, key, 'subtitle:local-12345678')).toThrow(CryptoIntegrityError);

    // Invalid format
    expect(() => decryptText('{"format":"unknown"}', key, 'subtitle:local-12345678')).toThrow(CryptoIntegrityError);
    expect(() => encryptText('abc', Buffer.alloc(16), 'settings')).toThrow(CryptoIntegrityError);
  });
});

describe('Sprint 21.5 (AUD-05) — Key Manager & OS Vault Adapters', () => {
  it('creates, retrieves, caches, wipes on dispose, and deletes master key cleanly', () => {
    const vault = new InMemoryKeyVault();
    const km = new PersistenceKeyManager(vault);

    expect(km.getExistingKey()).toBeNull();
    const k1 = km.getOrCreateKey();
    expect(k1.length).toBe(32);

    const k2 = km.getOrCreateKey();
    expect(k2.equals(k1)).toBe(true);

    km.dispose();
    const k3 = km.getExistingKey();
    expect(k3?.equals(k1)).toBe(true);

    expect(km.deleteKey()).toBe(true);
    expect(km.getExistingKey()).toBeNull();
  });

  it('fails closed when vault is unavailable, key is invalid, or OS is unsupported', () => {
    const vault = new InMemoryKeyVault();
    vault.setAvailable(false);
    const km = new PersistenceKeyManager(vault);
    expect(() => km.getOrCreateKey()).toThrow(VaultUnavailableError);

    // Corrupted key length stored in vault
    vault.setAvailable(true);
    vault.setSecret('SubtitleMe.LocalCompanion', 'MasterKey.v1', Buffer.from('short').toString('base64'));
    expect(() => km.getExistingKey()).toThrow(VaultOperationError);

    // Unsupported OS
    const unsupported = createOsKeyVault({ platform: 'freebsd' });
    expect(unsupported).toBeInstanceOf(UnsupportedOsKeyVault);
    expect(unsupported.isAvailable()).toBe(false);
    expect(() => unsupported.getSecret('s', 'a')).toThrow(VaultUnavailableError);
  });

  it('mocks Linux secret-tool (stdin + shell:false, headless failure) and macOS security adapter', () => {
    const linuxExec = vi.fn((_cmd: string, args: readonly string[]) => {
      if (args[0] === '--version') return 'secret-tool 0.21';
      if (args[0] === 'store') return '';
      if (args[0] === 'lookup') return 'bW9jay1zZWNyZXQ=';
      return '';
    });
    const linuxVault = new LinuxSecretServiceVault(linuxExec);
    expect(linuxVault.isAvailable()).toBe(true);
    linuxVault.setSecret('SubtitleMe.Test', 'Key', 'bW9jay1zZWNyZXQ=');
    expect(linuxExec).toHaveBeenCalledWith(
      'secret-tool',
      ['store', '--label=SubtitleMe.Test', 'service', 'SubtitleMe.Test', 'account', 'Key'],
      expect.objectContaining({ shell: false, input: 'bW9jay1zZWNyZXQ=\n' }),
    );
    expect(linuxVault.getSecret('SubtitleMe.Test', 'Key')).toBe('bW9jay1zZWNyZXQ=');

    // Headless D-Bus failure -> VaultUnavailableError
    const headlessExec = vi.fn(() => {
      throw Object.assign(new Error('Cannot autolaunch D-Bus without X11'), { stderr: 'org.freedesktop.secrets' });
    });
    const headlessLinux = new LinuxSecretServiceVault(headlessExec);
    expect(() => headlessLinux.setSecret('s', 'a', 'v')).toThrow(VaultUnavailableError);

    // Permission denied on macOS Keychain -> VaultPermissionError
    const lockedMacExec = vi.fn(() => {
      throw Object.assign(new Error('security: User interaction is not allowed'), { stderr: 'User interaction is not allowed' });
    });
    const macVault = new MacOsKeychainVault(lockedMacExec);
    expect(() => macVault.getSecret('s', 'a')).toThrow(VaultPermissionError);

    // CR-01: macOS setSecret uses `/usr/bin/security -i` via stdin, NEVER passing secret in process args
    const macWriteExec = vi.fn(() => '');
    const macWriteVault = new MacOsKeychainVault(macWriteExec);
    const macTestSecret = 'bWFjLWZpeHR1cmUtc2VjcmV0LTAxMjM0NTY3ODk=';
    macWriteVault.setSecret('SubtitleMe.Test', 'MasterKey.v1', macTestSecret);
    expect(macWriteExec).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = macWriteExec.mock.calls[0] as unknown as [
      string,
      readonly string[],
      { input?: string; shell: boolean },
    ];
    expect(cmd).toBe('/usr/bin/security');
    expect(args).toEqual(['-i']);
    expect(args.join(' ')).not.toContain(macTestSecret);
    expect(opts.shell).toBe(false);
    expect(opts.input).toBe(
      `add-generic-password -U -s "SubtitleMe.Test" -a "MasterKey.v1" -w "${macTestSecret}"\n`,
    );

    // Reject control/quote characters in interactive stdin fields without echoing secret
    expect(() =>
      macWriteVault.setSecret('SubtitleMe.Test', 'MasterKey.v1', 'bad\nsecret"inject'),
    ).toThrow(VaultOperationError);
  });

  it.skipIf(process.platform !== 'win32')(
    'validates real Windows Credential Manager round-trip (write, read, delete) natively on Windows',
    { timeout: 15_000 },
    () => {
      const winVault = new WindowsCredentialVault();
      expect(winVault.isAvailable()).toBe(true);

      const testService = 'SubtitleMe.Test.Sprint21_5';
      const testAccount = `NativeCheck.${randomUUID()}`;
      const testSecret = randomBytes(32).toString('base64');

      try {
        expect(winVault.getSecret(testService, testAccount)).toBeNull();
        winVault.setSecret(testService, testAccount, testSecret);
        expect(winVault.getSecret(testService, testAccount)).toBe(testSecret);
        expect(winVault.deleteSecret(testService, testAccount)).toBe(true);
        expect(winVault.getSecret(testService, testAccount)).toBeNull();
      } finally {
        try {
          winVault.deleteSecret(testService, testAccount);
        } catch {
          // Best-effort cleanup
        }
      }
    },
  );
});

describe('Sprint 21.5 (AUD-05) — Encrypted Persistence, Fail-Closed & Safe Legacy Migration', () => {
  it('stays disabled by default and never writes to disk when disabled', () => {
    const dataDir = createTempDir();
    const vault = new InMemoryKeyVault();
    const persistence = new CompanionPersistence({ enabled: false, dataDir, keyVault: vault });
    const status = persistence.getStatus();

    expect(status.enabled).toBe(false);
    expect(status.encryptedAtRest).toBe(false);

    const store = new CompanionSubtitleStore({ persistence });
    const up = validateCompanionUpload({
      contentId: 'tt1254207',
      language: 'en',
      filename: 'test.srt',
      content: '1\n00:00:01,000 --> 00:00:03,000\nMemory only line.\n',
    });
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    store.upsert(up.value);

    expect(readdirSync(dataDir)).toEqual([]);
  });

  it('encrypts subtitles, settings, and providers at rest with zero plaintext on disk and recovers across restart', async () => {
    const dataDir = createTempDir();
    const vault = new InMemoryKeyVault();

    const s1 = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: true, dataDir, keyVault: vault },
    });
    try {
      expect(s1.persistence.getStatus().encryptedAtRest).toBe(true);

      // Persist subtitle track
      const up = validateCompanionUpload({
        contentId: 'tt1254207',
        language: 'en',
        filename: 'secret-movie-en.srt',
        content: '1\n00:00:01,000 --> 00:00:03,000\nConfidential fixture line.\n',
      });
      expect(up.ok).toBe(true);
      if (!up.ok) return;
      s1.companionStore.upsert(up.value);

      // Persist settings & providers via encrypted store
      const settingsStore = new RuntimeSettingsStore(s1.persistence);
      settingsStore.set({ primaryLanguage: 'ja', secondaryLanguage: 'pt-BR', revealMs: 1000 }, true);
      s1.persistence.writeEncryptedJsonFile('providers.enc.json', 'providers', {
        v1Enabled: true,
        v1ApiKey: 'fixture-os-secret-key-999',
        subtitleSyncUrl: 'https://subtitlesync.example/private-token-xyz/manifest.json',
      });

      // Verify ZERO plaintext anywhere in dataDir
      const files = readdirSync(dataDir);
      expect(files).toContain('index.json');
      expect(files).toContain('settings.enc.json');
      expect(files).toContain('providers.enc.json');
      for (const file of files) {
        const raw = readFileSync(join(dataDir, file), 'utf-8');
        expect(isEncryptedEnvelope(raw)).toBe(true);
        expect(raw).not.toContain('Confidential fixture line.');
        expect(raw).not.toContain('secret-movie-en.srt');
        expect(raw).not.toContain('fixture-os-secret-key-999');
        expect(raw).not.toContain('private-token-xyz');
      }
    } finally {
      await s1.close();
    }

    // Restart with same OS vault -> all data recovers cleanly
    const s2 = await startStremioAddonServer({
      port: 0,
      persistenceOptions: { enabled: true, dataDir, keyVault: vault },
    });
    try {
      expect(s2.persistence.getStatus().encryptedAtRest).toBe(true);
      expect(s2.companionStore.count()).toBe(1);
      expect(s2.companionStore.findByContentAndLanguage('tt1254207', 'en')?.content).toContain(
        'Confidential fixture line.',
      );
      const settingsReloaded = new RuntimeSettingsStore(s2.persistence);
      settingsReloaded.load();
      expect(settingsReloaded.get().primaryLanguage).toBe('ja');
    } finally {
      await s2.close();
    }
  });

  it('refuses to enable or write plaintext when OS vault is unavailable (no silent fallback)', () => {
    const dataDir = createTempDir();
    const unavailableVault = new InMemoryKeyVault();
    unavailableVault.setAvailable(false);

    expect(
      () => new CompanionPersistence({ enabled: true, dataDir, keyVault: unavailableVault }),
    ).toThrow(VaultUnavailableError);
    expect(readdirSync(dataDir)).toEqual([]);

    const disabled = new CompanionPersistence({ enabled: false, dataDir, keyVault: unavailableVault });
    expect(() => disabled.setEnabled(true)).toThrow(VaultUnavailableError);
    expect(disabled.isEnabled()).toBe(false);
    expect(disabled.getStatus().encryptedAtRest).toBe(false);
    expect(readdirSync(dataDir)).toEqual([]);
  });

  it('safely migrates legacy plaintext providers.json, settings.json, and index.json + .srt, and preserves originals on vault failure', () => {
    const dataDir = createTempDir();
    const legacySrtFile = `${randomUUID()}.srt`;
    const legacySubText = '1\n00:00:02,000 --> 00:00:05,000\nLegacy plaintext subtitle.\n';

    writeFileSync(join(dataDir, legacySrtFile), legacySubText, 'utf-8');
    writeFileSync(
      join(dataDir, 'index.json'),
      JSON.stringify({
        version: 1,
        entries: [
          {
            id: 'local-legacy1234',
            contentId: 'tt1254207',
            associationKind: 'imdb-movie',
            language: 'en',
            format: 'srt',
            filename: 'legacy-en.srt',
            internalFile: legacySrtFile,
            byteLength: Buffer.byteLength(legacySubText, 'utf-8'),
            cueCount: 1,
            uploadedAt: 1700000000000,
          },
        ],
      }),
      'utf-8',
    );
    writeFileSync(
      join(dataDir, 'settings.json'),
      JSON.stringify({ primaryLanguage: 'de', secondaryLanguage: 'pt-BR' }),
      'utf-8',
    );
    writeFileSync(
      join(dataDir, 'providers.json'),
      JSON.stringify({ v1Enabled: true, v1ApiKey: 'legacy-fixture-key-123' }),
      'utf-8',
    );

    // 1. Interruption / vault unavailable -> originals MUST remain completely untouched
    const brokenVault = new InMemoryKeyVault();
    brokenVault.setAvailable(false);
    expect(
      () => new CompanionPersistence({ enabled: true, dataDir, keyVault: brokenVault }),
    ).toThrow(VaultUnavailableError);
    expect(existsSync(join(dataDir, 'providers.json'))).toBe(true);
    expect(existsSync(join(dataDir, 'settings.json'))).toBe(true);
    expect(existsSync(join(dataDir, legacySrtFile))).toBe(true);

    // 2. Vault available -> atomic verified migration succeeds and removes legacy plaintext files
    const vault = new InMemoryKeyVault();
    const persistence = new CompanionPersistence({ enabled: true, dataDir, keyVault: vault });
    const recovered = persistence.loadAll();
    expect(recovered.records).toHaveLength(1);
    expect(recovered.migratedLegacyCount).toBe(1);
    expect(recovered.records[0]?.record.content).toBe(legacySubText);

    const settingsStore = new RuntimeSettingsStore(persistence);
    settingsStore.load();
    expect(settingsStore.get().primaryLanguage).toBe('de');

    const provMigration = persistence.migrateLegacyJsonFile<{ v1ApiKey: string }>(
      'providers.json',
      'providers.enc.json',
      'providers',
    );
    expect(provMigration.migrated).toBe(true);
    expect(provMigration.data?.v1ApiKey).toBe('legacy-fixture-key-123');

    // Legacy plaintext files removed only after verified encryption
    expect(existsSync(join(dataDir, 'providers.json'))).toBe(false);
    expect(existsSync(join(dataDir, 'settings.json'))).toBe(false);
    expect(existsSync(join(dataDir, legacySrtFile))).toBe(false);

    // All remaining files are encrypted envelopes with zero plaintext
    for (const file of readdirSync(dataDir)) {
      const raw = readFileSync(join(dataDir, file), 'utf-8');
      expect(isEncryptedEnvelope(raw)).toBe(true);
      expect(raw).not.toContain('Legacy plaintext subtitle.');
      expect(raw).not.toContain('legacy-fixture-key-123');
    }
  });

  it('CR-03: handles idempotent migration re-execution when valid .enc.json and legacy file coexist on disk', () => {
    const dataDir = createTempDir();
    const vault = new InMemoryKeyVault();
    const persistence = new CompanionPersistence({ enabled: true, dataDir, keyVault: vault });

    // 1. Write a valid encrypted providers.enc.json (simulating post-write state before legacy unlink)
    const encryptedData = { v1Enabled: true, v1ApiKey: 'valid-encrypted-fixture-v2' };
    persistence.writeEncryptedJsonFile('providers.enc.json', 'providers', encryptedData);

    // 2. Simultaneously place a stale legacy plaintext providers.json on disk (simulating crash mid-migration)
    const legacyPath = join(dataDir, 'providers.json');
    const encPath = join(dataDir, 'providers.enc.json');
    writeFileSync(
      legacyPath,
      JSON.stringify({ v1Enabled: false, v1ApiKey: 'stale-legacy-fixture-v1' }),
      'utf-8',
    );
    expect(existsSync(encPath)).toBe(true);
    expect(existsSync(legacyPath)).toBe(true);

    // 3. Re-execute migration: preserves valid encrypted data (never overwrites with stale legacy) & removes legacy
    const firstRun = persistence.migrateLegacyJsonFile<{ v1Enabled: boolean; v1ApiKey: string }>(
      'providers.json',
      'providers.enc.json',
      'providers',
    );
    expect(firstRun.migrated).toBe(true);
    expect(firstRun.data).toEqual(encryptedData);
    expect(existsSync(legacyPath)).toBe(false);
    expect(existsSync(encPath)).toBe(true);

    // 4. Verify encrypted file on disk has zero plaintext and decrypts intact
    const rawEnc = readFileSync(encPath, 'utf-8');
    expect(isEncryptedEnvelope(rawEnc)).toBe(true);
    expect(rawEnc).not.toContain('valid-encrypted-fixture-v2');
    expect(rawEnc).not.toContain('stale-legacy-fixture-v1');
    expect(persistence.readEncryptedJsonFile('providers.enc.json', 'providers')).toEqual(encryptedData);

    // 5. Subsequent execution is idempotent (no-op, preserves encrypted file intact)
    const secondRun = persistence.migrateLegacyJsonFile<{ v1Enabled: boolean; v1ApiKey: string }>(
      'providers.json',
      'providers.enc.json',
      'providers',
    );
    expect(secondRun).toEqual({ migrated: false, data: null });
    expect(existsSync(encPath)).toBe(true);
    expect(persistence.readEncryptedJsonFile('providers.enc.json', 'providers')).toEqual(encryptedData);
  });
});
