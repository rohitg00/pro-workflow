---
description: Analyze permission denial patterns and generate optimized allow/deny rules to reduce prompt fatigue
---

# /permission-tuner - Permission Optimization

Analyze your permission patterns and generate rules to reduce prompt fatigue.

## Quick Start

Run this command to:
1. Scan permission denial history
2. Identify safe patterns for auto-approval
3. Generate optimized rules
4. Present for your approval

## What It Does

Reads your session's permission patterns and categorizes them:

- **Safe to auto-approve**: Read-only operations (Read, Glob, Grep, git status/diff/log)
- **Consider auto-approving**: Frequently approved operations (Edit, npm test)
- **Keep asking**: Operations that need review (git commit, npm install)
- **Auto-deny**: Dangerous operations (rm -rf, git push --force)

## Usage

```
/permission-tuner
```

After running, review the suggested rules and apply the ones you want.
