import type { LifeArea } from '@shared/laws';
import type { z } from 'zod';
import { getDb } from './client';
import { decode, encode } from './codec';
import type { SqlValue } from './types';

type Meta = 'id' | 'createdAt' | 'updatedAt';

/**
 * CRUD for an entry table. Table and column names only ever come from code (the schema), never from input;
 * values are always bound parameters.
 */
export function entryRepo<S extends z.ZodObject>(table: string, schema: S) {
  type T = z.infer<S>;
  type New = Omit<T, Meta>;
  const cols = Object.keys(schema.shape);

  async function write(entity: T, insert: boolean) {
    const row = encode(schema.parse(entity) as Record<string, unknown>);
    const values = cols.map((c) => row[c] ?? null);
    const sql = insert
      ? `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
      : `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`;
    await getDb().run(sql, insert ? values : [...values, entity.id as string]);
  }

  return {
    async create(input: New, now = new Date()): Promise<T> {
      const stamp = now.toISOString();
      const entity = { ...input, id: crypto.randomUUID(), createdAt: stamp, updatedAt: stamp } as T;
      await write(entity, true);
      return entity;
    },
    async get(id: string): Promise<T | null> {
      const rows = await getDb().all(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      return rows[0] ? decode(schema, rows[0]) : null;
    },
    async update(id: string, patch: Partial<New>, now = new Date()): Promise<T> {
      const existing = await this.get(id);
      if (!existing) throw new Error(`${table} ${id} not found`);
      const entity = { ...existing, ...patch, id, updatedAt: now.toISOString() } as T;
      await write(entity, false);
      return entity;
    },
    async remove(id: string): Promise<void> {
      await getDb().run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    },
    /** Newest first. */
    async list(filter: { lifeArea?: LifeArea } = {}): Promise<T[]> {
      const params: SqlValue[] = [];
      let where = '';
      if (filter.lifeArea) {
        where = 'WHERE lifeArea = ?';
        params.push(filter.lifeArea);
      }
      const rows = await getDb().all(`SELECT * FROM ${table} ${where} ORDER BY createdAt DESC`, params);
      return rows.map((r) => decode(schema, r));
    },
  };
}
