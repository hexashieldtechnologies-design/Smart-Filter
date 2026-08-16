import type { EncryptedVaultEnvelope, UnlockedVault } from '@/shared/types';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const ITERATIONS = 600_000;

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: asArrayBuffer(salt),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptVault(
  vault: UnlockedVault,
  passphrase: string,
): Promise<EncryptedVaultEnvelope> {
  if (passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = textEncoder.encode(JSON.stringify(vault));
  const payload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    asArrayBuffer(plaintext),
  );

  return {
    format: 'secure-vault-encrypted',
    formatVersion: 1,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: ITERATIONS,
      salt: toBase64(salt),
    },
    cipher: {
      name: 'AES-GCM',
      iv: toBase64(iv),
      tagLength: 128,
    },
    payload: toBase64(new Uint8Array(payload)),
  };
}

export async function decryptVault(
  envelope: EncryptedVaultEnvelope,
  passphrase: string,
): Promise<UnlockedVault> {
  if (
    envelope.format !== 'secure-vault-encrypted' ||
    envelope.formatVersion !== 1 ||
    envelope.kdf.iterations !== ITERATIONS ||
    envelope.kdf.hash !== 'SHA-256' ||
    envelope.cipher.name !== 'AES-GCM'
  ) {
    throw new Error('Unsupported encrypted vault package.');
  }

  const salt = fromBase64(envelope.kdf.salt);
  const iv = fromBase64(envelope.cipher.iv);
  const key = await deriveKey(passphrase, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(iv), tagLength: envelope.cipher.tagLength },
      key,
      asArrayBuffer(fromBase64(envelope.payload)),
    );
    const parsed = JSON.parse(textDecoder.decode(plaintext)) as UnlockedVault;
    validateUnlockedVault(parsed);
    return parsed;
  } catch {
    throw new Error('Could not unlock the vault with that passphrase.');
  }
}

export function parseEnvelope(input: string): EncryptedVaultEnvelope {
  const parsed = JSON.parse(input) as Partial<EncryptedVaultEnvelope>;
  if (
    parsed.format !== 'secure-vault-encrypted' ||
    parsed.formatVersion !== 1 ||
    !parsed.kdf ||
    !parsed.cipher ||
    typeof parsed.payload !== 'string'
  ) {
    throw new Error('This file is not a Secure Vault encrypted export.');
  }
  return parsed as EncryptedVaultEnvelope;
}

function validateUnlockedVault(value: UnlockedVault): void {
  if (
    value.kind !== 'secure-vault-export' ||
    value.schemaVersion !== 1 ||
    !value.profile ||
    !Array.isArray(value.documents)
  ) {
    throw new Error('The decrypted vault payload is invalid.');
  }
}

export function createVaultMetadata(vault: UnlockedVault) {
  return {
    schemaVersion: vault.schemaVersion,
    importedAt: new Date().toISOString(),
    documentCount: vault.documents.length,
    labels: vault.documents.map((document) => document.label).slice(0, 50),
  };
}