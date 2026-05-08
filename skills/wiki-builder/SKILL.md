---
name: wiki-builder
description: Start, structure, and grow a persistent research wiki indexed in pro-workflow's SQLite knowledge base. Each wiki is a folder of markdown pages with provenance, plus a shadow FTS5 index so any session can recall it. Use when the user says "start a wiki", "add to wiki", "compile a page", "wiki on X", or wants a long-lived knowledge base on a topic, paper, product, person, project, or codebase.
---

# Wiki Builder

Persistent knowledge base for any topic. Markdown on disk + SQLite FTS5 shadow index.

## When to use

- "Start a wiki on <topic>"
- "Add this paper / link / note to the <slug> wiki"
- "Compile a concept page on X in <slug>"
- "What does the <slug> wiki say about Y?" (delegates to wiki-query)
- "List my wikis"

## Locations

- **Global**: `~/.pro-workflow/wikis/<slug>/` — default, never committed
- **Project**: `<project>/.claude/wikis/<slug>/` — pass `--scope project`, committable

Both register in the same `~/.pro-workflow/data.db`.

## Flavors

| Flavor | Use for |
|--------|---------|
| `research` | ongoing topic exploration |
| `paper` | one-paper deep dive |
| `domain` | broad subject area |
| `product` | product/tool KB |
| `person` | researcher/founder dossier |
| `organization` | company/lab profile |
| `project` | internal project KB |
| `codebase` | symbol/file-aware KB tied to a repo |
| `incident` | post-mortem KB |

## Layout

```
<slug>/
├── wiki.config.md         # purpose, audience, page types, style, auto_research block
├── raw/                   # untouched source material (PDFs, scrapes, transcripts)
├── wiki/
│   └── index.md           # entry point, hand-curated TOC
├── derived/               # generated artifacts (surveys, charts, summaries)
├── prompts/               # per-task prompts (compile-page, lint, query)
├── logs/maintenance-log.md
└── sources.md             # one row per source: id | url | title | hash | fetched_at
```

Flavor adds folders: `wiki/papers`, `wiki/concepts`, `wiki/people`, `wiki/products`, `wiki/timelines`, `wiki/questions`.

## CLI surface

```
node $SKILL_ROOT/scripts/wiki-cli.js init <slug> --title "X" --flavor research [--scope project] [--root <path>]
node $SKILL_ROOT/scripts/wiki-cli.js list
node $SKILL_ROOT/scripts/wiki-cli.js page <slug> <rel-path> --title "X" [--type concept|paper|person|...] [--from-file path]
node $SKILL_ROOT/scripts/wiki-cli.js reindex <slug>
node $SKILL_ROOT/scripts/wiki-cli.js info <slug>
```

`init` runs `init_wiki.sh` (mirrors dair layout) AND registers the wiki in SQLite. `page` writes markdown + upserts FTS row.

## Workflow when invoked

1. Resolve action (init / ingest / compile / list / reindex / info).
2. Read `wiki.config.md` of the target wiki before any compile.
3. Every claim that lands in `wiki/` must cite a row in `sources.md` (one citation = one source row).
4. After page write, call `wiki-cli.js page` so FTS index stays in sync.
5. Append a one-line entry to `logs/maintenance-log.md` per change.
6. Update `wiki/index.md` if new top-level page.

## Quality bar

- First page useful immediately, not stub.
- Stable slug filenames (`tool-use-benchmarks.md`, not `2026-05-08-notes.md`).
- Separate raw source from compiled interpretation.
- Cross-link related pages in same wiki via relative links.
- Mark speculation with `> SPECULATION:` block.
- No duplicate summaries — link existing page instead.
- Generated pages stay navigable for future agents.

## Privacy

Wikis with `private: true` in config never get fetched from web sources by `wiki-research-loop`. Local raw/ only.

## Auto-research opt-in

Phase 3.3.0 ships builder + query only. Loop arrives in 3.3.1. To prep, `wiki.config.md` may include:

```yaml
auto_research:
  enabled: false        # flip in 3.3.1
  max_pages_per_run: 5
  max_depth: 3
  budget_usd: 0.50
  fetchers: [web, arxiv, github]
```

## Templates

See `templates/` for `wiki.config.md`, `index.md`, prompt files. `init_wiki.sh` copies these into the new wiki root.
