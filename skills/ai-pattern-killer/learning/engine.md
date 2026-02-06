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
4. All three agents' outputs are cross-referenced:
   - If detector missed something scorer caught -> add to pattern DB
   - If rewriter's fix scored low -> flag the rewriting strategy for review
   - If all 3 agree something is fine -> consider adding to exceptions

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
