import { FIELD_LABELS, VALUE_LABEL } from '../content/fields';
import type { JournalTable } from '../db/journal';
import { formatDay } from './dates';

export type Field = { label: string; value: string | string[] };

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Readable label/value pairs for an entry, skipping anything empty. */
export function entryFields(table: JournalTable, e: Record<string, unknown>): Field[] {
  const out: Field[] = [];
  for (const [key, label] of FIELD_LABELS[table]) {
    const v = e[key];
    let value: string | string[] | null = null;
    if (typeof v === 'string') value = v.trim() ? (VALUE_LABEL[v] ?? (isDay(v) ? formatDay(v) : v)) : null;
    else if (typeof v === 'boolean') value = v ? 'Yes' : 'No';
    else if (typeof v === 'number') value = key === 'likelihood' ? `${v}%` : String(v);
    else if (Array.isArray(v)) {
      const lines = v.map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' && 'q' in x ? `${String(x.q)} ${String((x as { a?: unknown }).a ?? '')}` : '')).filter((x) => x.trim());
      value = lines.length ? lines : null;
    } else if (v && typeof v === 'object' && key === 'review') {
      const r = v as { jargonTerms: string[]; vagueParts: string[]; gapQuestion: string };
      value = [...r.vagueParts.map((p) => `Vague: “${p}”`), ...r.jargonTerms.map((t) => `Explain: ${t}`), `Gap: ${r.gapQuestion}`];
    }
    if (value !== null) out.push({ label, value });
  }
  return out;
}
