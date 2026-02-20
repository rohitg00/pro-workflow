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

### Bulk Import Security Spec

The `handle_flag_import(path)` handler must enforce these checks in order:

1. **Path validation**: resolve with `path.resolve()` and verify the resolved path starts with the project root or `~/.claude/`. Reject paths outside these directories.
2. **File size limit**: check file size before reading. Reject files > 1MB with `"Import file exceeds 1MB limit"`.
3. **JSON parsing**: parse as JSON. On failure, reject with `"Invalid JSON: {parse_error}"`.
4. **Schema validation**: the file must be a JSON array. Each element must have:
   - `"pattern"` (string, required): max 200 characters, no shell metacharacters (`;`, `|`, `$`, `` ` ``)
   - `"alternative"` (string, optional): max 200 characters
   - `"type"` (string, required): must be one of `"word"`, `"phrase"`, `"structure"`
   - No additional properties allowed
5. **Regex safety**: if any pattern contains regex syntax (for phrase type), validate it compiles without catastrophic backtracking. Use a safe-regex check or compile with a timeout.
6. **On any check failure**: reject the entire import with a clear error. Do not partially import.
7. **On success**: add each entry to the appropriate banned_*.json file, set `flagged_count: 1` and `severity: "low"`, log to feedback_log.json, and report `"Imported {N} patterns ({W} words, {P} phrases, {S} structures)"`.
