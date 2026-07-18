---
name: writing-guidelines
description: Apply clear-writing standards to any prose the agent produces - READMEs, docs, UI copy, error messages, commit and PR text, release notes. Use when writing or editing documentation, interface copy, or any text a human will read. Says "write the README", "improve this copy", "draft the docs", "word this error".
---

# writing-guidelines

Write for a reader who is busy and did not see your work. Readability beats
cleverness; clarity beats completeness.

## Rules

- **Lead with the outcome.** The first sentence answers what happened or what
  the thing is - the line the reader would ask for if they said "just the TLDR".
  Supporting detail comes after.
- **Cut filler.** Delete "just", "simply", "basically", "in order to", "it is
  important to note". If a sentence changes nothing when removed, remove it.
- **Concrete over abstract.** Name the file, the number, the command. "Faster"
  is weaker than "cuts the build from 40s to 9s".
- **Active voice, one idea per sentence.** Short sentences that each carry one
  point read faster than long ones that carry three.
- **Consistent terms.** Use the project's own vocabulary, the same word for the
  same thing every time. Tie names to the shared-language `CONTEXT.md` when one
  exists (see `domain-modeling`).
- **Readable, not clipped.** Being short and being clear are different. Achieve
  short by dropping what the reader does not need, not by compressing prose into
  fragments, arrow chains (`A -> B -> fails`), or invented abbreviations.

## Error messages and UI copy

- Say what happened and what to do next: `Config not found at ./app.config.ts.
  Create it or pass --config <path>.` beats `Error: config missing`.
- No dead ends. Every failure names a next step.
- Match the product's voice; drop exclamation marks and filler enthusiasm.

## AI-slop tells to strip

- Em-dashes and en-dashes - use a spaced hyphen or a full stop. This is the most
  reliable machine-written tell.
- Hollow openers: "In today's fast-paced world", "It's worth noting that".
- Hedging stacks: "might potentially perhaps".
- Binary flourishes: "Not X. But Y." as a rhetorical beat.
- Over-structured lists where a sentence would do.

## Output

When editing, show the tightened version and, on request, a one-line note per
change. Do not pad the edit with praise for the original.
