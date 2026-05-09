---
name: survey-generator
description: Compile a structured literature survey on any AI/ML topic. Agent curates a research bundle (taxonomy + sections + bibliography of real papers) from a public anchor resource, then a chosen LLM generates the survey artifact. Output target is a wiki page (markdown), not a one-off HTML — survey lands in `<wiki>/derived/surveys/<slug>.md` with full bibliography rows in `sources.md`. Provider-agnostic (Anthropic/OpenAI/OpenRouter/Fireworks/custom OpenAI-compat). Use when the user asks for a "survey", "literature review", "lit review", or "deep dive" on a technical topic.
allowed-tools: Read, Write, Bash, WebFetch, AskUserQuestion
---

# Survey Generator

Provider-agnostic literature-survey artifact generator. Output flows into a pro-workflow wiki, not a standalone HTML file — survives sessions and indexes for FTS5 retrieval.

## Diff vs dair-academy version

| dair | pro-workflow |
|------|--------------|
| Hardcoded Kimi K2.6 on Fireworks | Provider-agnostic (Anthropic/OpenAI/OpenRouter/Fireworks/custom) |
| Output = single-file HTML with inline SVG | Output = wiki markdown page + bibliography rows in `sources.md` |
| One-off artifact, no follow-up | Persists in FTS5 index; reused by `wiki-research-loop` |
| Manual run only | Composable with `/wiki research` for auto-bibliography expansion |

## When to use

- "Survey on <topic>" / "lit review on <topic>"
- Onboarding a new domain — generate the map-of-the-field
- After a wiki has 10-30 sources, compile a synthesis page over them
- Pre-step before `/wiki research` runs: gives the loop a high-quality seed bundle

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `topic` | yes | "Reasoning Models", "Agentic Engineering" |
| `source_url` | yes | Public anchor: arXiv survey, GitHub awesome-list, canonical blog post |
| `--wiki <slug>` | yes | Target wiki for the artifact |
| `--bibliography-size N` | no | Default 20. 40-50 comprehensive, 80-100 exhaustive |
| `--section-count N` | no | Default 6-10 numbered sections |
| `--provider name` | no | Override provider (default: first env var found) |
| `--model id` | no | Override model |

## Workflow (the agent runs these in order)

### Step 1 — Read the anchor

`WebFetch source_url`. Extract subtopics + cited papers. For GitHub awesome-lists, walk README + linked papers files. For arXiv survey PDFs, use abstract + ToC.

### Step 2 — Build research_bundle.json

Use `templates/research_bundle.template.json` as scaffold. Required keys:

```json
{
  "topic": "...",
  "anchor_source": "...",
  "abstract_hints": ["..."],
  "taxonomy": [{"branch": "...", "children": [{"name": "...", "description": "..."}]}],
  "sections": [{"title": "...", "guidance": "...", "papers": ["key1","key2"]}],
  "bibliography": [{"key": "author-year-shortname", "authors": "...", "year": 2024, "title": "...", "venue": "...", "summary": "..."}]
}
```

**Hard rules:**
- Every paper in `bibliography` must be real. No invented entries.
- Every `key` referenced in `sections[].papers` must exist in `bibliography`.
- 4-8 taxonomy branches, 2-4 children each.
- 6-10 numbered sections covering: introduction → foundations → methods → evaluation → open problems.

### Step 3 — Run the generator

```bash
node $SKILL_ROOT/scripts/build-survey.js \
  --bundle <path-to-research_bundle.json> \
  --wiki <slug> \
  [--provider anthropic|openai|openrouter|fireworks|custom] \
  [--model <id>]
```

Generator:
1. Reads bundle.
2. Sends to LLM with strict markdown spec (numbered sections, inline `[^paper-key]` citations, no HTML).
3. Writes output to `<wiki>/derived/surveys/<topic-slug>.md`.
4. Appends bibliography rows to `<wiki>/sources.md` (deduped by key).
5. Calls `wiki-cli.js page` to upsert into FTS5 index.

### Step 4 — Iterate

If prose is thin: tighten `sections[].guidance` and rerun. Output filename versions automatically (`<slug>-v2.md`, `<slug>-v3.md`).

To compare providers:

```bash
node build-survey.js --bundle bundle.json --wiki agent-memory --provider openai --model gpt-4o
node build-survey.js --bundle bundle.json --wiki agent-memory --provider anthropic --model claude-opus-4-7
```

Each writes a separate versioned file; diff them.

## Output structure

```text
<wiki-root>/
├── sources.md                                 # bibliography rows appended (deduped)
└── derived/surveys/
    └── <topic-slug>-v1.md                     # the survey
        # title (h1)
        # ## 1. Introduction
        # ## 2. Foundations
        # ...
        # ## References
        # [^src-bib-<slug>] author year. title. venue.
```

## Hard rules

1. Never invent bibliography entries — every paper must be a real work with venue.
2. Every section's `papers` array references keys in `bibliography`.
3. Output is markdown ONLY. No HTML, no inline SVG, no JS.
4. Bibliography rows in `sources.md` use the slug-style id `src-bib-<slug>` (derived from the bibliography `key`); cite as `[^src-bib-<slug>]`. Manual non-bibliography sources continue to use `src-NNN`.
5. Iterate on inputs (`research_bundle.json`), not on the generated output.
6. Provider+model selection is the user's call — never hardcode.

## Composing with research loop

```bash
/wiki init reasoning-models --title "Reasoning Models" --flavor research
# Manually compile a research_bundle.json
node skills/survey-generator/scripts/build-survey.js --bundle bundle.json --wiki reasoning-models
# Now the wiki has a structured survey + 50 bibliography rows
# Enable auto-research to expand:
# (edit reasoning-models/wiki.config.md, set auto_research.enabled: true)
node skills/wiki-research-loop/scripts/research-loop.js seed reasoning-models "chain-of-thought failure modes" --depth 0
node skills/wiki-research-loop/scripts/research-loop.js run reasoning-models
```
