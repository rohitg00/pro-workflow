# /insights - Session & Learning Analytics

Surface patterns from your pro-workflow learnings and session history.

## Usage

```
/insights
/insights session
/insights learnings
/insights corrections
```

## What It Shows

### Session Summary

Current session stats:
```
Session Insights
  Duration: 47 min
  Edits: 23 files modified
  Corrections: 2 self-corrections applied
  Learnings: 3 new patterns captured
  Context: 62% used (safe)
```

### Learning Analytics

Query the learnings database for patterns:
```
Learning Insights (42 total)

Top categories:
  Testing     12 learnings (29%)
  Navigation   8 learnings (19%)
  Git          7 learnings (17%)
  Quality      6 learnings (14%)
  Editing      5 learnings (12%)
  Other        4 learnings (10%)

Most applied:
  #12 [Testing] Run tests before commit — 15 times
  #8  [Navigation] Confirm path for common names — 11 times
  #23 [Git] Use feature branches always — 9 times

Recent learnings (last 7 days):
  #42 [Claude-Code] Compact at task boundaries
  #41 [Prompting] Include acceptance criteria
  #40 [Architecture] Plan before multi-file edits

Stale learnings (never applied):
  #15 [Editing] Prefer named exports — 0 times (45 days old)
  #19 [Context] Ask before large refactors — 0 times (30 days old)
```

### Correction Patterns

Show what types of mistakes are recurring:
```
Correction Patterns

Most corrected areas:
  File navigation    5 corrections
  Test coverage      3 corrections
  Commit messages    2 corrections

Trend: Navigation errors decreasing (5 → 2 per week)
Trend: Testing corrections stable (1 per week)

Suggestions:
  - Add path confirmation rule to CLAUDE.md (3+ corrections)
  - Consider /learn-rule for test patterns
```

### Productivity Metrics

```
Productivity (last 10 sessions)

  Avg session: 35 min
  Avg edits/session: 18
  Correction rate: 12% (improving)
  Learning capture: 2.1 per session

  Best session: 2026-02-01 (28 edits, 0 corrections)
  Most productive hour: 10-11am
```

## Options

- **session**: Current session stats only
- **learnings**: Learning database analytics
- **corrections**: Correction pattern analysis
- **all**: Full report (default)
- **--export**: Output as markdown file

## How It Works

1. Reads learnings from `~/.pro-workflow/data.db`
2. Reads session history from the sessions table
3. Aggregates categories, application counts, and trends
4. Identifies stale learnings that may need cleanup
5. Surfaces correction patterns to suggest new rules

## Related Commands

- `/list` - Browse all learnings
- `/search <query>` - Find specific learnings
- `/learn-rule` - Capture a new learning
- `/wrap-up` - End-of-session with learning capture

---

**Trigger:** Use when user asks "show stats", "how am I doing", "what patterns", "analytics", "insights", or wants to understand their learning trajectory.
