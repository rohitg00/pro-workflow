# Feedback Processing

How your corrections become rules.

## The Pipeline

1. User runs `/flag "leverage" -> "use"`
2. System checks if "leverage" exists in banned_words.json
   - If yes: increment `flagged_count`, update alternative if different
   - If no: add new entry with `severity: "low"`, `flagged_count: 1`
3. Check severity promotion thresholds
   - 1-2 flags: low
   - 3-5 flags: medium
   - 6+ flags: high
4. Log the correction to feedback_log.json with timestamp
5. If the flag is a phrase (contains spaces), add to banned_phrases.json
6. If the flag describes a structure, add to banned_structures.json

## Pattern Type Detection

The `/flag` command auto-detects pattern type:
- Single word -> banned_words.json
- Multi-word phrase -> banned_phrases.json
- Structural description (starts with "structure:") -> banned_structures.json

## Exception Handling

If user flags something previously excepted:
1. Show the exception reason
2. Ask: keep exception or remove it?
3. Update accordingly

## Bulk Import

Users can seed patterns from external sources:
```
/flag import path/to/patterns.json
```
Format: array of `{"pattern": "...", "alternative": "...", "type": "word|phrase|structure"}`
