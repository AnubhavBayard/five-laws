export type SqlValue = string | number | null;
export type Row = Record<string, unknown>;

/** The one database surface the app uses. Adapters: Capacitor SQLite (device/web) and node:sqlite (tests). */
export interface Db {
  /** One statement with bound params. */
  run(sql: string, params?: SqlValue[]): Promise<void>;
  /** One query with bound params. */
  all(sql: string, params?: SqlValue[]): Promise<Row[]>;
  /** Several statements, no params (migrations). */
  exec(sql: string): Promise<void>;
  /** Runs fn inside BEGIN/COMMIT, rolling back if it throws. Not re-entrant. */
  tx<T>(fn: () => Promise<T>): Promise<T>;
}
