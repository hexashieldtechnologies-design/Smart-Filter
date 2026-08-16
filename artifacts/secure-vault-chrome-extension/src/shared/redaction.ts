export function maskAadhaar(value = ''): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• •••• ${digits.slice(-4)}` : '•••• ••••';
}

export function maskPan(value = ''): string {
  const normalized = value.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return normalized.length >= 5 ? `${normalized.slice(0, 5)}•••••` : '••••••••••';
}

export function maskPhone(value = ''): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `••••••${digits.slice(-4)}` : '••••••';
}

export function maskEmail(value = ''): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return '••••';
  return `${local.slice(0, 1)}•••@${domain}`;
}

export function maskValue(key: string, value = ''): string {
  if (key === 'aadhaar') return maskAadhaar(value);
  if (key === 'pan') return maskPan(value);
  if (key.includes('phone')) return maskPhone(value);
  if (key.includes('email')) return maskEmail(value);
  return value ? '••••••••' : '—';
}

export function safeOrigin(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    return new URL(url).origin;
  } catch {
    return 'unknown';
  }
}