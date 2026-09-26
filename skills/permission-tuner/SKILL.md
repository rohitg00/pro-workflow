---
name: permission-tuner
description: Analyze permission prompts and auto mode denials, then generate permission rules and autoMode entries that cut prompt fatigue. Use when prompts keep interrupting, auto mode falls back to prompting, or after sessions with many denials.
user-invocable: true
---

# Permission Tuner

Reduce permission prompts by fixing their causes, not by piling up rules.

## Trigger

Use when:
- Permission prompts interrupt flow repeatedly
- Auto mode keeps blocking routine work or falls back to prompting everything
- Starting a new project and want to configure permissions

## How Prompts Happen

- Rules resolve first: deny > ask > allow. A matching ask rule prompts even in auto mode, and a PreToolUse hook returning `allow` cannot override it.
- In auto mode, anything no rule resolves goes to a classifier. After 3 blocks in a row or 20 in a session, auto mode pauses and prompts for everything until you approve one.
- Auto mode drops broad allow rules: `Bash(*)`, wildcarded interpreters like `Bash(node *)`, package-manager run commands, `Agent`, and `Monitor`.
- Hooks that exit 2 on harmless commands count as denials and push the session toward that fallback.

## Workflow

### Step 1: Gather data

Rules merge across scopes, so check every file that exists, not only the user file. `/permissions` shows the rules Claude Code actually loaded, and `claude auto-mode config` shows the effective `autoMode` (the classifier ignores `autoMode` in `.claude/settings.local.json`).

```bash
for f in ~/.claude/settings.json .claude/settings.json .claude/settings.local.json; do
  [ -f "$f" ] && jq --arg f "$f" '{file: $f, mode: .permissions.defaultMode, allow: (.permissions.allow|length), ask: (.permissions.ask|length), deny: (.permissions.deny|length), autoMode: (.autoMode != null)}' "$f"
done
claude auto-mode config
ls -t ~/.claude/projects/*/*.jsonl | head -20 | xargs grep -ho '"toolDenialKind":"[^"]*"' | sort | uniq -c | sort -rn
```

`toolDenialKind` values seen in transcripts (undocumented, may change): `permission-rule` (rule or hook), `automode-blocked` (classifier), `automode-parsing-error` and `automode-unavailable` (no verdict, not tunable), `user-rejected` (you said no).

### Step 2: Pick the right fix

| Symptom | Fix |
|---------|-----|
| Prompt on something you always approve | Remove or narrow the ask rule |
| `permission-rule` on a harmless command | Fix the hook false positive or narrow the deny rule |
| Classifier blocks work in your own repos, registries, local services | Add an `autoMode.environment` entry |
| Classifier blocks one routine pattern | Add an `autoMode.allow` entry |
| Want outward actions only when you asked | Add an `autoMode.soft_deny` entry |
| Want a human check every time | Keep a short `permissions.ask` rule |

### Step 3: Generate rules

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(npm test)",
      "Bash(npm run lint)"
    ],
    "ask": [
      "Bash(git push --force*)",
      "Bash(git push * main)",
      "Bash(git push * main *)",
      "Bash(git push *:main)",
      "Bash(git push *:main *)",
      "Bash(git push * master)",
      "Bash(git push * master *)",
      "Bash(git push *:master)",
      "Bash(git push *:master *)",
      "Bash(gh pr merge *)",
      "Bash(npm publish*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Read(**/.env)",
      "Read(**/.env.*)"
    ]
  },
  "autoMode": {
    "environment": [
      "$defaults",
      "Source control: repositories under github.com/your-org are trusted; feature-branch pushes are routine."
    ],
    "allow": ["$defaults"],
    "soft_deny": [
      "$defaults",
      "Merging a pull request needs the user's approval for that specific merge."
    ]
  }
}
```

`autoMode` only takes effect in `~/.claude/settings.json`, managed settings, or `--settings`. Keep `"$defaults"` in each list. Check the result with `claude auto-mode config` and review custom rules with `claude auto-mode critique`.

## Output

```text
PERMISSION TUNER REPORT

Mode: [mode]   Rules: [X] allow, [Y] ask, [Z] deny   autoMode: [yes/no]
Denials: [n] permission-rule, [n] classifier, [n] no verdict, [n] you rejected

Remove (ask rules you always approve):
  - Bash(...) -- approved [n]x

Add to autoMode.environment:
  + "..." -- clears [n] blocks

Add to autoMode.allow / soft_deny:
  + "..."

Fix hooks:
  ! [script] blocked [n] harmless commands

Keep asking:
  ~ force push, merge, publish, deploy

Estimated prompts saved per session: ~[N]
```

## Rules

- Prefer `autoMode` entries over new ask rules
- Destructive operations stay in deny or ask
- Always present changes for user approval before applying
- Never write `autoMode` into project settings
- Include estimated prompt savings
