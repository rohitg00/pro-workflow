# Compile index — {{TITLE}}

Refresh `wiki/index.md` so it stays the entry point.

1. List sections by type (concepts, papers, questions...).
2. Within each section, link pages alphabetically by slug.
3. Surface 3-5 "open questions" pulled from `question/` pages with status `open`.
4. Top of file: 2-line orientation paragraph.
5. Bottom: link to `sources.md` and `logs/maintenance-log.md`.

Never delete user prose at the top; only update the generated section bounded by:
```
<!-- BEGIN GENERATED INDEX -->
...
<!-- END GENERATED INDEX -->
```
