import { DatabaseSync } from 'node:sqlite';
import { DB_PATH, ensureConfigDir } from '../../config.js';

let db: DatabaseSync | null = null;

export function getSqliteClient(): DatabaseSync {
  if (db) {
    return db;
  }

  ensureConfigDir();
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS trace_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      project_root TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trace_run_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      command TEXT NOT NULL,
      status TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      stdout_summary TEXT,
      stderr_summary TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  return db;
}

export function closeSqliteClient(): void {
  if (!db) return;
  db.close();
  db = null;
}
