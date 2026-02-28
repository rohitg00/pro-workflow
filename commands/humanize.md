# /humanize - Run 3-Agent AI Pattern Killer Pipeline

Spawns 3 sub-agents to detect, rewrite, and score your draft. Uses your personal pattern database built from `/flag` corrections.

## Usage

```
/humanize [paste or reference your draft]
/humanize file:path/to/draft.md
/humanize clipboard
```

## The Pipeline

### Agent 1: Detector (Sonnet - fast scan)
- Loads your full pattern database (banned words, phrases, structures)
- Loads exceptions (patterns you approved to keep)
- Reads sensitivity level from config.yaml
- Scans every line of the draft
- Outputs a detection report with line-by-line flags

### Agent 2: Rewriter (Opus - quality rewrites)
- Loads rewriting strategies and before/after examples
- Loads your writing samples for voice matching
- Takes the detection report from Agent 1
- Rewrites every flagged section in your voice
- Outputs the clean draft with change markers

### Agent 3: Scorer (Haiku - fast scoring)
- Scores each sentence 1-10 on humanization scale
- Checks the rewritten draft against the full pattern database
- Flags anything below threshold (default: 7) for re-pass
- If re-pass needed: Agent 2 runs again on failed sentences only
- Outputs final scorecard

## Process

1. **Read the draft** (from argument, file, or clipboard)

2. **Spawn Agent 1 (Detector)**
   Use Task tool with subagent_type "general-purpose":
   - Provide the full draft text
   - Point to all pattern files in `skills/ai-pattern-killer/patterns/`
   - Request detection report in table format

3. **Spawn Agent 2 (Rewriter)**
   Use Task tool with subagent_type "general-purpose":
   - Provide the draft + Agent 1's detection report
   - Point to `skills/ai-pattern-killer/rewriting/strategies.md` and `examples.json`
   - Request rewritten draft with change log

4. **Spawn Agent 3 (Scorer)**
   Use Task tool with subagent_type "general-purpose":
   - Provide Agent 2's rewritten draft
   - Point to all pattern files + config.yaml for threshold
   - Request per-sentence scorecard

5. **Check verdict**
   - If PASS: present final draft to user
   - If NEEDS RE-PASS: run Agent 2 again on failed sentences, then re-score
   - Max 2 re-passes (configurable in config.yaml)

6. **Learn from the run**
   - New patterns discovered by Agent 1 that weren't in DB -> suggest adding
   - Agent 2's rewrites -> add to examples.json as new before/after pairs
   - Agent 3's low scores -> patterns that need better detection rules

7. **Present results**
   ```
   ## Humanized Draft

   [Clean draft text]

   ---
   Score: 8.4/10 (was 4.2/10)
   Changes: 12 words, 3 phrases, 1 structure
   New patterns found: 2 (add to DB? y/n)
   ```

## Options

- `--strict` / `--balanced` / `--relaxed` - Override sensitivity level
- `--no-learn` - Don't update pattern DB from this run
- `--dry-run` - Show detection report only, don't rewrite
- `--score-only` - Score existing text without rewriting

---

**Trigger:** Use after writing any content with Claude that will be published (blog posts, tweets, docs, READMEs).
