# Learning Engine

How ai-pattern-killer updates itself from your feedback.

## Auto-Update Triggers

### After `/flag`
1. Add pattern to appropriate banned_*.json
2. Increment flagged_count if pattern exists
3. Check severity promotion thresholds
4. Log to feedback_log.json
5. Append to changelog.json

### After `/humanize`
1. Agent 1 (Detector) findings -> new patterns discovered in the wild
2. Agent 2 (Rewriter) corrections -> new before/after examples
3. Agent 3 (Scorer) low scores -> patterns that slipped through detection
4. All three agents' outputs are cross-referenced (see rules below)

### Cross-Reference Rules

**Detector miss:** The Detector did not flag a span in the original text, but the Scorer (which re-checks the rewritten text against the full pattern DB per agents/scorer.md) assigns a score < `min_pass_score` (default 7) or identifies a banned pattern still present in the rewritten text. Action: add the missed pattern to the appropriate banned_*.json with `severity: "low"` and `flagged_count: 1`.

**Rewriter low score:** The Scorer assigns a sentence score < `min_pass_score` (default 7) to a rewritten sentence. This means Agent 2's rewrite didn't fix the issue. Action: flag the sentence for re-pass by Agent 2, and mark the rewriting strategy used for that sentence as "needs review" in the changelog.

**Three-agent agreement (exception candidate):** All three conditions are met:
1. Detector did NOT flag the original span (no pattern match found)
2. Rewriter left the sentence text unchanged (no edit applied)
3. Scorer gave the sentence a high pass score (9-10)

Action: record the sentence as a candidate for the exceptions list. Present to user: `"Consider adding to exceptions: '{text}' — all 3 agents agree it's fine"`. Only add to exceptions.json after user approval.

## Scorer Calibration

Agent 3 uses this rubric:

| Score | Meaning |
|-------|---------|
| 9-10 | Sounds completely human. Could be from a blog post. |
| 7-8 | Good. Minor AI hints but nothing distracting. |
| 5-6 | Okay. AI patterns present but content is solid. |
| 3-4 | Bad. Multiple AI tells. Needs full rewrite. |
| 1-2 | Pure AI slop. Nuke from orbit. |

Calibration improves as user_samples grow in `rewriting/examples.json`.

## Pattern Evolution

Patterns aren't static. They evolve:
- New AI models introduce new patterns (track model version in feedback_log)
- Patterns that stop appearing get demoted in severity over time
- User's own style evolves, so exceptions may change

## Data Retention

- feedback_log.json: keep last 500 corrections (FIFO)
- changelog.json: keep indefinitely (audit trail)
- examples.json: keep all (training data)

### Feedback Log Pruning Spec

The `pruneFeedbackLog(maxEntries=500)` routine enforces the FIFO limit:

1. Called by `writeFeedbackEntry(entry)` after appending the new entry
2. Load feedback_log.json via `loadFeedbackLog()`
3. If `corrections.length > maxEntries`, trim from the front: `corrections = corrections.slice(-maxEntries)`
4. Write atomically: write to `feedback_log.tmp.json`, then rename to `feedback_log.json`
5. Single-writer guarantee: only one `/flag` or `/humanize` session writes at a time (skill commands are sequential in Claude Code)
6. changelog.json and examples.json are never touched by this routine

**Test cases:**
- After 501st write, file contains exactly 500 entries and the oldest is gone
- Atomic write: if process crashes mid-write, `feedback_log.json` is intact (temp file may exist)
- changelog.json and examples.json are unmodified after pruning
