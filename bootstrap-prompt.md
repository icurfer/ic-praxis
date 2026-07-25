# Bootstrap prompt (copy-paste)

If you'd rather not install anything, paste this into your coding agent at the
root of the target project. It builds the same scaffold from scratch.

---

You are setting up a "praxis" discipline system in this project — where
retrospectives become machine-enforced pre-commit gates so mistakes can't ship
twice. Create these five axes, adapting each to THIS repo (inspect the stack,
build, and CI first):

1. **`CLAUDE.md` + `AGENTS.md`** — the agent's constitution: a system map, a
   numbered work order, delegated responsibilities (steps the agent owns
   unprompted, e.g. bumping the deploy-trigger file), and hard "Do NOT" rules —
   each with the incident-style reason it exists. Include a **change-size rule**:
   big changes (new source file, ≥100 lines, new API/dep/infra, rule change)
   take the full doc flow; small changes skip spec/scope/deferred and just log
   one CHANGELOG line — otherwise the doc system gets bypassed and dies.
   Ship the shared rules as a `<!-- praxis:shared:begin/end -->` marker block
   mirrored VERBATIM in both files, so Claude Code (reads `CLAUDE.md`) and
   Codex (reads `AGENTS.md`) follow the same law; agent-native notes (memory
   routing, what auto-loads) go outside the block.

2. **`docs/`** — a four-stage flow: requirements backlog → spec → scope →
   deferred backlog → done report, plus a one-line `CHANGELOG.md`. Change is
   documented before it becomes code (big changes only — see the change-size rule).

3. **`scripts/check-conventions.sh` + `.githooks/pre-commit`** — a gate that
   BLOCKS commits violating checkable rules: deploy code changed without a
   version bump (CI won't fire — **deletions count**: removing deploy code is a
   deploy too, and deleting the version file itself is never a "bump"), malformed
   version file (exactly one non-empty line, no blank second line), secret/taboo
   patterns, and constitution drift (when both `CLAUDE.md` and `AGENTS.md`
   exist, their `praxis:shared` blocks must match byte-for-byte — one entrypoint
   silently missing rules the other has is how dual-agent repos split).
   EVERY gate judges the **staged blob** (`git show ":$f"`), never the
   working tree, runs from the repo root, and disables `core.quotepath` so
   non-ASCII filenames aren't silently skipped. Match secrets in quoted form
   (`key = "..."`, YAML `key: "..."`, unterminated `key: "...`) in all files, AND
   bare form (`key: value`, `KEY=value`) in config-style files (.env/.yaml/.ini/…;
   in code a bare RHS is a variable reference). The placeholder allowlist is
   checked per assignment against each **extracted value** — a line is exempt
   only if ALL its values are placeholders. For a monorepo, key each deploy area
   to its own version file. Add `scripts/install-hooks.sh` to set
   `core.hooksPath`. Portability: keep the scripts bash-3.2/Git-Bash compatible
   (no `declare -A`, no `mapfile`; guard empty-array expansions) and add a
   `.gitattributes` pinning `*.sh`, `.githooks/*`, and `version` to `eol=lf` so
   Windows checkouts don't break the hook. Emergency bypass:
   `git commit --no-verify`.

4. **`.claude/memory/`** — one fact per file with a `type:` (feedback / project
   / reference / user), indexed in `MEMORY.md`; feedback/project facts include
   *why* and *how to apply*.

5. **`.claude/skills/verify-app/`** — reusable end-to-end verification (helpers +
   per-feature scenarios) instead of throwaway scripts.

Then apply ONLY the modules this repo's shape needs (skip the rest): **monorepo**
(per-area version files), **deploy-manifest** (a gate syncing the version to a
Helm/k8s image tag), and — only if this hub is run with several parallel sessions
— **multi-session**: a `.claude/agents/worker.md` sub-agent that edits one
sub-unit and never the hub, plus a `CLAUDE.md` rule that only the main session
writes shared `docs/`. Don't add a module a simple repo doesn't need.

Finally, enable the hook and PROVE it: stage a deploy-code change without a
version bump and show the commit is blocked, then revert. Summarize what you
customized.

Guiding principle: don't water the gate down. Tune it to fire on THIS project's
real mistakes. Rules that rely on human memory eventually break again.
