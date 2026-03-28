# /context-optimizer - Optimize Token Usage

Diagnose and fix context window problems.

## Process

1. **Check current usage:**
   - If > 70% → compact now before quality degrades
   - If > 90% → compact immediately, you're in the "dumb zone"

2. **Run optimization checks:**

   **MCP audit:**
   ```bash
   /mcp
   ```
   - Keep <10 MCPs enabled, <80 tools total
   - Disable what you're not actively using

   **CLAUDE.md size:**
   - Root CLAUDE.md should be < 60 lines, < 150 max
   - Move package-specific info to package-level files
   - Move personal preferences to CLAUDE.local.md

3. **Apply fixes based on findings:**

   | Problem | Fix |
   |---------|-----|
   | High context usage | `/compact` with focus on current task |
   | Too many MCPs | Disable unused servers |
   | Bloated CLAUDE.md | Split into modular files |
   | Heavy exploration in main session | Delegate to subagents |
   | Vague prompts causing broad searches | Scope prompts with paths and constraints |

4. **Set proactive auto-compaction** if not already configured:
   ```json
   {
     "env": {
       "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
     }
   }
   ```

5. **Report** current state and what was optimized.

## Signs of Degraded Context

- Claude repeats itself or forgets earlier decisions
- Responses become generic, lose project-specific knowledge
- Tool calls fail for reasons that worked earlier

## Quick Fixes

| Action | Saves | When |
|--------|-------|------|
| `/compact` | 30-50% context | Task boundaries |
| Disable unused MCPs | ~5% per MCP | Switching domains |
| Subagent delegation | Keeps main clean | Heavy search/read tasks |
| Fresh session via `/resume` | 100% reset | Unrelated work |

---

**Trigger:** Use when sessions feel slow, context is degraded, running out of budget, or before starting a long task.
