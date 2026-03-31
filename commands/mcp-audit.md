---
description: Audit MCP servers for token overhead, redundancy, and usage — recommend servers to disable for faster sessions
---

# /mcp-audit - MCP Server Optimization

Audit your MCP servers and reduce token overhead.

## Quick Start

Run to see:
- Active MCP servers and their tool counts
- Estimated token overhead per request
- Servers you haven't used recently
- Recommendations for disabling/keeping

## Key Insight

Every MCP server adds ALL its tool descriptions to EVERY API request. A server with 20 tools adds ~2K-4K tokens per request whether you use it or not.

## Thresholds

- Servers: <10 ideal, >15 reduce
- Total tools: <80 ideal, >120 reduce
- Per server: <15 ok, >30 split or disable

## Usage

```
/mcp-audit
```
