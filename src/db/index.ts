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

  try {
    const candidates = [
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'),
    ];
    const schemaPath = candidates.find(p => fs.existsSync(p));
    if (!schemaPath) {
      throw new Error(`pro-workflow: schema.sql not found. Tried: ${candidates.join(', ')}. Run: npm run build`);
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  } catch (err) {
    db.close();
    throw err;
  }

  return db;
}

if (require.main === module) {
  const db = initializeDatabase();
  console.log(`Database initialized at: ${DEFAULT_DB_PATH}`);
  db.close();
}
