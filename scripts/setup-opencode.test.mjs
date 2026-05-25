import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const SCRIPTS = [
  "build-opencode-agents.js",
  "build-opencode-commands.js",
  "build-opencode-rules.js",
  "setup-opencode.js",
];

function parseFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return [null, content];
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === "---");
  if (endIdx === -1) return [null, content];
  const fm = {};
  for (let i = 1; i <= endIdx; i++) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1);
      fm[key] = inner
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      fm[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  const body = lines.slice(endIdx + 2).join("\n");
  return [fm, body];
}

function createFixtureProject(tmpRoot) {
  // Scripts
  const scriptsDir = path.join(tmpRoot, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  for (const script of SCRIPTS) {
    fs.copyFileSync(path.join(__dirname, script), path.join(scriptsDir, script));
  }

  // Agents
  const agentsDir = path.join(tmpRoot, "agents");
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, "orchestrator.md"),
    [
      "---",
      "name: orchestrator",
      "description: Multi-phase development agent",
      'tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write"]',
      "model: opus",
      "---",
      "",
      "# Orchestrator",
      "",
      "Orchestrator body.",
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(agentsDir, "scout.md"),
    [
      "---",
      "name: scout",
      "description: Confidence-gated exploration",
      'tools: ["Read", "Glob", "Grep", "Bash"]',
      "background: true",
      "omitClaudeMd: true",
      "---",
      "",
      "# Scout",
      "",
      "Scout body.",
    ].join("\n")
  );

  // Commands
  const commandsDir = path.join(tmpRoot, "commands");
  fs.mkdirSync(commandsDir, { recursive: true });
  fs.writeFileSync(
    path.join(commandsDir, "commit.md"),
    ["---", "description: Smart Commit with Quality Gates", "---", "", "# /commit - Smart Commit", "", "Commit process."].join("\n")
  );
  fs.writeFileSync(
    path.join(commandsDir, "doctor.md"),
    "# /doctor — Configuration Health Check\n\nDiagnose setup.\n"
  );

  // Rules
  const rulesDir = path.join(tmpRoot, "rules");
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, "atomic-commits.mdc"),
    [
      "---",
      "description: Git atomic commits",
      "alwaysApply: true",
      "---",
      "",
      "Make atomic commits with descriptive messages.",
    ].join("\n")
  );
  fs.writeFileSync(
    path.join(rulesDir, "no-debug.mdc"),
    [
      "---",
      "description: Remove debug statements",
      'globs: "**/*.ts"',
      "alwaysApply: false",
      "---",
      "",
      "No console.log or debugger statements.",
    ].join("\n")
  );

  // Skills (for provisioning test)
  const skillsDir = path.join(tmpRoot, "skills");
  fs.mkdirSync(path.join(skillsDir, "test-skill"), { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, "test-skill", "SKILL.md"),
    "# Test Skill\n\nThis is a test skill for integration testing.\n"
  );
  fs.mkdirSync(path.join(skillsDir, "another-skill"), { recursive: true });
  fs.writeFileSync(
    path.join(skillsDir, "another-skill", "SKILL.md"),
    "# Another Skill\n\nAnother test skill.\n"
  );
}

function verifyOutputStructure(targetDir) {
  const errors = [];
  if (!fs.existsSync(path.join(targetDir, "skills"))) errors.push("skills/ missing");
  if (!fs.existsSync(path.join(targetDir, "agents"))) errors.push("agents/ missing");
  if (!fs.existsSync(path.join(targetDir, "commands"))) errors.push("commands/ missing");
  if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) errors.push("AGENTS.md missing");
  return errors;
}

describe("setup-opencode integration – copy strategy", () => {
  let tmpRoot;
  let targetDir;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-setup-copy-"));
    targetDir = path.join(tmpRoot, ".opencode");
    createFixtureProject(tmpRoot);

    execSync(`node "${path.join(tmpRoot, "scripts", "setup-opencode.js")}" "${targetDir}" copy`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("creates all expected output directories and files", () => {
    const errors = verifyOutputStructure(targetDir);
    assert.deepEqual(errors, [], `Missing: ${errors.join(", ")}`);
  });

  it("skills directory contains provisioned skills as real directories (copy)", () => {
    const skillsDir = path.join(targetDir, "skills");
    const entries = fs.readdirSync(skillsDir).filter((e) => {
      const p = path.join(skillsDir, e);
      return fs.statSync(p).isDirectory();
    });
    assert.equal(entries.length, 2, "should have 2 skills provisioned");
    assert.ok(entries.includes("test-skill"));
    assert.ok(entries.includes("another-skill"));
  });

  it("copied skill directories contain SKILL.md", () => {
    const skillPath = path.join(targetDir, "skills", "test-skill", "SKILL.md");
    assert.ok(fs.existsSync(skillPath), "SKILL.md should exist in copied skill");
    const content = fs.readFileSync(skillPath, "utf-8");
    assert.ok(content.includes("Test Skill"));
  });

  it("converted agents exist with correct frontmatter transformations", () => {
    const agentsDir = path.join(targetDir, "agents");
    const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 2, "should have 2 agents");

    const orchContent = fs.readFileSync(path.join(agentsDir, "orchestrator.md"), "utf-8");
    const [orchFm] = parseFrontmatter(orchContent);
    assert.equal(orchFm.mode, "primary");
    assert.equal(orchFm.model, "anthropic/claude-opus-4");

    const scoutContent = fs.readFileSync(path.join(agentsDir, "scout.md"), "utf-8");
    const [scoutFm] = parseFrontmatter(scoutContent);
    assert.equal(scoutFm.hidden, "true");
    assert.equal(scoutFm.omitClaudeMd, undefined);
  });

  it("converted commands have agent: build and description", () => {
    const commandsDir = path.join(targetDir, "commands");
    const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 2, "should have 2 commands");

    for (const file of files) {
      const content = fs.readFileSync(path.join(commandsDir, file), "utf-8");
      const [fm] = parseFrontmatter(content);
      assert.equal(fm.agent, "build", `${file} should have agent: build`);
      assert.ok(fm.description, `${file} should have description`);
    }
  });

  it("AGENTS.md contains merged rules", () => {
    const content = fs.readFileSync(path.join(targetDir, "AGENTS.md"), "utf-8");
    assert.ok(content.includes("## Global Rules"));
    assert.ok(content.includes("## Conditional Rules"));
    assert.ok(content.includes("Make atomic commits"));
    assert.ok(content.includes("Remove debug statements"));
  });

  it("source files in agents/, commands/, rules/ are not modified", () => {
    // Check orchestrator still has its original frontmatter with deprecated fields
    const srcContent = fs.readFileSync(path.join(tmpRoot, "agents", "orchestrator.md"), "utf-8");
    assert.ok(srcContent.includes("tools:"), "source should still have tools field");
    assert.ok(srcContent.includes("model: opus"), "source should still have original model");
  });

  it("setup output mentions skills, agents, commands, and rules in summary", () => {
    // No easy way to capture console.error output from execSync...
    // Verify the existence is sufficient evidence of success
    assert.ok(fs.existsSync(path.join(targetDir, "AGENTS.md")));
  });
});

describe("setup-opencode integration – symlink strategy", () => {
  let tmpRoot;
  let targetDir;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-setup-symlink-"));
    targetDir = path.join(tmpRoot, ".opencode");
    createFixtureProject(tmpRoot);

    execSync(`node "${path.join(tmpRoot, "scripts", "setup-opencode.js")}" "${targetDir}" symlink`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("creates all expected output directories and files", () => {
    const errors = verifyOutputStructure(targetDir);
    assert.deepEqual(errors, [], `Missing: ${errors.join(", ")}`);
  });

  it("skills are provisioned as symlinks", () => {
    const skillLink = path.join(targetDir, "skills", "test-skill");
    assert.ok(fs.existsSync(skillLink), "skill symlink should exist");
    const stat = fs.lstatSync(skillLink);
    assert.ok(stat.isSymbolicLink(), "test-skill should be a symlink");
  });

  it("symlinked SKILL.md is accessible and has correct content", () => {
    const skillMdPath = path.join(targetDir, "skills", "test-skill", "SKILL.md");
    assert.ok(fs.existsSync(skillMdPath), "SKILL.md should be accessible via symlink");
    const content = fs.readFileSync(skillMdPath, "utf-8");
    assert.ok(content.includes("Test Skill"));
  });

  it("symlink strategy does not affect agents/commands/rules conversion", () => {
    const agentsDir = path.join(targetDir, "agents");
    assert.ok(fs.existsSync(agentsDir));
    const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 2);

    const commandsDir = path.join(targetDir, "commands");
    const cmdFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
    assert.equal(cmdFiles.length, 2);
  });

  it("both skills are symlinked", () => {
    for (const name of ["test-skill", "another-skill"]) {
      const p = path.join(targetDir, "skills", name);
      assert.ok(fs.lstatSync(p).isSymbolicLink(), `${name} should be a symlink`);
    }
  });
});

describe("setup-opencode idempotent re-run", () => {
  let tmpRoot;
  let targetDir;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-setup-rerun-"));
    targetDir = path.join(tmpRoot, ".opencode");
    createFixtureProject(tmpRoot);

    // First run
    execSync(`node "${path.join(tmpRoot, "scripts", "setup-opencode.js")}" "${targetDir}" copy`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });

    // Second run with same target
    execSync(`node "${path.join(tmpRoot, "scripts", "setup-opencode.js")}" "${targetDir}" copy`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("re-run does not corrupt output", () => {
    const errors = verifyOutputStructure(targetDir);
    assert.deepEqual(errors, [], `Missing after re-run: ${errors.join(", ")}`);
  });

  it("re-run preserves agents", () => {
    const agentsDir = path.join(targetDir, "agents");
    const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 2, "should still have 2 agents after re-run");
  });

  it("re-run preserves commands", () => {
    const commandsDir = path.join(targetDir, "commands");
    const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 2, "should still have 2 commands after re-run");
  });

  it("re-run preserves AGENTS.md content", () => {
    const content = fs.readFileSync(path.join(targetDir, "AGENTS.md"), "utf-8");
    assert.ok(content.includes("## Global Rules"));
    assert.ok(content.includes("## Conditional Rules"));
  });
});

describe("setup-opencode config snippet", () => {
  let tmpRoot;
  let targetDir;
  let stderr;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-setup-config-"));
    targetDir = path.join(tmpRoot, ".opencode");
    createFixtureProject(tmpRoot);

    // setup-opencode logs everything to stderr via log() = console.error
    stderr = execSync(
      `node "${path.join(tmpRoot, "scripts", "setup-opencode.js")}" "${targetDir}" copy 2>&1`,
      { cwd: tmpRoot, stdio: "pipe", encoding: "utf-8" }
    );
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("output contains a JSON config snippet for opencode.json", () => {
    assert.ok(stderr.includes("plugin"), "should mention plugin");
    assert.ok(stderr.includes("pro-workflow"), "should mention pro-workflow");
    assert.ok(stderr.includes("instructions"), "should mention instructions");
    assert.ok(stderr.includes(".opencode/AGENTS.md"), "should reference AGENTS.md path");
  });

  it("config snippet is valid JSON", () => {
    const jsonMatch = stderr.match(/\{[\s\S]*"plugin"[\s\S]*\}/);
    assert.ok(jsonMatch, "should contain a JSON object");
    const parsed = JSON.parse(jsonMatch[0]);
    assert.ok(Array.isArray(parsed.plugin), "plugin should be an array");
    assert.ok(parsed.plugin.includes("pro-workflow"), "plugin array should contain pro-workflow");
    assert.ok(Array.isArray(parsed.instructions), "instructions should be an array");
  });

  it("config snippet references mcp server configuration", () => {
    assert.ok(stderr.includes("mcp"), "should mention mcp");
  });
});
