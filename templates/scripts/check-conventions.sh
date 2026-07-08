#!/usr/bin/env bash
#
# check-conventions.sh — the praxis gate.
#
# Turns human discipline into a machine-enforced pre-commit gate. Each rule
# below was (or should be) born from a real incident: something broke, you wrote
# down why, and if it was mechanically checkable you moved it here so it can
# never slip back. Add a new gate every time a retro produces a checkable rule.
#
# Usage:
#   scripts/check-conventions.sh          # check staged changes (called by the hook)
#   scripts/check-conventions.sh --all    # sweep the whole working tree
#
# Emergency bypass:  git commit --no-verify
#
set -euo pipefail

# ── Config (tune these for your project) ────────────────────────────────────
# Paths whose change means "this must be deployed" → the deploy trigger file
# must be bumped in the SAME commit, or CI won't fire.
CODE_RE='^(src/|lib/|app/|public/|package\.json$|package-lock\.json$|pnpm-lock\.yaml$|go\.mod$|pyproject\.toml$|requirements\.txt$|Dockerfile|Cargo\.toml$)'
# The file your CI watches to trigger a build/deploy (one-line version file).
VERSION_FILE='version'
# Extra forbidden patterns (grep -E). Add project taboos: debug leftovers,
# secret literals, banned APIs, etc. One regex per line.
FORBIDDEN_PATTERNS=(
  'AKIA[0-9A-Z]{16}'                       # AWS access key id
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'     # private key literal
  'password\s*=\s*["'\''][^"'\'' ]{3,}'    # hardcoded password=...
)
# Files the forbidden-pattern gate scans (staged). Widen/narrow as needed.
FORBIDDEN_GLOBS='.'
# ────────────────────────────────────────────────────────────────────────────

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; RST=$'\033[0m'
fail=0
err()  { printf '%s✗%s %s\n' "$RED" "$RST" "$1" >&2; fail=1; }
ok()   { printf '%s✓%s %s\n' "$GRN" "$RST" "$1" >&2; }

staged() { git diff --cached --name-only --diff-filter=ACMR; }
STAGED_LIST="$(staged || true)"

# ── Gate A: deploy-trigger bump missing ─────────────────────────────────────
# Deploy-affecting code is staged but the version file is not → CI never fires
# and the change silently never ships. Pure docs/config changes are exempt.
if printf '%s\n' "$STAGED_LIST" | grep -Eq "$CODE_RE"; then
  if printf '%s\n' "$STAGED_LIST" | grep -qx "$VERSION_FILE"; then
    ok "deploy trigger bumped ('$VERSION_FILE' staged with code change)"
  else
    err "deploy code changed but '$VERSION_FILE' is not staged — CI won't fire."
    printf '%s    → patch-bump %s and git add it. Changed code paths:%s\n' "$DIM" "$VERSION_FILE" "$RST" >&2
    printf '%s\n' "$STAGED_LIST" | grep -E "$CODE_RE" | sed 's/^/        /' >&2
  fi
fi

# ── Gate B: version file format (one line, no blank second line) ────────────
if [ -f "$VERSION_FILE" ]; then
  nlines="$(awk 'END{print NR}' "$VERSION_FILE")"
  first="$(head -n1 "$VERSION_FILE")"
  if [ "$nlines" -ne 1 ] || [ -z "$first" ]; then
    err "'$VERSION_FILE' must be exactly one non-empty line (currently ${nlines})."
    printf '%s    → printf %%s "<version>" > %s%s\n' "$DIM" "$VERSION_FILE" "$RST" >&2
  else
    ok "'$VERSION_FILE' format ok ($first)"
  fi
fi

# ── Gate C: forbidden patterns (secrets / taboos) ───────────────────────────
scan_targets() {
  if [ "${1:-}" = "--all" ]; then git ls-files -- $FORBIDDEN_GLOBS
  else printf '%s\n' "$STAGED_LIST"; fi
}
hit=0
for pat in "${FORBIDDEN_PATTERNS[@]}"; do
  while IFS= read -r f; do
    [ -n "$f" ] && [ -f "$f" ] || continue
    if grep -nE "$pat" "$f" >/dev/null 2>&1; then
      if [ "$hit" -eq 0 ]; then err "forbidden pattern detected:"; hit=1; fi
      grep -nE "$pat" "$f" | sed "s|^|        ${f}:|" >&2
    fi
  done < <(scan_targets "${1:-}")
done

# ── Result ──────────────────────────────────────────────────────────────────
if [ "$fail" -ne 0 ]; then
  printf '\n%sCommit blocked.%s Fix the above, or bypass intentionally with %sgit commit --no-verify%s\n' \
    "$RED" "$RST" "$DIM" "$RST" >&2
  exit 1
fi
printf '%spraxis gate passed.%s\n' "$GRN" "$RST" >&2
exit 0
