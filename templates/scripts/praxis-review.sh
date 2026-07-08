#!/usr/bin/env bash
# praxis-review — hygiene check so the system's growth stays signal, not noise.
#
# The discipline system is meant to GROW (each incident adds a rule/gate/memory).
# This surfaces the sprawl that growth creates, so you can prune it:
#   - orphan memory files   (exist on disk but not linked in MEMORY.md)
#   - dangling index lines  (MEMORY.md points to a file that's gone)
#   - growth stats + the list of active gates
#
# Read-only. It reports and proposes; it never deletes. Run:
#   bash scripts/praxis-review.sh
set -euo pipefail

MEM=".claude/memory"
IDX="$MEM/MEMORY.md"
GATE="scripts/check-conventions.sh"

CYA=$'\033[36m'; YEL=$'\033[33m'; GRN=$'\033[32m'; DIM=$'\033[2m'; RST=$'\033[0m'
hdr() { printf '\n%s== %s ==%s\n' "$CYA" "$1" "$RST"; }

[ -d "$MEM" ] || { echo "no $MEM/ here — run from a scaffolded project root." >&2; exit 1; }

# all memory files except the index
mapfile -t FILES < <(find "$MEM" -maxdepth 1 -name '*.md' ! -name 'MEMORY.md' | sort)

hdr "Growth"
printf '  memory files: %s\n' "${#FILES[@]}"
if [ -f "$GATE" ]; then
  gates="$(grep -cE '^# ── Gate |^# ──.*[Gg]ate' "$GATE" 2>/dev/null || true)"
  printf '  active gates in %s: %s\n' "$GATE" "${gates:-?}"
fi

hdr "Orphan memory files (on disk, not linked in MEMORY.md)"
orphans=0
for f in "${FILES[@]}"; do
  base="$(basename "$f")"
  if ! grep -qF "$base" "$IDX" 2>/dev/null; then
    printf '  %s! %s%s  — add a line to MEMORY.md, or delete the file\n' "$YEL" "$base" "$RST"
    orphans=$((orphans+1))
  fi
done
[ "$orphans" -eq 0 ] && printf '  %s✓ none%s\n' "$GRN" "$RST"

hdr "Dangling index lines (MEMORY.md links a missing file)"
dangling=0
while IFS= read -r link; do
  [ -n "$link" ] || continue
  if [ ! -f "$MEM/$link" ]; then
    printf '  %s! %s%s  — file missing; fix or remove the MEMORY.md line\n' "$YEL" "$link" "$RST"
    dangling=$((dangling+1))
  fi
done < <(grep -E '^[[:space:]]*-[[:space:]]*\[' "$IDX" 2>/dev/null | grep -oE '\(([A-Za-z0-9_./-]+\.md)\)' | tr -d '()' | grep -v '^MEMORY.md$' || true)
[ "$dangling" -eq 0 ] && printf '  %s✓ none%s\n' "$GRN" "$RST"

hdr "Next"
printf '  %sReview the rules themselves for staleness with:  /praxis-review%s\n' "$DIM" "$RST"
printf '  %s(this script finds structural sprawl; judgment about "still true?" is the slash command)%s\n' "$DIM" "$RST"
