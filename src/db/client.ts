import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import { migrate } from './migrations';
import type { Db, Row, SqlValue } from './types';

const NAME = 'fivelaws';
let current: Db | null = null;

export function getDb(): Db {
  if (!current) throw new Error('Database not opened yet');
  return current;
}

/** Tests inject an in-memory db here. */
export function setDb(db: Db) {
  current = db;
}

export async function openDb(): Promise<Db> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const web = Capacitor.getPlatform() === 'web';
  if (web) {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    await defineCustomElements(window);
    document.body.appendChild(document.createElement('jeep-sqlite'));
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }
  const conn = await sqlite.createConnection(NAME, false, 'no-encryption', 1, false);
  await conn.open();
  const db = capacitorDb(conn, web ? () => sqlite.saveToStore(NAME) : async () => {});
  await migrate(db);
  current = db;
  return db;
}

function capacitorDb(conn: SQLiteDBConnection, persist: () => Promise<void>): Db {
  let inTx = false;
  const afterWrite = () => (inTx ? Promise.resolve() : persist());
  return {
    run: async (sql: string, params: SqlValue[] = []) => {
      await conn.run(sql, params, false);
      await afterWrite();
    },
    all: async (sql: string, params: SqlValue[] = []) => ((await conn.query(sql, params)).values ?? []) as Row[],
    exec: async (sql: string) => {
      await conn.execute(sql, false);
      await afterWrite();
    },
    tx: async <T>(fn: () => Promise<T>) => {
      await conn.beginTransaction();
      inTx = true;
      try {
        const out = await fn();
        await conn.commitTransaction();
        return out;
      } catch (e) {
        await conn.rollbackTransaction();
        throw e;
      } finally {
        inTx = false;
        await persist();
      }
    },
  };
}
