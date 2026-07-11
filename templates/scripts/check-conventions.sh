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
#   scripts/check-conventions.sh --all    # also sweep the whole working tree for secrets
#
# Emergency bypass:  git commit --no-verify
#
set -euo pipefail

# ── Config (tune these for your project) ────────────────────────────────────
# AREAS — one entry per deployable unit, expressed as two PARALLEL arrays:
# AREA_CODE_RE[i] is the code paths that "must be deployed"; AREA_VFILE[i] is the
# deploy-trigger file CI watches. Touching those paths without bumping that file
# in the SAME commit means CI never fires. (Two arrays, not a delimited string,
# because a CODE_RE like '(src/|lib/)' already contains '|'.)
#
# AREA_CODE_RE[i] is an extended regex matched against staged paths (repo-root
# relative). A single-deploy-unit repo has ONE area (the default below). A
# monorepo adds one per unit and ANCHORS each with '^' so units don't bleed:
#   AREA_CODE_RE=( '^backend/'               '^frontend/(src/|public/)' )
#   AREA_VFILE=(   'backend/version'         'frontend/version'         )
# (module: monorepo — /praxis-init enables this shape when it detects >1 unit.)
AREA_CODE_RE=(
  '^(src/|lib/|app/|public/|package\.json$|package-lock\.json$|pnpm-lock\.yaml$|go\.mod$|pyproject\.toml$|requirements\.txt$|Dockerfile|Cargo\.toml$)'
)
AREA_VFILE=(
  'version'
)

# DEPLOY_MANIFESTS — optional. Keep a deploy manifest's image tag in sync with a
# version file, so a version bump can't ship without updating what actually
# deploys. Empty = disabled. One entry per pair:
#   'VERSION_FILE|MANIFEST_FILE|TAG_REGEX'
# TAG_REGEX is an extended regex with ONE capture group for the tag, and it MUST
# match your manifest's ACTUAL layout — a nested-YAML `tag: "x"` and a flattened
# `image.tag: x` need different regexes. Verify it once:
#   sed -nE 's/.*<TAG_REGEX>.*/\1/p' <manifest>   # should print just the tag
# (module: deploy-manifest — enable on k8s/Helm/compose repos.)
DEPLOY_MANIFESTS=(
  # nested Helm values.yaml (image:\n  tag: "1.2.3"):
  # 'backend/version|helm/backend/values.yaml|tag:[[:space:]]*"?([^"[:space:]]+)"?'
)

# Secret / taboo detection ---------------------------------------------------
# Literal secrets — any match blocks outright (no placeholder exception).
FORBIDDEN_PATTERNS=(
  'AKIA[0-9A-Z]{16}'                       # AWS access key id
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'     # private key literal
)
# key/value secret assignment — matches both `foo = "..."` and `foo: "..."`
# (YAML/Helm/compose/Actions), which the '=' only form used to miss entirely.
SECRET_KEY_RE='(password|passwd|secret_?key|secretkey|token|api_?key)'
# Lines whose value looks like a placeholder/scaffold are skipped, so the gate
# doesn't flag `secretKey: "CHANGE_ME_..."` in its own templates.
PLACEHOLDER_RE='(CHANGE_ME|change[-_]?me|REDACTED|EXAMPLE|xxxx+|\$\{|\{\{|<[^>]+>)'
# Minimum value length for the key/value gate ({3,} over-flags `token: "abc"`).
SECRET_MIN_LEN=8
# Files the forbidden-pattern gate scans. Array; widen/narrow as needed.
FORBIDDEN_GLOBS=('.')
# ────────────────────────────────────────────────────────────────────────────

RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; RST=$'\033[0m'
fail=0
err()  { printf '%s✗%s %s\n' "$RED" "$RST" "$1" >&2; fail=1; }
ok()   { printf '%s✓%s %s\n' "$GRN" "$RST" "$1" >&2; }

MODE="${1:-}"
staged() { git diff --cached --name-only --diff-filter=ACMR; }
STAGED_LIST="$(staged || true)"

# Read a file's to-be-committed content: the staged blob (index), NOT the
# working tree — a pre-commit gate must judge what actually gets committed.
# `--all` mode sweeps the working tree instead.
content() {
  if [ "$MODE" = "--all" ]; then cat -- "$1" 2>/dev/null
  else git show ":$1" 2>/dev/null; fi
}

# ── Gate A: deploy-trigger bump missing (per area) ──────────────────────────
# Deploy-affecting code is staged but that area's version file is not → CI never
# fires and the change silently never ships. Pure docs/config changes are exempt.
for i in "${!AREA_CODE_RE[@]}"; do
  code_re="${AREA_CODE_RE[$i]}"; vfile="${AREA_VFILE[$i]}"
  [ -n "$code_re" ] && [ -n "$vfile" ] || continue
  if printf '%s\n' "$STAGED_LIST" | grep -Eq -e "$code_re"; then
    if printf '%s\n' "$STAGED_LIST" | grep -qx -e "$vfile"; then
      ok "deploy trigger bumped ('$vfile' staged with code change)"
    else
      err "deploy code changed but '$vfile' is not staged — CI won't fire."
      printf '%s    → patch-bump %s and git add it. Changed code paths:%s\n' "$DIM" "$vfile" "$RST" >&2
      printf '%s\n' "$STAGED_LIST" | grep -E -e "$code_re" | sed 's/^/        /' >&2
    fi
  fi
done

# ── Gate B: version file format (one line, no blank second line) ────────────
# Check every distinct version file referenced by AREAS.
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

# ── Gate C: forbidden patterns (secrets / taboos) ───────────────────────────
# Reads the STAGED blob (or the working tree under --all) — never a mix, so a
# secret staged then deleted from the working tree is still caught.
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
  # 1) literal secrets — always block
  for pat in "${FORBIDDEN_PATTERNS[@]}"; do
    while IFS= read -r line; do
      report_hit "$hit"; hit=1
      printf '        %s: %s\n' "$f" "$line" >&2
    done < <(printf '%s\n' "$body" | grep -nE -e "$pat" || true)
  done
  # 2) key/value secret assignment — block unless the value is a placeholder
  while IFS= read -r line; do
    printf '%s' "$line" | grep -Eiq -e "$PLACEHOLDER_RE" && continue
    report_hit "$hit"; hit=1
    printf '        %s: %s\n' "$f" "$line" >&2
  done < <(printf '%s\n' "$body" | grep -niE -e "${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*[\"'][^\"' ]{${SECRET_MIN_LEN},}" || true)
done < <(scan_targets)

# ── Gate D: deploy-manifest sync (optional) ─────────────────────────────────
# A version bump that doesn't update the manifest tag ships the OLD image.
for m in "${DEPLOY_MANIFESTS[@]}"; do
  [ -n "$m" ] || continue
  vfile="${m%%|*}"; rest="${m#*|}"; mfile="${rest%%|*}"; tag_re="${rest#*|}"
  [ -f "$vfile" ] && [ -f "$mfile" ] || continue
  want="$(head -n1 "$vfile")"
  have="$(sed -nE "s/.*${tag_re}.*/\1/p" "$mfile" 2>/dev/null | head -n1)"
  if [ -n "$have" ] && [ "$want" != "$have" ]; then
    err "version($want) != manifest tag($have) in $mfile — bump the manifest too."
  fi
done

# ── Result ──────────────────────────────────────────────────────────────────
if [ "$fail" -ne 0 ]; then
  printf '\n%sCommit blocked.%s Fix the above, or bypass intentionally with %sgit commit --no-verify%s\n' \
    "$RED" "$RST" "$DIM" "$RST" >&2
  exit 1
fi
printf '%spraxis gate passed.%s\n' "$GRN" "$RST" >&2
exit 0
