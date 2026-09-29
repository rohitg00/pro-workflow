---
description: Analyze session history, captured learnings, and correction patterns.
---

# /insights - Session & Learning Analytics

Surface patterns from your pro-workflow learnings and session history.

## Usage

```
/insights
/insights session
/insights learnings
/insights corrections
/insights heatmap
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

### Correction Heatmap

Show which files and patterns get corrected most across all sessions:
```
Correction Heatmap

By category (all time):
  ████████████ Testing      34 corrections
  ████████     Navigation   22 corrections
  ██████       Git          18 corrections
  ████         Quality      12 corrections
  ███          Editing       9 corrections
  ██           Architecture  6 corrections

By project:
  my-api         corrections_rate: 23%  (high — review patterns)
  my-frontend    corrections_rate: 8%   (healthy)
  my-cli         corrections_rate: 4%   (excellent)

Adaptive quality gates:
  Current threshold: 5 edits (tighter — 18% correction rate)
  If rate drops below 15%: gates relax to 8 edits
  If rate drops below 5%: gates relax to 10 edits

Hot learnings (most corrected, least learned):
  - [Testing] Mock external dependencies — corrected 8x, learned 0x
    → Consider: /learn-rule to capture this permanently
  - [Navigation] Check file exists before editing — corrected 5x, learned 1x
    → Pattern keeps recurring despite learning

Cold learnings (learned but never applied):
  - [Editing] Use named exports — learned 45 days ago, applied 0x
    → Consider removing if no longer relevant
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

## How to Query

Run these SQLite queries against `~/.pro-workflow/data.db`:

**Heatmap by category:**
```sql
SELECT category, COUNT(*) as count
FROM learnings
WHERE mistake IS NOT NULL
GROUP BY category
ORDER BY count DESC
```

**Correction rate by project:**
```sql
SELECT project,
  SUM(corrections_count) as total_corrections,
  SUM(edit_count) as total_edits,
  ROUND(CAST(SUM(corrections_count) AS FLOAT) / NULLIF(SUM(edit_count), 0) * 100, 1) as rate
FROM sessions
WHERE project IS NOT NULL
GROUP BY project
ORDER BY rate DESC
```

**Hot learnings (most corrected patterns):**
```sql
SELECT category, rule, times_applied,
  (SELECT COUNT(*) FROM sessions WHERE corrections_count > 0) as correction_sessions
FROM learnings
WHERE mistake IS NOT NULL
ORDER BY times_applied ASC, created_at ASC
LIMIT 10
```

## Options

- **session**: Current session stats only
- **learnings**: Learning database analytics
- **corrections**: Correction pattern analysis
- **heatmap**: Correction heatmap across categories, projects, and files
- **all**: Full report including heatmap (default)
- **--export**: Output as markdown file

## Related Commands

- `/list` - Browse all learnings
- `/search <query>` - Find specific learnings
- `/learn-rule` - Capture a new learning
- `/replay` - Surface learnings for current task
- `/wrap-up` - End-of-session with learning capture

---

**Trigger:** Use when user asks "show stats", "how am I doing", "what patterns", "analytics", "insights", "heatmap", "correction rate", or wants to understand their learning trajectory.
