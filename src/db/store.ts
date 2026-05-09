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

export type WikiFlavor =
  | 'research' | 'paper' | 'domain' | 'product' | 'person'
  | 'organization' | 'project' | 'codebase' | 'incident';

export type WikiScope = 'global' | 'project';

export interface Wiki {
  slug: string;
  title: string;
  flavor: WikiFlavor;
  root_path: string;
  scope: WikiScope;
  auto_research: number;
  private: number;
  created_at: string;
  updated_at: string;
}

export interface WikiPage {
  id: number;
  wiki_slug: string;
  rel_path: string;
  title: string;
  summary: string | null;
  content: string | null;
  page_type: string | null;
  content_hash: string | null;
  updated_at: string;
}

export interface WikiSearchHit {
  page_id: number;
  wiki_slug: string;
  rel_path: string;
  title: string;
  summary: string | null;
  snippet: string;
  rank: number;
}

export interface WikiSeed {
  id: number;
  wiki_slug: string;
  query: string;
  status: 'pending' | 'active' | 'done' | 'failed';
  parent_id: number | null;
  depth: number;
  created_at: string;
}

export interface Store {
  db: Database.Database;
  close: () => void;

  addLearning: (learning: Omit<Learning, 'id' | 'created_at' | 'times_applied'>, wikiSlug?: string) => Learning;
  getLearning: (id: number) => Learning | undefined;
  getAllLearnings: (project?: string) => Learning[];
  getLearningsByWiki: (wikiSlug: string) => Learning[];
  updateLearning: (id: number, updates: Partial<Learning>) => boolean;
  deleteLearning: (id: number) => boolean;
  incrementTimesApplied: (id: number) => void;

  startSession: (id: string, project?: string) => Session;
  endSession: (id: string) => void;
  getSession: (id: string) => Session | undefined;
  updateSessionCounts: (id: string, edits?: number, corrections?: number, prompts?: number) => void;
  getRecentSessions: (limit?: number) => Session[];

  // Wiki KB
  upsertWiki: (wiki: Pick<Wiki, 'slug' | 'title' | 'flavor' | 'root_path'> & Partial<Wiki>) => Wiki;
  getWiki: (slug: string) => Wiki | undefined;
  listWikis: (scope?: WikiScope) => Wiki[];
  deleteWiki: (slug: string) => boolean;

  upsertWikiPage: (page: Omit<WikiPage, 'id' | 'updated_at'>) => WikiPage;
  getWikiPage: (wikiSlug: string, relPath: string) => WikiPage | undefined;
  listWikiPages: (wikiSlug: string) => WikiPage[];
  searchWiki: (query: string, opts?: { wikiSlug?: string; limit?: number; loose?: boolean }) => WikiSearchHit[];

  enqueueSeed: (seed: Omit<WikiSeed, 'id' | 'created_at' | 'status'> & { status?: WikiSeed['status'] }) => WikiSeed;
  nextPendingSeed: (wikiSlug: string) => WikiSeed | undefined;
  claimPendingSeed: (wikiSlug: string) => WikiSeed | undefined;
  setSeedStatus: (id: number, status: WikiSeed['status']) => void;
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
    INSERT OR IGNORE INTO sessions (id, project, started_at)
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

  const upsertWikiStmt = db.prepare(`
    INSERT INTO wikis (slug, title, flavor, root_path, scope, auto_research, private)
    VALUES (@slug, @title, @flavor, @root_path, @scope, @auto_research, @private)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      flavor = excluded.flavor,
      root_path = excluded.root_path,
      scope = excluded.scope,
      auto_research = excluded.auto_research,
      private = excluded.private,
      updated_at = datetime('now')
  `);
  const getWikiStmt = db.prepare(`SELECT * FROM wikis WHERE slug = ?`);
  const listWikisStmt = db.prepare(`SELECT * FROM wikis ORDER BY updated_at DESC`);
  const listWikisByScopeStmt = db.prepare(`SELECT * FROM wikis WHERE scope = ? ORDER BY updated_at DESC`);
  const deleteWikiStmt = db.prepare(`DELETE FROM wikis WHERE slug = ?`);

  const upsertWikiPageStmt = db.prepare(`
    INSERT INTO wiki_pages (wiki_slug, rel_path, title, summary, content, page_type, content_hash)
    VALUES (@wiki_slug, @rel_path, @title, @summary, @content, @page_type, @content_hash)
    ON CONFLICT(wiki_slug, rel_path) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      content = excluded.content,
      page_type = excluded.page_type,
      content_hash = excluded.content_hash,
      updated_at = datetime('now')
    RETURNING id
  `);
  const getWikiPageStmt = db.prepare(`SELECT * FROM wiki_pages WHERE wiki_slug = ? AND rel_path = ?`);
  const getWikiPageByIdStmt = db.prepare(`SELECT * FROM wiki_pages WHERE id = ?`);
  const listWikiPagesStmt = db.prepare(`SELECT * FROM wiki_pages WHERE wiki_slug = ? ORDER BY updated_at DESC`);

  const searchWikiAllStmt = db.prepare(`
    SELECT p.id AS page_id, p.wiki_slug, p.rel_path, p.title, p.summary,
           snippet(wiki_pages_fts, 2, '[', ']', '...', 16) AS snippet,
           bm25(wiki_pages_fts) AS rank
    FROM wiki_pages_fts
    JOIN wiki_pages p ON p.id = wiki_pages_fts.rowid
    WHERE wiki_pages_fts MATCH @q
    ORDER BY rank
    LIMIT @limit
  `);
  const searchWikiScopedStmt = db.prepare(`
    SELECT p.id AS page_id, p.wiki_slug, p.rel_path, p.title, p.summary,
           snippet(wiki_pages_fts, 2, '[', ']', '...', 16) AS snippet,
           bm25(wiki_pages_fts) AS rank
    FROM wiki_pages_fts
    JOIN wiki_pages p ON p.id = wiki_pages_fts.rowid
    WHERE wiki_pages_fts MATCH @q AND p.wiki_slug = @slug
    ORDER BY rank
    LIMIT @limit
  `);

  const enqueueSeedStmt = db.prepare(`
    INSERT INTO wiki_seeds (wiki_slug, query, status, parent_id, depth)
    VALUES (@wiki_slug, @query, @status, @parent_id, @depth)
    RETURNING *
  `);
  const nextPendingSeedStmt = db.prepare(`
    SELECT * FROM wiki_seeds WHERE wiki_slug = ? AND status = 'pending'
    ORDER BY depth ASC, created_at ASC LIMIT 1
  `);
  const claimPendingSeedStmt = db.prepare(`
    UPDATE wiki_seeds
    SET status = 'active'
    WHERE id = (
      SELECT id FROM wiki_seeds
      WHERE wiki_slug = ? AND status = 'pending'
      ORDER BY depth ASC, created_at ASC
      LIMIT 1
    )
    RETURNING *
  `);
  const setSeedStatusStmt = db.prepare(`UPDATE wiki_seeds SET status = ? WHERE id = ?`);

  const linkLearningWikiStmt = db.prepare(`
    INSERT OR REPLACE INTO learnings_wiki (learning_id, wiki_slug) VALUES (?, ?)
  `);
  const learningsByWikiStmt = db.prepare(`
    SELECT l.* FROM learnings l
    JOIN learnings_wiki lw ON lw.learning_id = l.id
    WHERE lw.wiki_slug = ?
    ORDER BY l.created_at DESC
  `);

  const addLearningTx = db.transaction((learning: Omit<Learning, 'id' | 'created_at' | 'times_applied'>, wikiSlug?: string) => {
    const result = addLearningStmt.run({
      project: learning.project ?? null,
      category: learning.category,
      rule: learning.rule,
      mistake: learning.mistake ?? null,
      correction: learning.correction ?? null,
    });
    const row = getLearningStmt.get(result.lastInsertRowid) as Learning;
    if (wikiSlug) linkLearningWikiStmt.run(row.id, wikiSlug);
    return row;
  });

  return {
    db,
    close: () => db.close(),

    addLearning(learning, wikiSlug) {
      return addLearningTx(learning, wikiSlug);
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

    getLearningsByWiki(wikiSlug) {
      return learningsByWikiStmt.all(wikiSlug) as Learning[];
    },

    upsertWiki(wiki) {
      const scope = wiki.scope ?? 'global';
      const existing = getWikiStmt.get(wiki.slug) as Wiki | undefined;
      if (existing && (existing.scope !== scope || existing.root_path !== wiki.root_path)) {
        throw new Error(
          `wiki slug "${wiki.slug}" already registered at ${existing.scope}:${existing.root_path}; ` +
          `pick a different slug or delete the existing registration first`
        );
      }
      upsertWikiStmt.run({
        slug: wiki.slug,
        title: wiki.title,
        flavor: wiki.flavor,
        root_path: wiki.root_path,
        scope,
        auto_research: wiki.auto_research ?? 0,
        private: wiki.private ?? 0,
      });
      return getWikiStmt.get(wiki.slug) as Wiki;
    },

    getWiki(slug) {
      return getWikiStmt.get(slug) as Wiki | undefined;
    },

    listWikis(scope) {
      if (scope) return listWikisByScopeStmt.all(scope) as Wiki[];
      return listWikisStmt.all() as Wiki[];
    },

    deleteWiki(slug) {
      return deleteWikiStmt.run(slug).changes > 0;
    },

    upsertWikiPage(page) {
      const row = upsertWikiPageStmt.get({
        wiki_slug: page.wiki_slug,
        rel_path: page.rel_path,
        title: page.title,
        summary: page.summary ?? null,
        content: page.content ?? null,
        page_type: page.page_type ?? null,
        content_hash: page.content_hash ?? null,
      }) as { id: number };
      return getWikiPageByIdStmt.get(row.id) as WikiPage;
    },

    getWikiPage(wikiSlug, relPath) {
      return getWikiPageStmt.get(wikiSlug, relPath) as WikiPage | undefined;
    },

    listWikiPages(wikiSlug) {
      return listWikiPagesStmt.all(wikiSlug) as WikiPage[];
    },

    searchWiki(query, opts = {}) {
      const limit = opts.limit ?? 10;
      const q = sanitizeFtsQuery(query, opts.loose);
      if (!q) return [];
      const rows = opts.wikiSlug
        ? searchWikiScopedStmt.all({ q, slug: opts.wikiSlug, limit })
        : searchWikiAllStmt.all({ q, limit });
      return rows as WikiSearchHit[];
    },

    enqueueSeed(seed) {
      return enqueueSeedStmt.get({
        wiki_slug: seed.wiki_slug,
        query: seed.query,
        status: seed.status ?? 'pending',
        parent_id: seed.parent_id ?? null,
        depth: seed.depth,
      }) as WikiSeed;
    },

    nextPendingSeed(wikiSlug) {
      return nextPendingSeedStmt.get(wikiSlug) as WikiSeed | undefined;
    },

    claimPendingSeed(wikiSlug) {
      return claimPendingSeedStmt.get(wikiSlug) as WikiSeed | undefined;
    },

    setSeedStatus(id, status) {
      setSeedStatusStmt.run(status, id);
    },
  };
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'it', 'this', 'that', 'be', 'as', 'at', 'by', 'are', 'was', 'were',
  'what', 'which', 'how', 'why', 'when', 'where', 'who', 'about',
  'explain', 'tell', 'show', 'find', 'do', 'does', 'use', 'using'
]);

function sanitizeFtsQuery(input: string, loose = false): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const tokens = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
  if (!tokens.length) return '';
  if (loose) {
    return tokens.map(t => `${t}*`).join(' OR ');
  }
  return tokens.map(t => `"${t}"`).join(' ');
}
