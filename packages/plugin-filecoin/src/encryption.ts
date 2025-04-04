import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Configuration
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 32 bytes for AES-256
const IV_LENGTH = 16; // 16 bytes for AES-CBC
const DEFAULT_KEY = 'a'.repeat(64); // Fallback key (64 hex chars = 32 bytes)

// Load and validate encryption key
const ENCRYPTION_KEY = (() => {
  const keyHex = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new EncryptionError(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (got ${key.length} bytes)`);
  }
  return key;
})();

// Custom error class for encryption-related errors
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

// Utility to generate initialization vector
function generateIV(): Buffer {
  return randomBytes(IV_LENGTH);
}

/**
 * Encrypts data using AES-256-CBC.
 * @param data - The plaintext string to encrypt.
 * @returns A Uint8Array containing the IV and encrypted data (IV prepended).
 * @throws {EncryptionError} If encryption fails.
 */
export function encrypt(data: string): Uint8Array {
  try {
    const iv = generateIV();
    const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    return Buffer.concat([iv, encrypted]); // Prepend IV to encrypted data
  } catch (error) {
    throw new EncryptionError(`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts data encrypted with AES-256-CBC.
 * @param data - A Uint8Array containing the IV (first 16 bytes) and encrypted data.
 * @param key - Optional custom key to use for decryption (defaults to ENCRYPTION_KEY).
 * @returns The decrypted data as a Uint8Array.
 * @throws {EncryptionError} If decryption fails or data format is invalid.
 */
export function decrypt(data: Uint8Array, key: Buffer = ENCRYPTION_KEY): Uint8Array {
  try {
    if (data.length < IV_LENGTH) {
      throw new EncryptionError('Data too short to contain IV');
    }
    const iv = data.subarray(0, IV_LENGTH);
    const encrypted = data.subarray(IV_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    return decrypted;
  } catch (error) {
    throw new EncryptionError(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export constants for external use if needed
export { ALGORITHM, ENCRYPTION_KEY, IV_LENGTH };