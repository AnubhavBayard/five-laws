import { DatabaseSync } from 'node:sqlite';
import { migrate } from './migrations';
import type { Db, Row, SqlValue } from './types';

/** In-memory SQLite for tests, same SQL as the device. */
export function nodeDb(): Db {
  const db = new DatabaseSync(':memory:');
  return {
    run: async (sql: string, params: SqlValue[] = []) => {
      db.prepare(sql).run(...params);
    },
    all: async (sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as Row[],
    exec: async (sql: string) => db.exec(sql),
    tx: async <T>(fn: () => Promise<T>) => {
      db.exec('BEGIN');
      try {
        const out = await fn();
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

export async function migratedTestDb(): Promise<Db> {
  const db = nodeDb();
  await migrate(db);
  return db;
}
