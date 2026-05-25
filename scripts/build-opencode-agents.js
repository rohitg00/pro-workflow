#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const TOOL_MAP = {
  Read: 'read',
  Glob: 'glob',
  Grep: 'grep',
  Bash: 'bash',
  Edit: 'edit',
  Write: 'write',
};

const MODEL_MAP = {
  opus: 'anthropic/claude-opus-4',
  sonnet: 'anthropic/claude-sonnet-4',
  haiku: 'anthropic/claude-haiku-4',
};

const HIDDEN_AGENTS = ['scout', 'cost-analyst', 'permission-analyst'];

const AGENT_MODE = {
  orchestrator: 'primary',
};

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return [null, content];
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === '---');
  if (endIdx === -1) return [null, content];
  const fm = {};
  for (let i = 1; i <= endIdx; i++) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1);
      fm[key] = inner
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      fm[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  const body = lines.slice(endIdx + 2).join('\n');
  return [fm, body];
}

function convertAgent(sourcePath, targetDir) {
  const filename = path.basename(sourcePath);
  const content = fs.readFileSync(sourcePath, 'utf-8');
  const [fm, body] = parseFrontmatter(content);
  if (!fm || !fm.name) {
    console.error(`Skipping ${filename}: no valid frontmatter`);
    return null;
  }

  const tools = fm.tools || [];
  const permission = {};
  for (const tool of tools) {
    const mapped = TOOL_MAP[tool];
    if (mapped) permission[mapped] = 'allow';
  }

  const mode = AGENT_MODE[fm.name] || 'subagent';
  const hidden = HIDDEN_AGENTS.includes(fm.name) ? true : undefined;

  const opencode = { description: fm.description };

  if (mode) opencode.mode = mode;
  if (hidden) opencode.hidden = hidden;

  if (fm.model && MODEL_MAP[fm.model]) {
    opencode.model = MODEL_MAP[fm.model];
  }

  const permKeys = Object.keys(permission);
  if (permKeys.length > 0) opencode.permission = permission;

  const yamlLines = ['---'];
  for (const [key, value] of Object.entries(opencode)) {
    if (value === undefined) continue;
    if (typeof value === 'object') {
      yamlLines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) {
        yamlLines.push(`  ${k}: ${v}`);
      }
    } else if (typeof value === 'string') {
      yamlLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else {
      yamlLines.push(`${key}: ${value}`);
    }
  }
  yamlLines.push('---');

  const opencodeContent = yamlLines.join('\n') + '\n' + body;

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, filename);
  fs.writeFileSync(targetPath, opencodeContent);

  return { name: fm.name, targetPath };
}

function main() {
  const agentsDir = path.join(PROJECT_ROOT, 'agents');
  const targetDir = process.argv[2] || path.join(PROJECT_ROOT, '.opencode', 'agents');

  if (!fs.existsSync(agentsDir)) {
    console.error(`Agents directory not found: ${agentsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
  const results = [];
  const errors = [];

  for (const file of files) {
    const sourcePath = path.join(agentsDir, file);
    const result = convertAgent(sourcePath, targetDir);
    if (result) {
      results.push(result);
    } else {
      errors.push(file);
    }
  }

  console.log(`Agents converted: ${results.length}`);
  console.log(`Agents with errors: ${errors.length}`);
  if (errors.length > 0) console.error(`  Errors: ${errors.join(', ')}`);
}

main();
