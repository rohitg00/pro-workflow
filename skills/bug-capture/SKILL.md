---
name: bug-capture
description: Capture a user-reported defect as a durable GitHub issue written in the project's own domain language. Explores the codebase in parallel for context but never leaks file paths or line numbers into the issue. Use when the user reports a bug conversationally, runs a QA pass, or says "file an issue", "log this as a bug", "capture this".
---

# bug-capture

Turn a conversation into an issue that still reads correctly after a
major refactor.

## Flow

### 1. Listen, then clarify minimally

Let the user describe the problem in their own words. Ask at most two
short clarifying questions, drawn from:

- Expected behavior vs. actual behavior.
- Concrete reproduction steps if not already implied.
- Frequency: deterministic, intermittent, or one-off.

If the description already answers these, skip straight to filing. Over-
interviewing is a tax the reporter pays for your uncertainty.

### 2. Explore in parallel

While the user is answering, start a background exploration of the
relevant area. The goal is **not** to propose a fix. The goal is to
absorb the project's own vocabulary — the nouns and verbs the codebase
uses for this feature — so the issue reads like it was written by a
maintainer.

If the repo has a glossary file (common names: GLOSSARY.md,
UBIQUITOUS_LANGUAGE.md, docs/domain.md), read it first.

### 3. Check for duplicates before filing

Run `gh issue list --search "<key phrase>" --state all --limit 10`. If a
live or recently closed issue matches, surface it to the user and ask
whether to add a comment instead of opening a new issue. Do not silently
skip filing.

### 4. Decide: single issue or breakdown

Break down when the report contains two or more independent failure
modes that a different contributor could fix in parallel. Keep as one
when every symptom traces to a single wrong behavior.

For a breakdown, file in dependency order so each child issue can
reference a real parent number, and mark honest `Blocked by` links.
Avoid inventing dependencies to make the tree look tidier.

### 5. File with `gh issue create`

File without asking the user to review the draft. Send back the URLs.

#### Single-issue template

```
## What happened
<observed behavior, in domain terms>

## What I expected
<expected behavior>

## Reproduction
1. <step>
2. <step>
3. <step>

## Context
<anything that narrows where the bug lives, in domain terms — e.g.
"only affects the import path, not the export path">
```

#### Child-issue template

```
## Parent
#<parent-number>

## What is wrong
<one behavior, narrow slice>

## What I expected
<expected for this slice>

## Reproduction
1. <step>

## Blocked by
<#issue or "none — independent">

## Context
<notes that apply only to this slice>
```

### 6. Rules that apply to every issue body

- No file paths, line numbers, function names, or PR numbers. These go
  stale. Describe behavior, not code.
- Use the project's domain nouns, not generic tech terms. "The sync
  worker drops the patch" beats "`applyPatch()` throws".
- Reproduction steps are mandatory. If you cannot derive them, go back
  to the user once before filing.
- Thirty-second read target. Cut anything that does not help a
  maintainer decide whether to pick it up.

### 7. Keep going

After each issue, print the URL and ask whether there is a next one. Do
not batch multiple reports into one filing pass — each bug deserves its
own scoped issue.
