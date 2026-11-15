import { formatBytes, formatDuration, formatEndpoint, formatRelative } from './format';

describe('format helpers', () => {
  const now = new Date('2026-11-14T12:00:00Z').getTime();

  it('describes how long ago something happened', () => {
    expect(formatRelative(null)).toBe('never');
    expect(formatRelative(new Date(now - 30_000), now)).toBe('30 s ago');
    expect(formatRelative(new Date(now - 5 * 60_000), now)).toBe('5 min ago');
    expect(formatRelative(new Date(now - 3 * 3_600_000), now)).toBe('3 h ago');
    expect(formatRelative(new Date(now - 2 * 86_400_000), now)).toBe('2 d ago');
  });

  it('brackets IPv6 addresses when a port is attached', () => {
    expect(formatEndpoint('192.168.100.1', 443)).toBe('192.168.100.1:443');
    expect(formatEndpoint('2001:db8::1', 53)).toBe('[2001:db8::1]:53');
    expect(formatEndpoint('203.0.113.7', null)).toBe('203.0.113.7');
  });

  it('formats sizes and durations', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatDuration(90)).toBe('1 min');
    expect(formatDuration(2 * 86_400 + 3 * 3600)).toBe('2 d 3 h');
  });
});
