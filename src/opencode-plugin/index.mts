import type { Plugin, Hooks, PluginModule } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";
import type { Store } from "../db/store.js";
import { createStore } from "../db/store.js";
import { pwSearch, pwLearn, pwWikiQuery } from "./tools.mjs";

let _store: Store | null = null;

function getOrCreateStore(): Store {
  if (!_store) {
    _store = createStore();
  }
  return _store;
}

function getStoreState(): Store | null {
  return _store;
}

type LogFn = (msg: string) => void;

function safeLog(log: LogFn, msg: string): void {
  try {
    log(msg);
  } catch {
    /* noop — client.app.log can be absent or throw in test environments */
  }
}

export const ProWorkflow: Plugin = async (input): Promise<Hooks> => {
  const log: LogFn = (msg: string) => {
    try {
      const client = input.client;
      (client as any).app?.log?.(msg);
    } catch {
      /* noop */
    }
  };

  return {
    event: async ({ event }: { event: Event }): Promise<void> => {
      try {
        getOrCreateStore();
        safeLog(log, `ProWorkflow: event ${event.type} received`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        safeLog(log, `ProWorkflow: event ${event.type ?? "unknown"} handler error: ${message}`);
      }
    },

    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: any },
    ): Promise<void> => {
      try {
        getOrCreateStore();
        safeLog(log, `ProWorkflow: tool.execute.before ${input.tool}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        safeLog(log, `ProWorkflow: tool.execute.before error: ${message}`);
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string; args: any },
      output: { title: string; output: string; metadata: any },
    ): Promise<void> => {
      try {
        getOrCreateStore();
        safeLog(log, `ProWorkflow: tool.execute.after ${input.tool}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        safeLog(log, `ProWorkflow: tool.execute.after error: ${message}`);
      }
    },

    "shell.env": async (
      input: { cwd: string; sessionID?: string; callID?: string },
      output: { env: Record<string, string> },
    ): Promise<void> => {
      try {
        getOrCreateStore();
        safeLog(log, `ProWorkflow: shell.env`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        safeLog(log, `ProWorkflow: shell.env error: ${message}`);
      }
    },

    "permission.ask": async (input, output): Promise<void> => {
      try {
        getOrCreateStore();
        safeLog(log, `ProWorkflow: permission.ask`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        safeLog(log, `ProWorkflow: permission.ask error: ${message}`);
      }
    },

    "experimental.session.compacting": async (
      input: { sessionID: string },
      output: { context: string[]; prompt?: string },
    ): Promise<void> => {
      try {
        getOrCreateStore();
        safeLog(log, `ProWorkflow: experimental.session.compacting`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        safeLog(log, `ProWorkflow: experimental.session.compacting error: ${message}`);
      }
    },

    tool: {
      "pw-search": pwSearch,
      "pw-learn": pwLearn,
      "pw-wiki-query": pwWikiQuery,
    },
  };
};

const pluginModule: PluginModule = { server: ProWorkflow };
export default pluginModule;

export { getOrCreateStore, getStoreState };
