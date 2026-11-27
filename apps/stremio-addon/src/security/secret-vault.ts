/**
 * Abstract interface for OS-backed secure secret storage.
 *
 * Implementations must store master key material exclusively inside the operating system's
 * native credential vault (never alongside persisted data files, never in plaintext config,
 * and never logged).
 */
export interface KeyVault {
  readonly backendName: string;
  isAvailable(): boolean;
  getSecret(service: string, account: string): string | null;
  setSecret(service: string, account: string, secret: string): void;
  deleteSecret(service: string, account: string): boolean;
}

export class VaultUnavailableError extends Error {
  public readonly code = 'VAULT_UNAVAILABLE';
  public readonly backend: string;

  public constructor(backend: string, message: string) {
    super(message);
    this.name = 'VaultUnavailableError';
    this.backend = backend;
  }
}

export class VaultPermissionError extends Error {
  public readonly code = 'VAULT_PERMISSION_DENIED';
  public readonly backend: string;

  public constructor(backend: string, message: string) {
    super(message);
    this.name = 'VaultPermissionError';
    this.backend = backend;
  }
}

export class VaultOperationError extends Error {
  public readonly code = 'VAULT_OPERATION_FAILED';
  public readonly backend: string;

  public constructor(backend: string, message: string) {
    super(message);
    this.name = 'VaultOperationError';
    this.backend = backend;
  }
}

/**
 * Ephemeral in-memory vault strictly for unit/integration tests.
 * NEVER used as a fallback in production runtime.
 */
export class InMemoryKeyVault implements KeyVault {
  public readonly backendName = 'in-memory-test-vault';
  private readonly store = new Map<string, string>();
  private available = true;

  public setAvailable(available: boolean): void {
    this.available = available;
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public getSecret(service: string, account: string): string | null {
    if (!this.available) {
      throw new VaultUnavailableError(this.backendName, 'Test vault is marked unavailable.');
    }
    return this.store.get(`${service}::${account}`) ?? null;
  }

  public setSecret(service: string, account: string, secret: string): void {
    if (!this.available) {
      throw new VaultUnavailableError(this.backendName, 'Test vault is marked unavailable.');
    }
    this.store.set(`${service}::${account}`, secret);
  }

  public deleteSecret(service: string, account: string): boolean {
    if (!this.available) {
      throw new VaultUnavailableError(this.backendName, 'Test vault is marked unavailable.');
    }
    return this.store.delete(`${service}::${account}`);
  }
}
