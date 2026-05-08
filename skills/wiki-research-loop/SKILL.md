---
name: wiki-research-loop
description: Auto-grow a pro-workflow wiki by running a budget-capped BFS research loop over pluggable source fetchers (web, arXiv, GitHub). Each iteration pops a seed from the queue, fetches sources, drafts a wiki page, dedupes claims against existing pages, enqueues follow-up seeds. Halts on budget cap, depth cap, or convergence. Use when the user says "research <topic>", "grow the <slug> wiki", "auto-research", or wants a knowledge base that builds itself overnight.
---

# Wiki Research Loop

Driver that turns a wiki into an auto-grown knowledge base. Layers on top of `wiki-builder` and `wiki-query`.

## Loop semantics

```
seed-queue (pending) → next-seed
  → fetch sources via plugins (web | arxiv | github)
  → extract claims
  → dedupe vs index (FTS5; later vector via 3.3.2)
  → compile new page or amend existing
  → upsert page (auto-FTS-index)
  → enqueue follow-up seeds (max-depth gate)
  → mark seed done
  → if budget OR convergence OR kill-switch → halt
```

## Halt conditions (any one trips)

- `budget_usd` exceeded (loop tracks per-fetcher cost estimate)
- `max_pages_per_run` written
- `max_depth` reached on every active branch
- 3 consecutive pages add < 5 % new claims (convergence)
- File `~/.pro-workflow/STOP` exists (operator kill-switch)
- `wiki.config.md` `auto_research.enabled: false`
- Wiki `private: true` AND any non-local fetcher selected

## Commands

```
node $SKILL_ROOT/scripts/research-loop.js run <slug> [--max-pages N] [--max-depth N] [--budget-usd 0.50] [--fetchers web,arxiv,github]
node $SKILL_ROOT/scripts/research-loop.js seed <slug> "<query>" [--depth 0] [--parent-id N]
node $SKILL_ROOT/scripts/research-loop.js seeds <slug> [--status pending|active|done|failed]
node $SKILL_ROOT/scripts/research-loop.js cancel <slug>
node $SKILL_ROOT/scripts/research-loop.js status
```

CLI flags override `wiki.config.md` for one run only.

## Source fetchers

Pluggable. Each lives at `scripts/source-fetchers/<name>.js`. Interface:

```js
module.exports = {
  name: 'web',
  match: (q) => true,                       // is this fetcher useful?
  estimateCost: (q) => ({ usd: 0, tokens: 0 }),
  fetch: async (q, opts) => [               // returns RawDoc[]
    { url, title, content, fetched_at }
  ]
};
```

Built-in:
- **`web.js`** — Fetches via the user's available `WebFetch` tool through a stdin/stdout shim. Treats result as plain text/markdown.
- **`arxiv.js`** — `https://export.arxiv.org/api/query` (free, public, no key). Returns abstract + metadata.
- **`github.js`** — `https://api.github.com/search/repositories` + README pull (uses `GH_TOKEN` if set, otherwise unauthenticated rate limit).

Drop a new file in `~/.pro-workflow/fetchers/<name>.js` to add a custom fetcher. Loaded at startup if present.

## Budget enforcement

Pre-iteration: sum `estimateCost` across selected fetchers. If projected cumulative cost would exceed `budget_usd`, halt.

Post-iteration: track tokens used by the LLM compile step (Anthropic/OpenAI passthrough). Hard-kill on overrun.

Per-fetcher overrides via env: `WIKI_LOOP_BUDGET_USD`, `WIKI_LOOP_MAX_PAGES`, `WIKI_LOOP_MAX_DEPTH`.

## Seed queue

SQLite-backed via `wiki_seeds` table:

| field | meaning |
|-------|---------|
| `query` | natural-language seed |
| `status` | `pending` → `active` → `done`\|`failed` |
| `parent_id` | seed that produced this one |
| `depth` | BFS depth from root |

Loop pops by `(depth ASC, created_at ASC)` so it explores breadth-first.

## Convergence detection

After each compiled page, compute Jaccard overlap of claim-text tokens vs the prior 3 pages. If `< 5 %` novel content for 3 consecutive pages, halt and report `converged`.

## Kill switch

```
touch ~/.pro-workflow/STOP
```

Loop checks per-iteration and halts gracefully. Remove file to resume next run.

## Privacy guard

If `wiki.config.md` has `private: true`, the loop refuses any non-local fetcher and emits a warning. Only `raw/` ingestion via manual seeds is allowed.

## Reactive trigger (Phase 3.3.4)

`scripts/file-watcher.js` watches `wiki/<slug>/wiki/**/*.md`. On user-edited claim, enqueues a verification seed (`verify: <claim>`) at depth 0. Wired through pro-workflow's `file-watcher.js` hook.

## Cron tick (Phase 3.3.4)

`scripts/research-tick.js` is launchable from any cron-style runner. Picks the oldest opted-in wiki with pending seeds and runs a single iteration. Hook event: `pro-workflow:research-tick`.

## Output

Each run writes:

```
<wiki-root>/logs/research-<UTC-timestamp>.md   # human-readable run log
<wiki-root>/derived/run-<UTC-timestamp>.json   # structured stats
```

Run log lines:

```
[2026-05-08T10:42Z] seed-3 (depth=1) "memory consolidation in agents"
  fetcher=arxiv hits=3
  fetcher=web hits=2
  compiled wiki/concepts/memory-consolidation.md (claims=7, novel=4)
  enqueued 2 follow-up seeds
  cost so far: $0.04 / $0.50
```

## Integration with `wiki-query`

Every compiled page goes through `wiki-cli.js page` so FTS5 stays consistent. The dedupe step calls `searchWiki` with the candidate claim text to find near-duplicates.

## Status (Phase 3.3.1)

Ships: loop driver, seed queue, web/arxiv/github fetchers, budget caps, convergence detector, kill-switch, manual `run` command.

Defers:
- Vector dedupe (Phase 3.3.2 via sqlite-vec)
- LLM-judged claim novelty (current = Jaccard token overlap)
- Cron + reactive (Phase 3.3.4)
