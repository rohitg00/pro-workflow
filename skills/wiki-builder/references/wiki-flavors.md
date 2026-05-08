# Wiki Flavors

Starting points only. Each wiki's `wiki.config.md` overrides any structure listed here.

## Research

Ongoing topic with many source types.

- `wiki/index.md` — overview + navigation
- `wiki/maps/research-map.md` — conceptual map
- `wiki/concepts/<concept>.md` — durable ideas
- `wiki/sources/<source>.md` — important source writeups
- `wiki/questions/<question>.md` — open investigations
- `derived/briefs/` — synthesis memos

## Paper

A paper, paper cluster, or literature review.

- `wiki/index.md` — paper-set overview
- `wiki/papers/<paper-slug>.md` — individual papers
- `wiki/concepts/<concept>.md` — reusable technical ideas
- `wiki/comparisons/<topic>.md` — cross-paper comparisons
- `wiki/questions/<question>.md` — research gaps

Paper pages cover: problem, method, results, limitations, implementation notes, related papers.

## Domain

Tracking an entire field.

- `wiki/index.md` — high-level map
- `wiki/landscape.md` — actors, concepts, tools, debates
- `wiki/timelines/<topic>.md` — historical development
- `wiki/glossary.md` — terms
- `wiki/questions/<question>.md` — active uncertainties

## Product

Products, tools, APIs, platforms.

- `wiki/index.md` — product summary
- `wiki/features/<feature>.md` — feature pages
- `wiki/use-cases/<use-case>.md` — applied workflows
- `wiki/competitors/<competitor>.md` — alternatives
- `wiki/questions/<question>.md` — evaluation gaps

Distinguish documented behavior, observed behavior, pricing/availability, limitations, integration notes.

## Person

Researcher, founder, writer, public expert.

- `wiki/index.md` — profile + navigation
- `wiki/work/<work-slug>.md` — papers, talks, posts, projects, artifacts
- `wiki/themes/<theme>.md` — recurring ideas
- `wiki/timeline.md` — dated milestones
- `wiki/questions/<question>.md` — unresolved context

Source-grounded language only. No unsupported biographical claims.

## Organization

Labs, companies, communities, institutions.

- `wiki/index.md` — overview
- `wiki/projects/<project>.md` — important initiatives
- `wiki/people/<person>.md` — relevant people
- `wiki/timeline.md` — milestones
- `wiki/strategy.md` — source-grounded strategic analysis

Separate facts from interpretation, especially for strategy.

## Project

Internal build, research initiative, course, content project.

- `wiki/index.md` — status + navigation
- `wiki/decisions/<decision>.md` — important choices
- `wiki/specs/<spec>.md` — requirements
- `wiki/notes/<note>.md` — working notes
- `derived/briefs/` — summaries + handoffs

Project wikis make current state obvious to the next agent.

## Codebase (pro-workflow extension)

Symbol/file-aware KB tied to a repo.

- `wiki/index.md` — module map
- `wiki/modules/<module>.md` — per-module deep dive
- `wiki/symbols/<symbol>.md` — high-traffic types/functions
- `wiki/decisions/<decision>.md` — ADR-style entries
- `wiki/runbooks/<flow>.md` — operational sequences
- `wiki/questions/<question>.md` — open architecture questions

Pages link to file paths; reindex on git pull. Pair with `--scope project` for committable form.

## Incident (pro-workflow extension)

Post-mortem KB.

- `wiki/index.md` — incident roster
- `wiki/timeline/<incident>.md` — minute-by-minute
- `wiki/signals/<signal>.md` — early-warning patterns
- `wiki/fixes/<fix>.md` — applied remedies
- `wiki/questions/<question>.md` — what we still don't know

Pin status (`active | resolved | recurring`). Cross-link to runbooks if a `codebase` wiki exists.
