# /wiki — Persistent Research Wikis

Build, query, and maintain long-lived knowledge bases. Each wiki = markdown folder + SQLite FTS5 shadow index. Survives sessions, indexes auto-load on `SessionStart`.

## Subcommands

| Subcommand | Action |
|------------|--------|
| `/wiki init <slug> --title "X" [--flavor research] [--scope global\|project]` | Scaffold + register a new wiki |
| `/wiki list [--scope global\|project]` | List registered wikis |
| `/wiki info <slug>` | Show wiki metadata + page count |
| `/wiki page <slug> <rel-path> [--title "X"] [--type concept\|paper\|...]` | Upsert a markdown page into the FTS index |
| `/wiki reindex <slug>` | Walk `wiki/` and re-index all `*.md` |
| `/wiki ask "<query>" [--wiki <slug>] [--limit N]` | BM25 search over wiki pages |
| `/wiki related <slug> <rel-path>` | Find adjacent pages by reusing title+summary as query |
| `/wiki show <slug> <rel-path>` | Print a page from the index |
| `/wiki seed <slug> "<query>" [--depth 0]` | Enqueue a research seed |
| `/wiki research <slug> [--max-pages 5] [--budget-usd 0.50] [--fetchers web,arxiv,github]` | Run the auto-research loop |
| `/wiki seeds <slug> [--status pending\|active\|done\|failed]` | List queued seeds |
| `/wiki cancel <slug>` | Mark all pending/active seeds as failed |
| `/wiki status` | Cross-wiki seed counts + kill-switch state |
| `/wiki embed [<slug>] [--limit N]` | Compute embeddings for indexed pages (needs `OPENAI_API_KEY` or `VOYAGE_API_KEY`) |
| `/wiki hybrid "<query>" [--wiki <slug>]` | Hybrid retrieval: BM25 + vector + RRF |
| `/wiki council "<query>" --wiki <slug>` | Run llm-council; persist transcript as a wiki page |
| `/wiki survey --bundle <path> --wiki <slug>` | Generate literature survey from a research_bundle.json |

## Routes to skills

- `init / list / info / page / reindex` → `wiki-builder`
- `ask / related / show / hybrid` → `wiki-query` (+ `embed-wiki.js` for hybrid)
- `seed / research / seeds / cancel / status` → `wiki-research-loop`
- `council` → `llm-council`
- `survey` → `survey-generator`
- `embed` → `scripts/embed-wiki.js`

## Storage

- **Global** (default): `~/.pro-workflow/wikis/<slug>/`
- **Project**: `<project>/.claude/wikis/<slug>/` via `--scope project`

Both indexed in `~/.pro-workflow/data.db`.

## Flavors

`research`, `paper`, `domain`, `product`, `person`, `organization`, `project`, `codebase`, `incident`. See wiki-builder skill for layout per flavor.

## Examples

```
/wiki init agent-memory --title "Agent Memory" --flavor research
/wiki page agent-memory wiki/concepts/episodic-memory.md --type concept
/wiki ask "what is episodic memory" --wiki agent-memory
/wiki related agent-memory wiki/concepts/episodic-memory.md
```

## Auto-research (Phase 3.3.1+)

Loop is opt-in per-wiki via `wiki.config.md`:

```yaml
auto_research:
  enabled: true
  max_pages_per_run: 5
  max_depth: 3
  budget_usd: 0.50
```

Phase 3.3.0 ships the index + manual page workflow. Loop driver lands next.

## Cited recall

Every answer that uses a wiki hit must cite as:

```
[wiki:<slug>] <Title> — `<rel_path>`
```

No paraphrase without citation.

## Related

- `/learn` (and `learn-rule`) accepts `--wiki <slug>` to scope a learning rule to one wiki.
- SessionStart auto-loads top-3 wiki hits when prompt matches indexed content.
