---
slug: {{SLUG}}
title: {{TITLE}}
flavor: {{FLAVOR}}
scope: {{SCOPE}}
created_at: {{TODAY}}
private: false
auto_research:
  enabled: false
  max_pages_per_run: 5
  max_depth: 3
  budget_usd: 0.50
  fetchers: [web, arxiv, github]
---

# {{TITLE}} — Wiki Config

## Purpose

Why this wiki exists. Who reads it. What questions it answers.

## Audience

Primary: <author / future-you / team>
Secondary: <other agents that might query this wiki>

## Page types

- `concept/<slug>.md` — durable explanation of a single idea
- `paper/<key>.md` — one-paper deep dive (key = author-year-shortname)
- `question/<slug>.md` — open question, links to claims/papers that bear on it
- `note/<date>-<slug>.md` — dated raw thinking, may be promoted to concept later

Adjust per flavor.

## Style rules

- Plain markdown, no HTML.
- Headings: H1 = page title, H2 = top-level section, H3 = subsection.
- Citations inline as `[^src-id]` referencing `sources.md` row.
- Speculation marked `> SPECULATION:` blockquote.
- Each page ≤ 1500 words; split if longer.

## Update workflow

1. Land raw material in `raw/` (PDFs, scrapes, transcripts).
2. Add a row to `sources.md` (id, url, title, hash, fetched_at).
3. Compile `wiki/<type>/<slug>.md` citing those sources.
4. Cross-link from `wiki/index.md`.
5. Run `wiki-cli.js page` to update the FTS index.
6. Append a one-line entry to `logs/maintenance-log.md`.

## Auto-research

Loop is opt-in. Set `auto_research.enabled: true` once Phase 3.3.1 ships.
Budget caps are enforced; loop halts on cap or convergence.
