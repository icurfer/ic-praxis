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
   routing, what auto-loads) go outside the block. ASK the user whether
   AI-agent commits should carry a `Co-Authored-By` trailer (team policy, not
   auto-detectable); if yes, add a "Commit attribution" section to `AGENTS.md`
   (Claude Code appends its own trailer automatically) — if no, leave it out.

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
   only if ALL its values are placeholders. Cover `jwtSecret`/`clientSecret`
   style keys too, not just `secretKey`. For a value that is plaintext by
   policy, add a narrow `SECRET_ALLOWLIST` entry (`FILE_RE|LINE_RE`, with the
   actual value in the line regex so a change re-triggers the gate) instead of
   disabling the gate; literal AWS keys / private keys are never allowlistable.
   For a monorepo, key each deploy area to its own version file. Add `scripts/install-hooks.sh` to set
   `core.hooksPath`. Portability: keep the scripts bash-3.2/Git-Bash compatible
   (no `declare -A`, no `mapfile`; guard empty-array expansions) and add a
   `.gitattributes` pinning `*.sh`, `.githooks/*`, and `version` to `eol=lf` so
   Windows checkouts don't break the hook. Emergency bypass:
   `git commit --no-verify`.

4. **`.claude/memory/`** — one fact per file with a `type:` (feedback / project
   / reference / user), indexed in `MEMORY.md`; feedback/project facts include
   *why* and *how to apply*. Treat it as **team knowledge read on demand**: the
   constitution tells the agent to open `MEMORY.md` when a task touches a topic.
   Never link, move or replace anything under the user's personal agent
   directory (`~/.claude/`) to get auto-loading — on a shared repo that hijacks
   a per-person location and turns every saved memory into a repo file. Draw the
   team/personal line by filename and enforce it in `.gitignore`:
   `.claude/settings.local.json`, `.claude/memory/user-*.md`,
   `.claude/memory/*.local.md` are personal and ignored; everything else is
   committed. Note in the docs that a committed `.claude/` reaches every
   teammate — `settings.json` keys outrank their personal ones and its hooks
   fire in their sessions too — so committing one is a team decision.

5. **Verify skill + Codex adapters** — keep the canonical reusable end-to-end
   verification procedure (per-feature scenarios) in
   `.claude/skills/verify-app/`, with the **runnable helpers it calls in
   `scripts/`** — a skill is documentation packaging and gets renamed or
   dropped; executables buried under `.claude/skills/<name>/helpers/` split the
   repo's script conventions in two. Then add Codex-native thin adapters in
   `.agents/skills/` for `praxis-init`, `praxis-review`, and `verify-app`:
   each adapter only points to the existing canonical procedure
   (`.claude/commands/<name>.md` or `.claude/skills/<name>/SKILL.md`) instead
   of duplicating it, so Codex discovers the workflow without creating a
   second source that can drift.

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
