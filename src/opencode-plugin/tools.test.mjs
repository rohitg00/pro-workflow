import { describe, it, before, beforeEach, after } from "node:test";
import { strict as assert } from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import * as fs from "node:fs";
import Database from "better-sqlite3";
import { createStore } from "../../dist/db/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build an in-memory FTS5-backed database with the learnings schema and populate
 * it with sample rows.  This mirrors the production setup in `src/db/store.ts`
 * so that `searchLearnings()` can run unmodified.
 */
function createTestDb() {
  const schemaRelative = path.resolve(__dirname, "..", "db", "schema.sql");
  const candidates = [
    path.resolve(__dirname, "../../dist/db/schema.sql"),
    path.resolve(__dirname, "../../src/db/schema.sql"),
    schemaRelative,
  ];
  const schemaPath = candidates.find((p) => fs.existsSync(p));
  if (!schemaPath) {
    throw new Error(`schema.sql not found. Candidates: ${candidates.join(", ")}`);
  }

  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  // Seed a few learnings so FTS5 returns something
  db.exec(`
    INSERT INTO learnings (project, category, rule, mistake, correction) VALUES
      ('test-proj', 'python', 'Always use virtualenv', 'Used system python', 'Run: python -m venv .venv'),
      ('test-proj', 'git', 'Write meaningful commit messages', 'msg: fix', 'Use conventional commits'),
      (NULL, 'security', 'Never hardcode secrets', 'API key in source', 'Use env vars')
  `);

  return db;
}

describe("pw-search tool", () => {
  let db;
  let pwSearch;
  let mod;

  before(async () => {
    db = createTestDb();

    // Dynamically import the compiled tool and inject the test store
    mod = await import(
      path.resolve(__dirname, "../../dist/opencode-plugin/tools.mjs")
    );

    if (typeof mod.__setTestStore !== "function") {
      throw new Error("tools.mjs must export __setTestStore(store) for test injection");
    }

    // Provide a Store-shaped object that wraps the in-memory db
    mod.__setTestStore({
      db,
      close() {},
      searchWiki(query, opts) {
        return [];
      },
    });

    pwSearch = mod.pwSearch;
  });

  after(() => {
    if (db) db.close();
    mod.__setTestStore(null);
  });

  it("REQ 9.2: returns markdown table of learning results for a text query", async () => {
    const result = await pwSearch.execute({ query: "virtualenv", limit: 10 }, {
      sessionID: "s1",
      messageID: "m1",
      agent: "test",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
    });

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("virtualenv"), "should mention the matched learning");
    assert.ok(output.includes("Learnings"), "should have a 'Learnings' section");
    assert.ok(output.includes("|"), "should contain markdown table bars");
  });

  it("respects the limit parameter", async () => {
    // Use a broad query that matches multiple rows (3 seeded learnings)
    const result = await pwSearch.execute({ query: "use", limit: 2 }, {
      sessionID: "s1",
      messageID: "m1",
      agent: "test",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
    });

    const output = typeof result === "string" ? result : result.output;
    const lines = output.split("\n").filter((l) => l.match(/^\| \d+ \|/));
    assert.ok(lines.length <= 2, `expected ≤ 2 result rows, got ${lines.length}`);
  });

  it("filters by category when provided", async () => {
    const result = await pwSearch.execute({ query: "git", category: "python", limit: 10 }, {
      sessionID: "s1",
      messageID: "m1",
      agent: "test",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
    });

    const output = typeof result === "string" ? result : result.output;
    // "virtualenv" learning has category="python", "commit" learning has category="git"
    // With category filter "python", we should NOT see the git rule
    assert.ok(
      !output.toLowerCase().includes("commit message"),
      "should not include git-category result when filtering for python"
    );
  });

  it("returns empty message when no results found", async () => {
    const result = await pwSearch.execute({ query: "zzzznonexistentpattern", limit: 10 }, {
      sessionID: "s1",
      messageID: "m1",
      agent: "test",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
    });

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("No results"), "should indicate no results found");
  });

  it("REQ 11.2: returns within 200ms for a normal-sized query", async () => {
    const start = Date.now();
    await pwSearch.execute({ query: "virtualenv", limit: 10 }, {
      sessionID: "s1",
      messageID: "m1",
      agent: "test",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
    });
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `expected < 200ms, took ${elapsed}ms`);
  });
});

const makeCtx = () => ({
  sessionID: "s1",
  messageID: "m1",
  agent: "test",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
});

describe("pw-learn tool", () => {
  let store;
  let pwLearn;
  let mod;

  before(async () => {
    store = createStore(":memory:");
    mod = await import(
      path.resolve(__dirname, "../../dist/opencode-plugin/tools.mjs")
    );

    if (typeof mod.__setTestStore !== "function") {
      throw new Error("tools.mjs must export __setTestStore(store) for test injection");
    }

    mod.__setTestStore(store);
    pwLearn = mod.pwLearn;
  });

  after(() => {
    if (store) store.close();
    mod.__setTestStore(null);
  });

  it("REQ 9.1: stores a learning with content and category", async () => {
    const result = await pwLearn.execute({
      content: "Always write tests before implementation",
      category: "testing",
    }, makeCtx());

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("Learning stored"), "should confirm storage");
    assert.ok(output.includes("testing"), "should include category in output");

    const all = store.getAllLearnings();
    assert.equal(all.length, 1);
    assert.ok(all[0].rule.includes("Always write tests"));
    assert.equal(all[0].category, "testing");
  });

  it("stores a learning with only content (defaults category to general)", async () => {
    const result = await pwLearn.execute({
      content: "Use meaningful variable names",
    }, makeCtx());

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("Learning stored"));
    assert.ok(output.includes("general"), "should default to general category");

    const all = store.getAllLearnings();
    assert.ok(all.some((l) => l.category === "general"));
  });

  it("stores a learning with tags", async () => {
    const result = await pwLearn.execute({
      content: "Avoid premature optimization",
      tags: ["performance", "best-practice"],
    }, makeCtx());

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("Learning stored"));
    assert.ok(output.includes("performance"), "should include tags in output");
    assert.ok(output.includes("best-practice"), "should include tags in output");

    const all = store.getAllLearnings();
    const found = all.find((l) => l.rule.includes("Avoid premature"));
    assert.ok(found, "should persist learning with tags");
    assert.ok(found.rule.includes("[performance, best-practice]"), "tags should be in rule");
  });

  it("persists learning to database and can be retrieved by store", async () => {
    await pwLearn.execute({
      content: "Commit often with meaningful messages",
      category: "git",
      tags: ["version-control"],
    }, makeCtx());

    const all = store.getAllLearnings();
    assert.ok(all.length > 0, "should have persisted learnings");

    const found = all.find((l) => l.rule.includes("Commit often"));
    assert.ok(found, "should find the persisted learning");
    assert.equal(found.category, "git");
    assert.ok(found.rule.includes("version-control"), "tags persisted in rule");
  });
});

describe("pw-wiki-query tool", () => {
  let store;
  let pwWikiQuery;
  let mod;

  before(async () => {
    store = createStore(":memory:");

    // Seed wiki and pages
    store.upsertWiki({
      slug: "test-wiki",
      title: "Test Wiki",
      flavor: "research",
      root_path: "/tmp/test-wiki",
      scope: "global",
    });
    store.upsertWiki({
      slug: "other-wiki",
      title: "Other Wiki",
      flavor: "domain",
      root_path: "/tmp/other-wiki",
      scope: "project",
    });

    store.upsertWikiPage({
      wiki_slug: "test-wiki",
      rel_path: "python-guide.md",
      title: "Python Programming Guide",
      summary: "A comprehensive guide to Python programming",
      content: "Python is a high-level programming language known for readability.",
      page_type: "guide",
      content_hash: "abc123",
    });
    store.upsertWikiPage({
      wiki_slug: "test-wiki",
      rel_path: "git-workflow.md",
      title: "Git Workflow Best Practices",
      summary: "Best practices for Git workflows in teams",
      content: "Use feature branches and pull requests for collaboration.",
      page_type: "guide",
      content_hash: "def456",
    });
    store.upsertWikiPage({
      wiki_slug: "other-wiki",
      rel_path: "python-advanced.md",
      title: "Advanced Python Topics",
      summary: "Advanced Python concepts and patterns",
      content: "Decorators, metaclasses, and context managers in Python.",
      page_type: "guide",
      content_hash: "ghi789",
    });

    mod = await import(
      path.resolve(__dirname, "../../dist/opencode-plugin/tools.mjs")
    );

    if (typeof mod.__setTestStore !== "function") {
      throw new Error("tools.mjs must export __setTestStore(store) for test injection");
    }

    mod.__setTestStore(store);
    pwWikiQuery = mod.pwWikiQuery;
  });

  after(() => {
    if (store) store.close();
    mod.__setTestStore(null);
  });

  it("REQ 9.1: returns wiki pages matching a text query", async () => {
    const result = await pwWikiQuery.execute({
      query: "Python",
    }, makeCtx());

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("Wiki Pages"), "should have 'Wiki Pages' section");
    assert.ok(output.includes("Python Programming Guide"), "should include matching page");
    assert.ok(output.includes("Advanced Python Topics"), "should include from other wiki too");
    assert.ok(output.includes("|"), "should contain markdown table bars");
  });

  it("filters results by wiki_name when provided", async () => {
    const result = await pwWikiQuery.execute({
      query: "python",
      wiki_name: "test-wiki",
    }, makeCtx());

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("Python Programming Guide"), "should include test-wiki page");
    assert.ok(!output.includes("Advanced Python Topics"), "should exclude other-wiki page");
  });

  it("returns empty message when no wiki pages match", async () => {
    const result = await pwWikiQuery.execute({
      query: "zzzznonexistentterm",
    }, makeCtx());

    const output = typeof result === "string" ? result : result.output;
    assert.ok(output.includes("No wiki pages found"), "should indicate no results");
  });
});
