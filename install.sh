#!/usr/bin/env bash
#
# ic-guardrails installer — scaffold the discipline system INTO a project.
#
# It only copies the template files (CLAUDE.md, docs/, scripts/, .claude/, ...)
# into the target repo. It never leaves ic-guardrails' own repo, .git, or
# templates/ folder behind — so your project is not polluted.
#
#   # recommended — run at your project root, nothing left behind:
#   curl -fsSL https://raw.githubusercontent.com/icurfer/ic-guardrails/main/install.sh | bash
#   #  or:  wget -qO- https://raw.githubusercontent.com/icurfer/ic-guardrails/main/install.sh | bash
#
#   # from a local clone (kept OUTSIDE your project):
#   /path/to/ic-guardrails/install.sh /path/to/your/project
#
# Idempotent: never overwrites an existing file unless you pass --force.
#
set -euo pipefail

BRANCH="main"
TARBALL="https://codeload.github.com/icurfer/ic-guardrails/tar.gz/refs/heads/${BRANCH}"
REPO_URL="https://github.com/icurfer/ic-guardrails.git"   # git fallback only
FORCE=0
TARGET="."
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
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
    echo "→ fetching ic-guardrails (curl)..."
    curl -fsSL "$TARBALL" | tar -xz -C "$TMP"
  elif command -v wget >/dev/null 2>&1; then
    echo "→ fetching ic-guardrails (wget)..."
    wget -qO- "$TARBALL" | tar -xz -C "$TMP"
  elif command -v git >/dev/null 2>&1; then
    echo "→ fetching ic-guardrails (git)..."
    git clone --depth 1 "$REPO_URL" "$TMP/ic-guardrails-${BRANCH}" >/dev/null 2>&1
  else
    echo "✗ need one of: curl, wget, or git" >&2; exit 1
  fi
  SRC="$(find "$TMP" -maxdepth 2 -type d -name templates | head -n1)"
fi
[ -n "${SRC:-}" ] && [ -d "$SRC" ] || { echo "✗ templates/ not found" >&2; exit 1; }

mkdir -p "$TARGET"
echo "→ scaffolding into: $(cd "$TARGET" && pwd)"

copied=0 skipped=0
# copy every file under templates/, preserving structure, skipping existing
while IFS= read -r -d '' f; do
  rel="${f#"$SRC"/}"
  dest="$TARGET/$rel"
  mkdir -p "$(dirname "$dest")"
  if [ -e "$dest" ] && [ "$FORCE" -ne 1 ]; then
    echo "  skip (exists): $rel"; skipped=$((skipped+1)); continue
  fi
  cp "$f" "$dest"; echo "  add: $rel"; copied=$((copied+1))
done < <(find "$SRC" -type f -print0)

# seed a one-line version file if the project has none
if [ ! -e "$TARGET/version" ]; then printf '%s' "0.1.0" > "$TARGET/version"; echo "  add: version (0.1.0)"; fi

chmod +x "$TARGET"/scripts/*.sh "$TARGET/.githooks/pre-commit" 2>/dev/null || true

echo ""
echo "✓ scaffolded ($copied new, $skipped kept)."
echo "Next (from the project root):"
echo "  1) activate the commit gate:      bash scripts/install-hooks.sh"
echo "  2) git-version the memory:         bash scripts/setup-claude-memory.sh"
echo "  3) in Claude Code, customize:      /guardrails-init <one line about your project>"
echo "     (fills placeholders in CLAUDE.md + the gate, then proves the gate blocks a bad commit)"
