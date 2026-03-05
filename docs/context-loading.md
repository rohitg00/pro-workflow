# Context Loading: How CLAUDE.md Works in Monorepos

Understanding how Claude Code loads memory files is critical for large projects.

## Two Loading Mechanisms

### 1. Ancestor Loading (UP the tree)

When you start Claude Code, it walks UP from your current directory to the root, loading every `CLAUDE.md` it finds.

```text
/                           ← loaded (if exists)
├── CLAUDE.md               ← loaded at startup
├── packages/
│   ├── CLAUDE.md           ← loaded at startup (you're deeper)
│   ├── api/
│   │   ├── CLAUDE.md       ← loaded at startup (you started here)
│   │   └── src/
│   └── web/
│       ├── CLAUDE.md       ← NOT loaded (sibling)
│       └── src/
```

**Running from `packages/api/`**: loads root, packages, and api CLAUDE.md files.
**Running from `packages/web/`**: loads root, packages, and web CLAUDE.md files.

Siblings never load each other.

### 2. Descendant Loading (DOWN, lazy)

When Claude reads or edits a file in a subdirectory, it lazy-loads that directory's CLAUDE.md.

```bash
# You start at root. Claude reads packages/web/src/app.tsx
# → packages/web/CLAUDE.md gets lazy-loaded into context
```

This happens automatically. You don't control it.

## What This Means for Monorepos

### Good Structure

```text
monorepo/
├── CLAUDE.md                    # Shared: repo conventions, build commands
├── packages/
│   ├── api/
│   │   ├── CLAUDE.md            # API-specific: endpoints, auth patterns
│   │   └── src/
│   ├── web/
│   │   ├── CLAUDE.md            # Frontend-specific: component patterns
│   │   └── src/
│   └── shared/
│       ├── CLAUDE.md            # Shared library conventions
│       └── src/
```

### Root CLAUDE.md (< 60 lines ideal, < 150 max)

Keep it lean. This loads every session regardless of where you work.

```markdown
# MyProject

## Build
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint everything

## Conventions
- TypeScript strict mode
- snake_case for database, camelCase for code
- All API responses follow RFC 7807 for errors

## Packages
- `packages/api` - Express REST API
- `packages/web` - Next.js frontend
- `packages/shared` - Shared types and utils
```

### Package CLAUDE.md

Detailed, package-specific context. Only loads when working in that package.

```markdown
# API Package

## Run
pnpm dev             # Start with hot reload on :3001
pnpm test            # Jest with --coverage

## Architecture
- Express + Prisma + PostgreSQL
- Auth: JWT with refresh tokens in httpOnly cookies
- Rate limiting: Redis sliding window

## Gotchas
- Prisma client must be regenerated after schema changes: pnpm prisma generate
- Test database is SQLite (different from prod PostgreSQL)
```

## CLAUDE.local.md

For personal preferences. Gitignored.

```markdown
# My Preferences (not committed)
- I prefer verbose test output
- Always show file paths in suggestions
- My editor is Neovim
```

## Skills Loading (Different from CLAUDE.md)

Skills do NOT follow ancestor/descendant loading. They have fixed discovery locations:

```text
1. Enterprise policies (managed)
2. ~/.claude/skills/         (user-global)
3. .claude/skills/           (project)
4. Plugins
```

Skills from nested `.claude/skills/` directories ARE discovered automatically when Claude accesses files in those directories.

Key difference: skill descriptions are always in context (for the `/` menu), but full skill content is only loaded on invocation. This keeps context lean.

### Character Budget

If you have many skills, they share a character budget for descriptions. Set `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var to increase the limit if needed.

## Agent Memory (Persistent per Agent)

Agents with `memory: user` get their own MEMORY.md:

```text
~/.claude/agent-memory/<agent-name>/MEMORY.md
```

- First 200 lines injected at agent startup
- Agent auto-curates: creates topic files, links from MEMORY.md
- Three scopes: `user` (global), `project` (per-project), `local` (per-directory)

This is different from CLAUDE.md — it's agent-specific and self-managed.

## Memory Systems Comparison

| System | Scope | Managed By | When Loaded |
|--------|-------|-----------|-------------|
| CLAUDE.md | Project | You | Every session (ancestors), lazy (descendants) |
| CLAUDE.local.md | Personal | You | Every session (gitignored) |
| Auto Memory | User | Claude | Session start (first 200 lines) |
| Agent Memory | Per-agent | Agent | Agent invocation |
| `/memory` command | User | You | On demand |
| Pro-Workflow DB | User | Hooks | Session start (via SessionStart hook) |

These systems are complementary. Use CLAUDE.md for project conventions, auto memory for personal patterns, and agent memory for specialized agent knowledge.
