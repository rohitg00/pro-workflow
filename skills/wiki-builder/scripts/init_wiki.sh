#!/usr/bin/env bash
set -euo pipefail

slug=""
title=""
flavor="research"
scope="global"
root=""

usage() {
  cat <<EOF
Usage: init_wiki.sh <slug> --title "<title>" [--flavor <flavor>] [--scope global|project] [--root <path>]

Flavors: research paper domain product person organization project codebase incident
EOF
}

if [ $# -lt 1 ]; then usage; exit 1; fi
slug="$1"; shift

if ! [[ "$slug" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Invalid slug: lowercase letters, digits, hyphens only (must start alphanumeric)" >&2
  exit 1
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --title) title="$2"; shift 2 ;;
    --flavor) flavor="$2"; shift 2 ;;
    --scope) scope="$2"; shift 2 ;;
    --root) root="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [ -z "$title" ]; then echo "--title required" >&2; exit 1; fi

case "$scope" in
  global|project) ;;
  *) echo "Invalid --scope: $scope (expected global|project)" >&2; exit 1 ;;
esac

case "$flavor" in
  research|paper|domain|product|person|organization|project|codebase|incident) ;;
  *) echo "Invalid --flavor: $flavor" >&2; exit 1 ;;
esac

if [ -z "$root" ]; then
  if [ "$scope" = "project" ]; then
    project_dir="${CLAUDE_PROJECT_DIR:-$PWD}"
    root="$project_dir/.claude/wikis"
  else
    root="${WIKI_ROOT:-$HOME/.pro-workflow/wikis}"
  fi
fi

dest="$root/$slug"
if [ -d "$dest" ]; then
  echo "Wiki already exists: $dest" >&2
  exit 2
fi

mkdir -p "$dest"/{raw,wiki,derived,prompts,logs}

case "$flavor" in
  paper) mkdir -p "$dest/wiki/sections" ;;
  domain|research) mkdir -p "$dest/wiki"/{concepts,papers,questions} ;;
  product) mkdir -p "$dest/wiki"/{features,decisions,issues} ;;
  person|organization) mkdir -p "$dest/wiki"/{publications,timelines} ;;
  project) mkdir -p "$dest/wiki"/{decisions,runbooks,questions} ;;
  codebase) mkdir -p "$dest/wiki"/{modules,symbols,decisions} ;;
  incident) mkdir -p "$dest/wiki"/{timeline,signals,fixes} ;;
esac

skill_dir="$(cd "$(dirname "$0")"/.. && pwd)"
templates="$skill_dir/templates"

render() {
  local src="$1" dst="$2"
  sed -e "s|{{SLUG}}|$slug|g" \
      -e "s|{{TITLE}}|$title|g" \
      -e "s|{{FLAVOR}}|$flavor|g" \
      -e "s|{{SCOPE}}|$scope|g" \
      -e "s|{{TODAY}}|$(date -u +%Y-%m-%d)|g" \
      "$src" > "$dst"
}

render "$templates/wiki.config.md" "$dest/wiki.config.md"
render "$templates/index.md" "$dest/wiki/index.md"
render "$templates/sources.md" "$dest/sources.md"
render "$templates/maintenance-log.md" "$dest/logs/maintenance-log.md"

for p in compile-index compile-source-page compile-concept-page query-and-file lint-wiki; do
  if [ -f "$templates/prompts/$p.md" ]; then
    render "$templates/prompts/$p.md" "$dest/prompts/$p.md"
  fi
done

echo "$dest"
