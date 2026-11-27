import { randomBytes } from 'node:crypto';
import { AES_256_KEY_BYTES } from './data-cipher';
import {
  type KeyVault,
  VaultOperationError,
  VaultUnavailableError,
} from './secret-vault';

export const DEFAULT_VAULT_SERVICE = 'SubtitleMe.LocalCompanion';
export const DEFAULT_VAULT_ACCOUNT = 'MasterKey.v1';

export interface PersistenceKeyManagerOptions {
  readonly service?: string;
  readonly account?: string;
}

/**
 * Manages the 256-bit master encryption key for local persistence.
 *
 * Security invariants:
 * - Master key is stored EXCLUSIVELY in the OS-backed `KeyVault` (never on disk next to data).
 * - Key is cached only in process memory during the active session and zeroed on `dispose()`.
 * - Never falls back to a hardcoded or disk-stored key when the OS vault is unavailable.
 * - Never logs key material in errors or diagnostics.
 */
export class PersistenceKeyManager {
  private readonly vault: KeyVault;
  private readonly service: string;
  private readonly account: string;
  private cachedKey: Buffer | null = null;

  public constructor(vault: KeyVault, options: PersistenceKeyManagerOptions = {}) {
    this.vault = vault;
    this.service = options.service ?? DEFAULT_VAULT_SERVICE;
    this.account = options.account ?? DEFAULT_VAULT_ACCOUNT;
  }

  public getBackendName(): string {
    return this.vault.backendName;
  }

  public isVaultAvailable(): boolean {
    return this.vault.isAvailable();
  }

  /**
   * Retrieves the existing 256-bit master key from the OS vault without creating a new one.
   */
  public getExistingKey(): Buffer | null {
    if (this.cachedKey) {
      return Buffer.from(this.cachedKey);
    }
    if (!this.vault.isAvailable()) {
      throw new VaultUnavailableError(
        this.vault.backendName,
        `OS credential vault (${this.vault.backendName}) is not available. Persistence cannot operate without secure key storage.`,
      );
    }

    const encoded = this.vault.getSecret(this.service, this.account);
    if (!encoded) {
      return null;
    }

    const decoded = Buffer.from(encoded.trim(), 'base64');
    if (decoded.length !== AES_256_KEY_BYTES) {
      decoded.fill(0);
      throw new VaultOperationError(
        this.vault.backendName,
        'Stored master key in OS vault has invalid length.',
      );
    }

    this.cachedKey = decoded;
    return Buffer.from(this.cachedKey);
  }

  /**
   * Retrieves the master key from the OS vault, or generates a fresh 256-bit key,
   * stores it in the OS vault, and verifies round-trip retrieval before returning it.
   */
  public getOrCreateKey(): Buffer {
    const existing = this.getExistingKey();
    if (existing) {
      return existing;
    }

    const freshKey = randomBytes(AES_256_KEY_BYTES);
    const encoded = freshKey.toString('base64');

    try {
      this.vault.setSecret(this.service, this.account, encoded);
      const verified = this.vault.getSecret(this.service, this.account);
      if (!verified || verified.trim() !== encoded) {
        freshKey.fill(0);
        throw new VaultOperationError(
          this.vault.backendName,
          'OS vault failed round-trip verification after storing the master key.',
        );
      }
      this.cachedKey = freshKey;
      return Buffer.from(this.cachedKey);
    } catch (err) {
      freshKey.fill(0);
      throw err;
    }
  }

  /**
   * Removes the master key from the OS vault and wipes the in-memory copy.
   */
  public deleteKey(): boolean {
    this.dispose();
    if (!this.vault.isAvailable()) {
      throw new VaultUnavailableError(
        this.vault.backendName,
        `OS credential vault (${this.vault.backendName}) is not available.`,
      );
    }
    return this.vault.deleteSecret(this.service, this.account);
  }

  /**
   * Zeroes any cached key material in memory.
   */
  public dispose(): void {
    if (this.cachedKey) {
      this.cachedKey.fill(0);
      this.cachedKey = null;
    }
  }
}
