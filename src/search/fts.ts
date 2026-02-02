import Database from 'better-sqlite3';
import { Learning } from '../db/store';

export interface SearchResult extends Learning {
  rank: number;
  snippet?: string;
}

export interface SearchOptions {
  limit?: number;
  project?: string;
  category?: string;
}

export function searchLearnings(
  db: Database.Database,
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const { limit = 10, project, category } = options;

  const sanitizedQuery = sanitizeQuery(query);

  if (!sanitizedQuery) {
    return [];
  }

  let sql = `
    SELECT
      learnings.*,
      bm25(learnings_fts, 1.0, 2.0, 1.0, 1.0) as rank,
      snippet(learnings_fts, 1, '<mark>', '</mark>', '...', 32) as snippet
    FROM learnings
    JOIN learnings_fts ON learnings.id = learnings_fts.rowid
    WHERE learnings_fts MATCH ?
  `;

  const params: (string | number)[] = [sanitizedQuery];

  if (project) {
    sql += ` AND (learnings.project = ? OR learnings.project IS NULL)`;
    params.push(project);
  }

  if (category) {
    sql += ` AND learnings.category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY rank LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params) as SearchResult[];
}

export function searchByCategory(
  db: Database.Database,
  category: string,
  options: SearchOptions = {}
): Learning[] {
  const { limit = 10, project } = options;

  let sql = `
    SELECT * FROM learnings
    WHERE category = ?
  `;

  const params: (string | number)[] = [category];

  if (project) {
    sql += ` AND (project = ? OR project IS NULL)`;
    params.push(project);
  }

  sql += ` ORDER BY times_applied DESC, created_at DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params) as Learning[];
}

export function getRelatedLearnings(
  db: Database.Database,
  learningId: number,
  limit: number = 5
): SearchResult[] {
  const learningStmt = db.prepare(`SELECT * FROM learnings WHERE id = ?`);
  const learning = learningStmt.get(learningId) as Learning | undefined;

  if (!learning) {
    return [];
  }

  const keywords = extractKeywords(learning.rule);
  if (keywords.length === 0) {
    return searchByCategory(db, learning.category, { limit }) as SearchResult[];
  }

  const query = keywords.join(' OR ');
  const results = searchLearnings(db, query, { limit: limit + 1 });

  return results.filter((r) => r.id !== learningId).slice(0, limit);
}

export function getMostAppliedLearnings(
  db: Database.Database,
  limit: number = 10
): Learning[] {
  const stmt = db.prepare(`
    SELECT * FROM learnings
    WHERE times_applied > 0
    ORDER BY times_applied DESC, created_at DESC
    LIMIT ?
  `);

  return stmt.all(limit) as Learning[];
}

export function getRecentLearnings(
  db: Database.Database,
  limit: number = 10,
  project?: string
): Learning[] {
  let sql = `SELECT * FROM learnings`;
  const params: (string | number)[] = [];

  if (project) {
    sql += ` WHERE project = ? OR project IS NULL`;
    params.push(project);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params) as Learning[];
}

function sanitizeQuery(query: string): string {
  return query
    .replace(/[^\w\s*"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => {
      if (word.startsWith('"') && word.endsWith('"')) {
        return word;
      }
      if (!word.includes('*')) {
        return `${word}*`;
      }
      return word;
    })
    .join(' ');
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
    'by', 'from', 'as', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'although', 'though', 'this',
    'that', 'these', 'those', 'it', 'its',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}
