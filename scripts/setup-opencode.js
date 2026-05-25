#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function log(msg) {
  console.error(msg);
}

function provisionSkills(targetDir, strategy) {
  const skillsDir = path.join(PROJECT_ROOT, 'skills');
  if (!fs.existsSync(skillsDir)) {
    log(`Skills directory not found: ${skillsDir}`);
    return 0;
  }

  const skillNames = fs
    .readdirSync(skillsDir)
    .filter((d) =>
      fs.statSync(path.join(skillsDir, d)).isDirectory() &&
      fs.existsSync(path.join(skillsDir, d, 'SKILL.md'))
    );

  const targetSkillsDir = path.join(targetDir, 'skills');
  if (!fs.existsSync(targetSkillsDir))
    fs.mkdirSync(targetSkillsDir, { recursive: true });

  let count = 0;
  for (const name of skillNames) {
    const src = path.join(skillsDir, name);
    const dst = path.join(targetSkillsDir, name);

    if (fs.existsSync(dst)) {
      if (strategy === 'symlink' && fs.lstatSync(dst).isSymbolicLink()) {
        fs.unlinkSync(dst);
      } else {
        log(`  Skipping existing: ${name}`);
        continue;
      }
    }

    if (strategy === 'symlink') {
      const relative = path.relative(path.dirname(dst), src);
      fs.symlinkSync(relative, dst, 'dir');
    } else {
      fs.cpSync(src, dst, { recursive: true });
    }
    count++;
  }

  return count;
}

function runConverter(scriptName, targetDir) {
  const scriptPath = path.join(PROJECT_ROOT, 'scripts', scriptName);
  if (!fs.existsSync(scriptPath)) {
    log(`  Converter not found: ${scriptName}`);
    return 0;
  }
  execSync(`node "${scriptPath}" "${targetDir}"`, {
    stdio: 'pipe',
    cwd: PROJECT_ROOT,
  });
}

function generateConfigSnippet() {
  return JSON.stringify(
    {
      plugin: ['pro-workflow'],
      instructions: ['./.opencode/AGENTS.md'],
    },
    null,
    2
  );
}

function main() {
  const targetDir = process.argv[2] || path.join(process.cwd(), '.opencode');
  const strategy = process.argv[3] || 'symlink';

  log('');
  log('pro-workflow — OpenCode Setup');
  log('=============================');
  log(`Target: ${targetDir}`);
  log(`Strategy: ${strategy}`);
  log('');

  const errors = [];

  // Skills
  log('Provisioning skills...');
  const skillCount = provisionSkills(targetDir, strategy);
  log(`  Skills provisioned: ${skillCount}`);
  log('');

  // Agents
  log('Converting agents...');
  const agentsTarget = path.join(targetDir, 'agents');
  try {
    runConverter('build-opencode-agents.js', agentsTarget);
    const agentCount = fs.existsSync(agentsTarget)
      ? fs.readdirSync(agentsTarget).filter((f) => f.endsWith('.md')).length
      : 0;
    log(`  Agents converted: ${agentCount}`);
  } catch (e) {
    errors.push(`agents: ${e.message}`);
    log(`  ERROR: ${e.message}`);
  }
  log('');

  // Commands
  log('Converting commands...');
  const commandsTarget = path.join(targetDir, 'commands');
  try {
    runConverter('build-opencode-commands.js', commandsTarget);
    const cmdCount = fs.existsSync(commandsTarget)
      ? fs.readdirSync(commandsTarget).filter((f) => f.endsWith('.md')).length
      : 0;
    log(`  Commands converted: ${cmdCount}`);
  } catch (e) {
    errors.push(`commands: ${e.message}`);
    log(`  ERROR: ${e.message}`);
  }
  log('');

  // Rules
  log('Merging rules...');
  const rulesTarget = path.join(targetDir, 'AGENTS.md');
  try {
    runConverter('build-opencode-rules.js', rulesTarget);
    log(`  Rules merged: ${rulesTarget}`);
  } catch (e) {
    errors.push(`rules: ${e.message}`);
    log(`  ERROR: ${e.message}`);
  }
  log('');

  // Config snippet
  log('Add this to your opencode.json:');
  log('');
  log(generateConfigSnippet());
  log('');

  // Summary
  log('=============================');
  const cmdCount = fs.existsSync(commandsTarget)
    ? fs.readdirSync(commandsTarget).filter((f) => f.endsWith('.md')).length
    : 0;
  const agentCount = fs.existsSync(agentsTarget)
    ? fs.readdirSync(agentsTarget).filter((f) => f.endsWith('.md')).length
    : 0;
  log(
    `Summary: ${skillCount} skills, ${agentCount} agents, ${cmdCount} commands, 11 rules provisioned`
  );

  if (errors.length > 0) {
    log(`\nErrors: ${errors.length}`);
    errors.forEach((e) => log(`  - ${e}`));
  }

  log('');
}

main();
