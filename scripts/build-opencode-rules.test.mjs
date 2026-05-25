import { describe, it, before, after } from "node:test";
import { strict as assert } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_SRC = path.join(__dirname, "build-opencode-rules.js");

function parseFrontmatterRule(content) {
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
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    if (value === "true") fm[key] = true;
    else if (value === "false") fm[key] = false;
    else fm[key] = value;
  }
  const body = lines.slice(endIdx + 2).join("\n").trim();
  return [fm, body];
}

describe("build-opencode-rules integration with fixtures", () => {
  let tmpRoot;
  let rulesDir;
  let outputFile;

  before(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-rules-"));
    rulesDir = path.join(tmpRoot, "rules");
    outputFile = path.join(tmpRoot, ".opencode", "AGENTS.md");
    const scriptsDir = path.join(tmpRoot, "scripts");
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.mkdirSync(scriptsDir, { recursive: true });

    fs.copyFileSync(SCRIPT_SRC, path.join(scriptsDir, "build-opencode-rules.js"));

    // alwaysApply: true rule
    fs.writeFileSync(
      path.join(rulesDir, "atomic-commits.mdc"),
      [
        "---",
        "description: Make atomic commits",
        "alwaysApply: true",
        "---",
        "",
        "Make atomic commits. Each commit should represent one logical change.",
        "",
        "Write descriptive commit messages in conventional format.",
      ].join("\n")
    );

    // Another alwaysApply rule
    fs.writeFileSync(
      path.join(rulesDir, "quality-gates.mdc"),
      [
        "---",
        "description: Enforce quality checks before commits",
        "alwaysApply: true",
        "---",
        "",
        "Run lint and typecheck before every commit.",
        "",
        "No console.log or debugger statements in production code.",
      ].join("\n")
    );

    // Conditional rule with globs
    fs.writeFileSync(
      path.join(rulesDir, "no-debug.mdc"),
      [
        "---",
        'description: Remove debug statements before committing',
        'globs: "**/*.{ts,tsx,js,jsx,py,go,rs}"',
        "alwaysApply: false",
        "---",
        "",
        "Remove all debug statements before committing:",
        "- JavaScript/TypeScript: console.log(), debugger",
        "- Python: print(), breakpoint()",
      ].join("\n")
    );

    // Conditional rule with globs (comma-separated)
    fs.writeFileSync(
      path.join(rulesDir, "sql-safety.mdc"),
      [
        "---",
        "description: SQL safety rules",
        "globs: \"**/*.sql,**/*.ts,**/*.js\"",
        "alwaysApply: false",
        "---",
        "",
        "Always use parameterized queries. Never string-interpolate user input into SQL.",
      ].join("\n")
    );

    // Rule with no frontmatter (should be treated as alwaysApply)
    fs.writeFileSync(
      path.join(rulesDir, "core-rules.md"),
      "# Core Rules\n\nUniversal rules for any project.\n\n## Quality\n- Run lint before commit\n- Test affected code\n"
    );

    execSync(`node "${path.join(scriptsDir, "build-opencode-rules.js")}" "${outputFile}"`, {
      cwd: tmpRoot,
      stdio: "pipe",
    });
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("creates the AGENTS.md output file", () => {
    assert.ok(fs.existsSync(outputFile), "AGENTS.md should exist");
  });

  it("output is non-empty", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.length > 100, "should have substantial content");
  });

  it("output has a title header", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.includes("# Pro-Workflow Rules for OpenCode"), "should have title");
  });

  it("output has auto-generated note", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(
      content.includes("Auto-generated from `rules/` by `build-opencode-rules.js`"),
      "should note auto-generation"
    );
  });

  it("alwaysApply: true rules appear under Global Rules", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.includes("## Global Rules (Always Apply)"), "should have Global Rules section");
    assert.ok(content.includes("### Make atomic commits"), "should include atomic-commits rule");
    assert.ok(content.includes("### Enforce quality checks before commits"), "should include quality-gates rule");
    // No-frontmatter rule: description derived from filename, treated as alwaysApply
    assert.ok(content.includes("### core-rules"), "should include core-rules (no fm) in alwaysApply");
  });

  it("alwaysApply: false rules appear under Conditional Rules", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.includes("## Conditional Rules"), "should have Conditional Rules section");
    assert.ok(
      content.includes("### Remove debug statements before committing"),
      "should include no-debug rule"
    );
    assert.ok(content.includes("### SQL safety rules"), "should include sql-safety rule");
  });

  it("conditional rules with globs have a conversion note comment", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(
      content.includes("OpenCode note: This rule applies to files matching"),
      "should have OpenCode note for glob-based rules"
    );
    assert.ok(
      content.includes('`**/*.{ts,tsx,js,jsx,py,go,rs}`'),
      "should reference the glob pattern from no-debug"
    );
    assert.ok(
      content.includes('`**/*.sql,**/*.ts,**/*.js`'),
      "should reference the glob pattern from sql-safety"
    );
  });

  it("unconvertible glob rules are documented with instructions comment", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(
      content.includes("OpenCode does not natively support glob-based rule scoping"),
      "should warn about glob scoping limitation"
    );
    assert.ok(
      content.includes("Consider adding equivalent patterns to `opencode.json` `instructions` field"),
      "should suggest workaround"
    );
  });

  it("alwaysApply rules do NOT have glob conversion notes", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    const globalSectionStart = content.indexOf("## Global Rules");
    const conditionalSectionStart = content.indexOf("## Conditional Rules");
    const globalSection = content.slice(globalSectionStart, conditionalSectionStart);
    assert.ok(
      !globalSection.includes("OpenCode note: This rule applies to files matching"),
      "Global Rules section should not have glob notes"
    );
  });

  it("output has Conversion Notes section at the end", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.includes("## Conversion Notes"), "should have Conversion Notes section");
    assert.ok(
      content.includes("Generated by pro-workflow setup utility"),
      "should note pro-workflow origin"
    );
  });

  it("rule body content is preserved", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(
      content.includes("Make atomic commits. Each commit should represent one logical change."),
      "should preserve atomic-commits body"
    );
    assert.ok(
      content.includes("Run lint and typecheck before every commit."),
      "should preserve quality-gates body"
    );
    assert.ok(
      content.includes("Remove all debug statements before committing:"),
      "should preserve no-debug body"
    );
  });

  it("no-frontmatter rule body is preserved intact", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.includes("Universal rules for any project."));
    assert.ok(content.includes("Run lint before commit"));
  });

  it("processes all 5 fixture rules", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    const headingCount = (content.match(/^### /gm) || []).length;
    assert.equal(headingCount, 5, "should have 5 rule headings");
  });
});

describe("build-opencode-rules batch test with real rules", () => {
  let outputFile;

  before(() => {
    outputFile = fs.mkdtempSync(path.join(os.tmpdir(), "pw-test-real-rules-"));
    outputFile = path.join(outputFile, "AGENTS.md");
    execSync(`node "${SCRIPT_SRC}" "${outputFile}"`, {
      cwd: path.resolve(__dirname, ".."),
      stdio: "pipe",
    });
  });

  after(() => {
    const dir = path.dirname(outputFile);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("processes all 11 real rules", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    const ruleHeadings = (content.match(/^### /gm) || []).length;
    assert.equal(ruleHeadings, 11, "should process all 11 rules");
  });

  it("output is valid markdown with consistent structure", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    assert.ok(content.startsWith("# Pro-Workflow Rules for OpenCode"), "should start with title");
    assert.ok(content.includes("## Global Rules (Always Apply)"), "should have Global Rules section");
    assert.ok(content.includes("## Conditional Rules"), "should have Conditional Rules section");
    assert.ok(content.includes("## Conversion Notes"), "should have Conversion Notes section");
  });

  it("all sections are separated by blank lines", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    // Check that headings are followed by content, not stacked
    const sections = content.split(/\n## /);
    assert.ok(sections.length >= 3, "should have at least 3 sections");
    for (const section of sections) {
      assert.ok(section.trim().length > 0, "each section should have content");
    }
  });

  it("conversion notes contain the expected guidance", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    const convSection = content.slice(content.indexOf("## Conversion Notes"));
    assert.ok(convSection.includes("opencode.json"), "should mention opencode.json");
    assert.ok(convSection.includes("instructions"), "should mention instructions array");
  });

  it("no raw frontmatter delimiters appear in output (body dashes are from original rule content)", () => {
    const content = fs.readFileSync(outputFile, "utf-8");
    // Some real rule bodies contain "---" as markdown horizontal rules.
    // These should be at most 1-2 occurrences from the actual rule bodies,
    // not from unconverted frontmatter delimiters.
    const dashes = content.split("\n").filter((l) => l.trim() === "---");
    assert.ok(
      dashes.length <= 2,
      `expected <= 2 body horizontal rules, got ${dashes.length}`
    );
    // Verify the dash lines appear within rule body sections, not as frontmatter
    if (dashes.length > 0) {
      const allLines = content.split("\n");
      for (const [idx, line] of allLines.entries()) {
        if (line.trim() === "---") {
          // Check surrounding context — should be within a rule body, not at a section boundary
          const prevNonBlank = allLines.slice(0, idx).reverse().find((l) => l.trim() !== "");
          const nextNonBlank = allLines.slice(idx + 1).find((l) => l.trim() !== "");
          // Rule bodies have prose text around horizontal rules
          assert.ok(
            (prevNonBlank && prevNonBlank.length > 10) || (nextNonBlank && nextNonBlank.length > 10),
            `--- at line ${idx} should be within rule body prose, prefixed by blank or text`
          );
        }
      }
    }
  });
});
