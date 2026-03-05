# Daily Habits for AI-Assisted Development

Practical habits organized by frequency. Tested across Claude Code, Cursor, and Codex workflows.

## Every Session

### Start Right
- Run `/doctor` if things feel off
- Check context with `/context` — know your budget
- Name your session with `/rename` for easy `/resume` later
- For returning tasks: `/replay <topic>` to surface past learnings

### During Work
- **Commit early, commit often** — as soon as a logical unit is done
- **Manual `/compact` at 50%** — don't wait for auto-compact at 95% (the "dumb zone")
- **Read before edit** — always understand what's there before changing it
- **Plan mode for multi-file changes** — `Shift+Tab` to toggle
- **Subagents for heavy lifting** — delegate exploration, tests, docs

### Before Ending
- Run `/wrap-up` — audit changes, capture learnings
- Or at minimum: `git status`, check for uncommitted work
- Generate `/handoff` if continuing later

## Every Day

### Update
- Keep Claude Code updated (it auto-updates, but check)
- Read the changelog for new features
- Review your `LEARNED.md` — prune stale rules

### Terminal Setup
- Use a capable terminal: iTerm2, Ghostty, Warp, or Kitty
- Avoid IDE embedded terminals for heavy Claude Code sessions
- tmux for split pane agent teams
- Short alias: `alias c='claude'`

### Monitor Usage
- `/usage` to check plan limits
- `/cost` for API key users
- Watch for fast mode billing (charges extra usage from first token)

## Every Week

### Review Patterns
- Run `/insights` to see correction trends
- Identify hot learnings (corrected often, not learned)
- Prune cold learnings (learned but never applied)

### Optimize CLAUDE.md
- Keep root CLAUDE.md under 150 lines
- Move specialized knowledge to package-level CLAUDE.md files
- Move personal preferences to CLAUDE.local.md (gitignored)

## Debugging Tips

### When Claude Gets Stuck
1. Try a different model — switch to Opus for hard problems
2. Use `ultrathink` in your prompt for maximum reasoning
3. Provide a screenshot (Claude is multimodal)
4. Share browser console logs via MCP
5. Start a fresh session with more targeted context

### When Context Is Degraded
1. Run `/compact` manually
2. Or start a new session with `/resume`
3. Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` for proactive compaction
4. Use subagents to isolate heavy output (test results, logs)

### When You're Blocked
1. `/doctor` for configuration issues
2. Try a different approach — don't brute force
3. Use the `debugger` agent for systematic investigation
4. Check if it's a model limitation vs. a prompt issue
5. Ask Claude to "think step by step about why this isn't working"

## Environment Tips

### Terminal Recommendations

| Terminal | Platform | Why |
|----------|----------|-----|
| iTerm2 | macOS | Split panes, tmux integration |
| Ghostty | macOS/Linux | Fast, GPU-rendered |
| Warp | macOS | AI-native, blocks |
| Kitty | Cross-platform | GPU-rendered, scriptable |
| Windows Terminal | Windows | WSL support |

### Voice Prompting

If you have voice mode access:
- `/voice` to enable
- Hold spacebar → speak → release
- Great for: describing bugs, architecture discussions, code reviews
- Mix with typed input for precise file paths

### Tool Layering

The most productive setup uses multiple tools:

```text
Primary editor (Cursor/VS Code)
  ├── Tab completions for small edits
  ├── Inline chat for quick questions
  └── Claude Code in terminal for:
      ├── Multi-file changes
      ├── Debugging hard issues
      ├── Architecture decisions
      └── CI/CD and git operations
```

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| Skip quality gates to save time | Gates prevent more corrections later |
| Use `dontAsk` permission mode daily | Use `default` with specific allow rules |
| Load 15+ MCP servers | Keep <10 active, disable unused |
| Compact mid-task | Compact at task boundaries |
| Fight the AI on style | Add rules to CLAUDE.md instead |
| Use one huge CLAUDE.md | Split into root + package-level files |
| Ignore the correction pattern | Every correction is a learning opportunity |
