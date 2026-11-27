import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const ENVELOPE_FORMAT = 'subtitleme-enc-v1' as const;
export const ENVELOPE_ALG = 'aes-256-gcm' as const;
export const AES_256_KEY_BYTES = 32;
export const GCM_IV_BYTES = 12;
export const GCM_TAG_BYTES = 16;

export interface EncryptedEnvelopeV1 {
  readonly format: typeof ENVELOPE_FORMAT;
  readonly alg: typeof ENVELOPE_ALG;
  readonly purpose: string;
  readonly iv: string;
  readonly tag: string;
  readonly ciphertext: string;
}

export class CryptoIntegrityError extends Error {
  public readonly code:
    | 'INVALID_KEY'
    | 'INVALID_ENVELOPE'
    | 'PURPOSE_MISMATCH'
    | 'AUTHENTICATION_FAILED';

  public constructor(
    code: 'INVALID_KEY' | 'INVALID_ENVELOPE' | 'PURPOSE_MISMATCH' | 'AUTHENTICATION_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'CryptoIntegrityError';
    this.code = code;
  }
}

function assertValidKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== AES_256_KEY_BYTES) {
    throw new CryptoIntegrityError(
      'INVALID_KEY',
      `Encryption key must be a ${AES_256_KEY_BYTES}-byte Buffer.`,
    );
  }
}

function buildAad(purpose: string): Buffer {
  return Buffer.from(`${ENVELOPE_FORMAT}:${purpose}`, 'utf-8');
}

/**
 * Encrypts UTF-8 plaintext using Node.js built-in AES-256-GCM with a fresh 96-bit random IV
 * and AAD binding the ciphertext to its intended file purpose.
 */
export function encryptText(plaintext: string, key: Buffer, purpose: string): string {
  assertValidKey(key);
  if (!purpose || typeof purpose !== 'string') {
    throw new CryptoIntegrityError('INVALID_ENVELOPE', 'Encryption purpose must be a non-empty string.');
  }

  const iv = randomBytes(GCM_IV_BYTES);
  const cipher = createCipheriv(ENVELOPE_ALG, key, iv, { authTagLength: GCM_TAG_BYTES });
  cipher.setAAD(buildAad(purpose));

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope: EncryptedEnvelopeV1 = {
    format: ENVELOPE_FORMAT,
    alg: ENVELOPE_ALG,
    purpose,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };

  return JSON.stringify(envelope);
}

/**
 * Validates envelope structure, purpose AAD, and GCM authentication tag BEFORE returning
 * plaintext. Any bit flip, truncation, wrong key, or file-swap throws `CryptoIntegrityError`.
 */
export function decryptText(rawEnvelope: string, key: Buffer, expectedPurpose: string): string {
  assertValidKey(key);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawEnvelope);
  } catch {
    throw new CryptoIntegrityError('INVALID_ENVELOPE', 'Encrypted file is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new CryptoIntegrityError('INVALID_ENVELOPE', 'Encrypted envelope must be a JSON object.');
  }

  const env = parsed as Partial<EncryptedEnvelopeV1>;
  if (env.format !== ENVELOPE_FORMAT || env.alg !== ENVELOPE_ALG) {
    throw new CryptoIntegrityError(
      'INVALID_ENVELOPE',
      'Unsupported or malformed encrypted envelope format.',
    );
  }

  if (typeof env.purpose !== 'string' || env.purpose !== expectedPurpose) {
    throw new CryptoIntegrityError(
      'PURPOSE_MISMATCH',
      `Encrypted envelope purpose mismatch (expected "${expectedPurpose}").`,
    );
  }

  if (
    typeof env.iv !== 'string' ||
    typeof env.tag !== 'string' ||
    typeof env.ciphertext !== 'string'
  ) {
    throw new CryptoIntegrityError(
      'INVALID_ENVELOPE',
      'Encrypted envelope is missing required cryptographic fields.',
    );
  }

  const iv = Buffer.from(env.iv, 'base64');
  const tag = Buffer.from(env.tag, 'base64');
  const ciphertext = Buffer.from(env.ciphertext, 'base64');

  if (iv.length !== GCM_IV_BYTES || tag.length !== GCM_TAG_BYTES) {
    throw new CryptoIntegrityError(
      'INVALID_ENVELOPE',
      'Encrypted envelope has invalid IV or authentication tag length.',
    );
  }

  try {
    const decipher = createDecipheriv(ENVELOPE_ALG, key, iv, { authTagLength: GCM_TAG_BYTES });
    decipher.setAAD(buildAad(expectedPurpose));
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch {
    throw new CryptoIntegrityError(
      'AUTHENTICATION_FAILED',
      'Failed to authenticate or decrypt persisted data (invalid key or tampered/truncated file).',
    );
  }
}

export function encryptJson(value: unknown, key: Buffer, purpose: string): string {
  return encryptText(JSON.stringify(value), key, purpose);
}

export function decryptJson<T = unknown>(rawEnvelope: string, key: Buffer, expectedPurpose: string): T {
  const plaintext = decryptText(rawEnvelope, key, expectedPurpose);
  try {
    return JSON.parse(plaintext) as T;
  } catch {
    throw new CryptoIntegrityError(
      'INVALID_ENVELOPE',
      'Authenticated plaintext payload is not valid JSON.',
    );
  }
}

export function isEncryptedEnvelope(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as Partial<EncryptedEnvelopeV1>;
    return Boolean(
      parsed &&
        typeof parsed === 'object' &&
        parsed.format === ENVELOPE_FORMAT &&
        parsed.alg === ENVELOPE_ALG,
    );
  } catch {
    return false;
  }
}
