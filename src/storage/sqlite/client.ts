import type { DatabaseSync } from 'node:sqlite';
import { DB_PATH, ensureConfigDir } from '../../config.js';

let db: DatabaseSync | null = null;
let DatabaseSyncCtor: (typeof import('node:sqlite'))['DatabaseSync'] | null = null;

function loadDatabaseSyncCtor(): (typeof import('node:sqlite'))['DatabaseSync'] {
  if (DatabaseSyncCtor) {
    return DatabaseSyncCtor;
  }

  // Hide Node's SQLite experimental warning from end users while keeping all other warnings visible.
  const originalEmitWarning = process.emitWarning.bind(process);
  process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
    const warningName = typeof args[0] === 'string'
      ? args[0]
      : warning instanceof Error
        ? warning.name
        : '';
    const message = typeof warning === 'string' ? warning : warning.message;

    if (warningName === 'ExperimentalWarning' && /sqlite/i.test(message)) {
      return;
    }

    originalEmitWarning(warning as string | Error, ...(args as []));
  }) as typeof process.emitWarning;

  try {
    const sqlite = require('node:sqlite') as typeof import('node:sqlite');
    DatabaseSyncCtor = sqlite.DatabaseSync;
    return DatabaseSyncCtor;
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

export function getSqliteClient(): DatabaseSync {
  if (db) {
    return db;
  }

  ensureConfigDir();
  db = new (loadDatabaseSyncCtor())(DB_PATH);
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

    CREATE TABLE IF NOT EXISTS trace_run_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      project_root TEXT NOT NULL,
      plan_signature TEXT NOT NULL,
      status TEXT NOT NULL,
      resumed_from_run_id TEXT,
      last_successful_step_index INTEGER NOT NULL DEFAULT -1,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trace_run_step_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      status TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      exit_code INTEGER NOT NULL,
      failure_kind TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trace_execution_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trace_run_state_root_updated
      ON trace_run_state(project_root, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_trace_run_step_state_run_idx
      ON trace_run_step_state(run_id, step_index);

    CREATE INDEX IF NOT EXISTS idx_trace_execution_events_run
      ON trace_execution_events(run_id, created_at);
  `);

  return db;
}

export function closeSqliteClient(): void {
  if (!db) return;
  db.close();
  db = null;
}
