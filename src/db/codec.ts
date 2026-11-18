import type { z } from 'zod';
import type { Row, SqlValue } from './types';

/** Maps entity <-> row. Arrays/objects become JSON text, booleans become 0/1, undefined becomes NULL. */
export function encode(entity: Record<string, unknown>): Record<string, SqlValue> {
  const out: Record<string, SqlValue> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (v === undefined || v === null) out[k] = null;
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
    else if (typeof v === 'object') out[k] = JSON.stringify(v);
    else out[k] = v as string | number;
  }
  return out;
}

export function decode<S extends z.ZodObject>(schema: S, row: Row): z.infer<S> {
  const shaped: Record<string, unknown> = {};
  for (const [k, field] of Object.entries(schema.shape)) {
    const v = row[k];
    const kind = baseKind(field as z.ZodType);
    if (v === null || v === undefined) shaped[k] = null;
    else if (kind === 'boolean') shaped[k] = v === 1 || v === true;
    else if ((kind === 'array' || kind === 'object') && typeof v === 'string') shaped[k] = JSON.parse(v);
    else shaped[k] = v;
  }
  return schema.parse(shaped);
}

function baseKind(t: z.ZodType): string {
  let cur = t;
  while (cur.def.type === 'nullable' || cur.def.type === 'optional') {
    cur = (cur.def as unknown as { innerType: z.ZodType }).innerType;
  }
  return cur.def.type;
}
