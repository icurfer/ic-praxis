#!/usr/bin/env bash
# unlink-claude-memory — undo the memory symlink that ic-praxis <= v0.5.3 created.
#
# Older versions shipped `scripts/setup-claude-memory.sh`, which MOVED your
# personal memory directory aside and replaced it with a symlink into this repo:
#
#   ~/.claude/projects/<encoded-repo-path>/memory  ->  <repo>/.claude/memory
#
# On a shared repo that is the wrong trade: every memory the agent saves becomes
# a repo file, so personal notes leak into the team's working tree, and the
# encoded path depends on WHERE you opened the session, so teammates (and even
# two sessions of the same person) get different results. v0.6.0 dropped that
# mechanism — the repo's `.claude/memory/` is now read-on-demand team knowledge
# (CLAUDE.md tells the agent to read `MEMORY.md` when a task touches a topic).
#
# This script reverses the link and restores the backup it made. Read-only until
# you confirm.
#
#   bash scripts/unlink-claude-memory.sh        # show the plan, ask, then act
#   bash scripts/unlink-claude-memory.sh -y     # non-interactive (CI/scripted)
#
# Nothing here deletes a real directory: it removes LINKS only, and restores
# `memory.bak.*` if one is sitting next to the link.
set -euo pipefail

ASSUME_YES=0
for a in "$@"; do
  case "$a" in
    -y|--yes) ASSUME_YES=1 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/.claude/memory"
PROJECTS="$HOME/.claude/projects"

[ -d "$PROJECTS" ] || { echo "nothing to undo: $PROJECTS does not exist."; exit 0; }

# Collect every <projects>/*/memory that is a LINK into this repo. Scanning by
# target (not by encoded path) matters: the encoded path is derived from the
# directory the session was opened in, so the same repo can have links under
# several slugs — the exact failure the retro reported.
LINKS=()
while IFS= read -r d; do
  [ -n "$d" ] || continue
  m="$d/memory"
  [ -L "$m" ] || continue
  tgt="$(readlink "$m" 2>/dev/null || true)"
  case "$tgt" in
    "$SRC"|"$SRC"/) LINKS+=("$m") ;;
  esac
done < <(find "$PROJECTS" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort)

# Windows: `mklink /J` junctions may not test as links. Only consider the slug
# for THIS repo root, and only when the directory is not a real memory store of
# its own (`rmdir` below refuses a non-empty real directory anyway).
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    ENCODED="$(echo "$REPO_ROOT" | sed 's|/|-|g')"
    J="$PROJECTS/$ENCODED/memory"
    if [ -d "$J" ] && [ ! -L "$J" ]; then LINKS+=("$J"); fi ;;
esac

if [ "${#LINKS[@]}" -eq 0 ]; then
  echo "✓ no memory link into this repo found — nothing to undo."
  echo "  (If you never ran the old setup-claude-memory.sh, this is expected.)"
  exit 0
fi

echo "Found memory link(s) into this repo:"
for m in "${LINKS[@]}"; do
  echo "  - $m  ->  $SRC"
  bak="$(find "$(dirname "$m")" -maxdepth 1 -name 'memory.bak.*' 2>/dev/null | sort | tail -n1)"
  [ -n "$bak" ] && echo "      backup to restore: $bak"
done
echo ""
echo "Plan: remove the link (the repo's .claude/memory is NOT touched), then move"
echo "      the newest memory.bak.* back into place if one exists."

if [ "$ASSUME_YES" -ne 1 ]; then
  if [ ! -t 0 ]; then
    echo "✗ not a terminal and no -y given — refusing to act unattended." >&2; exit 1
  fi
  printf 'Proceed? [y/N] '
  read -r ans
  case "$ans" in y|Y|yes|YES) ;; *) echo "aborted."; exit 0 ;; esac
fi

for m in "${LINKS[@]}"; do
  if [ -L "$m" ]; then
    rm -f "$m"
  else
    # junction (Windows) — rmdir never recurses, and fails on a real non-empty dir
    cmd //c rmdir "$(cygpath -w "$m")" >/dev/null 2>&1 \
      || { echo "✗ $m is a real directory, not a link — left untouched." >&2; continue; }
  fi
  echo "✓ unlinked: $m"
  bak="$(find "$(dirname "$m")" -maxdepth 1 -name 'memory.bak.*' 2>/dev/null | sort | tail -n1)"
  if [ -n "$bak" ] && [ ! -e "$m" ]; then
    mv "$bak" "$m"
    echo "✓ restored: $bak -> $m"
  fi
done

echo ""
echo "Done. This repo's .claude/memory/ is still here and still git-versioned —"
echo "it is now read-on-demand team knowledge (see CLAUDE.md § Memory)."
