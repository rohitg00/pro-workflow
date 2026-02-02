import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ProWorkflowConfig {
  dbPath: string;
}

const DEFAULT_DB_DIR = path.join(os.homedir(), '.pro-workflow');
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'data.db');

export function getDefaultDbPath(): string {
  return DEFAULT_DB_PATH;
}

export function ensureDbDir(): void {
  if (!fs.existsSync(DEFAULT_DB_DIR)) {
    fs.mkdirSync(DEFAULT_DB_DIR, { recursive: true });
  }
}

export function initializeDatabase(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  ensureDbDir();

  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(__dirname, 'schema.sql');

  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS learnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT DEFAULT (datetime('now')),
        project TEXT,
        category TEXT NOT NULL,
        rule TEXT NOT NULL,
        mistake TEXT,
        correction TEXT,
        times_applied INTEGER DEFAULT 0
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS learnings_fts USING fts5(
        category,
        rule,
        mistake,
        correction,
        content=learnings,
        content_rowid=id
      );

      CREATE TRIGGER IF NOT EXISTS learnings_ai AFTER INSERT ON learnings BEGIN
        INSERT INTO learnings_fts(rowid, category, rule, mistake, correction)
        VALUES (new.id, new.category, new.rule, new.mistake, new.correction);
      END;

      CREATE TRIGGER IF NOT EXISTS learnings_ad AFTER DELETE ON learnings BEGIN
        INSERT INTO learnings_fts(learnings_fts, rowid, category, rule, mistake, correction)
        VALUES ('delete', old.id, old.category, old.rule, old.mistake, old.correction);
      END;

      CREATE TRIGGER IF NOT EXISTS learnings_au AFTER UPDATE ON learnings BEGIN
        INSERT INTO learnings_fts(learnings_fts, rowid, category, rule, mistake, correction)
        VALUES ('delete', old.id, old.category, old.rule, old.mistake, old.correction);
        INSERT INTO learnings_fts(rowid, category, rule, mistake, correction)
        VALUES (new.id, new.category, new.rule, new.mistake, new.correction);
      END;

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project TEXT,
        started_at TEXT DEFAULT (datetime('now')),
        ended_at TEXT,
        edit_count INTEGER DEFAULT 0,
        corrections_count INTEGER DEFAULT 0,
        prompts_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category);
      CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings(project);
      CREATE INDEX IF NOT EXISTS idx_learnings_created_at ON learnings(created_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
    `);
  }

  return db;
}

if (require.main === module) {
  const db = initializeDatabase();
  console.log(`Database initialized at: ${DEFAULT_DB_PATH}`);
  db.close();
}
