---
name: plan-interrogate
description: Stress-test a plan or design by walking its decision tree one question at a time. Each question carries a recommended answer. Codebase exploration substitutes for asking whenever possible. Use when the user wants to pressure-test a design before implementation or says "interrogate the plan", "stress-test this", "walk the tree".
---

# plan-interrogate

Drive a plan from sketch to commitment by resolving every open decision
before any code is written.

## Method

1. Restate the plan in one paragraph. Confirm with the user that this is
   the plan being interrogated. Do not proceed on a mis-restatement.
2. Extract the decision tree. Every branch point becomes a node. Mark
   nodes as **open** (not decided), **pinned** (decided by the user), or
   **inferred** (derivable from the codebase or existing constraints).
3. Resolve in dependency order. A node is ready when every node it
   depends on is pinned or inferred.
4. For each ready open node, ask exactly one question. Keep the question
   tight and binary or small-multiple-choice when possible.
5. Pair every question with a **recommended answer** and one sentence of
   reasoning. The user can confirm, pick a different option, or push back.
6. Before asking, check whether the answer already lives in the codebase,
   prior commits, or an existing doc. If so, skip the question and mark
   the node inferred with the source.
7. Exit only when zero nodes are open. Print the resolved tree as a flat
   list: "Decision — Choice — Source (user / inferred: path)".

## Anti-patterns

- Asking multiple questions at once. The user loses context and you lose
  the ability to react to each answer individually.
- Asking before exploring. If a fifteen-second read would answer the
  question, read first.
- Asking without a recommendation. A question without a stance is a
  survey; it offloads design onto the user.
- Rolling past an unresolved node. If a dependency is not pinned, the
  downstream question is premature.

## Output contract

A single decision ledger the user can paste into the plan doc. No prose
summary. No hedging. If any node remains open because the user declined
to decide, flag it as `DEFERRED` with the reason the user gave.
