const dateTime = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const shortTime = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const integer = new Intl.NumberFormat(undefined);

export function formatDateTime(value: string | Date | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : '—';
}

export function formatTime(value: string | Date): string {
  return shortTime.format(new Date(value));
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : integer.format(value);
}

/** "3 min ago", "2 h ago", "5 d ago"; exact time stays available via formatDateTime. */
export function formatRelative(value: string | Date | null | undefined, now = Date.now()): string {
  if (!value) return 'never';
  const seconds = Math.round((now - new Date(value).getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86_400)} d ago`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

export function formatEndpoint(ip: string, port: number | null): string {
  if (port === null) return ip;
  return ip.includes(':') ? `[${ip}]:${port}` : `${ip}:${port}`;
}
