# Requirements: OpenCode Support

## Project Description

Users of the pro-workflow system who use OpenCode as their AI coding agent currently lack native plugin support. While Claude Code and Cursor have dedicated plugin manifests, OpenCode users must rely on SkillKit translation, which loses fidelity for hooks, rules, and agent configurations. This spec adds first-class OpenCode support so that all 34 skills, 8 agents, 22 commands, 11 rules, and 37 hook scripts work natively within OpenCode without translation loss.

## Functional Requirements

### Plugin Manifest

1.1 The system shall provide a plugin manifest that OpenCode can discover and load.

- When OpenCode scans the installed package for plugin metadata, the system shall present a manifest containing name, version, description, author, repository, license, and keywords.
- When the manifest is loaded, the system shall declare entry points for skills, agents, and rules.
- Where the manifest is compared against existing Claude Code and Cursor plugin manifests, the structure shall follow the same conventions.

### Skills Compatibility

2.1 The system shall make all 34 skills discoverable to OpenCode.

- When OpenCode loads the plugin, all 34 skills shall appear in the available skills list.
- When a skill is invoked, the system shall provide its name and description from the skill's frontmatter.

2.2 The system shall support argument substitution in skills.

- When a skill references argument placeholders, the system shall substitute user-provided arguments at invocation time.

2.3 The system shall ensure skill content is agent-neutral.

- If a skill contains syntax or references specific to another agent, the system shall either adapt the content or document the incompatibility.

### Agent Compatibility

3.1 The system shall provide definitions for all 8 agents (planner, reviewer, scout, orchestrator, debugger, context-engineer, permission-analyst, cost-analyst) in a format OpenCode can load.

- When OpenCode loads the plugin, all 8 agent definitions shall be available for task dispatch.
- Each agent definition shall declare its description, operational mode, and tool access configuration.

3.2 The system shall enforce agent tool restrictions.

- When an agent definition restricts tool access, the system shall prevent that agent from using restricted tools during execution.

### Command Compatibility

4.1 The system shall register all 22 commands in OpenCode's command interface.

- When a user invokes a slash command, the system shall execute the corresponding command definition.
- Each command shall declare its description and associated agent in its frontmatter.

4.2 The system shall route commands to specified agents.

- When a command specifies an agent, the system shall delegate execution to that agent.

### Rule Compatibility

5.1 The system shall make all 11 rules available in OpenCode's rule format.

- When OpenCode loads the plugin, all rules shall be active and influence agent behavior during code generation and review.
- The system shall preserve rule semantics during format conversion — conditions, constraints, and instructions shall remain functionally equivalent to the originals.

5.2 The system shall document any rules that cannot be fully converted.

- If a rule relies on features unavailable in OpenCode, the system shall document the limitation and provide an alternative enforcement strategy.

### Hook Adaptation

6.1 The system shall classify all 24 hook event types by OpenCode compatibility.

- When a hook event type has no native OpenCode equivalent, the system shall document the gap and provide an adaptation strategy.

6.2 The system shall adapt enforcement hooks through alternative mechanisms.

- When a hook enforces behavior via file modification or validation, the system shall provide equivalent enforcement through rules or skills.

6.3 The system shall expose content-generation hooks as invocable skills.

- When a hook generates content (e.g., session summaries, learning capture) and no native event is available, the system shall make the functionality available as a skill.

6.4 The system shall document unadaptable hooks.

- If a hook cannot be adapted to OpenCode, the system shall document the functional gap and its impact on the user workflow.

### Configuration Templates

7.1 The system shall provide configuration templates for OpenCode integration.

- When a user sets up the plugin, the system shall provide a template for server connections to the pro-workflow data store.
- When a user configures the plugin, the system shall provide a settings template with OpenCode-specific options.
- When a user needs to integrate search capabilities, the system shall provide a template demonstrating full-text and semantic search configuration.

### Documentation

8.1 The system shall include an OpenCode integration guide.

- When a user installs the plugin, the guide shall cover installation, configuration, and usage.

8.2 The system shall update cross-agent workflow documentation.

- When a user reads cross-agent workflow documentation, OpenCode shall be included as a first-class participant alongside existing agents.

8.3 The system shall provide a feature parity matrix.

- When a user compares agent support, the system shall document differences between OpenCode, Claude Code, and Cursor support.

### Data Store Compatibility

9.1 The system shall make the pro-workflow data store accessible from OpenCode.

- When OpenCode needs to access learnings, sessions, wikis, or wiki pages, the system shall provide access through the configured integration.

9.2 The system shall support full-text search from OpenCode.

- When a user performs a text search, the system shall return results from the full-text search index.

9.3 The system shall support semantic search from OpenCode.

- When a user performs a semantic search, the system shall return results using embedding-based similarity.

### Build and Distribution

10.1 The system shall include the OpenCode plugin in the npm package.

- When the npm package is published, the OpenCode plugin directory shall be included in the package contents.

10.2 The system shall require no additional setup beyond configuration.

- When a user installs the npm package and applies the configuration template, the OpenCode plugin shall be functional.

10.3 The system shall list OpenCode as a supported agent.

- When a user reads the package documentation, OpenCode shall appear in the supported agents list alongside Claude Code and Cursor.

## Non-Functional Requirements

### Performance

11.1 Skill loading shall not noticeably impact startup time.

- When OpenCode starts with the plugin loaded, skill discovery shall complete within 500ms.

11.2 Search queries shall return results promptly.

- When a full-text search is performed against a database of up to 10,000 entries, results shall return within 200ms.

### Compatibility

12.1 The system shall maintain backward compatibility.

- When the OpenCode plugin is added, existing Claude Code and Cursor plugin configurations shall continue to function without modification.

12.2 The system shall support current OpenCode versions.

- Where the OpenCode plugin API changes, the system shall adapt to maintain compatibility with the latest stable release.

### Maintainability

13.1 The system shall avoid content duplication across plugin manifests.

- When a skill, agent, or command is updated, the change shall be reflected across all agent integrations without requiring per-manifest edits.

13.2 The system shall use a single source of truth for plugin metadata.

- When the version or description changes in the source of truth, all plugin manifests shall reflect the update without per-manifest edits.
