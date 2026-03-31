---
description: Auto-detect project type and configure quality gates, permissions, and hooks for a new codebase
---

# /auto-setup - Project Configuration

Automatically detect your project type and set up pro-workflow quality gates.

## Quick Start

Run in any project to:
1. Detect project type (Node.js, Python, Rust, Go)
2. Configure lint/typecheck/test commands
3. Set up safe permission rules
4. Verify tooling is installed

## Supported Project Types

- **Node.js/TypeScript** — npm/pnpm/yarn, ESLint, TypeScript, Jest/Vitest
- **Python** — pip/poetry, ruff/flake8, mypy, pytest
- **Rust** — cargo, clippy, cargo test
- **Go** — go vet, golangci-lint, go test
- **Mixed/Monorepo** — detects multiple types

## Usage

```
/auto-setup
```
