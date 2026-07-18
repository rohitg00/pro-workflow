---
name: domain-modeling
description: Build the project's shared language and bounded contexts before writing code, so names stay consistent and the agent stops paraphrasing domain concepts. Produces a CONTEXT.md glossary and decision records. Use at the start of a project or feature, or when the codebase and the people describing it speak different languages.
user-invocable: true
---

# domain-modeling

Most misbuilds start as a language gap: the agent is dropped into a project
and left to infer the jargon, so it uses twenty words where the domain has
one. A shared language closes the gap. When code, conversation, and the model
all draw from the same vocabulary, names line up, navigation gets cheaper, and
the model spends fewer tokens reasoning because it has a tighter language to
reason in.

## Method

1. **Harvest the terms.** From the request, the codebase, and the user's own
   words, list the nouns and verbs that carry domain meaning - the concepts a
   newcomer would have to ask about. Prefer the user's word over a synonym you
   like better.
2. **Pin each one.** Write a one-line definition in the project's own language,
   not a dictionary definition. If two terms blur together, force the
   distinction or collapse them - ambiguity here becomes inconsistent names in
   code.
3. **Draw the boundaries.** Where the same word means different things in
   different parts of the system, that is a boundary. Name each context and
   note which terms belong to it. A term that means two things is two terms.
4. **Record the hard calls.** When a modeling choice was contested or will be
   questioned later, write a short decision record: context, choice,
   alternatives rejected, why.

## Outputs

- **`CONTEXT.md`** - the shared-language glossary. One term per line:
  `term - what it means in this project`. Grouped by bounded context when
  there is more than one. Point every future session at this file. On re-run,
  add new terms and update definitions that changed; do not rewrite the file
  wholesale.
- **Bounded-context sketch** - the contexts and which terms live in each,
  short enough to read in fifteen seconds.
- **Decision records** in `docs/decisions/NNNN-slug.md` for the contested
  modeling calls only. Read the directory first and number from the highest
  existing record so two records never collide. Skip the obvious ones.

## Guardrails

- The glossary is for the model as much as the human - write it to be loaded,
  not framed on a wall.
- Do not invent terms the project does not use. Reflect the domain; do not
  rename it.
- Keep it small and current. A glossary that lists everything and updates
  nothing is worse than none. Prune terms that fall out of use.

## Where it fits

Run this before `plan-interrogate` on a new area, or let `plan-interrogate`
call back here when it hits terms it cannot pin. The `CONTEXT.md` this produces
is the same file `plan-interrogate` emits - one shared-language artifact, two
ways in.
