---
description: Build a feature using Research > Plan > Implement phases
argument-hint: <feature description>
---

# /develop - Multi-Phase Feature Development

Build features through structured phases with validation gates.

## Feature: $ARGUMENTS

### Phase 1: Research

Explore the codebase to understand the scope:

1. Find all relevant files and existing patterns
2. Check dependencies and constraints
3. Score confidence across 5 dimensions (0-100)

**Scoring:**
- Scope clarity (0-20): Know exactly what files change?
- Pattern familiarity (0-20): Similar patterns exist?
- Dependency awareness (0-20): Know what depends on changed code?
- Edge cases (0-20): Can identify the edge cases?
- Test strategy (0-20): Know how to verify?

**Decision:**
- Score >= 70 → Present research findings and move to Phase 2
- Score < 70 → Identify gaps, gather more context, re-score

### Phase 2: Plan

Present a plan for approval:

```text
PLAN: [Feature Name]

Goal: [one sentence]

Files to modify:
1. path/file.ts - [what changes]

New files:
1. path/new.ts - [purpose]

Approach:
1. [step with rationale]

Risks:
- [potential issue and mitigation]

Test strategy:
- [how to verify]
```

**Wait for "proceed" or "approved" before continuing.**

### Phase 3: Implement

Execute the approved plan:

1. Make changes in plan order
2. Run tests after each file change
3. Pause for review every 5 edits
4. Run full quality gates at the end (lint, typecheck, test)

### Phase 4: Review & Commit

Self-review with verification — every finding must be confirmed by reading the code.

1. **Read every changed file** — re-read each modified file in full
2. **Verify, don't assume** — for each potential issue, quote the exact line. If you can't quote it, drop the finding.
3. **Grep for problems** — run `grep` for console.log, TODO, hardcoded secrets, debug statements. Report only what grep finds.
4. **Never report unverified findings** — don't say "ensure X" or "consider Y". Either it's a confirmed problem with a file:line citation, or it's not worth reporting.
5. Present verified summary for final approval
6. Commit with conventional message

### Learning Capture

After completing, ask:
- What corrections were made during implementation?
- Any patterns worth adding to LEARNED?
- Format: `[LEARN] Category: Rule`
