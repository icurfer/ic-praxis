#!/usr/bin/env bash
#
# ic-ratchet installer — scaffold the discipline system into a project.
#
#   # from a clone:
#   ic-ratchet/install.sh [target-dir]      # default: current dir
#
#   # one-liner (clones itself into a temp dir first):
#   curl -fsSL https://raw.githubusercontent.com/icurfer/ic-ratchet/main/install.sh | bash
#
# Idempotent: never overwrites an existing file unless you pass --force.
#
set -euo pipefail

REPO_URL="https://github.com/icurfer/ic-ratchet.git"
FORCE=0
TARGET="."
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    *) TARGET="$a" ;;
  esac
done

# Locate templates/: next to this script (clone), else clone to a temp dir (curl|bash).
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "$SELF_DIR" ] && [ -d "$SELF_DIR/templates" ]; then
  SRC="$SELF_DIR/templates"
else
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
  echo "→ fetching ic-ratchet..."
  git clone --depth 1 "$REPO_URL" "$TMP/cr" >/dev/null 2>&1
  SRC="$TMP/cr/templates"
fi
[ -d "$SRC" ] || { echo "✗ templates/ not found" >&2; exit 1; }

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

chmod +x "$TARGET/scripts/check-conventions.sh" "$TARGET/.githooks/pre-commit" 2>/dev/null || true

echo ""
echo "✓ scaffolded ($copied new, $skipped kept)."
echo "Next:"
echo "  1) if this is a git repo:  (cd \"$TARGET\" && bash scripts/install-hooks.sh)"
echo "  2) open the project in Claude Code and run:  /ratchet-init <one line about your project>"
echo "     (fills placeholders in CLAUDE.md + the gate, then proves the gate blocks a bad commit)"
