export function sanitizeAuthRequestUrl(url: string): string {
  if (!url.startsWith('/api/auth/')) return url;
  const path = url.split('?', 1)[0] ?? '/api/auth/';
  return path.replace(/^(\/api\/auth\/reset-password)\/.+$/, '$1/[redacted]');
}
