# Core Rules

Universal rules for any project. Add to CLAUDE.md or use as reference.

## Quality
- Run lint/typecheck before commit
- Test affected code
- No console.log in production
- No hardcoded secrets

## Git
- Atomic commits
- Descriptive messages
- Feature branches, not main
- Review before push

## Context
- Read before edit
- Plan before multi-file
- Compact at milestones
- <10 MCPs enabled

## Learning
- Capture corrections: [LEARN] Category: Rule
- Update LEARNED.md
- Patterns compound over time

## Communication
- Concise > verbose
- Action > explanation
- Ask when unclear
- Acknowledge mistakes

## Performance
- Haiku for quick tasks
- Sonnet for features
- Opus for architecture
- Opus+Thinking for hard bugs

## Claude Code Mastery
Docs: https://code.claude.com/docs/
- Use plan mode for multi-file changes
- Write CLAUDE.md with structure, conventions, rules
- Manage context: /compact at task boundaries, /context to check usage
- Prompts need scope + context + constraints + acceptance criteria
- Build skills for repeated workflows (>3 repetitions)
- Delegate to subagents for parallel exploration
- Keep <10 MCPs, <80 tools
- Use hooks for automated quality gates
- Review security model before handling sensitive data
- See references/claude-code-resources.md for full guide
