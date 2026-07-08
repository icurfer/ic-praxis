# Bootstrap prompt (copy-paste)

If you'd rather not install anything, paste this into your coding agent at the
root of the target project. It builds the same scaffold from scratch.

---

You are setting up a "praxis" discipline system in this project — where
retrospectives become machine-enforced pre-commit gates so mistakes can't ship
twice. Create these five axes, adapting each to THIS repo (inspect the stack,
build, and CI first):

1. **`CLAUDE.md`** — the agent's constitution: a system map, a numbered work
   order, delegated responsibilities (steps the agent owns unprompted, e.g.
   bumping the deploy-trigger file), and hard "Do NOT" rules — each with the
   incident-style reason it exists.

2. **`docs/`** — a four-stage flow: requirements backlog → spec → scope →
   deferred backlog → done report, plus a one-line `CHANGELOG.md`. Change is
   documented before it becomes code.

3. **`scripts/check-conventions.sh` + `.githooks/pre-commit`** — a gate that
   BLOCKS commits violating checkable rules: deploy code changed without a
   version bump (CI won't fire), malformed version file, secret/taboo patterns.
   Add `scripts/install-hooks.sh` to set `core.hooksPath`. Emergency bypass:
   `git commit --no-verify`.

4. **`.claude/memory/`** — one fact per file with a `type:` (feedback / project
   / reference / user), indexed in `MEMORY.md`; feedback/project facts include
   *why* and *how to apply*.

5. **`.claude/skills/verify-app/`** — reusable end-to-end verification (helpers +
   per-feature scenarios) instead of throwaway scripts.

Finally, enable the hook and PROVE it: stage a deploy-code change without a
version bump and show the commit is blocked, then revert. Summarize what you
customized.

Guiding principle: don't water the gate down. Tune it to fire on THIS project's
real mistakes. Rules that rely on human memory eventually break again.
