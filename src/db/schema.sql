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

-- Wiki knowledge base (Phase 3.3.0)
-- slug is the natural id used everywhere (FKs, CLI, hooks). To avoid silent
-- overwrites when two wikis share a slug across different (scope, root_path)
-- locations, upsertWiki() guards on those columns at the application layer
-- and refuses to overwrite a registration that points at a different location.
CREATE TABLE IF NOT EXISTS wikis (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  flavor TEXT NOT NULL DEFAULT 'research',
  root_path TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  auto_research INTEGER NOT NULL DEFAULT 0,
  private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wiki_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wiki_slug TEXT NOT NULL REFERENCES wikis(slug) ON DELETE CASCADE,
  rel_path TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  page_type TEXT,
  content_hash TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(wiki_slug, rel_path)
);

CREATE TABLE IF NOT EXISTS wiki_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wiki_slug TEXT NOT NULL REFERENCES wikis(slug) ON DELETE CASCADE,
  url TEXT,
  title TEXT,
  fetched_at TEXT DEFAULT (datetime('now')),
  content_hash TEXT,
  fetcher TEXT,
  UNIQUE(wiki_slug, content_hash)
);

CREATE TABLE IF NOT EXISTS wiki_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES wiki_sources(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  confidence REAL DEFAULT 0.8,
  last_verified_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wiki_seeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wiki_slug TEXT NOT NULL REFERENCES wikis(slug) ON DELETE CASCADE,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  parent_id INTEGER REFERENCES wiki_seeds(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS wiki_pages_fts USING fts5(
  title,
  summary,
  content,
  content=wiki_pages,
  content_rowid=id
);

CREATE TRIGGER IF NOT EXISTS wiki_pages_ai AFTER INSERT ON wiki_pages BEGIN
  INSERT INTO wiki_pages_fts(rowid, title, summary, content)
  VALUES (new.id, new.title, new.summary, new.content);
END;

CREATE TRIGGER IF NOT EXISTS wiki_pages_ad AFTER DELETE ON wiki_pages BEGIN
  INSERT INTO wiki_pages_fts(wiki_pages_fts, rowid, title, summary, content)
  VALUES ('delete', old.id, old.title, old.summary, old.content);
END;

CREATE TRIGGER IF NOT EXISTS wiki_pages_au AFTER UPDATE ON wiki_pages BEGIN
  INSERT INTO wiki_pages_fts(wiki_pages_fts, rowid, title, summary, content)
  VALUES ('delete', old.id, old.title, old.summary, old.content);
  INSERT INTO wiki_pages_fts(rowid, title, summary, content)
  VALUES (new.id, new.title, new.summary, new.content);
END;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug ON wiki_pages(wiki_slug);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_type ON wiki_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_wiki_seeds_status ON wiki_seeds(wiki_slug, status);
CREATE INDEX IF NOT EXISTS idx_wiki_claims_page ON wiki_claims(page_id);

-- Embeddings (Phase 3.3.2). Stored as float32 BLOB. Hybrid retrieval = BM25 + vector + RRF.
-- sqlite-vec is optional; if not loaded, this table degrades to dot-product in JS.
CREATE TABLE IF NOT EXISTS wiki_embeddings (
  page_id INTEGER PRIMARY KEY REFERENCES wiki_pages(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dim INTEGER NOT NULL,
  vector BLOB NOT NULL,
  computed_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wiki_embeddings_model ON wiki_embeddings(model);

-- Wiki-scoped learning rules
CREATE TABLE IF NOT EXISTS learnings_wiki (
  learning_id INTEGER PRIMARY KEY REFERENCES learnings(id) ON DELETE CASCADE,
  wiki_slug TEXT NOT NULL REFERENCES wikis(slug) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learnings_wiki_slug ON learnings_wiki(wiki_slug);
