import { execFileSync } from 'node:child_process';
import {
  type KeyVault,
  VaultOperationError,
  VaultPermissionError,
  VaultUnavailableError,
} from './secret-vault';

export interface OsVaultExecOptions {
  readonly input?: string;
  readonly encoding: 'utf-8';
  readonly stdio: ['pipe', 'pipe', 'pipe'];
  readonly shell: false;
  readonly timeout: number;
  readonly windowsHide: true;
}

export type OsVaultExecFileFn = (
  command: string,
  args: readonly string[],
  options: OsVaultExecOptions,
) => string;

export interface CreateOsKeyVaultOptions {
  readonly platform?: NodeJS.Platform;
  readonly execFile?: OsVaultExecFileFn;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function defaultExecFile(
  command: string,
  args: readonly string[],
  options: OsVaultExecOptions,
): string {
  return execFileSync(command, [...args], options);
}

function classifyExecError(backend: string, err: unknown, action: string): Error {
  const errObj = err as { code?: string; stderr?: string | Buffer; message?: string };
  const stderrText =
    typeof errObj?.stderr === 'string'
      ? errObj.stderr
      : Buffer.isBuffer(errObj?.stderr)
        ? errObj.stderr.toString('utf-8')
        : '';
  const combined = `${errObj?.message ?? ''} ${stderrText}`.toLowerCase();

  if (errObj?.code === 'ENOENT') {
    return new VaultUnavailableError(
      backend,
      `OS credential vault utility is not installed or unavailable during ${action}.`,
    );
  }
  if (
    combined.includes('access is denied') ||
    combined.includes('permission denied') ||
    combined.includes('unauthorized') ||
    combined.includes('user interaction is not allowed') ||
    combined.includes('locked')
  ) {
    return new VaultPermissionError(
      backend,
      `OS credential vault denied permission or is locked during ${action}.`,
    );
  }
  if (
    combined.includes('cannot autolaunch d-bus') ||
    combined.includes('no such interface') ||
    combined.includes('org.freedesktop.secrets') ||
    combined.includes('serviceunknown')
  ) {
    return new VaultUnavailableError(
      backend,
      `OS credential vault service is unavailable (headless or daemon not running) during ${action}.`,
    );
  }
  return new VaultOperationError(
    backend,
    `OS credential vault failed during ${action} (details redacted for security).`,
  );
}

/**
 * Windows Credential Manager adapter using Win32 `advapi32.dll` (`CredWriteW` / `CredReadW` / `CredDeleteW`)
 * via PowerShell with `shell: false` and secret input passed strictly through `stdin` (never CLI args).
 */
export class WindowsCredentialVault implements KeyVault {
  public readonly backendName = 'windows-credential-manager';
  private readonly execFile: OsVaultExecFileFn;

  public constructor(execFile: OsVaultExecFileFn = defaultExecFile) {
    this.execFile = execFile;
  }

  private buildTargetName(service: string, account: string): string {
    return `${service}/${account}`;
  }

  private buildPowerShellScript(action: 'get' | 'set' | 'delete', targetName: string): string {
    const safeTarget = targetName.replace(/'/g, "''");
    const csType = `
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class SubtitleMeWinCred {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags;
    public uint Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize;
    public IntPtr CredentialBlob;
    public uint Persist;
    public uint AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }

  [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredWrite([In] ref CREDENTIAL userCredential, [In] uint flags);

  [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, uint type, uint reservedFlag, out IntPtr credentialPtr);

  [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredDelete(string target, uint type, uint flags);

  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern void CredFree([In] IntPtr buffer);

  public static void Write(string target, string secret) {
    byte[] bytes = Encoding.UTF8.GetBytes(secret);
    IntPtr blob = Marshal.AllocCoTaskMem(bytes.Length);
    try {
      Marshal.Copy(bytes, 0, blob, bytes.Length);
      CREDENTIAL cred = new CREDENTIAL();
      cred.Type = 1; // CRED_TYPE_GENERIC
      cred.TargetName = target;
      cred.CredentialBlobSize = (uint)bytes.Length;
      cred.CredentialBlob = blob;
      cred.Persist = 2; // CRED_PERSIST_LOCAL_MACHINE
      cred.UserName = Environment.UserName;
      if (!CredWrite(ref cred, 0)) {
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
      }
    } finally {
      Marshal.FreeCoTaskMem(blob);
    }
  }

  public static string Read(string target) {
    IntPtr ptr;
    if (!CredRead(target, 1, 0, out ptr)) {
      int err = Marshal.GetLastWin32Error();
      if (err == 1168) return null; // ERROR_NOT_FOUND
      throw new System.ComponentModel.Win32Exception(err);
    }
    try {
      CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(ptr, typeof(CREDENTIAL));
      if (cred.CredentialBlob == IntPtr.Zero || cred.CredentialBlobSize == 0) return "";
      byte[] bytes = new byte[cred.CredentialBlobSize];
      Marshal.Copy(cred.CredentialBlob, bytes, 0, (int)cred.CredentialBlobSize);
      return Encoding.UTF8.GetString(bytes);
    } finally {
      CredFree(ptr);
    }
  }

  public static bool Delete(string target) {
    if (!CredDelete(target, 1, 0)) {
      int err = Marshal.GetLastWin32Error();
      if (err == 1168) return false;
      throw new System.ComponentModel.Win32Exception(err);
    }
    return true;
  }
}
`;

    if (action === 'get') {
      return `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${csType}
'@
$val = [SubtitleMeWinCred]::Read('${safeTarget}')
if ($null -eq $val) { Write-Output '__NOT_FOUND__' } else { Write-Output $val }
`;
    }
    if (action === 'set') {
      return `
$ErrorActionPreference = 'Stop'
$secret = [Console]::In.ReadToEnd().Trim()
if ([string]::IsNullOrEmpty($secret)) { throw 'Empty secret' }
Add-Type -TypeDefinition @'
${csType}
'@
[SubtitleMeWinCred]::Write('${safeTarget}', $secret)
Write-Output 'OK'
`;
    }
    return `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${csType}
'@
$deleted = [SubtitleMeWinCred]::Delete('${safeTarget}')
if ($deleted) { Write-Output 'DELETED' } else { Write-Output 'NOT_FOUND' }
`;
  }

  private runPs(script: string, stdinSecret?: string): string {
    const encodedCmd = Buffer.from(script, 'utf16le').toString('base64');
    return this.execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCmd],
      {
        ...(stdinSecret !== undefined ? { input: stdinSecret } : {}),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        timeout: DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      },
    );
  }

  public isAvailable(): boolean {
    try {
      const out = this.runPs("Write-Output 'OK'");
      return out.trim() === 'OK';
    } catch {
      return false;
    }
  }

  public getSecret(service: string, account: string): string | null {
    try {
      const out = this.runPs(
        this.buildPowerShellScript('get', this.buildTargetName(service, account)),
      ).trim();
      if (out === '__NOT_FOUND__' || out.length === 0) return null;
      return out;
    } catch (err) {
      throw classifyExecError(this.backendName, err, 'getSecret');
    }
  }

  public setSecret(service: string, account: string, secret: string): void {
    try {
      const out = this.runPs(
        this.buildPowerShellScript('set', this.buildTargetName(service, account)),
        secret,
      ).trim();
      if (out !== 'OK') {
        throw new VaultOperationError(
          this.backendName,
          'Unexpected response from Windows Credential Manager.',
        );
      }
    } catch (err) {
      if (err instanceof VaultOperationError) throw err;
      throw classifyExecError(this.backendName, err, 'setSecret');
    }
  }

  public deleteSecret(service: string, account: string): boolean {
    try {
      const out = this.runPs(
        this.buildPowerShellScript('delete', this.buildTargetName(service, account)),
      ).trim();
      return out === 'DELETED';
    } catch (err) {
      throw classifyExecError(this.backendName, err, 'deleteSecret');
    }
  }
}

/**
 * Linux Secret Service (`libsecret`) adapter via `secret-tool`.
 * Passes secret strictly via `stdin` (`shell: false`). Fails closed in headless environments.
 */
export class LinuxSecretServiceVault implements KeyVault {
  public readonly backendName = 'linux-secret-service';
  private readonly execFile: OsVaultExecFileFn;

  public constructor(execFile: OsVaultExecFileFn = defaultExecFile) {
    this.execFile = execFile;
  }

  public isAvailable(): boolean {
    try {
      this.execFile('secret-tool', ['--version'], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        timeout: DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  public getSecret(service: string, account: string): string | null {
    try {
      const out = this.execFile('secret-tool', ['lookup', 'service', service, 'account', account], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        timeout: DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      }).trim();
      return out.length > 0 ? out : null;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 1) {
        return null; // secret-tool exits 1 when item is not found
      }
      throw classifyExecError(this.backendName, err, 'getSecret');
    }
  }

  public setSecret(service: string, account: string, secret: string): void {
    try {
      this.execFile(
        'secret-tool',
        ['store', `--label=${service}`, 'service', service, 'account', account],
        {
          input: `${secret}\n`,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
          timeout: DEFAULT_TIMEOUT_MS,
          windowsHide: true,
        },
      );
    } catch (err) {
      throw classifyExecError(this.backendName, err, 'setSecret');
    }
  }

  public deleteSecret(service: string, account: string): boolean {
    try {
      this.execFile('secret-tool', ['clear', 'service', service, 'account', account], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        timeout: DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      });
      return true;
    } catch (err) {
      throw classifyExecError(this.backendName, err, 'deleteSecret');
    }
  }
}

/**
 * macOS Keychain adapter via `/usr/bin/security`.
 * Note: Not natively validated on macOS hardware in this release cycle.
 */
export class MacOsKeychainVault implements KeyVault {
  public readonly backendName = 'macos-keychain';
  private readonly execFile: OsVaultExecFileFn;

  public constructor(execFile: OsVaultExecFileFn = defaultExecFile) {
    this.execFile = execFile;
  }

  public isAvailable(): boolean {
    try {
      this.execFile('/usr/bin/security', ['list-keychains'], {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        timeout: DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  public getSecret(service: string, account: string): string | null {
    try {
      const out = this.execFile(
        '/usr/bin/security',
        ['find-generic-password', '-s', service, '-a', account, '-w'],
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
          timeout: DEFAULT_TIMEOUT_MS,
          windowsHide: true,
        },
      ).trim();
      return out.length > 0 ? out : null;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 44) return null; // errSecItemNotFound
      throw classifyExecError(this.backendName, err, 'getSecret');
    }
  }

  private assertSafeInteractiveToken(value: string, fieldName: string): void {
    if (!value || /[\r\n\0"\\]/.test(value)) {
      throw new VaultOperationError(
        this.backendName,
        `Invalid ${fieldName} characters for macOS Keychain interactive mode.`,
      );
    }
  }

  public setSecret(service: string, account: string, secret: string): void {
    this.assertSafeInteractiveToken(service, 'service');
    this.assertSafeInteractiveToken(account, 'account');
    this.assertSafeInteractiveToken(secret, 'secret');

    // Uses `/usr/bin/security -i` with stdin so the secret never appears in process CLI args.
    const interactiveCommand = `add-generic-password -U -s "${service}" -a "${account}" -w "${secret}"\n`;
    try {
      this.execFile('/usr/bin/security', ['-i'], {
        input: interactiveCommand,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        timeout: DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      });
    } catch (err) {
      throw classifyExecError(this.backendName, err, 'setSecret');
    }
  }

  public deleteSecret(service: string, account: string): boolean {
    try {
      this.execFile(
        '/usr/bin/security',
        ['delete-generic-password', '-s', service, '-a', account],
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false,
          timeout: DEFAULT_TIMEOUT_MS,
          windowsHide: true,
        },
      );
      return true;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 44) return false;
      throw classifyExecError(this.backendName, err, 'deleteSecret');
    }
  }
}

export class UnsupportedOsKeyVault implements KeyVault {
  public readonly backendName: string;

  public constructor(platform: string) {
    this.backendName = `unsupported-${platform}`;
  }

  public isAvailable(): boolean {
    return false;
  }

  public getSecret(): string | null {
    throw new VaultUnavailableError(
      this.backendName,
      `No native OS credential vault is supported on platform "${this.backendName}".`,
    );
  }

  public setSecret(): void {
    throw new VaultUnavailableError(
      this.backendName,
      `No native OS credential vault is supported on platform "${this.backendName}".`,
    );
  }

  public deleteSecret(): boolean {
    throw new VaultUnavailableError(
      this.backendName,
      `No native OS credential vault is supported on platform "${this.backendName}".`,
    );
  }
}

export function createOsKeyVault(options: CreateOsKeyVaultOptions = {}): KeyVault {
  const platform = options.platform ?? process.platform;
  const execFile = options.execFile ?? defaultExecFile;

  if (platform === 'win32') return new WindowsCredentialVault(execFile);
  if (platform === 'linux') return new LinuxSecretServiceVault(execFile);
  if (platform === 'darwin') return new MacOsKeychainVault(execFile);
  return new UnsupportedOsKeyVault(platform);
}
