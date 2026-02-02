# /learn - Save Learning to Database

Capture a lesson from this session into the persistent SQLite database.

## Process

1. **Identify the learning**
   - What mistake was made?
   - What should happen instead?
   - What category does this fall under?

2. **Categories**
   - Navigation (file paths, finding code)
   - Editing (code changes, patterns)
   - Testing (test approaches)
   - Git (commits, branches)
   - Quality (lint, types, style)
   - Context (when to clarify)
   - Architecture (design decisions)
   - Performance (optimization)

3. **Save to database**
   Use this format to save:
   ```
   Category: <category>
   Rule: <one-line description of the correct behavior>
   Mistake: <what went wrong>
   Correction: <how it was fixed>
   ```

4. **Confirm storage**
   Show the learning ID and confirm it was saved.

## Example

```
Recent mistake: Edited wrong utils.ts file when there were multiple

Category: Navigation
Rule: Confirm full path when multiple files share a name
Mistake: Edited src/utils.ts instead of lib/utils.ts
Correction: User pointed out the file was in lib/, not src/

Saved as learning #42. Use /search utils to find this later.
```

## Database Location

Learnings are stored in `~/.pro-workflow/data.db` and persist across sessions.

Use `/search <keyword>` to find past learnings.
Use `/list` to see all learnings.

---

**Trigger:** Use when user says "remember this", "add to rules", "learn this", or after making a mistake that should be captured.
