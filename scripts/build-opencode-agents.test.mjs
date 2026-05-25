import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_SRC = path.join(__dirname, "build-opencode-agents.js");

const TOOL_MAP = {
  Read: "read",
  Glob: "glob",
  Grep: "grep",
  Bash: "bash",
  Edit: "edit",
  Write: "write",
};

const MODEL_MAP = {
  opus: "anthropic/claude-opus-4",
  sonnet: "anthropic/claude-sonnet-4",
  haiku: "anthropic/claude-haiku-4",
};

const HIDDEN_AGENTS = ["scout", "cost-analyst", "permission-analyst"];

/**
 * Parses simple YAML frontmatter including nested blocks (like permission:).
 */
function parseFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return [null, content];
  const endIdx = lines.slice(1).findIndex((l) => l.trim() === "---");
  if (endIdx === -1) return [null, content];

  const fm = {};
  let i = 1;
  while (i <= endIdx) {
    const line = lines[i];
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }
    const [, key, rawValue] = match;
    const value = rawValue.trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1);
      fm[key] = inner
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      i++;
    } else if (
      value === "" &&
      key !== "name" &&
      key !== "description" &&
      key !== "mode" &&
      key !== "model" &&
      key !== "hidden"
    ) {
      const nested = {};
      let j = i + 1;
      while (j <= endIdx && lines[j] && lines[j].match(/^\s{2,}\w/)) {
        const nm = lines[j].match(/^\s+(\w[\w-]*)\s*:\s*(.*)$/);
        if (nm) {
          const nv = nm[2].trim().replace(/^["']|["']$/g, "");
          nested[nm[1]] = nv;
        }
        j++;
      }
      fm[key] = nested;
      i = j;
    } else {
      fm[key] = value.replace(/^["']|["']$/g, "");
      i++;
    }
  }

  let bodyStart = endIdx + 2;
  while (bodyStart < lines.length && lines[bodyStart] === "") {
    bodyStart++;
  }
  const body = lines.slice(bodyStart).join("\n");
  return [fm, body];
}

function createFixtureProject(tmpRoot) {
  const agentsDir = path.join(tmpRoot, "agents");
  const scriptsDir = path.join(tmpRoot, "scripts");
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(SCRIPT_SRC, path.join(scriptsDir, "build-opencode-agents.js"));

  fs.writeFileSync(
    path.join(agentsDir, "orchestrator.md"),
    [
      "---",
      "name: orchestrator",
      "description: Multi-phase development agent",
      'tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write"]',
      'skills: ["pro-workflow"]',
      "model: opus",
      "memory: project",
      "---",
      "",
      "# Orchestrator",
      "",
      "Body content.",
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
      "isolation: worktree",
      "omitClaudeMd: true",
      "---",
      "",
      "# Scout",
      "",
      "Runs in the background.",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(agentsDir, "debugger.md"),
    [
      "---",
      "name: debugger",
      "description: Specialized debugging agent",
      'tools: ["Read", "Glob", "Grep", "Bash"]',
      "model: opus",
      "memory: project",
      "---",
      "",
      "# Debugger",
      "",
      "Systematic debugging.",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(agentsDir, "planner.md"),
    [
      "---",
      "name: planner",
      "description: Break down complex tasks",
      'tools: ["Read", "Glob", "Grep"]',
      "model: sonnet",
      "---",
      "",
      "# Planner",
      "",
      "Read-only task planner.",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(agentsDir, "reviewer.md"),
    [
      "---",
      "name: reviewer",
      "description: Code review specialist",
      'tools: ["Read", "Glob", "Grep", "Bash"]',
      "model: haiku",
      "---",
      "",
      "# Reviewer",
      "",
      "Verified reviews only.",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(agentsDir, "cost-analyst.md"),
    [
      "---",
      "name: cost-analyst",
      "description: Analyze token usage and cost",
      'tools: ["Read", "Glob", "Grep", "Bash"]',
      "omitClaudeMd: true",
      "---",
      "",
      "# Cost Analyst",
      "",
      "Analyze patterns.",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(agentsDir, "permission-analyst.md"),
    [
      "---",
      "name: permission-analyst",
      "description: Analyze permission denial patterns",
      'tools: ["Read", "Glob", "Grep", "Bash"]',
      "omitClaudeMd: true",
      "---",
      "",
      "# Permission Analyst",
      "",
      "Optimize rules.",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(agentsDir, "context-engineer.md"),
    [
      "---",
      "name: context-engineer",
      "description: Analyze context window usage",
      'tools: ["Read", "Glob", "Grep", "Bash"]',
      "omitClaudeMd: true",
      "---",
      "",
      "# Context Engineer",
      "",
      "Context optimization.",
    ].join("\n")
  );

  // Edge case: no frontmatter
  fs.writeFileSync(
    path.join(agentsDir, "no-fm.md"),
    "# No Frontmatter Agent\n\nJust a heading.\n"
  );

  // Edge case: empty tools
  fs.writeFileSync(
    path.join(agentsDir, "minimal.md"),
    [
      "---",
      "name: minimal",
      "description: Minimal agent with no tools",
      "tools: []",
      "---",
      "",
      "# Minimal",
      "",
      "Bare minimum.",
    ].join("\n")
  );

  // Edge case: unknown tool
  fs.writeFileSync(
    path.join(agentsDir, "unknown-tool.md"),
    [
      "---",
      "name: unknown-tool",
      "description: Agent with unknown tool",
      'tools: ["Read", "NonExistentTool", "Grep"]',
      "---",
      "",
      "# Test",
    ].join("\n")
  );
}

describe("parseFrontmatter (unit)", () => {
  it("returns null fm and full content when no frontmatter", () => {
    const content = "# Just a heading\n\nSome body text.\n";
    const [fm, body] = parseFrontmatter(content);
    assert.equal(fm, null);
    assert.equal(body, content);
  });

  it("returns null for malformed frontmatter (no closing ---)", () => {
    const content = "---\nname: test\n# Body\n";
    const [fm, body] = parseFrontmatter(content);
    assert.equal(fm, null);
    assert.equal(body, content);
  });

  it("parses simple string fields", () => {
    const content = "---\nname: orchestrator\ndescription: Does things\n---\n\nBody text.";
    const [fm, body] = parseFrontmatter(content);
    assert.equal(fm.name, "orchestrator");
    assert.equal(fm.description, "Does things");
    assert.equal(body, "Body text.");
  });

  it("parses array fields (tools)", () => {
    const content = '---\ntools: ["Read", "Glob", "Grep"]\n---\n\nBody.\n';
    const [fm] = parseFrontmatter(content);
    assert.deepEqual(fm.tools, ["Read", "Glob", "Grep"]);
  });

  it("parses empty array as empty list", () => {
    const content = "---\ntools: []\n---\n\nBody.\n";
    const [fm] = parseFrontmatter(content);
    assert.deepEqual(fm.tools, []);
  });

  it("parses single-value arrays", () => {
    const content = '---\ntools: ["Read"]\n---\n\nBody.\n';
    const [fm] = parseFrontmatter(content);
    assert.deepEqual(fm.tools, ["Read"]);
  });

  it("handles booleans as strings (true/false)", () => {
    const content = "---\nbackground: true\nisolation: worktree\nomitClaudeMd: true\n---\n\nBody.\n";
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.background, "true");
    assert.equal(fm.isolation, "worktree");
    assert.equal(fm.omitClaudeMd, "true");
  });

  it("strips surrounding quotes from string values", () => {
    const content = '---\ndescription: "Has quotes"\n---\n\nBody.\n';
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Has quotes");
  });

  it("parses nested permission block from converter output", () => {
    const content = [
      "---",
      "description: Test",
      "permission:",
      "  read: allow",
      "  glob: allow",
      "  grep: allow",
      "---",
      "",
      "# Body",
    ].join("\n");
    const [fm] = parseFrontmatter(content);
    assert.equal(typeof fm.permission, "object");
    assert.equal(fm.permission.read, "allow");
    assert.equal(fm.permission.glob, "allow");
    assert.equal(fm.permission.grep, "allow");
  });

  it("handles mixed simple and nested fields", () => {
    const content = [
      "---",
      'description: "Test agent"',
      "mode: primary",
      'model: "anthropic/claude-opus-4"',
      "permission:",
      "  read: allow",
      "  glob: allow",
      "---",
      "",
      "# Body",
    ].join("\n");
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Test agent");
    assert.equal(fm.mode, "primary");
    assert.equal(fm.model, "anthropic/claude-opus-4");
    assert.equal(fm.permission.read, "allow");
    assert.equal(fm.permission.glob, "allow");
  });
});

describe("build-opencode-agents integration", () => {
  let tmpRoot;
  let agentsDir;
  let outputDir;
  let outputFiles;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-agents-"));
    agentsDir = path.join(tmpRoot, "agents");
    outputDir = path.join(tmpRoot, ".opencode", "agents");
    createFixtureProject(tmpRoot);

    execSync(`node "${path.join(tmpRoot, "scripts", "build-opencode-agents.js")}" "${outputDir}"`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });

    outputFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"));
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function readFm(agentName) {
    const content = fs.readFileSync(path.join(outputDir, `${agentName}.md`), "utf-8");
    const [fm] = parseFrontmatter(content);
    return fm;
  }

  it("converts all valid agents (skips no-frontmatter file)", () => {
    // no-fm.md has no frontmatter and no name field -> skipped
    // 8 named agents + minimal + unknown-tool = 10 output files
    assert.equal(outputFiles.length, 10, "should produce 10 output files");
    assert.ok(outputFiles.includes("orchestrator.md"));
    assert.ok(outputFiles.includes("scout.md"));
    assert.ok(outputFiles.includes("debugger.md"));
    assert.ok(outputFiles.includes("planner.md"));
    assert.ok(outputFiles.includes("reviewer.md"));
    assert.ok(outputFiles.includes("cost-analyst.md"));
    assert.ok(outputFiles.includes("permission-analyst.md"));
    assert.ok(outputFiles.includes("context-engineer.md"));
    assert.ok(outputFiles.includes("minimal.md"));
    assert.ok(outputFiles.includes("unknown-tool.md"));
  });

  it("orchestrator gets mode: primary", () => {
    const fm = readFm("orchestrator");
    assert.equal(fm.mode, "primary");
    assert.equal(fm.hidden, undefined);
  });

  it("subagents get mode: subagent", () => {
    for (const agent of ["debugger", "planner", "reviewer", "context-engineer"]) {
      const fm = readFm(agent);
      assert.equal(fm.mode, "subagent", `${agent} should be subagent`);
    }
  });

  it("hidden agents get hidden: true", () => {
    for (const name of HIDDEN_AGENTS) {
      const fm = readFm(name);
      assert.equal(fm.hidden, "true", `${name} should be hidden`);
    }
    const orchFm = readFm("orchestrator");
    assert.equal(orchFm.hidden, undefined, "orchestrator should not be hidden");
  });

  it("tools are mapped to permission (Read -> read: allow, etc.)", () => {
    const fm = readFm("debugger");
    const perm = fm.permission;
    assert.equal(typeof perm, "object");
    assert.equal(perm.read, "allow");
    assert.equal(perm.glob, "allow");
    assert.equal(perm.grep, "allow");
    assert.equal(perm.bash, "allow");
  });

  it("orchestrator has all 6 tool permissions", () => {
    const fm = readFm("orchestrator");
    for (const [, v] of Object.entries(TOOL_MAP)) {
      assert.equal(fm.permission[v], "allow", `orchestrator should have ${v}: allow`);
    }
  });

  it("planner has only 3 tool permissions", () => {
    const fm = readFm("planner");
    const perm = fm.permission;
    assert.equal(typeof perm, "object");
    assert.equal(Object.keys(perm).length, 3);
    assert.equal(perm.read, "allow");
    assert.equal(perm.glob, "allow");
    assert.equal(perm.grep, "allow");
    assert.equal(perm.bash, undefined);
  });

  it("empty tools produces no permission field", () => {
    const fm = readFm("minimal");
    assert.equal(fm.permission, undefined, "should have no permission field");
  });

  it("unknown tool names are silently ignored in permission mapping", () => {
    const fm = readFm("unknown-tool");
    assert.equal(fm.permission.read, "allow");
    assert.equal(fm.permission.grep, "allow");
    assert.equal(fm.permission.NonExistentTool, undefined);
    assert.equal(Object.keys(fm.permission).length, 2);
  });

  it("model opus maps to anthropic/claude-opus-4", () => {
    assert.equal(readFm("orchestrator").model, MODEL_MAP.opus);
    assert.equal(readFm("debugger").model, MODEL_MAP.opus);
  });

  it("model sonnet maps to anthropic/claude-sonnet-4", () => {
    assert.equal(readFm("planner").model, MODEL_MAP.sonnet);
  });

  it("model haiku maps to anthropic/claude-haiku-4", () => {
    assert.equal(readFm("reviewer").model, MODEL_MAP.haiku);
  });

  it("agents without model field omit model in output", () => {
    assert.equal(readFm("context-engineer").model, undefined);
  });

  it("deprecated fields (omitClaudeMd, memory, skills, background, isolation) are dropped from output", () => {
    const scoutFm = readFm("scout");
    assert.equal(scoutFm.omitClaudeMd, undefined, "omitClaudeMd should be dropped");
    assert.equal(scoutFm.background, undefined, "background should be dropped");
    assert.equal(scoutFm.isolation, undefined, "isolation should be dropped");

    const caFm = readFm("cost-analyst");
    assert.equal(caFm.omitClaudeMd, undefined);

    const orchFm = readFm("orchestrator");
    assert.equal(orchFm.memory, undefined, "memory should be dropped");
    assert.equal(orchFm.skills, undefined, "skills should be dropped");

    const dbgFm = readFm("debugger");
    assert.equal(dbgFm.memory, undefined);
  });

  it("description is preserved in output", () => {
    assert.equal(readFm("orchestrator").description, "Multi-phase development agent");
  });

  it("body content is preserved after frontmatter", () => {
    const content = fs.readFileSync(path.join(outputDir, "scout.md"), "utf-8");
    assert.ok(content.includes("# Scout"), "should contain original heading");
    assert.ok(content.includes("Runs in the background."), "should contain original body");
  });

  it("output is valid YAML frontmatter followed by markdown body", () => {
    const content = fs.readFileSync(path.join(outputDir, "orchestrator.md"), "utf-8");
    const [fm, body] = parseFrontmatter(content);
    assert.ok(fm, "should parse frontmatter");
    assert.ok(fm.description, "should have description");
    assert.ok(body.startsWith("#"), "body should start with markdown heading");
    assert.ok(body.includes("Body content."), "should contain body text");
  });
});
