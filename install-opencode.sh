#!/usr/bin/env bash
# Install pro-workflow into OpenCode
# Usage: ./install-opencode.sh [target_dir] [--force]
#
# target_dir defaults to ~/.config/opencode
#
# What it does:
#   1. Builds TypeScript (tsc)
#   2. Installs plugin module into target_dir/plugins/pro-workflow/
#   3. Provisions skills, agents, commands, rules into target_dir/
#   4. Merges plugin + instructions + mcp into target_dir/opencode.json

set -euo pipefail

TARGET="${1:-$HOME/.config/opencode}"
FORCE="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/dist/opencode-plugin"
PLUGIN_DST="$TARGET/plugins/pro-workflow"

echo ""
echo "pro-workflow — OpenCode Installer"
echo "================================="
echo "Target: $TARGET"
echo ""

# ── 1. Build ──────────────────────────────────────────────
echo "[1/4] Building TypeScript..."
( cd "$SCRIPT_DIR" && npx tsc )
echo "       Done."
echo ""

# ── 2. Install plugin module ──────────────────────────────
echo "[2/4] Installing plugin module..."
if [ ! -d "$PLUGIN_SRC" ]; then
  echo "       ERROR: Plugin build output not found at $PLUGIN_SRC"
  echo "       Make sure src/opencode-plugin/ compiles correctly."
  exit 1
fi

if [ -d "$PLUGIN_DST" ]; then
  rm -rf "$PLUGIN_DST"
fi

mkdir -p "$(dirname "$PLUGIN_DST")"
cp -rL "$PLUGIN_SRC" "$PLUGIN_DST"

# Ensure package.json exists so OpenCode resolves ES module imports
cat > "$PLUGIN_DST/package.json" <<'PKGJSON'
{
  "type": "module",
  "name": "pro-workflow-opencode-plugin",
  "version": "0.0.0"
}
PKGJSON

echo "       Installed to $PLUGIN_DST"
echo ""

# ── 3. Provision content ──────────────────────────────────
echo "[3/4] Provisioning skills, agents, commands, rules..."
node "$SCRIPT_DIR/scripts/setup-opencode.js" "$TARGET" symlink
echo ""

# ── 4. Merge config into opencode.json ────────────────────
CONFIG_FILE="$TARGET/opencode.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "[4/4] Creating $CONFIG_FILE..."
  cat > "$CONFIG_FILE" <<'JSON'
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [],
  "instructions": [],
  "mcp": {}
}
JSON
fi

echo "[4/4] Merging config..."

# Use jq to merge plugin entry
jq --arg p "$PLUGIN_DST/index.mjs" '
  .plugin as $existing |
  if ($existing | index($p)) then . else .plugin += [$p] end
' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

# Merge instructions entry
AGENTS_PATH="$TARGET/AGENTS.md"
jq --arg a "$AGENTS_PATH" '
  .instructions as $existing |
  if ($existing | index($a)) then . else .instructions += [$a] end
' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

echo "       Config merged into $CONFIG_FILE"
echo ""

# ── Summary ────────────────────────────────────────────────
echo "================================="

SKILLS=$(ls -1 "$TARGET/skills/" 2>/dev/null | wc -l)
AGENTS=$(ls -1 "$TARGET/agents/" 2>/dev/null | wc -l)
COMMANDS=$(ls -1 "$TARGET/commands/" 2>/dev/null | wc -l)

echo "Installed:"
echo "  Plugin:  $PLUGIN_DST"
echo "  Config:  $CONFIG_FILE"
echo "  Skills:  ${SKILLS:-0}"
echo "  Agents:  ${AGENTS:-0}"
echo "  Commands: ${COMMANDS:-0}"
echo "  Rules:   $AGENTS_PATH"
echo ""

if grep -q "pro-workflow" "$CONFIG_FILE"; then
  echo "Ready. Restart OpenCode to load the plugin."
else
  echo "WARNING: Config merge may have failed. Check $CONFIG_FILE manually."
fi
echo ""
