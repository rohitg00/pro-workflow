import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_SRC = path.join(__dirname, "build-opencode-commands.js");

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
    fm[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
  const body = lines.slice(endIdx + 2).join("\n");
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

describe("parseFrontmatter – commands variant", () => {
  it("parses description from frontmatter", () => {
    const content = "---\ndescription: Does something useful\n---\n\n# /cmd\n";
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Does something useful");
  });

  it("returns null fm for no frontmatter", () => {
    const content = "# /cmd - A command\n\nBody.\n";
    const [fm, body] = parseFrontmatter(content);
    assert.equal(fm, null);
    assert.equal(body, content);
  });

  it("strips quotes from description value", () => {
    const content = '---\ndescription: "Quoted desc"\n---\n\nBody.\n';
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Quoted desc");
  });
});

describe("inferDescription", () => {
  it("extracts from /command - Description pattern (em dash)", () => {
    const content = "# /commit — Smart Commit with Quality Gates\n\nProcess.\n";
    assert.equal(inferDescription(content), "Smart Commit with Quality Gates");
  });

  it("extracts from /command - Description pattern (en dash)", () => {
    const content = "# /commit – Smart Commit\n\nProcess.\n";
    assert.equal(inferDescription(content), "Smart Commit");
  });

  it("extracts from /command - Description pattern (hyphen)", () => {
    const content = "# /commit - Smart Commit\n\nProcess.\n";
    assert.equal(inferDescription(content), "Smart Commit");
  });

  it("falls back to first heading text when no slash-command pattern", () => {
    const content = "# Simple Command\n\nJust a command.\n";
    assert.equal(inferDescription(content), "Simple Command");
  });

  it("returns null for content with no heading", () => {
    const content = "Just some text.\nNo heading.\n";
    assert.equal(inferDescription(content), null);
  });
});

describe("build-opencode-commands integration", () => {
  let tmpRoot;
  let commandsDir;
  let outputDir;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-cmds-"));
    commandsDir = path.join(tmpRoot, "commands");
    outputDir = path.join(tmpRoot, ".opencode", "commands");
    const scriptsDir = path.join(tmpRoot, "scripts");
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });

    fs.copyFileSync(SCRIPT_SRC, path.join(scriptsDir, "build-opencode-commands.js"));

    // Command with frontmatter
    fs.writeFileSync(
      path.join(commandsDir, "with-fm.md"),
      ["---", "description: Command with explicit frontmatter", "---", "", "# /with-fm - Has Frontmatter", "", "Body content."].join("\n")
    );

    // Command without frontmatter — infer from heading
    fs.writeFileSync(
      path.join(commandsDir, "no-fm.md"),
      "# /no-fm — Inferred from heading\n\nNo frontmatter body.\n"
    );

    // Command without frontmatter — fallback to heading
    fs.writeFileSync(
      path.join(commandsDir, "plain-heading.md"),
      "# Plain Heading\n\nBody with no slash pattern.\n"
    );

    // Command without frontmatter and no heading
    fs.writeFileSync(
      path.join(commandsDir, "no-heading.md"),
      "Just some text, no heading at all.\n"
    );

    // Edge case: empty file
    fs.writeFileSync(path.join(commandsDir, "empty.md"), "");

    execSync(`node "${path.join(scriptsDir, "build-opencode-commands.js")}" "${outputDir}"`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("creates the output directory", () => {
    assert.ok(fs.existsSync(outputDir), "output directory should exist");
  });

  it("converts all 5 fixture commands", () => {
    const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 5);
  });

  it("adds agent: build to every output", () => {
    for (const file of fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(outputDir, file), "utf-8");
      const [fm] = parseFrontmatter(content);
      assert.ok(fm, `${file} should have frontmatter`);
      assert.equal(fm.agent, "build", `${file} should have agent: "build"`);
    }
  });

  it("preserves explicit description from frontmatter", () => {
    const content = fs.readFileSync(path.join(outputDir, "with-fm.md"), "utf-8");
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Command with explicit frontmatter");
  });

  it("infers description from heading when no frontmatter exists", () => {
    const content = fs.readFileSync(path.join(outputDir, "no-fm.md"), "utf-8");
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Inferred from heading");
  });

  it("falls back to first heading for plain headings", () => {
    const content = fs.readFileSync(path.join(outputDir, "plain-heading.md"), "utf-8");
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "Plain Heading");
  });

  it("falls back to filename when no heading exists", () => {
    const content = fs.readFileSync(path.join(outputDir, "no-heading.md"), "utf-8");
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "no-heading");
  });

  it("handles empty files with filename fallback", () => {
    const content = fs.readFileSync(path.join(outputDir, "empty.md"), "utf-8");
    const [fm] = parseFrontmatter(content);
    assert.equal(fm.description, "empty");
    assert.equal(fm.agent, "build");
  });

  it("output has valid YAML frontmatter structure", () => {
    for (const file of fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(outputDir, file), "utf-8");
      const lines = content.split("\n");
      assert.equal(lines[0].trim(), "---", `${file} should start with ---`);
      const endIdx = lines.slice(1).findIndex((l) => l.trim() === "---");
      assert.ok(endIdx >= 0, `${file} should have closing ---`);
    }
  });

  it("preserves original body content", () => {
    const content = fs.readFileSync(path.join(outputDir, "with-fm.md"), "utf-8");
    assert.ok(content.includes("# /with-fm - Has Frontmatter"));
    assert.ok(content.includes("Body content."));
  });
});

describe("build-opencode-commands batch test with real commands", () => {
  let outputDir;

  before(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-real-cmds-"));
    // Run from real project root against real commands/ dir
    execSync(`node "${SCRIPT_SRC}" "${outputDir}"`, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "pipe",
    });
  });

  after(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it("converts all 22 real commands", () => {
    const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, 22, "should convert exactly 22 commands");
  });

  it("every command has agent: build", () => {
    for (const file of fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(outputDir, file), "utf-8");
      const [fm] = parseFrontmatter(content);
      assert.equal(fm.agent, "build", `${file} should have agent: "build"`);
    }
  });

  it("every command has a non-empty description", () => {
    for (const file of fs.readdirSync(outputDir).filter((f) => f.endsWith(".md"))) {
      const content = fs.readFileSync(path.join(outputDir, file), "utf-8");
      const [fm] = parseFrontmatter(content);
      assert.ok(fm.description, `${file} should have a description`);
      assert.ok(fm.description.length > 0, `${file} description should not be empty`);
    }
  });
});
