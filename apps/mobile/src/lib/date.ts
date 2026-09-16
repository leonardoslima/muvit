export function isoDateFromTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs);
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return isoDateFromTimestamp(Date.now());
}

export function formatTodayDisplayLabel(timestampMs: number = Date.now()): string {
  const label = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(timestampMs));

  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}
