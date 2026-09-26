---
name: token-efficiency
description: Reduce token waste by 40-60% through anti-sycophancy rules, one-pass coding, task profiles, and read-before-write enforcement. Inspired by drona23/claude-token-efficient.
---

# Token Efficiency

Reduce output token waste and prevent iteration cycles that consume context.

## Trigger

Use when:
- Sessions feel expensive or slow
- Output is verbose with filler text
- Claude is re-reading files or iterating unnecessarily
- Setting up a new project for token-efficient work

## Anti-Sycophancy

Lead with the answer or the action. Skip preamble, restating the prompt, unsolicited follow-up suggestions, and sign-offs - they cost tokens and give the reader nothing.

## One-Pass Coding Discipline

For simple-to-medium tasks, read the relevant files and tests first, then write the complete solution rather than building it up incrementally. Once the tests pass and the request is met, stop - polishing working code is out of scope unless the user asks. If the same fix fails twice, step back and rethink the approach instead of retrying variations.

## Task Profiles

Switch profiles based on what you're doing:

### Coding Profile
- Return code first, explanation after (only if non-obvious)
- Simplest working solution, no over-engineering
- Read file before modifying — always
- No docstrings on unchanged code
- No error handling for impossible scenarios
- State bug, show fix, stop

### Agent/Pipeline Profile
- Structured output only: JSON, bullets, tables
- No prose unless targeting a human reader
- Every output must be parseable without post-processing
- Never invent file paths, API endpoints, or function names
- If unknown: return null or "UNKNOWN", never guess

### Analysis Profile
- Lead with finding, context and methodology after
- Tables and bullets over prose
- Numbers must include units
- Never fabricate data points
- Summary first, caveats last

## Read-Before-Write Enforcement

Hard rules:
1. **Never write a file you haven't read** in this session
2. **Never re-read a file** already read unless it was modified
3. **Read tests before coding** — understand what passes before writing
4. **Read error output carefully** before attempting a fix

## ASCII-Only Output

Use ASCII characters only in all output:
- `--` not `—` (em dash)
- `"` not `"` `"` (smart quotes)
- `'` not `'` `'` (curly apostrophes)
- No emoji unless explicitly requested
- No Unicode decorators or special characters

This ensures clean copy-paste for code and compatibility with downstream systems.

## Measuring Impact

Track these metrics to measure token savings:
- **Output length**: average words per response (target: 30-50% reduction)
- **Re-read count**: should be near zero
- **Write-without-read count**: should be zero
- **Iteration cycles**: tests should pass in 1-2 attempts, not 5+

## Attribution

Token efficiency patterns adapted from [drona23/claude-token-efficient](https://github.com/drona23/claude-token-efficient) (MIT).
