import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { getOrCreateStore } from "./index.mjs";
import { searchLearnings } from "../search/fts.js";
import type { Store } from "../db/store.js";

let _testStore: Store | null = null;

/**
 * Injection point for tests.  Set to null after tests to restore normal behaviour.
 */
export function __setTestStore(store: Store | null): void {
  _testStore = store;
}

function resolveStore(): Store {
  return _testStore ?? getOrCreateStore();
}

/**
 * Decode a float32 BLOB into a Float32Array.
 * Each float occupies 4 bytes in little-endian order (SQLite default).
 */
function decodeFloat32Blob(blob: Buffer): Float32Array {
  const floats = new Float32Array(blob.length / 4);
  for (let i = 0; i < floats.length; i++) {
    floats[i] = blob.readFloatLE(i * 4);
  }
  return floats;
}

/**
 * Compute cosine similarity between two Float32Arrays.
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create a simple keyword-frequency vector from a query string.
 * Falls back to hashing keywords into dimension indices when no real embedding model
 * is available.  This is intentionally a simple approximation — full semantic search
 * requires a configured embedding model.
 */
function makeQueryVector(dim: number, queryText: string): Float32Array {
  const vec = new Float32Array(dim);
  const words = queryText.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % dim;
    vec[idx] = 1.0;
  }
  return vec;
}

/**
 * Attempt embedding-based search on wiki_embeddings.
 * Returns wiki pages sorted by cosine similarity to the query.
 */
function embeddingSearch(
  db: import("better-sqlite3").Database,
  queryText: string,
  limit: number,
): Array<{ page_id: number; similarity: number; title: string; summary: string | null; wiki_slug: string; rel_path: string }> {
  // Check if table has any rows
  const countRow = db.prepare("SELECT COUNT(*) as c FROM wiki_embeddings").get() as { c: number };
  if (countRow.c === 0) return [];

  // Get model dim from first row
  const sample = db.prepare("SELECT model, dim FROM wiki_embeddings LIMIT 1").get() as { model: string; dim: number } | undefined;
  if (!sample) return [];

  const queryVec = makeQueryVector(sample.dim, queryText);

  const rows = db.prepare(`
    SELECT e.page_id, e.vector, p.title, p.summary, p.wiki_slug, p.rel_path
    FROM wiki_embeddings e
    JOIN wiki_pages p ON p.id = e.page_id
  `).all() as Array<{ page_id: number; vector: Buffer; title: string; summary: string | null; wiki_slug: string; rel_path: string }>;

  const scored = rows.map((row) => ({
    page_id: row.page_id,
    similarity: cosineSimilarity(queryVec, decodeFloat32Blob(row.vector)),
    title: row.title,
    summary: row.summary,
    wiki_slug: row.wiki_slug,
    rel_path: row.rel_path,
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

function escapeMd(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export const pwLearn = tool({
  description: "Store a new learning in the pro-workflow database",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: {
    content: z.string().describe("Learning content"),
    category: z.string().optional().describe("Learning category"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
  } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (rawArgs: any, _ctx: any) => {
    const args = rawArgs as { content: string; category?: string; tags?: string[] };
    const store = resolveStore();

    const tagsPrefix = args.tags?.length ? `[${args.tags.join(", ")}] ` : "";

    const learning = store.addLearning({
      project: null,
      category: args.category ?? "general",
      rule: tagsPrefix + args.content,
      mistake: null,
      correction: null,
    });

    const tagsInfo = args.tags?.length ? `, tags: ${args.tags.join(", ")}` : "";
    return { output: `Learning stored (id: ${learning.id}, category: ${escapeMd(learning.category)}${tagsInfo})` };
  },
});

export const pwWikiQuery = tool({
  description: "Query wiki pages by title or content",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: {
    query: z.string().describe("Search query"),
    wiki_name: z.string().optional().describe("Specific wiki to search"),
  } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (rawArgs: any, _ctx: any) => {
    const args = rawArgs as { query: string; wiki_name?: string };
    const store = resolveStore();

    const results = store.searchWiki(args.query, {
      wikiSlug: args.wiki_name,
      limit: 10,
    });

    if (results.length === 0) {
      return { output: `No wiki pages found for query: *${escapeMd(args.query)}*` };
    }

    const lines: string[] = [];
    lines.push("## Wiki Pages");
    lines.push("");
    lines.push("| # | Wiki | Title | Snippet |");
    lines.push("|---|------|-------|---------|");
    for (let i = 0; i < results.length; i++) {
      const w = results[i];
      const title = w.title.length > 48 ? w.title.slice(0, 45) + "..." : w.title;
      const snippet = w.snippet.length > 64 ? w.snippet.slice(0, 61) + "..." : w.snippet;
      lines.push(`| ${i + 1} | ${escapeMd(w.wiki_slug)} | ${escapeMd(title)} | ${escapeMd(snippet)} |`);
    }
    lines.push("");

    return { output: lines.join("\n") };
  },
});

export const pwSearch = tool({
  description: "Search pro-workflow learnings and wiki pages using full-text search (FTS5) with embedding-based fallback",
  // args typed with Zod v3; @opencode-ai/plugin ships Zod v4 types so we cast
  args: {
    query: z.string().describe("Full-text search query"),
    category: z.string().optional().describe("Filter by learning category"),
    limit: z.number().optional().default(10).describe("Maximum number of results"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (rawArgs: any, _ctx: any) => {
    const args = rawArgs as { query: string; category?: string; limit: number };
    const store = resolveStore();
    const db = store.db;

    const maxResults = args.limit ?? 10;

    // ---- Primary: FTS5 search on learnings ----
    const learningResults = searchLearnings(db, args.query, {
      category: args.category,
      limit: maxResults,
    });

    // ---- Secondary: FTS5 search on wiki pages ----
    let wikiResults: Array<{
      page_id: number;
      wiki_slug: string;
      rel_path: string;
      title: string;
      summary: string | null;
      snippet: string;
      rank: number;
    }> = [];

    if (typeof store.searchWiki === "function") {
      try {
        wikiResults = store.searchWiki(args.query, { limit: Math.max(0, maxResults - learningResults.length) });
      } catch {
        // wiki search may not be available — ignore
      }
    }

    // ---- Fallback: embedding-based search ----
    let embeddingResults: Array<{
      page_id: number;
      similarity: number;
      title: string;
      summary: string | null;
      wiki_slug: string;
      rel_path: string;
    }> = [];

    if (learningResults.length === 0 && wikiResults.length === 0) {
      try {
        embeddingResults = embeddingSearch(db, args.query, Math.ceil(maxResults / 2));
      } catch {
        // embedding search not available — ignore
      }
    }

    // ---- Format output ----
    const lines: string[] = [];

    if (learningResults.length > 0) {
      lines.push("## Learnings");
      lines.push("");
      lines.push("| # | Category | Rule | Times Applied |");
      lines.push("|---|----------|------|---------------|");
      for (let i = 0; i < learningResults.length; i++) {
        const r = learningResults[i];
        const rule = r.rule.length > 72 ? r.rule.slice(0, 69) + "..." : r.rule;
        lines.push(`| ${i + 1} | ${escapeMd(r.category)} | ${escapeMd(rule)} | ${r.times_applied} |`);
      }
      lines.push("");
    }

    if (wikiResults.length > 0) {
      lines.push("## Wiki Pages");
      lines.push("");
      lines.push("| # | Wiki | Title | Snippet |");
      lines.push("|---|------|-------|---------|");
      for (let i = 0; i < wikiResults.length; i++) {
        const w = wikiResults[i];
        const title = w.title.length > 48 ? w.title.slice(0, 45) + "..." : w.title;
        const snippet = w.snippet.length > 64 ? w.snippet.slice(0, 61) + "..." : w.snippet;
        lines.push(`| ${i + 1} | ${escapeMd(w.wiki_slug)} | ${escapeMd(title)} | ${escapeMd(snippet)} |`);
      }
      lines.push("");
    }

    if (embeddingResults.length > 0) {
      lines.push("## Embedding Matches");
      lines.push("");
      lines.push("| # | Wiki | Title | Similarity |");
      lines.push("|---|------|-------|------------|");
      for (let i = 0; i < embeddingResults.length; i++) {
        const e = embeddingResults[i];
        const title = e.title.length > 48 ? e.title.slice(0, 45) + "..." : e.title;
        lines.push(`| ${i + 1} | ${escapeMd(e.wiki_slug)} | ${escapeMd(title)} | ${e.similarity.toFixed(4)} |`);
      }
      lines.push("");
    }

    if (lines.length === 0) {
      lines.push(`No results found for query: *${escapeMd(args.query)}*`);
    }

    return { output: lines.join("\n") };
  },
});
