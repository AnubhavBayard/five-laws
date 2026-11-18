/** Calendar days as local 'YYYY-MM-DD' strings. No times, no time zones. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const today = (now = new Date()) => toDay(now);

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return toDay(new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) + n));
}

/** "Wednesday 25 November" */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
