import type { DatabaseSync } from 'node:sqlite';
import { DB_PATH, ensureConfigDir } from '../config';

export interface CommandRecord {
  id: number;
  command: string;
  cwd: string;
  exit_code: number;
  timestamp: number;
  session_id: string;
}

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

function getDb(): DatabaseSync {
  if (!db) {
    ensureConfigDir();
    db = new (loadDatabaseSyncCtor())(DB_PATH);
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS commands (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        command    TEXT    NOT NULL,
        cwd        TEXT    NOT NULL,
        exit_code  INTEGER NOT NULL DEFAULT 0,
        timestamp  INTEGER NOT NULL,
        session_id TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_commands_session   ON commands(session_id);
      CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp);
      CREATE INDEX IF NOT EXISTS idx_commands_cwd       ON commands(cwd);
    `);
  }
  return db;
}

export function insertCommand(record: Omit<CommandRecord, 'id'>): void {
  const stmt = getDb().prepare(
    `INSERT INTO commands (command, cwd, exit_code, timestamp, session_id)
     VALUES (?, ?, ?, ?, ?)`
  );
  stmt.run(record.command, record.cwd, record.exit_code, record.timestamp, record.session_id);
}

export function getCommandsInCwd(cwd: string, limit = 300): CommandRecord[] {
  return getDb()
    .prepare(
      `SELECT * FROM commands
       WHERE cwd = ? COLLATE NOCASE AND exit_code = 0
       ORDER BY timestamp ASC
       LIMIT ?`
    )
    .all(cwd, limit) as unknown as CommandRecord[];
}

export function getSuccessfulCommands(limit = 500): CommandRecord[] {
  return getDb()
    .prepare(
      `SELECT * FROM commands
       WHERE exit_code = 0
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(limit) as unknown as CommandRecord[];
}

export function getLatestSession(): CommandRecord[] {
  const latest = getDb()
    .prepare(
      `SELECT session_id FROM commands ORDER BY timestamp DESC LIMIT 1`
    )
    .get() as { session_id: string } | undefined;

  if (!latest) return [];

  return getDb()
    .prepare(
      `SELECT * FROM commands WHERE session_id = ? ORDER BY timestamp ASC`
    )
    .all(latest.session_id) as unknown as CommandRecord[];
}

export function getAllSessions(): string[] {
  const rows = getDb()
    .prepare(
      `SELECT session_id, MAX(timestamp) AS last_seen
       FROM commands
       GROUP BY session_id
       ORDER BY last_seen DESC`
    )
    .all() as { session_id: string; last_seen: number }[];
  return rows.map((r) => r.session_id);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
