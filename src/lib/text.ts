/** Trimmed, non-empty lines. */
export const filled = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

/** "group project!!" -> "group-project". Up to three unique tags that fit the Problem.tags rule. */
export function toTags(xs: string[]): string[] {
  const slugs = xs.map((x) => x.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, ''));
  return [...new Set(slugs.filter(Boolean))].slice(0, 3);
}

/** Adds a closing "?" if the user left it off. */
export const asQuestion = (q: string) => (q.trim().endsWith('?') ? q.trim() : `${q.trim().replace(/[.!]+$/, '')}?`);

export type Piece = { text: string; mark: boolean };

/**
 * Splits text so each quoted part (matched case-insensitively, first occurrence) can be highlighted.
 * Parts that aren't found or overlap an earlier one are skipped.
 */
export function highlightParts(text: string, parts: string[]): Piece[] {
  const lower = text.toLowerCase();
  const spans: [number, number][] = [];
  for (const p of parts) {
    const start = p.trim() ? lower.indexOf(p.trim().toLowerCase()) : -1;
    if (start < 0) continue;
    const end = start + p.trim().length;
    if (spans.some(([s, e]) => start < e && end > s)) continue;
    spans.push([start, end]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: Piece[] = [];
  let at = 0;
  for (const [s, e] of spans) {
    if (s > at) out.push({ text: text.slice(at, s), mark: false });
    out.push({ text: text.slice(s, e), mark: true });
    at = e;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: false });
  return out;
}
