# /wrap-up - Session Wrap-Up

End your Claude Code session with intention.

## Execute This Checklist

### 1. Changes Audit
```bash
git status
git diff --stat
```
- What files were modified?
- Any uncommitted changes?
- Any TODOs left in code?

### 2. Quality Check
```bash
npm run lint 2>&1 | head -20
npm run typecheck 2>&1 | head -20
npm test -- --changed --passWithNoTests
```
- All checks passing?
- Any warnings to address?

### 3. Learning Capture
- What mistakes were made this session?
- What patterns worked well?
- Any corrections to add to LEARNED?

Format: `[LEARN] Category: Rule`

### 4. Next Session Context
- What's the next logical task?
- Any blockers to note?
- Context to preserve for next time?

### 5. Summary
Write one paragraph:
- What was accomplished
- Current state
- What's next

---

**After completing checklist, ask:** "Ready to end session?"
