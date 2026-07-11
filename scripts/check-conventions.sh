#!/usr/bin/env bash
#
# check-conventions.sh — ic-praxis' OWN praxis gate (dogfooding).
#
# This repo ships the scaffold in templates/ but is not a CI-deployed app, so the
# gate is tuned for a scaffold repo: bump the root 'version' whenever the shipped
# scaffold or installer changes (that IS ic-praxis' release signal), keep the
# version file well-formed, and never let a real secret land in an example that
# ships to every user. This is the same engine as templates/scripts/, retuned.
#
# Usage:  scripts/check-conventions.sh          # staged (hook)
#         scripts/check-conventions.sh --all    # sweep working tree for secrets
# Bypass: git commit --no-verify
#
set -euo pipefail

# ── Config (this repo's real rules) ─────────────────────────────────────────
# Changing what ships to users (the scaffold, the installer, the gate engine, the
# bootstrap prompt) is a scaffold release → bump the root 'version'. Pure README/
# docs edits are exempt.
AREA_CODE_RE=(
  '^(templates/|scripts/|install\.sh$|bootstrap-prompt\.md$)'
)
AREA_VFILE=(
  'version'
)

DEPLOY_MANIFESTS=()   # n/a — ic-praxis isn't image-deployed

# Literal secrets — always block.
FORBIDDEN_PATTERNS=(
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)
SECRET_KEY_RE='(password|passwd|secret_?key|secretkey|token|api_?key)'
# Placeholders — the scaffold intentionally ships CHANGE_ME / {{...}} examples.
PLACEHOLDER_RE='(CHANGE_ME|change[-_]?me|REDACTED|EXAMPLE|xxxx+|hunter2|\$\{|\{\{|<[^>]+>)'
SECRET_MIN_LEN=8
FORBIDDEN_GLOBS=('.')
# ────────────────────────────────────────────────────────────────────────────

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; RST=$'\033[0m'
fail=0
err()  { printf '%s✗%s %s\n' "$RED" "$RST" "$1" >&2; fail=1; }
ok()   { printf '%s✓%s %s\n' "$GRN" "$RST" "$1" >&2; }

MODE="${1:-}"
staged() { git diff --cached --name-only --diff-filter=ACMR; }
STAGED_LIST="$(staged || true)"

content() {
  if [ "$MODE" = "--all" ]; then cat -- "$1" 2>/dev/null
  else git show ":$1" 2>/dev/null; fi
}

# ── Gate A: scaffold changed but 'version' not bumped ───────────────────────
for i in "${!AREA_CODE_RE[@]}"; do
  code_re="${AREA_CODE_RE[$i]}"; vfile="${AREA_VFILE[$i]}"
  [ -n "$code_re" ] && [ -n "$vfile" ] || continue
  if printf '%s\n' "$STAGED_LIST" | grep -Eq -e "$code_re"; then
    if printf '%s\n' "$STAGED_LIST" | grep -qx -e "$vfile"; then
      ok "scaffold release bumped ('$vfile' staged with a shipped change)"
    else
      err "shipped scaffold/installer changed but '$vfile' is not staged."
      printf '%s    → patch-bump %s and git add it. Changed shipped paths:%s\n' "$DIM" "$vfile" "$RST" >&2
      printf '%s\n' "$STAGED_LIST" | grep -E -e "$code_re" | sed 's/^/        /' >&2
    fi
  fi
done

# ── Gate B: version file format (one line, no blank second line) ────────────
declare -A _seen_vfile=()
for vfile in "${AREA_VFILE[@]}"; do
  [ -n "$vfile" ] && [ -z "${_seen_vfile[$vfile]:-}" ] || continue
  _seen_vfile[$vfile]=1
  [ -f "$vfile" ] || continue
  nlines="$(awk 'END{print NR}' "$vfile")"
  first="$(head -n1 "$vfile")"
  if [ "$nlines" -ne 1 ] || [ -z "$first" ]; then
    err "'$vfile' must be exactly one non-empty line (currently ${nlines})."
    printf '%s    → printf %%s "<version>" > %s%s\n' "$DIM" "$vfile" "$RST" >&2
  else
    ok "'$vfile' format ok ($first)"
  fi
done

# ── Gate C: forbidden patterns (secrets / taboos), staged blob ──────────────
scan_targets() {
  if [ "$MODE" = "--all" ]; then git ls-files -- "${FORBIDDEN_GLOBS[@]}"
  else printf '%s\n' "$STAGED_LIST"; fi
}
report_hit() { [ "$1" -eq 0 ] && err "forbidden pattern detected:"; }
hit=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  body="$(content "$f")" || continue
  [ -n "$body" ] || continue
  for pat in "${FORBIDDEN_PATTERNS[@]}"; do
    while IFS= read -r line; do
      report_hit "$hit"; hit=1
      printf '        %s: %s\n' "$f" "$line" >&2
    done < <(printf '%s\n' "$body" | grep -nE -e "$pat" || true)
  done
  while IFS= read -r line; do
    printf '%s' "$line" | grep -Eiq -e "$PLACEHOLDER_RE" && continue
    report_hit "$hit"; hit=1
    printf '        %s: %s\n' "$f" "$line" >&2
  done < <(printf '%s\n' "$body" | grep -niE -e "${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*[\"'][^\"' ]{${SECRET_MIN_LEN},}" || true)
done < <(scan_targets)

# ── Result ──────────────────────────────────────────────────────────────────
if [ "$fail" -ne 0 ]; then
  printf '\n%sCommit blocked.%s Fix the above, or bypass intentionally with %sgit commit --no-verify%s\n' \
    "$RED" "$RST" "$DIM" "$RST" >&2
  exit 1
fi
printf '%spraxis gate passed.%s\n' "$GRN" "$RST" >&2
exit 0
