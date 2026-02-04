# /learn-rule - Extract Correction to Memory

Capture a lesson from this session into permanent memory.

## Process

1. **Identify the lesson**
   - What mistake was made?
   - What should happen instead?

2. **Format the rule**
   ```
   [LEARN] Category: One-line rule
   ```

   Categories:
   - Navigation (file paths, finding code)
   - Editing (code changes, patterns)
   - Testing (test approaches)
   - Git (commits, branches)
   - Quality (lint, types, style)
   - Context (when to clarify)
   - Architecture (design decisions)
   - Performance (optimization)
   - Claude-Code (sessions, modes, CLAUDE.md, skills, subagents, hooks, MCP)
   - Prompting (scope, constraints, acceptance criteria)

3. **Propose addition**
   Show what will be added to LEARNED section.

4. **Wait for approval**
   Only add after user confirms.

## Example

```
Recent mistake: Edited wrong utils.ts file

[LEARN] Navigation: Confirm full path when multiple files share a name.

Add to LEARNED section? (y/n)
```

---

## Claude Code Examples

```
[LEARN] Claude-Code: Use plan mode before multi-file changes.
Docs: https://code.claude.com/docs/common-workflows

[LEARN] Claude-Code: Compact context at task boundaries, not mid-work.
Docs: https://code.claude.com/docs/common-workflows

[LEARN] Prompting: Always include acceptance criteria in prompts.
```

---

**Trigger:** Use when user says "remember this", "add to rules", or after making a mistake.
