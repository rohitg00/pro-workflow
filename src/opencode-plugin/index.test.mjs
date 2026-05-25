import { describe, it, before } from "node:test";
import { strict as assert } from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_HOOKS = [
  "event",
  "tool.execute.before",
  "tool.execute.after",
  "shell.env",
  "permission.ask",
  "experimental.session.compacting",
];

function mockPluginInput() {
  return {
    project: { id: "test-project" },
    client: { app: { log: () => {} } },
    $: async () => String(""),
    directory: "/tmp",
    worktree: "/tmp",
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
  };
}

describe("ProWorkflow Plugin Entry Point", () => {
  let mod;

  before(async () => {
    mod = await import(path.resolve(__dirname, "../../dist/opencode-plugin/index.mjs"));
  });

  it("exports an async function (Plugin type)", () => {
    assert.equal(typeof mod.ProWorkflow, "function");
    const isAsync =
      mod.ProWorkflow.constructor.name === "AsyncFunction" ||
      String(mod.ProWorkflow).startsWith("async");
    assert.ok(isAsync, "ProWorkflow should be an async function");
  });

  it("exports default PluginModule with { server } shape", () => {
    assert.equal(typeof mod.default, "object");
    assert.notEqual(mod.default, null);
    assert.equal(mod.default.server, mod.ProWorkflow);
    assert.equal(mod.default.tui, undefined);
  });

  it("receives plugin input without throwing", async () => {
    const hooks = await mod.ProWorkflow(mockPluginInput());
    assert.equal(typeof hooks, "object");
    assert.ok(hooks !== null, "should return a non-null hooks object");
  });

  it("returns object with all 6 expected OpenCode hook keys", async () => {
    const hooks = await mod.ProWorkflow(mockPluginInput());

    for (const key of EXPECTED_HOOKS) {
      assert.ok(key in hooks, `hooks object should contain "${key}" hook`);
      assert.equal(typeof hooks[key], "function", `hooks["${key}"] should be a function`);
    }
  });

  it("all 6 hook handlers are async functions", async () => {
    const hooks = await mod.ProWorkflow(mockPluginInput());

    for (const key of EXPECTED_HOOKS) {
      const fn = hooks[key];
      const isAsync =
        fn.constructor.name === "AsyncFunction" || String(fn).startsWith("async");
      assert.ok(isAsync, `"${key}" handler should be async`);
    }
  });

  it("handlers can be called without throwing", async () => {
    const hooks = await mod.ProWorkflow(mockPluginInput());

    await assert.doesNotReject(async () => {
      await hooks.event({ event: { type: "session.created" } });
    }, "event handler should not throw");

    await assert.doesNotReject(async () => {
      await hooks["tool.execute.before"](
        { tool: "test", sessionID: "s1", callID: "c1" },
        { args: {} },
      );
    }, "tool.execute.before should not throw");

    await assert.doesNotReject(async () => {
      await hooks["tool.execute.after"](
        { tool: "test", sessionID: "s1", callID: "c1", args: {} },
        { title: "", output: "", metadata: {} },
      );
    }, "tool.execute.after should not throw");

    await assert.doesNotReject(async () => {
      await hooks["shell.env"]({ cwd: "/tmp" }, { env: {} });
    }, "shell.env should not throw");

    await assert.doesNotReject(async () => {
      await hooks["permission.ask"]({}, { status: "ask" });
    }, "permission.ask should not throw");

    await assert.doesNotReject(async () => {
      await hooks["experimental.session.compacting"](
        { sessionID: "s1" },
        { context: [] },
      );
    }, "experimental.session.compacting should not throw");
  });

  it("lazy store init: store is null at import time, handler calls init without throwing", () => {
    assert.equal(
      typeof mod.getStoreState,
      "function",
      "should export getStoreState helper for testing",
    );

    const before = mod.getStoreState();
    assert.equal(before, null, "store should not be initialized before first handler call");
  });

  it("hooks object includes tool registrations for all three custom tools", async () => {
    const hooks = await mod.ProWorkflow(mockPluginInput());
    assert.ok("tool" in hooks, "hooks should have a 'tool' key for custom tools");
    assert.equal(typeof hooks.tool, "object", "hooks.tool should be an object");
    assert.notEqual(hooks.tool, null, "hooks.tool should not be null");

    assert.ok("pw-search" in hooks.tool, "should register pw-search tool");
    assert.ok("pw-learn" in hooks.tool, "should register pw-learn tool");
    assert.ok("pw-wiki-query" in hooks.tool, "should register pw-wiki-query tool");
  });
});
