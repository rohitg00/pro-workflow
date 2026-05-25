# Research Log: OpenCode Support

## Summary

**Discovery type:** Extension (integration-focused discovery)
**Scope:** Analyzed pro-workflow codebase structure, existing plugin manifests (Claude Code, Cursor), and OpenCode's plugin API, event system, agent/skill/command formats, and configuration model.

**Critical finding:** OpenCode has a native event/hook system (~30+ events) and a JS/TS plugin API via `@opencode-ai/plugin`. This contradicts the initial assumption that OpenCode lacks hook support. The design leverages native events rather than working around their absence.

## Research Log

### 1. OpenCode Plugin API

**Source:** OpenCode documentation (https://opencode.ai/docs/plugins), `@opencode-ai/plugin` npm package, local `~/.config/opencode/` analysis.

**Findings:**
- Plugins are JS/TS modules exporting async functions: `export const Name = async (ctx) => ({ hooks })`
- No manifest file format — plugins discovered via `opencode.json` `plugin` array (npm packages) or local directories (`~/.config/opencode/plugins/`, `.opencode/plugins/`)
- TypeScript types: `import type { Plugin } from "@opencode-ai/plugin"`
- Plugin context: `{ project, client, $, directory, worktree }`
- Custom tools via `tool()` helper with Zod schemas

**Implications:** The plugin manifest requirement (1.1) must be reinterpreted as "npm package with proper exports" rather than a JSON manifest file.

### 2. OpenCode Event System

**Source:** OpenCode documentation, plugin API reference.

**Findings:**
- ~30+ native events across categories: tool, session, file, message, permission, shell, LSP, command, TUI, server, installation, todo, experimental
- Key mappings to Claude Code hooks:
  - `tool.execute.before/after` ↔ PreToolUse/PostToolUse
  - `session.created/idle` ↔ SessionStart/SessionEnd
  - `file.edited` ↔ FileChanged
  - `session.compacted` ↔ PostCompact
  - `permission.asked` ↔ PermissionRequest
- 7 of 24 Claude Code events have no OpenCode equivalent

**Implications:** 15 of 24 hooks can be directly or partially adapted. 7 require alternative strategies (rules, skills, documentation).

### 3. OpenCode Agent Format

**Source:** OpenCode documentation (https://opencode.ai/docs/agents), local agent files.

**Findings:**
- `tools` field is deprecated, replaced by `permission` object
- `mode` field required: `primary | subagent | all`
- `hidden` field for subagents
- `permission` uses pattern-based allow/deny/ask with glob support
- Agent body is the system prompt (same as pro-workflow)

**Implications:** Agent conversion requires frontmatter transformation. The `tools` array → `permission` object mapping is the primary conversion challenge.

### 4. OpenCode Skill Format

**Source:** OpenCode documentation (https://opencode.ai/docs/skills), local skill files.

**Findings:**
- `SKILL.md` with `name`, `description` frontmatter — identical to pro-workflow
- Optional fields: `compatibility`, `metadata`, `license`, `version`
- Discovery paths include `.claude/skills/` (Claude Code compatibility)
- `$ARGUMENTS` placeholder supported

**Implications:** Zero conversion needed. Skills can be symlinked or copied directly.

### 5. OpenCode Command Format

**Source:** OpenCode documentation (https://opencode.ai/docs/commands), local command files.

**Findings:**
- `description` and `agent` frontmatter fields
- `$ARGUMENTS`, `$1/$2`, `!\`shell\``, `@filename` supported
- `model` and `subtask` optional fields

**Implications:** Commands need `agent` field added. Existing `description` and `$ARGUMENTS` are compatible.

### 6. OpenCode Rules System

**Source:** OpenCode documentation (https://opencode.ai/docs/rules), local config analysis.

**Findings:**
- No `rules/` directory convention
- Rules expressed as `AGENTS.md` files (project root or `~/.config/opencode/`)
- Additional rules via `instructions` field in `opencode.json` (file paths, globs, URLs)
- `AGENTS.md` walks up to git worktree root
- Claude Code compatibility: reads `CLAUDE.md`

**Implications:** `.mdc` rules must be merged into `AGENTS.md` or provided as `instructions` entries.

### 7. Existing Plugin Manifests (Claude Code, Cursor)

**Source:** `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` in pro-workflow.

**Findings:**
- Claude Code: JSON manifest with name, version, skills (array of dirs), agents (array of files)
- Cursor: JSON manifest with additional fields (displayName, logo, category, tags, rules)
- Both are directory-based manifests — fundamentally different from OpenCode's module-based approach

**Implications:** OpenCode plugin cannot follow the same manifest pattern. A different integration model is required.

## Design Decisions

### Generalization: Content Adapter Pattern

Skills, agents, commands, and rules conversion are all variations of the same problem: transforming pro-workflow assets into OpenCode-compatible formats. The Setup Utility generalizes this as a single content provisioning step with format-specific converters.

### Build vs. Adopt

| Component | Decision | Rationale |
|---|---|---|
| Plugin module | Build | No existing solution — OpenCode-specific API |
| Event handlers | Adopt (native events) | OpenCode provides ~30+ events; no need for custom event system |
| Custom tools | Adopt (`tool()` helper) | OpenCode native capability replaces MCP server need |
| Skill conversion | Adopt (as-is) | Formats are identical; no conversion needed |
| Agent conversion | Build (transform script) | Frontmatter formats differ; no existing converter |
| Rule conversion | Build (merge script) | OpenCode has no rules directory; must merge to AGENTS.md |
| SQLite access | Adopt (existing store) | `getStore()` already provides full Store interface |

### Simplification

- **Removed:** Separate `.opencode-plugin/` manifest directory — OpenCode doesn't use manifest files
- **Removed:** MCP server for data access — custom tools via `tool()` helper are simpler and native
- **Removed:** Skill conversion step — formats are identical
- **Flattened:** Agent/command/rules conversion into setup utility rather than separate build pipeline
- **Kept:** Event handler adapter layer — necessary to bridge payload shape differences

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenCode plugin API instability | Medium | High | Pin `@opencode-ai/plugin` version; monitor changelog |
| `permission` object format mismatch | Medium | Medium | Test with actual OpenCode runtime during implementation |
| Event payload shape differences | High | Medium | Adapter layer isolates transformation; test each mapping |
| `tui.prompt.append` not firing in server mode | Medium | Low | Document limitation; provide skill alternative |
| Symlink support on Windows | Medium | Low | Provide `--copy` fallback in setup utility |
