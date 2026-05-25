#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

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
    fm[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
  const body = lines.slice(endIdx + 2).join('\n');
  return [fm, body];
}

function inferDescription(content) {
  const match = content.match(/^#\s+\/\S+\s*[-–—]\s*(.+)$/m);
  if (match) return match[1].trim();
  const match2 = content.match(/^#\s+\/\S+\s*\n\s*(.+)$/m);
  if (match2) return match2[1].trim();
  const match3 = content.match(/^#\s+(.+)$/m);
  if (match3) return match3[1].trim();
  return null;
}

function convertCommand(sourcePath, targetDir) {
  const filename = path.basename(sourcePath);
  const content = fs.readFileSync(sourcePath, 'utf-8');
  let [fm, body] = parseFrontmatter(content);

  let description;
  if (fm && fm.description) {
    description = fm.description;
  } else {
    description = inferDescription(content);
    if (!description) description = path.basename(filename, '.md');
    fm = {};
  }

  const opencode = { description, agent: 'build' };

  const yamlLines = ['---'];
  for (const [key, value] of Object.entries(opencode)) {
    if (value === undefined) continue;
    yamlLines.push(`${key}: "${String(value).replace(/"/g, '\\"')}"`);
  }
  yamlLines.push('---');

  const opencodeContent = yamlLines.join('\n') + '\n' + body;

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, filename);
  fs.writeFileSync(targetPath, opencodeContent);

  return { filename, description, hadFrontmatter: fm !== null };
}

function main() {
  const commandsDir = path.join(PROJECT_ROOT, 'commands');
  const targetDir = process.argv[2] || path.join(PROJECT_ROOT, '.opencode', 'commands');

  if (!fs.existsSync(commandsDir)) {
    console.error(`Commands directory not found: ${commandsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md'));
  const results = [];

  for (const file of files) {
    const sourcePath = path.join(commandsDir, file);
    const result = convertCommand(sourcePath, targetDir);
    results.push(result);
  }

  console.log(`Commands converted: ${results.length}`);
}

main();
