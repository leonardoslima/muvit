export function readTrimmed(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export function readOptionalTrimmed(formData: FormData, key: string): string | undefined {
  const value = readTrimmed(formData, key);
  return value ? value : undefined;
}

export function readOptionalNumber(formData: FormData, key: string): number | undefined {
  const value = readTrimmed(formData, key).replace(',', '.');
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
