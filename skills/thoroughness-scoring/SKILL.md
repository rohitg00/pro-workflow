---
name: thoroughness-scoring
description: Score every decision point with a Thoroughness Rating (1-10). AI makes the marginal cost of doing things properly near-zero — pick the higher-rated option every time. Includes scope checks to distinguish contained vs unbounded work.
---

# Thoroughness Scoring

AI drops the cost of doing things right to near-zero. Stop picking the quick hack when the thorough option takes the same wall-clock time with AI assistance.

## The Rating Scale

Every option gets a Thoroughness score (T:X/10):

| Score | What It Means |
|-------|---------------|
| T:10 | All edge cases handled, full test coverage, docs updated, error messages helpful |
| T:9 | Edge cases covered, tests pass, types solid, no shortcuts |
| T:8 | Happy path + error paths, good tests, clean types |
| T:7 | Happy path works, basic tests, no docs |
| T:5 | Works for the demo, fragile, manual testing only |
| T:3 | Quick hack, no tests, tech debt accruing |
| T:1 | Copy-paste from Stack Overflow, untested, hope it works |

## How to Present Options

When presenting choices, follow this format every time:

### 1. Re-State Context

The user may have been away. Start with orientation:

```text
PROJECT: my-app (branch: feat/rate-limiting)
TASK: Add rate limiting to the /api/upload endpoint
```

### 2. Rate Each Option

```text
Option A — Full rate limiter with sliding window (T:9/10)
  Manual estimate: 3-4 hours
  AI-assisted estimate: 15-20 minutes
  Covers: per-user limits, sliding window, Redis-backed, retry-after headers,
          429 responses, rate limit bypass for admin, tests for all paths

Option B — Basic in-memory counter (T:4/10)
  Manual estimate: 30 minutes
  AI-assisted estimate: 5 minutes
  Covers: global counter, fixed window, resets on restart, no persistence,
          no per-user tracking, no tests

Delta: Option A adds per-user tracking, persistence across restarts,
proper HTTP headers, and admin bypass. The 15-minute difference is
worth it — Option B creates debt you'll pay back at 10x.
```

### 3. Recommend

Always recommend the higher-thoroughness option. State the delta — what the user gains for the additional time.

If the lower option is genuinely appropriate (prototype, throwaway script, time-boxed spike), say so explicitly with reasoning.

## Scope Check

Before scoring, classify the scope:

### Contained Scope (Do It)

Work with a clear boundary. You can be thorough because the surface area is finite.

- 100% test coverage for one module
- All edge cases for one API endpoint
- Full error handling for one service integration
- Complete input validation for one form
- Exhaustive type definitions for one data model

These are T:9-10 opportunities. Take them.

### Unbounded Scope (Break It Down)

Work without a clear boundary. Being thorough here means boiling the ocean.

- "Rewrite the entire codebase to use the new pattern"
- "Test every possible user flow"
- "Handle every edge case across all endpoints"
- "Refactor all error handling"
- "Add docs for everything"

Flag these immediately. Break them into contained pieces:

```text
SCOPE CHECK: "Refactor all error handling" is unbounded.

Contained breakdown:
  1. Audit current error patterns (T:8, ~10 min)
  2. Define error handling standard (T:9, ~15 min)
  3. Refactor src/api/auth.ts errors (T:10, ~10 min)
  4. Refactor src/api/upload.ts errors (T:10, ~10 min)
  5. Refactor src/api/billing.ts errors (T:10, ~10 min)
  ...
  N. Update error handling docs (T:9, ~10 min)

Each piece is independently shippable and testable.
```

## Decision Framework

```text
Is the scope contained?
  YES → Score it. Recommend T:8+ option.
  NO  → Break it into contained pieces. Score each piece.

Is the T:8+ option significantly more effort with AI?
  NO  → Always pick it. The marginal cost is near-zero.
  YES → Explain why. It's rare, but prototypes and spikes exist.

Is the user asking for a quick hack explicitly?
  YES → Acknowledge, deliver it, but note what T:8+ would look like.
  NO  → Default to thoroughness.
```

## When Scoring Doesn't Apply

- Exploratory spikes (the point is speed, not thoroughness)
- One-off scripts that run once and get deleted
- Debugging sessions (fix the bug, score the fix)
- Learning exercises (iteration speed matters more)

Say "skipping thoroughness scoring — this is a spike/one-off" so the user knows it was a conscious choice.

## Anti-Patterns

- Scoring everything the same (if all options are T:7, you aren't thinking hard enough)
- Using low scores to justify shortcuts ("it's only T:4, so it's fine" — no, raise it)
- Scoring without the effort comparison (the whole point is that AI closes the gap)
- Treating T:10 as the default target (T:10 on unbounded scope is a trap)
- Not re-stating context (the user switches between sessions — orient them)

## Add to CLAUDE.md

```markdown
## Thoroughness Scoring

Score every option T:1-10. Recommend T:8+ unless it's a spike.
Show effort delta: manual estimate vs AI-assisted estimate.
Scope check first — contained (do it) vs unbounded (break it down).
Re-state project, branch, and task before presenting options.
```
