# Lint wiki — {{TITLE}}

Audit the wiki and report (do not auto-fix unless asked):

1. **Orphan pages** — pages not linked from `wiki/index.md` or any other page.
2. **Broken cross-links** — relative links pointing to missing files.
3. **Uncited claims** — paragraphs in `wiki/` with no `[^src-id]` reference.
4. **Stale claims** — `last_verified_at` older than 90 days.
5. **Duplicate summaries** — pages whose first paragraph is >80% similar to another's.
6. **Missing sources rows** — `[^src-NNN]` cited but `src-NNN` not in `sources.md`.

Output a report under `derived/lint-{{TODAY}}.md`. Do not modify `wiki/` content.
