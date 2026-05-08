---
name: token-efficiency
description: Reduce token waste by 40-60% through anti-sycophancy rules, tool-call budgets, one-pass coding, task profiles, and read-before-write enforcement. Inspired by drona23/claude-token-efficient.
---

# Token Efficiency

Reduce output token waste and prevent iteration cycles that consume context.

## Trigger

Use when:
- Sessions feel expensive or slow
- Output is verbose with filler text
- Claude is re-reading files or iterating unnecessarily
- Setting up a new project for token-efficient work

## Anti-Sycophancy Rules

These patterns waste 30-60% of output tokens:

| Pattern | Example | Fix |
|---------|---------|-----|
| Sycophantic opener | "Sure! Great question!" | Delete. Lead with answer. |
| Prompt restatement | "You're asking about X..." | Delete. Answer directly. |
| Closing fluff | "Let me know if you need anything!" | Delete. Stop after the answer. |
| Unsolicited suggestions | "You might also want to..." | Delete unless asked. |
| AI disclaimers | "As an AI model..." | Delete entirely. |
| Verbose preambles | "I'll help you with that..." | Delete. Start with the action. |

## Tool-Call Budgets

Set explicit budgets by task complexity:

| Task Type | Tool-Call Budget | Wrap-Up At |
|-----------|-----------------|------------|
| Quick fix / lookup | 20 calls | 15 |
| Bug fix | 30 calls | 25 |
| Feature (small) | 50 calls | 40 |
| Feature (large) | 80 calls | 65 |
| Refactor | 50 calls | 40 |
| Exploration / research | 30 calls | 25 |

At the wrap-up threshold: commit progress, assess remaining work, decide whether to continue or start fresh.

## One-Pass Coding Discipline

For simple-to-medium tasks:

1. **Read all relevant files** including tests first
2. **Understand what tests assert** before coding
3. **Write complete solution in one pass** — not incrementally
4. **Run tests once** — if pass, STOP immediately
5. **If fail**: read the error, fix once, retest
6. **Never iterate** more than twice on the same failure — rethink approach
7. **Never refactor, improve, or polish passing code**

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
- Execute task, do not narrate actions
- Never invent file paths, API endpoints, or function names
- If unknown: return null or "UNKNOWN", never guess

### Analysis Profile
- Lead with finding, context and methodology after
- Tables and bullets over prose
- Numbers must include units
- Never fabricate data points
- Summary first (3 bullets max), caveats last

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
- **Tool calls per task**: should stay within budget tier
- **Re-read count**: should be near zero
- **Write-without-read count**: should be zero
- **Iteration cycles**: tests should pass in 1-2 attempts, not 5+

## Attribution

Token efficiency patterns adapted from [drona23/claude-token-efficient](https://github.com/drona23/claude-token-efficient) (MIT).
