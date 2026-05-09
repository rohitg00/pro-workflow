---
name: wiki-viewer
description: Render a self-contained HTML viewer for a pro-workflow wiki. Pages, sources, claims, seed queue, page-link graph and full-text search all in one file. No external dependencies, no JS framework, S3-uploadable. Use when the user wants to browse a wiki visually, share its current state with someone, audit research progress, or hand off a knowledge base. Inspired by Thariq Shihipar's "Unreasonable Effectiveness of HTML" — favors information density and shareability over markdown-only outputs.
---

# Wiki Viewer

Single-file HTML view of a pro-workflow wiki. Reads `~/.pro-workflow/data.db`, dumps the wiki into one self-contained HTML document with in-browser search, link graph and a seed-queue panel.

## Why HTML, not markdown

- **Information density** — pages, sources, claims, seeds, link graph in one viewport
- **Visual clarity** — long wikis are unreadable as raw markdown; HTML scales
- **Shareability** — upload to S3, send the URL; recipient does not need pro-workflow installed
- **Two-way interaction** — "copy as seed" buttons turn open questions into seed queue prompts you can paste back into Claude Code
- **Auditable** — quick visual proof that the auto-research loop produced something useful

## When to use

- After a `/wiki research` run, to see what it built
- Before sharing a wiki with a teammate or with leadership
- Code review: render a `codebase`-flavored wiki for an unfamiliar module
- Incident review: render an `incident` wiki for a post-mortem readout
- Periodic audits: stale-claim detection, orphan-page review

## Commands

```
node $SKILL_ROOT/scripts/render.js <slug> [--out <path>] [--theme dark|light]
```

Defaults:

- output: `<wiki-root>/derived/viewer.html`
- theme: `dark`

## What ships in the file

| Panel | Contents |
|-------|----------|
| Header | wiki slug, flavor, scope, root path, last-update timestamp, page count, source count, kill-switch status |
| Sidebar | page list grouped by `page_type`, in-page filter input |
| Main | selected-page detail: title, summary, full markdown content (rendered), inline citations resolve to source rows |
| Sources | table of every `wiki_sources` row + manual `sources.md` rows |
| Seeds | seed-queue table grouped by status; "copy as research prompt" button per pending seed |
| Link graph | SVG force-layout of cross-page citations + back-links |
| Search | in-browser substring + token search over title/summary/content |
| Footer | meta: schema versions, embedding model if present, generator version |

## Self-contained

No CDN, no external fonts, no `<script src=>`. Inline CSS, inline SVG, inline JS only. Result is a single `.html` file that opens locally or from any static host.

## Compose with the rest

```bash
# Generate after auto-research run completes
/wiki research agent-memory --max-pages 5
node skills/wiki-viewer/scripts/render.js agent-memory
open ~/.pro-workflow/wikis/agent-memory/derived/viewer.html

# Hand off to a teammate
aws s3 cp ~/.pro-workflow/wikis/agent-memory/derived/viewer.html s3://my-bucket/agent-memory.html --acl public-read
```

## Design principles

1. **Type-first** — every panel reads as text; visualizations are auxiliary, not load-bearing.
2. **Zero decoration** — no gradients, no glow, no atmospheric backgrounds.
3. **Color is meaning** — Anthropic coral marks the active page and CTAs only.
4. **Print-friendly** — `@media print` collapses sidebars so the markdown content prints clean.

## Limits (initial release)

- Markdown rendering is a small in-file parser (headings, lists, code blocks, links, blockquotes, tables, footnote citations). No HTML-in-markdown.
- Link graph is precomputed and serialized as SVG; no live re-layout.
- Search is substring + tokenized AND match. BM25 stays in SQLite; the viewer is a snapshot.
- Re-render after each batch of changes. The file is not live.

## Future hooks (not in initial release)

- `--include-council` to bundle every linked council transcript inline
- `--include-survey` to bundle generated surveys
- "Copy as council prompt" buttons next to claims tagged `contested`
- Diff view: `--against <previous.html>` to highlight new claims since a prior render
