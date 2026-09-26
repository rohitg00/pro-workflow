---
description: Analyze permission prompts and auto mode denials, then generate permission rules and autoMode entries that reduce prompt fatigue
---

# /permission-tuner - Permission Optimization

Find out why Claude Code keeps prompting or denying, and fix the cause.

## Quick Start

Run this command to:
1. Read your permission rules and `autoMode` config
2. Count denials by kind from recent session transcripts
3. Separate hook false positives, classifier blocks, and ask-rule prompts
4. Present recommended changes for your approval

## What It Does

- **Ask rules you always approve**: suggests removing them, since ask rules prompt even in auto mode
- **Classifier blocks on routine work**: suggests `autoMode.environment` or `autoMode.allow` entries
- **Hook false positives**: names the hook script that blocked harmless commands, since each block counts toward auto mode's fallback to prompts
- **Dangerous operations**: keeps them in deny or ask

## Usage

```text
/permission-tuner
```

After running, review the suggested changes and apply the ones you want. `autoMode` entries belong in `~/.claude/settings.json`.
