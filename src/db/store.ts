import Database from 'better-sqlite3';
import { initializeDatabase, getDefaultDbPath } from './index';

export interface Learning {
  id: number;
  created_at: string;
  project: string | null;
  category: string;
  rule: string;
  mistake: string | null;
  correction: string | null;
  times_applied: number;
}

export interface Session {
  id: string;
  project: string | null;
  started_at: string;
  ended_at: string | null;
  edit_count: number;
  corrections_count: number;
  prompts_count: number;
}

export interface Store {
  db: Database.Database;
  close: () => void;

  addLearning: (learning: Omit<Learning, 'id' | 'created_at' | 'times_applied'>) => Learning;
  getLearning: (id: number) => Learning | undefined;
  getAllLearnings: (project?: string) => Learning[];
  updateLearning: (id: number, updates: Partial<Learning>) => boolean;
  deleteLearning: (id: number) => boolean;
  incrementTimesApplied: (id: number) => void;

  startSession: (id: string, project?: string) => Session;
  endSession: (id: string) => void;
  getSession: (id: string) => Session | undefined;
  updateSessionCounts: (id: string, edits?: number, corrections?: number, prompts?: number) => void;
  getRecentSessions: (limit?: number) => Session[];
}

export function createStore(dbPath: string = getDefaultDbPath()): Store {
  const db = initializeDatabase(dbPath);

  const addLearningStmt = db.prepare(`
    INSERT INTO learnings (project, category, rule, mistake, correction)
    VALUES (@project, @category, @rule, @mistake, @correction)
  `);

  const getLearningStmt = db.prepare(`
    SELECT * FROM learnings WHERE id = ?
  `);

  const getAllLearningsStmt = db.prepare(`
    SELECT * FROM learnings ORDER BY created_at DESC
  `);

  const getLearningsByProjectStmt = db.prepare(`
    SELECT * FROM learnings WHERE project = ? OR project IS NULL ORDER BY created_at DESC
  `);

  const updateLearningStmt = db.prepare(`
    UPDATE learnings SET
      category = COALESCE(@category, category),
      rule = COALESCE(@rule, rule),
      mistake = COALESCE(@mistake, mistake),
      correction = COALESCE(@correction, correction)
    WHERE id = @id
  `);

  const deleteLearningStmt = db.prepare(`
    DELETE FROM learnings WHERE id = ?
  `);

  const incrementTimesAppliedStmt = db.prepare(`
    UPDATE learnings SET times_applied = times_applied + 1 WHERE id = ?
  `);

  const startSessionStmt = db.prepare(`
    INSERT OR REPLACE INTO sessions (id, project, started_at)
    VALUES (@id, @project, datetime('now'))
  `);

  const endSessionStmt = db.prepare(`
    UPDATE sessions SET ended_at = datetime('now') WHERE id = ?
  `);

  const getSessionStmt = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `);

  const updateSessionCountsStmt = db.prepare(`
    UPDATE sessions SET
      edit_count = edit_count + @edits,
      corrections_count = corrections_count + @corrections,
      prompts_count = prompts_count + @prompts
    WHERE id = @id
  `);

  const getRecentSessionsStmt = db.prepare(`
    SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?
  `);

  return {
    db,
    close: () => db.close(),

    addLearning(learning) {
      const result = addLearningStmt.run({
        project: learning.project ?? null,
        category: learning.category,
        rule: learning.rule,
        mistake: learning.mistake ?? null,
        correction: learning.correction ?? null,
      });
      return getLearningStmt.get(result.lastInsertRowid) as Learning;
    },

    getLearning(id) {
      return getLearningStmt.get(id) as Learning | undefined;
    },

    getAllLearnings(project) {
      if (project) {
        return getLearningsByProjectStmt.all(project) as Learning[];
      }
      return getAllLearningsStmt.all() as Learning[];
    },

    updateLearning(id, updates) {
      const result = updateLearningStmt.run({
        id,
        category: updates.category ?? null,
        rule: updates.rule ?? null,
        mistake: updates.mistake ?? null,
        correction: updates.correction ?? null,
      });
      return result.changes > 0;
    },

    deleteLearning(id) {
      const result = deleteLearningStmt.run(id);
      return result.changes > 0;
    },

    incrementTimesApplied(id) {
      incrementTimesAppliedStmt.run(id);
    },

    startSession(id, project) {
      startSessionStmt.run({ id, project: project ?? null });
      return getSessionStmt.get(id) as Session;
    },

    endSession(id) {
      endSessionStmt.run(id);
    },

    getSession(id) {
      return getSessionStmt.get(id) as Session | undefined;
    },

    updateSessionCounts(id, edits = 0, corrections = 0, prompts = 0) {
      updateSessionCountsStmt.run({ id, edits, corrections, prompts });
    },

    getRecentSessions(limit = 10) {
      return getRecentSessionsStmt.all(limit) as Session[];
    },
  };
}
