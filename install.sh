#!/usr/bin/env bash
#
# ic-praxis installer — scaffold the discipline system INTO a project.
#
# It only copies the template files (CLAUDE.md, docs/, scripts/, .claude/, ...)
# into the target repo. It never leaves ic-praxis' own repo, .git, or
# templates/ folder behind — so your project is not polluted.
#
#   # recommended — run at your project root, nothing left behind:
#   curl -fsSL https://raw.githubusercontent.com/icurfer/ic-praxis/main/install.sh | bash
#   #  or:  wget -qO- https://raw.githubusercontent.com/icurfer/ic-praxis/main/install.sh | bash
#
#   # from a local clone (kept OUTSIDE your project):
#   /path/to/ic-praxis/install.sh /path/to/your/project
#
# BEST results come from letting an AI agent adopt this WITH you (/praxis-init):
# it inspects the repo, tunes the gate to real deploy paths, and turns on only
# the modules your project shape needs. The flags below are for scripted/CI use.
#
# Flags:
#   --force            overwrite existing files (default: never overwrite)
#   --no-version       don't seed a root 'version' file (per-area version repos)
#   --no-docs          don't scaffold docs/ (project already has a doc system)
#   --multi-session    also install the multi-session module
#                      (.claude/agents/worker.md + .claude/settings.json reminder)
#                      — only for a hub repo run with several parallel sessions.
#
# Idempotent: never overwrites an existing file unless you pass --force.
#
set -euo pipefail

BRANCH="main"
TARBALL="https://codeload.github.com/icurfer/ic-praxis/tar.gz/refs/heads/${BRANCH}"
REPO_URL="https://github.com/icurfer/ic-praxis.git"   # git fallback only
FORCE=0; NO_VERSION=0; NO_DOCS=0; MULTI_SESSION=0
TARGET="."
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    --no-version) NO_VERSION=1 ;;
    --no-docs) NO_DOCS=1 ;;
    --multi-session) MULTI_SESSION=1 ;;
    *) TARGET="$a" ;;
  esac
done

# Locate templates/. Priority:
#   1) next to this script  → running from a local clone
#   2) download a tarball via curl/wget into a temp dir  → no git needed, no pollution
#   3) git clone into a temp dir  → last-resort fallback
# Cases 2/3 use a temp dir that is auto-removed on exit; nothing lands in TARGET
# except the scaffold files themselves.
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "$SELF_DIR" ] && [ -d "$SELF_DIR/templates" ]; then
  SRC="$SELF_DIR/templates"
else
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
  if command -v curl >/dev/null 2>&1; then
    echo "→ fetching ic-praxis (curl)..."
    curl -fsSL "$TARBALL" | tar -xz -C "$TMP"
  elif command -v wget >/dev/null 2>&1; then
    echo "→ fetching ic-praxis (wget)..."
    wget -qO- "$TARBALL" | tar -xz -C "$TMP"
  elif command -v git >/dev/null 2>&1; then
    echo "→ fetching ic-praxis (git)..."
    git clone --depth 1 "$REPO_URL" "$TMP/ic-praxis-${BRANCH}" >/dev/null 2>&1
  else
    echo "✗ need one of: curl, wget, or git" >&2; exit 1
  fi
  SRC="$(find "$TMP" -maxdepth 2 -type d -name templates | head -n1)"
fi
[ -n "${SRC:-}" ] && [ -d "$SRC" ] || { echo "✗ templates/ not found" >&2; exit 1; }

mkdir -p "$TARGET"
echo "→ scaffolding into: $(cd "$TARGET" && pwd)"

# If the constitution won't be installed (already present, not forced), the docs/
# scaffold would land as orphan empty folders with nothing explaining them. Skip
# it and say so — don't drop a doc system on top of an existing one. (P7)
skip_docs=$NO_DOCS
if [ -e "$TARGET/CLAUDE.md" ] && [ "$FORCE" -ne 1 ] && [ "$NO_DOCS" -eq 0 ]; then
  skip_docs=1
  echo "  note: CLAUDE.md exists → skipping docs/ scaffold (pass --force to add it anyway)."
fi

copied=0 skipped=0
COPIED_FILES=()
# copy every file under templates/, preserving structure, skipping existing.
# EXCLUDE templates/optional/** — those are opt-in modules copied separately.
while IFS= read -r -d '' f; do
  rel="${f#"$SRC"/}"
  case "$rel" in
    docs/*) [ "$skip_docs" -eq 1 ] && { echo "  skip (docs off): $rel"; skipped=$((skipped+1)); continue; } ;;
  esac
  dest="$TARGET/$rel"
  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ] && [ "$FORCE" -ne 1 ]; then
    echo "  skip (exists): $rel"; skipped=$((skipped+1)); continue
  fi
  cp "$f" "$dest"; echo "  add: $rel"; copied=$((copied+1)); COPIED_FILES+=("$dest")
done < <(find "$SRC" -type f -not -path "$SRC/optional/*" -print0)

# Opt-in module: multi-session (hub + parallel sessions). (msa-fe P0/P1)
if [ "$MULTI_SESSION" -eq 1 ]; then
  MOD="$SRC/optional/multi-session"
  if [ -d "$MOD" ]; then
    echo "→ installing module: multi-session"
    while IFS= read -r -d '' f; do
      rel="${f#"$MOD"/}"; dest="$TARGET/$rel"
      mkdir -p "$(dirname "$dest")"
      if [ -e "$dest" ] && [ "$FORCE" -ne 1 ]; then
        echo "  skip (exists): $rel"; skipped=$((skipped+1)); continue
      fi
      cp "$f" "$dest"; echo "  add: $rel"; copied=$((copied+1)); COPIED_FILES+=("$dest")
    done < <(find "$MOD" -type f -print0)
  fi
fi

# Merge LF pins into a PRE-EXISTING .gitattributes (the copy loop never touches
# an existing file, but without these lines a CRLF checkout on Windows breaks the
# hook with '\r: command not found'). Additive and idempotent: appends only the
# template lines that aren't already present verbatim.
GA="$TARGET/.gitattributes"
if [ -f "$GA" ] && [ -f "$SRC/.gitattributes" ]; then
  while IFS= read -r attr; do
    case "$attr" in ''|'#'*) continue ;; esac
    if ! grep -qxF -e "$attr" "$GA"; then
      [ -n "$(tail -c1 "$GA")" ] && printf '\n' >> "$GA"
      printf '%s\n' "$attr" >> "$GA"
      echo "  merge: .gitattributes += $attr"
    fi
  done < "$SRC/.gitattributes"
fi

# Seed a one-line root 'version' file — unless disabled, already present, or the
# repo already uses per-area 'foo/version' files (monorepo). (P4)
if [ "$NO_VERSION" -eq 1 ]; then
  echo "  skip (--no-version): root version file"
elif compgen -G "$TARGET/*/version" >/dev/null 2>&1; then
  echo "  skip: per-area */version detected → not seeding a root version file."
elif [ ! -e "$TARGET/version" ]; then
  printf '%s' "0.1.0" > "$TARGET/version"; echo "  add: version (0.1.0)"
fi

# chmod +x only the files WE copied — never touch a pre-existing script we skipped. (P8)
# (guarded expansion: an all-skipped re-run leaves the array empty, and empty
#  array + set -u crashes bash <4.4 — e.g. stock macOS bash 3.2)
for c in ${COPIED_FILES[@]+"${COPIED_FILES[@]}"}; do
  case "$c" in
    */scripts/*.sh|*/.githooks/pre-commit) chmod +x "$c" 2>/dev/null || true ;;
  esac
done

echo ""
echo "✓ scaffolded ($copied new, $skipped kept)."
echo "Next (from the project root):"
echo "  1) activate the commit gate:      bash scripts/install-hooks.sh"
echo "  2) git-version the memory:         bash scripts/setup-claude-memory.sh"
echo "  3) in Claude Code, customize:      /praxis-init <one line about your project>"
echo "     (recommended — inspects the repo, tunes the gate & modules, proves it blocks a bad commit)"
