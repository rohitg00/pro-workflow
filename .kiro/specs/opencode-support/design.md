# Design: OpenCode Support

## 1. Overview

This design adds first-class OpenCode support to pro-workflow by implementing a native OpenCode plugin module, a setup utility for content provisioning, and event-based hook adaptation. OpenCode's plugin system differs fundamentally from Claude Code and Cursor: plugins are JavaScript modules loaded via `opencode.json`, not manifest-based directories. The design adapts to this model while preserving the single source of truth in pro-workflow's existing assets.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OpenCode Runtime                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Skills       │  │ Agents       │  │ Commands      │  │
│  │ (.opencode/  │  │ (.opencode/  │  │ (.opencode/   │  │
│  │  skills/)    │  │  agents/)    │  │  commands/)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│  ┌──────┴─────────────────┴──────────────────┴────────┐  │
│  │           Plugin Module (src/opencode-plugin/)      │  │
│  │  ┌──────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │ Event        │  │ Custom     │  │ Shell Env  │  │  │
│  │  │ Handlers     │  │ Tools      │  │ Injector   │  │  │
│  │  └──────────────┘  └────────────┘  └────────────┘  │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │         pro-workflow SQLite Store (existing)        │  │
│  │         dist/db/store.js — getStore()               │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                Setup Utility (scripts/)                  │
│  Reads skills/, agents/, commands/, rules/ from          │
│  pro-workflow source → generates .opencode/ content      │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Plugin = JS module, not manifest directory.** OpenCode has no plugin manifest format. Plugins are JS/TS modules exporting an async function, discovered via `opencode.json` `plugin` array or local directories. The design adopts this model rather than creating a `.opencode-plugin/` directory.

2. **Skills: zero conversion.** OpenCode's `SKILL.md` format (name, description frontmatter) is identical to pro-workflow's. The setup utility symlinks or copies skill directories without modification.

3. **Agents/Commands: build-time frontmatter conversion.** OpenCode agents require `mode`, `permission` (object) instead of `tools` (array). OpenCode commands require `agent` field. A build-time converter generates OpenCode-compatible files from existing sources.

4. **Rules: merge into AGENTS.md.** OpenCode has no `rules/` directory convention. Rules are expressed as `AGENTS.md` content and `instructions` in `opencode.json`. The setup utility merges `.mdc` rules into a single `AGENTS.md`.

5. **Hooks: native event mapping.** OpenCode has ~30+ native events that map to 15 of 24 Claude Code hook types. The plugin registers event handlers for mappable events. Unmappable hooks are documented with alternative strategies.

6. **Data access: custom tools via `tool()` helper.** OpenCode supports native custom tools with Zod schemas. The plugin defines tools for search, learnings, and wiki access using the existing SQLite store.

## 3. Component Definitions

### 3.1 Plugin Module

**Responsibility:** Register event handlers and custom tools with OpenCode at load time.

**Interface:**
```typescript
import type { Plugin } from "@opencode-ai/plugin";

export const ProWorkflow: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    "tool.execute.before": async (event) => { /* pre-tool hooks */ },
    "tool.execute.after": async (event) => { /* post-tool hooks */ },
    "session.created": async (event) => { /* session start hooks */ },
    "session.idle": async (event) => { /* session end / stop hooks */ },
    "file.edited": async (event) => { /* file change hooks */ },
    "session.compacted": async (event) => { /* post-compact hooks */ },
    "permission.asked": async (event) => { /* permission request hooks */ },
    "todo.updated": async (event) => { /* task lifecycle hooks */ },
    "shell.env": async () => { /* inject CLAUDE_PLUGIN_ROOT, session vars */ },
  };
};
```

**Custom tools registered by the plugin:**
- `pw-search`: Full-text search across learnings and wiki pages. Parameters: `query` (string), `category` (optional string), `limit` (optional number, default 10).
- `pw-learn`: Store a new learning. Parameters: `content` (string), `category` (optional string), `tags` (optional string array).
- `pw-wiki-query`: Query wiki pages by title or content. Parameters: `query` (string), `wiki_name` (optional string).

**State:** The plugin maintains no in-memory state. All persistence delegates to the SQLite store via `getStore()`.

**Error handling:** Event handlers catch all exceptions and log via `client.app.log()`. A failing handler never blocks OpenCode execution.

### 3.2 Setup Utility

**Responsibility:** Generate OpenCode-compatible content files from pro-workflow source assets. Run once after npm install or manually.

**Operations:**
1. **Skills**: Copy or symlink each skill directory from `skills/` to `.opencode/skills/`. No content modification.
2. **Agents**: Read each `agents/*.md`, parse YAML frontmatter, convert `tools: [...]` array to `permission: {...}` object, add `mode: subagent` (or `mode: primary` for orchestrator), write to `.opencode/agents/`.
3. **Commands**: Read each `commands/*.md`, add `agent: build` frontmatter (default), write to `.opencode/commands/`.
4. **Rules**: Read all `rules/*.mdc` files, strip `.mdc` frontmatter, merge into `.opencode/AGENTS.md` with sections for always-apply and glob-conditional rules.
5. **Config**: Generate `.opencode/opencode-config-snippet.json` with `plugin`, `instructions`, and MCP server entries.

**Agent frontmatter conversion rules:**

| Source Field | OpenCode Field | Conversion |
|---|---|---|
| `name` | (omitted, filename is identity) | Drop |
| `description` | `description` | Keep as-is |
| `tools: ["Read", "Bash", ...]` | `permission: { read: allow, bash: allow, ... }` | Array → object with `allow` values |
| `omitClaudeMd: true` | (omitted) | Drop — OpenCode uses AGENTS.md |
| `model: "opus"` | `model: "anthropic/claude-opus-4"` | Map shorthand to full model ID |
| `memory: "project"` | (omitted) | Drop — not an OpenCode concept |
| `skills: [...]` | (omitted) | Drop — skills loaded via available_skills |
| `background: true` | (omitted) | Drop — not an OpenCode concept |
| `isolation: "worktree"` | (omitted) | Drop — not an OpenCode concept |
| (none) | `mode: "subagent"` | Default for all except orchestrator |
| (none) | `hidden: true` | Add for scout, cost-analyst, permission-analyst |

**Command frontmatter conversion rules:**

| Source Field | OpenCode Field | Conversion |
|---|---|---|
| `description` | `description` | Keep as-is |
| `argument-hint` | (omitted) | Drop — OpenCode uses `$ARGUMENTS` directly |
| (none) | `agent: "build"` | Default agent assignment |

### 3.3 Event Handler Adapter

**Responsibility:** Translate OpenCode event payloads into the format expected by existing hook scripts, then delegate execution.

**Event mapping table:**

| Claude Code Event | OpenCode Event | Adaptation |
|---|---|---|
| `PreToolUse` | `tool.execute.before` | Direct — extract tool name, args from event |
| `PostToolUse` | `tool.execute.after` | Direct — extract tool name, result from event |
| `PostToolUseFailure` | `tool.execute.after` (error) | Check event for error state |
| `SessionStart` | `session.created` | Direct |
| `SessionEnd` / `Stop` | `session.idle` | Direct — session idle approximates end |
| `UserPromptSubmit` | `tui.prompt.append` | Partial — TUI event, may not fire in server mode |
| `FileChanged` | `file.edited` | Direct |
| `PostCompact` | `session.compacted` | Direct |
| `PermissionRequest` | `permission.asked` | Partial — different payload shape |
| `SubagentStart/Stop` | `session.status` | Partial — status changes, not lifecycle events |
| `TaskCreated/Completed` | `todo.updated` | Partial — todo events, not task-specific |
| `ConfigChange` | (none) | No equivalent — document gap |
| `PreCompact` | `experimental.session.compacting` | Experimental — document instability |
| `Notification` | (none) | No equivalent — expose as skill |
| `TeammateIdle` | (none) | No equivalent — document gap |
| `StopFailure` | (none) | No equivalent — document gap |
| `WorktreeCreate/Remove` | (none) | No equivalent — document gap |
| `CwdChanged` | (none) | No equivalent — document gap |
| `Setup` | (none) | No equivalent — handled by setup utility |

**Adapter pattern:** Each event handler receives the OpenCode event payload, transforms it to match the Claude Code hook input shape (JSON on stdin), and invokes the corresponding script from `scripts/` via `$("node script.js")` shell execution.

### 3.4 Configuration Templates

**Responsibility:** Provide ready-to-use configuration snippets for OpenCode integration.

**Templates provided:**
1. **Plugin registration snippet** — JSON fragment for `opencode.json` `plugin` array
2. **MCP server snippet** — JSON fragment for MCP server configuration pointing to pro-workflow's SQLite store
3. **Instructions snippet** — `instructions` array entries pointing to generated `AGENTS.md`
4. **Settings example** — Complete `opencode-settings.example.json` demonstrating all OpenCode-specific options

### 3.5 Documentation

**Responsibility:** Provide integration guide, update cross-agent docs, and maintain feature parity matrix.

**Documents:**
1. **Integration guide** (`docs/opencode-integration.md`): Installation steps, configuration, verification, troubleshooting
2. **Cross-agent update** (`docs/cross-agent-workflows.md`): Add OpenCode as first-class participant
3. **Feature parity matrix** (`docs/feature-parity.md`): Table comparing Claude Code, Cursor, and OpenCode support across all pro-workflow features

## 4. Data Model

No new data models. The plugin delegates all persistence to the existing SQLite store (`src/db/store.ts`). Custom tools (`pw-search`, `pw-learn`, `pw-wiki-query`) use the existing `Store` interface methods: `searchLearnings()`, `addLearning()`, `searchWikiPages()`, etc.

## 5. Contracts and Interfaces

### 5.1 Plugin Entry Point Contract

```typescript
// src/opencode-plugin/index.ts
import type { Plugin } from "@opencode-ai/plugin";

export const ProWorkflow: Plugin;
```

The plugin function receives `{ project, client, $, directory, worktree }` and returns an object mapping event names to async handler functions.

### 5.2 Custom Tool Contracts

```typescript
// pw-search tool
tool({
  name: "pw-search",
  description: "Search pro-workflow learnings and wiki pages",
  parameters: z.object({
    query: z.string().describe("Full-text search query"),
    category: z.string().optional().describe("Filter by category"),
    limit: z.number().optional().default(10).describe("Max results"),
  }),
  execute: async ({ query, category, limit }) => { ... }
});

// pw-learn tool
tool({
  name: "pw-learn",
  description: "Store a new learning in the pro-workflow database",
  parameters: z.object({
    content: z.string().describe("Learning content"),
    category: z.string().optional().describe("Learning category"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
  }),
  execute: async ({ content, category, tags }) => { ... }
});

// pw-wiki-query tool
tool({
  name: "pw-wiki-query",
  description: "Query wiki pages by title or content",
  parameters: z.object({
    query: z.string().describe("Search query"),
    wiki_name: z.string().optional().describe("Specific wiki to search"),
  }),
  execute: async ({ query, wiki_name }) => { ... }
});
```

### 5.3 Setup Utility Contract

```typescript
// scripts/setup-opencode.ts
interface SetupOptions {
  sourceDir: string;      // pro-workflow package root
  targetDir: string;      // User's project root (where .opencode/ lives)
  strategy: "copy" | "symlink";  // How to provision skills
}

function setupOpenCode(options: SetupOptions): SetupResult;

interface SetupResult {
  skills: number;    // Count of skills provisioned
  agents: number;    // Count of agents generated
  commands: number;  // Count of commands generated
  rules: number;     // Count of rules merged
  errors: string[];  // Any conversion errors
}
```

### 5.4 Event Handler Contract

Each event handler follows this shape:

```typescript
type EventHandler = (event: OpenCodeEvent) => Promise<void>;

interface OpenCodeEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
```

Handlers are fire-and-forget. They log errors but never throw to the caller.

## 6. Flows

### 6.1 Installation Flow

```
User runs: npm install pro-workflow
         ↓
User adds to opencode.json: "plugin": ["pro-workflow"]
         ↓
User runs: npx pro-workflow setup-opencode
         ↓
Setup utility:
  1. Creates .opencode/skills/ (symlinks to skills/)
  2. Generates .opencode/agents/ (converted frontmatter)
  3. Generates .opencode/commands/ (added agent field)
  4. Generates .opencode/AGENTS.md (merged rules)
  5. Prints config snippet for opencode.json
         ↓
User merges config snippet into opencode.json
         ↓
OpenCode loads plugin → registers event handlers + custom tools
         ↓
Plugin is operational
```

### 6.2 Event Handling Flow

```
OpenCode runtime fires event (e.g., tool.execute.before)
         ↓
Plugin event handler receives OpenCode event payload
         ↓
Adapter transforms payload to Claude Code hook input shape
         ↓
Adapter invokes corresponding script: $("node scripts/<hook>.js")
         ↓
Script executes (reads stdin, accesses SQLite store)
         ↓
Script output captured and logged via client.app.log()
         ↓
Handler returns (never blocks OpenCode execution)
```

### 6.3 Custom Tool Flow

```
User invokes: pw-search("query text")
         ↓
OpenCode routes to plugin's pw-search tool
         ↓
Tool calls getStore() to access SQLite database
         ↓
Tool calls store.searchLearnings(query, { limit })
         ↓
Results formatted as markdown table
         ↓
Returned to OpenCode for display
```

## 7. Requirements Traceability

| Requirement | Component | Design Element |
|---|---|---|
| 1.1 | Plugin Module | JS module entry point, `opencode.json` plugin array |
| 2.1 | Setup Utility | Skills provisioning (symlink/copy to `.opencode/skills/`) |
| 2.2 | Setup Utility | Skills passed as-is — `$ARGUMENTS` natively supported by OpenCode |
| 2.3 | Setup Utility | Agent-neutral content check during skill copy |
| 3.1 | Setup Utility | Agent frontmatter conversion (tools→permission, mode, hidden) |
| 3.2 | Setup Utility | Permission object generation from tools array |
| 4.1 | Setup Utility | Command frontmatter generation (description, agent) |
| 4.2 | Setup Utility | Command `agent` field assignment |
| 5.1 | Setup Utility | Rules merge into `.opencode/AGENTS.md` |
| 5.2 | Documentation | Feature parity matrix documents unconvertible rules |
| 6.1 | Event Handler Adapter | Event mapping table (24 events classified) |
| 6.2 | Event Handler Adapter | Enforcement via rules in AGENTS.md for unmappable hooks |
| 6.3 | Plugin Module | Content-generation hooks exposed as custom tools |
| 6.4 | Documentation | Feature parity matrix documents unadaptable hooks |
| 7.1 | Configuration Templates | Plugin, MCP, instructions, settings snippets |
| 8.1 | Documentation | `docs/opencode-integration.md` |
| 8.2 | Documentation | Update `docs/cross-agent-workflows.md` |
| 8.3 | Documentation | `docs/feature-parity.md` |
| 9.1 | Plugin Module (custom tools) | `getStore()` access via pw-search, pw-learn, pw-wiki-query |
| 9.2 | Plugin Module (custom tools) | `pw-search` tool uses `searchLearnings()` |
| 9.3 | Plugin Module (custom tools) | `pw-search` tool uses embedding-based search when available |
| 10.1 | Build/Distribution | `dist/opencode-plugin/` in package.json `files` array |
| 10.2 | Setup Utility | Single `npx pro-workflow setup-opencode` command |
| 10.3 | Documentation | README.md updated with OpenCode in supported agents |
| 11.1 | Plugin Module | Lazy initialization — store connection on first use |
| 11.2 | Plugin Module (custom tools) | Existing FTS5 index provides sub-200ms search |
| 12.1 | All | No modifications to `.claude-plugin/`, `.cursor-plugin/`, existing assets |
| 12.2 | Plugin Module | `@opencode-ai/plugin` type imports ensure API compatibility |
| 13.1 | Setup Utility | Single source: skills/, agents/, commands/ → generated for all platforms |
| 13.2 | Build/Distribution | `package.json` is single metadata source for all manifests |

## 8. File Structure Plan

### New Files

| File | Responsibility |
|---|---|
| `src/opencode-plugin/index.ts` | Plugin entry point — exports async function, registers event handlers and custom tools |
| `src/opencode-plugin/handlers.ts` | Event handler implementations — one function per OpenCode event type |
| `src/opencode-plugin/tools.ts` | Custom tool definitions (pw-search, pw-learn, pw-wiki-query) using `tool()` + Zod |
| `src/opencode-plugin/adapter.ts` | Payload transformation — converts OpenCode events to Claude Code hook input shape |
| `scripts/setup-opencode.ts` | Setup utility — provisions skills, agents, commands, rules into `.opencode/` |
| `scripts/build-opencode-agents.ts` | Agent frontmatter converter — reads `agents/*.md`, writes OpenCode-compatible versions |
| `scripts/build-opencode-commands.ts` | Command frontmatter converter — reads `commands/*.md`, adds `agent` field |
| `scripts/build-opencode-rules.ts` | Rule merger — reads `rules/*.mdc`, outputs merged `AGENTS.md` content |
| `templates/opencode-config.example.json` | Configuration snippet template for `opencode.json` |
| `templates/opencode-settings.example.json` | Settings template with OpenCode-specific options |
| `docs/opencode-integration.md` | Installation, configuration, and usage guide |
| `docs/feature-parity.md` | Feature comparison matrix across Claude Code, Cursor, OpenCode |

### Modified Files

| File | Change |
|---|---|
| `package.json` | Add `"dist/opencode-plugin"` to `files` array; add `"setup-opencode"` script; add `@opencode-ai/plugin` and `zod` as dependencies |
| `README.md` | Add OpenCode to supported agents list; add installation instructions |
| `docs/cross-agent-workflows.md` | Add OpenCode as first-class participant in workflow examples |

### Generated Files (by setup utility, not committed)

| File | Generated By |
|---|---|
| `.opencode/skills/<name>/SKILL.md` | `setup-opencode.ts` (symlink or copy from `skills/`) |
| `.opencode/agents/<name>.md` | `build-opencode-agents.ts` (converted frontmatter) |
| `.opencode/commands/<name>.md` | `build-opencode-commands.ts` (added agent field) |
| `.opencode/AGENTS.md` | `build-opencode-rules.ts` (merged from `rules/*.mdc`) |

## 9. Testing Strategy

### Unit Tests

| Test | Component | Verifies |
|---|---|---|
| Agent frontmatter conversion | `build-opencode-agents.ts` | `tools` array correctly converts to `permission` object; `mode` assigned correctly; deprecated fields dropped |
| Command frontmatter conversion | `build-opencode-commands.ts` | `agent` field added; `description` preserved; `argument-hint` dropped |
| Rule merging | `build-opencode-rules.ts` | All `.mdc` files merged; `alwaysApply` rules in correct section; `globs` preserved as comments |
| Event payload transformation | `adapter.ts` | OpenCode event shape correctly transforms to Claude Code hook input shape for each mapped event |
| Custom tool parameter validation | `tools.ts` | Zod schemas validate inputs; error messages are clear |

### Integration Tests

| Test | Scope | Verifies |
|---|---|---|
| Setup utility end-to-end | `setup-opencode.ts` | Running setup creates all expected files in `.opencode/`; no source files modified |
| Plugin load in OpenCode | `src/opencode-plugin/index.ts` | Plugin exports valid Plugin type; event handlers register without errors |
| Custom tool execution | `tools.ts` + SQLite store | `pw-search` returns results from test database; `pw-learn` persists and retrieves |

### End-to-End Tests

| Test | Flow | Verifies |
|---|---|---|
| Install → setup → use | Full installation flow | User can install npm package, run setup, configure opencode.json, and invoke a skill |
| Event handler fires on tool use | tool.execute.before/after | PreToolUse-equivalent hook script runs when OpenCode executes a tool |
| Backward compatibility | All three plugins | Adding OpenCode support does not break Claude Code or Cursor plugin functionality |

## 10. Boundary Commitments

### In Scope

- OpenCode plugin module (event handlers, custom tools)
- Setup utility for content provisioning (skills, agents, commands, rules)
- Event mapping and adaptation for 15 of 24 hook types
- Configuration templates for OpenCode
- Documentation (integration guide, cross-agent update, parity matrix)
- Build scripts for agent/command/rule conversion
- npm package integration (files array, dependencies, scripts)

### Out of Boundary

- Modifications to existing Claude Code or Cursor plugin configurations
- Changes to existing skill, agent, command, or rule content
- OpenCode core modifications (upstream changes to OpenCode itself)
- MCP server implementation (custom tools replace this need)
- SkillKit translation improvements (out of scope — this spec adds native support)
- Runtime hot-reload of plugin configuration

### Allowed Dependencies

- `@opencode-ai/plugin` — OpenCode plugin TypeScript types
- `zod` — Schema validation for custom tool parameters
- `better-sqlite3` — Existing dependency for SQLite store access
- Node.js >= 18 — Existing engine requirement

### Revalidation Triggers

- OpenCode plugin API changes (new events, changed event payloads, deprecated fields)
- Changes to pro-workflow agent/command/rule formats
- New skills, agents, or commands added to pro-workflow
- OpenCode minimum version changes
