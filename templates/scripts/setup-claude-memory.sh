#!/usr/bin/env bash
# Symlink this repo's .claude/memory into Claude Code's global memory path, so
# your project's rules/memory are versioned in git AND loaded every session —
# and shared with the team via commit/PR.
#
# Run once per clone, from the repo root:  bash scripts/setup-claude-memory.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/.claude/memory"

[ -d "$SRC" ] || { echo "ERROR: $SRC not found. Run from the repo root." >&2; exit 1; }

# Claude Code encodes a project path by replacing every '/' with '-'.
ENCODED="$(echo "$REPO_ROOT" | sed 's|/|-|g')"
TARGET_DIR="$HOME/.claude/projects/$ENCODED"
TARGET="$TARGET_DIR/memory"

mkdir -p "$TARGET_DIR"

# If a real directory (not a symlink) already lives there, back it up first.
if [ -d "$TARGET" ] && [ ! -L "$TARGET" ]; then
  BACKUP="$TARGET.bak.$(date +%Y%m%d%H%M%S)"
  echo "existing memory dir found → backing up to: $BACKUP"
  mv "$TARGET" "$BACKUP"
fi

ln -sfn "$SRC" "$TARGET"
echo "✓ linked: $TARGET -> $SRC"
echo "  Your .claude/memory is now git-versioned and loaded by Claude Code each session."
