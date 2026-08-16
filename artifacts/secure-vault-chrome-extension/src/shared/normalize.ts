import { findCanonicalField } from './field-aliases';
import type { CanonicalFieldKey } from './types';

export function normalizeLabel(value = ''): string {
  return value
    .normalize('NFKC')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeText(value = ''): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeAadhaar(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function normalizePan(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
}

export function normalizePhone(value: string): string {
  return value.trim().replace(/[^\d+]/g, '');
}

export function normalizeEmail(value: string): string {
  return value.trim();
}

export function normalizeDate(value: string): string {
  return value.trim();
}

export function normalizeForField(key: CanonicalFieldKey, value: string): string {
  switch (key) {
    case 'aadhaar':
      return normalizeAadhaar(value);
    case 'pan':
      return normalizePan(value);
    case 'phone':
    case 'alternatePhone':
      return normalizePhone(value);
    case 'email':
    case 'alternateEmail':
      return normalizeEmail(value);
    case 'dateOfBirth':
      return normalizeDate(value);
    default:
      return normalizeText(value);
  }
}

export function valuesMatch(key: CanonicalFieldKey, expected: string, actual: string): boolean {
  if (key === 'phone' || key === 'alternatePhone') {
    return normalizePhone(expected).replace(/\D/g, '') === normalizePhone(actual).replace(/\D/g, '');
  }

  return normalizeForField(key, expected).toLowerCase() === normalizeForField(key, actual).toLowerCase();
}

export function inferFieldKey(signals: {
  autocomplete?: string;
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  nearbyText?: string;
  inputType?: string;
}): CanonicalFieldKey | undefined {
  const candidates = [
    signals.autocomplete,
    signals.name,
    signals.id,
    signals.label,
    signals.placeholder,
    signals.nearbyText,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const key = findCanonicalField(normalizeLabel(candidate));
    if (key) return key;
  }

  if (signals.inputType === 'email') return 'email';
  if (signals.inputType === 'tel') return 'phone';
  return undefined;
}