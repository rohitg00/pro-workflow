---
name: improve-architecture
description: Audit an area of the codebase and propose the smallest structural moves that improve it - untangle boundaries, kill duplication, fix seams, break cycles. Produces a prioritized plan and decision records, not a rewrite. Use when a codebase feels tangled, hard to change, or is becoming a ball of mud, or when asked to improve or refactor architecture.
user-invocable: true
---

# improve-architecture

Invest in the shape of the system a little at a time rather than paying for a
rewrite later. This skill diagnoses and proposes; it does not rewrite on its own.

## Method

1. **Map first.** Get the current shape before judging it - entry points,
   modules, data flow, who calls whom. Reuse `module-map` for the one-screen
   view; do not skip to opinions.
2. **Find the strain.** Look for the load-bearing problems, not style nits:
   - God modules that everything imports and nothing can change safely.
   - Leaky boundaries - a module reaching into another's internals instead of
     its surface.
   - Duplicated logic that drifts (the same rule implemented three ways).
   - Wrong seams - the code is split where it does not bend and fused where it
     does.
   - Cyclic dependencies.
   - A shape that fights the domain (see `domain-modeling` - boundaries in code
     should track boundaries in the language).
3. **Propose the smallest move.** For each problem, the least change that
   relieves it: extract a boundary, collapse a duplicate, invert a dependency,
   move a seam. Prefer a sequence of safe steps over one big cut.
4. **Rank by leverage.** Order the moves by pain relieved over effort. Say which
   are safe now and which need a test net first (pair with `tdd`).
5. **Record the big calls.** For a structural change a future reader would
   question, write a decision record in `docs/decisions/NNNN-slug.md`: context,
   choice, alternatives rejected, why.

## Guardrails

- Diagnose, do not rewrite. The deliverable is a plan the user approves before
  any code moves.
- No churn for taste. A move must relieve a named strain; "cleaner" is not a
  reason.
- Three similar lines beat a premature abstraction - do not trade duplication
  for indirection unless the duplication actually drifts.
- Keep behavior fixed. Structural moves are refactors; land them behind green
  tests.

## Output

A prioritized list: each item is the problem, the smallest move, the risk, and
whether it needs a test net first. Plus decision records for the big moves. No
code changes until the user picks what to do.
