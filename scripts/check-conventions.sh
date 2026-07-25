#!/usr/bin/env bash
#
# check-conventions.sh — ic-praxis' OWN praxis gate (dogfooding).
#
# This repo ships the scaffold in templates/ but is not a CI-deployed app, so the
# gate is tuned for a scaffold repo: bump the root 'version' whenever the shipped
# scaffold or installer changes (that IS ic-praxis' release signal), keep the
# version file well-formed, and never let a real secret land in an example that
# ships to every user. This is the same engine as templates/scripts/, retuned —
# when you fix the engine THERE, mirror the fix HERE (and vice versa).
#
# Every gate judges the STAGED BLOB (`git show ":$f"`), never the working tree.
# Portability: stock bash 3.2 (macOS) and Git Bash (Windows) — no bash-4-isms.
#
# Usage:  scripts/check-conventions.sh          # staged (hook)
#         scripts/check-conventions.sh --all    # sweep working tree for secrets
# Bypass: git commit --no-verify
#
set -euo pipefail

# Staged paths are repo-root relative — run from the root so `git show :path`,
# pathspecs, and AREA regexes agree no matter where the script was invoked from.
cd "$(git rev-parse --show-toplevel)"

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
BARE_VALUE_FILES_RE='(^|/)(\.env[^/]*|[^/]+\.(ya?ml|properties|ini|conf|cfg|toml|env))$|(^|/)dockerfile[^/]*$'
# Placeholders — the scaffold intentionally ships CHANGE_ME / {{...}} examples.
# Checked per assignment against the extracted VALUE; a line is exempt only if
# ALL its values are placeholders. Wordy patterns are boundary-anchored.
PLACEHOLDER_RE='(CHANGE_?ME|REDACTED|xxxx+|\$\{|\{\{|<[^>]*>|(^|[^[:alnum:]])(example|placeholder|dummy|change[-_]?me)([^[:alnum:]]|$))'
SECRET_MIN_LEN=8
# Pathspecs the `--all` sweep scans. Staged mode ALWAYS scans every staged file.
FORBIDDEN_GLOBS=('.')
# ────────────────────────────────────────────────────────────────────────────

RED=$'\033[31m'; GRN=$'\033[32m'; DIM=$'\033[2m'; RST=$'\033[0m'
fail=0
err()  { printf '%s✗%s %s\n' "$RED" "$RST" "$1" >&2; fail=1; }
ok()   { printf '%s✓%s %s\n' "$GRN" "$RST" "$1" >&2; }

MODE="${1:-}"

# quotepath=false: git shell-quotes non-ASCII paths otherwise, breaking the AREA
# regexes and `git show ":$f"` — silently skipping files the gate must judge.
gitq() { git -c core.quotepath=false "$@"; }

# Gate A judges every staged change INCLUDING deletions (removing a shipped file
# changes the scaffold too); the "bump" must survive the commit; content scans
# read only files that will exist.
CHANGED_LIST="$(gitq diff --cached --name-only --diff-filter=ACMRD || true)"
PRESENT_LIST="$(gitq diff --cached --name-only --diff-filter=ACMR || true)"
DELETED_LIST="$(gitq diff --cached --name-only --diff-filter=D || true)"

content() {
  if [ "$MODE" = "--all" ]; then cat -- "$1" 2>/dev/null
  else git show ":$1" 2>/dev/null; fi
}

# ── Gate A: scaffold changed but 'version' not bumped ───────────────────────
# A staged DELETION of the version file is never a bump — it removes the signal.
for i in "${!AREA_CODE_RE[@]}"; do
  code_re="${AREA_CODE_RE[$i]}"; vfile="${AREA_VFILE[$i]}"
  [ -n "$code_re" ] && [ -n "$vfile" ] || continue
  if printf '%s\n' "$DELETED_LIST" | grep -Fxq -e "$vfile"; then
    err "'$vfile' is staged for DELETION — the release signal would vanish."
    printf '%s    → unstage it (git restore --staged %s), or --no-verify if intentional.%s\n' "$DIM" "$vfile" "$RST" >&2
    continue
  fi
  if printf '%s\n' "$CHANGED_LIST" | grep -Eq -e "$code_re"; then
    if printf '%s\n' "$PRESENT_LIST" | grep -Fxq -e "$vfile"; then
      ok "scaffold release bumped ('$vfile' staged with a shipped change)"
    else
      err "shipped scaffold/installer changed but '$vfile' is not staged."
      printf '%s    → patch-bump %s and git add it. Changed shipped paths:%s\n' "$DIM" "$vfile" "$RST" >&2
      printf '%s\n' "$CHANGED_LIST" | grep -E -e "$code_re" | sed 's/^/        /' >&2
    fi
  fi
done

# ── Gate B: version file format (one non-empty line, no blank second line) ──
# Judged on the staged blob. A single trailing newline is tolerated — this repo
# itself writes the file with `printf '%s'`, but the gate must not hard-block
# an editor-touched adopter repo.
seen_vfiles=' '
for vfile in "${AREA_VFILE[@]}"; do
  [ -n "$vfile" ] || continue
  case "$seen_vfiles" in *" $vfile "*) continue ;; esac
  seen_vfiles="$seen_vfiles$vfile "
  content "$vfile" >/dev/null 2>&1 || continue
  nlines="$(content "$vfile" | awk 'END{print NR}')"
  first="$(content "$vfile" | head -n1)"
  if [ "${nlines:-0}" -ne 1 ] || [ -z "$first" ]; then
    err "'$vfile' must be exactly one non-empty line (staged: ${nlines:-0} line(s))."
    printf '%s    → printf %%s "<version>" > %s   (then git add it)%s\n' "$DIM" "$vfile" "$RST" >&2
  else
    ok "'$vfile' format ok ($first)"
  fi
done

# ── Gate C: forbidden patterns (secrets / taboos), staged blob ──────────────
scan_targets() {
  if [ "$MODE" = "--all" ]; then
    gitq ls-files -- ${FORBIDDEN_GLOBS[@]+"${FORBIDDEN_GLOBS[@]}"}
  else
    printf '%s\n' "$PRESENT_LIST"
  fi
}
QUOTED_ASSIGN_RE="${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*(\"[^\"]{${SECRET_MIN_LEN},}\"|'[^']{${SECRET_MIN_LEN},}'|[\"'][^\"' ]{${SECRET_MIN_LEN},})"
BARE_ASSIGN_RE="${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*[A-Za-z0-9_+/=.-]{${SECRET_MIN_LEN},}[[:space:]]*(#.*)?\$"
assign_val() {
  printf '%s\n' "$1" | sed -En \
    -e "s@.*${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*\"([^\"]{${SECRET_MIN_LEN},})\".*@\2@p" \
    -e "s@.*${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*'([^']{${SECRET_MIN_LEN},})'.*@\2@p" \
    -e "s@.*${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*[\"']([^\"' ]{${SECRET_MIN_LEN},}).*@\2@p" \
    -e "s@.*${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*([a-z0-9_+/=.-]{${SECRET_MIN_LEN},})[[:space:]]*(#.*)?\$@\2@p" \
    | head -n1
}
line_all_placeholders() {  # $1 = line, $2 = assign regex
  lline="$(printf '%s\n' "$1" | tr '[:upper:]' '[:lower:]')"
  found=0
  while IFS= read -r m; do
    [ -n "$m" ] || continue
    found=1
    v="$(assign_val "$m")"
    [ -n "$v" ] || return 1
    printf '%s\n' "$v" | grep -Eiq -e "$PLACEHOLDER_RE" || return 1
  done < <(printf '%s\n' "$lline" | grep -oE -e "$2" || true)
  [ "$found" -eq 1 ]
}
report_hit() { if [ "$1" -eq 0 ]; then err "forbidden pattern detected:"; fi; }
hit=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  body="$(content "$f")" || continue
  [ -n "$body" ] || continue
  for pat in ${FORBIDDEN_PATTERNS[@]+"${FORBIDDEN_PATTERNS[@]}"}; do
    while IFS= read -r line; do
      report_hit "$hit"; hit=1
      printf '        %s: %s\n' "$f" "$line" >&2
    done < <(printf '%s\n' "$body" | grep -nIE -e "$pat" || true)
  done
  assign_re="$QUOTED_ASSIGN_RE"
  if printf '%s\n' "$f" | grep -Eiq -e "$BARE_VALUE_FILES_RE"; then
    assign_re="${QUOTED_ASSIGN_RE}|${BARE_ASSIGN_RE}"
  fi
  while IFS= read -r line; do
    if line_all_placeholders "$line" "$assign_re"; then continue; fi
    report_hit "$hit"; hit=1
    printf '        %s: %s\n' "$f" "$line" >&2
  done < <(printf '%s\n' "$body" | grep -nIiE -e "$assign_re" || true)
done < <(scan_targets)

# ── Gate D: deploy-manifest sync (optional, staged blob) ────────────────────
for m in ${DEPLOY_MANIFESTS[@]+"${DEPLOY_MANIFESTS[@]}"}; do
  [ -n "$m" ] || continue
  vfile="${m%%|*}"; rest="${m#*|}"; mfile="${rest%%|*}"; tag_re="${rest#*|}"
  content "$vfile" >/dev/null 2>&1 && content "$mfile" >/dev/null 2>&1 || continue
  want="$(content "$vfile" | head -n1)"
  have="$(content "$mfile" | sed -nE "s/.*${tag_re}.*/\1/p" | head -n1)"
  if [ -n "$have" ] && [ "$want" != "$have" ]; then
    err "version($want) != manifest tag($have) in $mfile — bump the manifest too."
  fi
done

# ── Gate E: dual-agent constitution sync (CLAUDE.md ↔ AGENTS.md) ────────────
# One rule set, two native entrypoints: Claude Code reads CLAUDE.md, Codex
# reads AGENTS.md. Both carry a marker-delimited shared block that must stay
# byte-identical — otherwise the two agents follow different rules and drift
# silently. Judged on the staged blob, like every other gate.
#   - both files carry the block          → blocks must match
#   - one carries it, the other file exists WITHOUT it → that agent can't see
#     the shared rules → block (finish the merge, or delete the odd file out)
#   - only one entrypoint exists at all   → single-agent setup, nothing to judge
SHARED_BEGIN='<!-- praxis:shared:begin -->'
SHARED_END='<!-- praxis:shared:end -->'
shared_block() {  # prints the block body; empty if the file or markers are absent
  content "$1" | awk -v b="$SHARED_BEGIN" -v e="$SHARED_END" \
    '$0==b{on=1;next} $0==e{on=0} on{print}'
}
if content CLAUDE.md >/dev/null 2>&1 && content AGENTS.md >/dev/null 2>&1; then
  c_block="$(shared_block CLAUDE.md)"
  a_block="$(shared_block AGENTS.md)"
  if [ -z "$c_block" ] && [ -z "$a_block" ]; then
    :  # neither carries the praxis block — the sync mechanism isn't in use here
  elif [ "$c_block" = "$a_block" ]; then
    ok "constitution in sync (CLAUDE.md ↔ AGENTS.md shared block)"
  elif [ -z "$c_block" ] || [ -z "$a_block" ]; then
    err "one constitution entrypoint has no praxis:shared block — that agent can't see the shared rules."
    printf '%s    → copy the <!-- praxis:shared:begin/end --> block into the file that lacks it, or delete that file if unused.%s\n' "$DIM" "$RST" >&2
  else
    err "CLAUDE.md and AGENTS.md shared blocks have DRIFTED — the two agents would follow different rules."
    printf '%s    → edit one, copy the marker block VERBATIM into the other, then stage both.%s\n' "$DIM" "$RST" >&2
  fi
fi

# ── Result ──────────────────────────────────────────────────────────────────
if [ "$fail" -ne 0 ]; then
  printf '\n%sCommit blocked.%s Fix the above, or bypass intentionally with %sgit commit --no-verify%s\n' \
    "$RED" "$RST" "$DIM" "$RST" >&2
  exit 1
fi
printf '%spraxis gate passed.%s\n' "$GRN" "$RST" >&2
exit 0
