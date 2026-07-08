<!--
  CLAUDE.md — the project constitution. The coding agent reads this every session.
  Replace every {{...}} placeholder. Delete guidance comments once filled.
  Keep it short and enforceable: rules the agent must FOLLOW, not prose.
-->

# {{PROJECT_NAME}}

## System map
<!-- The lay of the land: services/apps/repos, ports, and one-line roles. -->
| Component | Port | Role |
|---|---|---|
| {{app}} | {{port}} | {{role}} |

## Work order (do not skip)
1. **Check the backlog first** — read `docs/requirements/backlog.md` before starting new planning; mark handled items ✅ + version.
2. Write **`docs/spec/plan-vX.Y.Z.md`** (spec) — clone the latest, edit as a diff. Every new feature spec states 3 lines: **placement / credential storage / existing pattern it follows**.
3. Write **`docs/scope/scope-vX.Y.Z.md`** — MVP scope at file/function granularity.
4. Update **`docs/deferred/backlog-vX.Y.Z.md`** — move non-MVP items here.
5. Implement.
6. **Bump the deploy trigger file (`{{VERSION_FILE}}`) in every affected repo** — the agent does this WITHOUT being told; CI won't fire otherwise.
7. Write **`docs/done/done-vX.Y.Z-{timestamp}.md`** + one CHANGELOG line + mark the backlog item ✅.

## Delegated responsibilities (agent does these unprompted)
<!-- The steps humans forget. Name them so the agent owns them. -->
- Bump `{{VERSION_FILE}}` whenever you touch deploy-affecting code.
- `{{VERSION_FILE}}` is exactly one line, no blank second line.

## Do NOT
<!-- Each rule earns its place by having caused a real incident. Add the "why".
     The first four are universal starters — keep or replace with your own. -->
- Do not push if the build/checks fail — chain `check && commit && push`. (why: a broken build shipped once.)
- Do not edit code with `sed`/blind replace — use exact-match edits only. (why: a stray match corrupted a file.)
- Do not offer a "quick fix" that skips diagnosis — go diagnose → plan → implement. (why: shortcuts mask the cause and it resurfaces.)
- Do not micro-bump-spam deploys — batch related changes into one version bump. (why: deploy churn and keepalive thrash.)
- {{add your own hard-won rules}}

## Automated gate
The mechanically-checkable rules above are enforced at commit time by
`.githooks/pre-commit` → `scripts/check-conventions.sh`. Enable once per clone:
`bash scripts/install-hooks.sh`. Bypass (emergency): `git commit --no-verify`.
When a retro produces a new checkable rule, add a gate to that script.

## Memory
`.claude/memory/` is shared, cross-session memory (one fact per file, indexed in
`MEMORY.md`). Save durable facts there, not incidental conversation detail. Run
`bash scripts/setup-claude-memory.sh` once per clone to git-version it and load it
each session. Starter rules are marked `(STARTER RULE …)` — keep or prune them.
This system is meant to grow, but growth must stay signal: periodically run
`/praxis-review` (or `bash scripts/praxis-review.sh`) to prune stale rules
and dead gates.
