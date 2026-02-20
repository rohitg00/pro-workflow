# /flag - Flag an AI Pattern

Flag an AI-ism and store your preferred alternative. Builds your personal pattern database over time.

## Usage

```
/flag "leverage" -> "use"
/flag "In today's rapidly evolving" -> [cut]
/flag structure: "triple bullets after every heading" -> "vary list lengths"
/flag exception: "robust" reason: "I actually use this word"
```

## Process

1. **Parse the flag**
   - Detect type: word (single word), phrase (multi-word), structure (prefixed with "structure:")
   - Extract the pattern and the alternative
   - If prefixed with "exception:", add to exceptions.json instead

2. **Check existing patterns**
   - Read the appropriate banned_*.json file
   - If pattern exists: increment `flagged_count`, update alternative if different
   - If pattern is new: add with `flagged_count: 1`

3. **Apply severity promotion**
   - 1-2 flags: low
   - 3-5 flags: medium
   - 6+ flags: high

4. **Log the correction**
   - Append to `skills/ai-pattern-killer/feedback/feedback_log.json`
   - Include: pattern, alternative, type, timestamp, context (if available)

5. **Update changelog**
   - Append to `skills/ai-pattern-killer/learning/changelog.json`

6. **Confirm to user**
   ```
   Added: "leverage" -> "use" [word, severity: low, flags: 1]
   Pattern database: 31 words, 25 phrases, 10 structures
   ```

## Bulk Flag

```
/flag import path/to/list.json
```

Expected format:
```json
[
  {"pattern": "leverage", "alternative": "use", "type": "word"},
  {"pattern": "game-changer", "alternative": "[be specific]", "type": "phrase"}
]
```

## Quick Flags (no alternative needed)

```
/flag "leverage"
```
Will use the existing alternative if the word is already in the database, or prompt you for one if it's new.

---

**Trigger:** Use when you spot an AI-ism in any Claude output. The more you flag, the sharper the filter gets.
