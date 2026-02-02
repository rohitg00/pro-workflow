-- Pro-Workflow Database Schema
-- SQLite with FTS5 for searchable learnings

-- Main learnings table
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

-- Full-text search index using FTS5 with BM25
CREATE VIRTUAL TABLE IF NOT EXISTS learnings_fts USING fts5(
  category,
  rule,
  mistake,
  correction,
  content=learnings,
  content_rowid=id
);

-- Triggers to keep FTS index in sync
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

-- Sessions table for analytics
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  edit_count INTEGER DEFAULT 0,
  corrections_count INTEGER DEFAULT 0,
  prompts_count INTEGER DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category);
CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings(project);
CREATE INDEX IF NOT EXISTS idx_learnings_created_at ON learnings(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
