---
name: orchestrate
description: Wire Commands, Agents, and Skills together for complex features. Use when building features that need research, planning, and implementation phases.
---

# Orchestrate - Multi-Phase Feature Development

Build features through structured phases with validation gates.

## The Pattern

```text
/develop <feature>
  │
  ├── Phase 1: Research (orchestrator agent)
  │   └── Score confidence → GO/HOLD
  │
  ├── Phase 2: Plan (orchestrator agent)
  │   └── Present plan → wait for approval
  │
  ├── Phase 3: Implement (orchestrator agent)
  │   └── Execute plan → quality gates
  │
  └── Phase 4: Review (reviewer agent)
      └── Code review → commit
```

## Usage

When asked to build a feature:

1. **Start with research**: Delegate to the orchestrator agent or scout agent to explore the codebase
2. **Wait for GO/HOLD**: Don't proceed if confidence is below 70
3. **Present a plan**: List all files to change, the approach, and risks
4. **Get approval**: Never implement without explicit "proceed"
5. **Implement step by step**: Quality gates every 5 edits
6. **Review before commit**: Run the reviewer agent on changes

## When to Use This

- Feature touches >5 files
- Architecture decisions needed
- Requirements are unclear or complex
- Cross-cutting concerns (auth, logging, error handling)
- New patterns not yet established in the codebase

## When NOT to Use This

- Quick bug fixes (just fix it)
- Single-file changes
- Well-understood patterns (follow existing code)
- Documentation-only changes

## Agent Selection

| Phase | Agent | Why |
|-------|-------|-----|
| Research | scout (background, worktree) | Non-blocking exploration |
| Plan | orchestrator (opus, memory) | Deep reasoning, pattern recall |
| Implement | orchestrator (opus, memory) | Full tool access |
| Review | reviewer (read + bash) | Security and quality focus |
| Debug | debugger (opus, memory) | Systematic investigation |

## Integration with Pro-Workflow

- Corrections during implementation trigger self-correction loop
- Quality gates fire at checkpoints via hooks
- Learnings are captured at the end of each phase
- Session handoff works across phases
