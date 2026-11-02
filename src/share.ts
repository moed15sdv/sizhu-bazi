import type { BirthInput, Gender, LateZiMode } from './types';

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBirthInput(input: BirthInput): string {
  return toBase64Url(JSON.stringify(input));
}

export function decodeBirthInput(encoded: string): BirthInput | null {
  try {
    const value = JSON.parse(fromBase64Url(encoded)) as Partial<BirthInput>;
    if (!value.date || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
    if (!value.time || !/^\d{2}:\d{2}$/.test(value.time)) return null;
    const genders: Gender[] = ['female', 'male', 'unspecified'];
    const lateZiModes: LateZiMode[] = ['same-day', 'next-day'];
    return {
      date: value.date,
      time: value.time,
      gender: genders.includes(value.gender as Gender) ? value.gender as Gender : 'unspecified',
      birthplace: typeof value.birthplace === 'string' ? value.birthplace.slice(0, 80) : '',
      lateZi: lateZiModes.includes(value.lateZi as LateZiMode) ? value.lateZi as LateZiMode : 'same-day',
    };
  } catch {
    return null;
  }
}

export function createShareUrl(input: BirthInput): string {
  const url = new URL(window.location.href);
  url.hash = `chart=${encodeBirthInput(input)}`;
  return url.toString();
}

export function readInputFromHash(hash = window.location.hash): BirthInput | null {
  const match = /^#chart=([A-Za-z0-9_-]+)$/.exec(hash);
  return match ? decodeBirthInput(match[1]) : null;
}
