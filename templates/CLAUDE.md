<!--
  CLAUDE.md — the project constitution. The coding agent reads this every session.
  Replace every {{...}} placeholder. Delete guidance comments once filled.
  Keep it short and enforceable: rules the agent must FOLLOW, not prose.

  DUAL-AGENT: the block between the praxis:shared markers is mirrored VERBATIM
  in AGENTS.md (the same constitution for AGENTS.md-reading agents, e.g. Codex).
  Edit the shared rules in either file, copy the block into the other, stage
  both — the pre-commit gate (Gate E) blocks the commit if they drift.
-->

<!-- praxis:shared:begin -->
# {{PROJECT_NAME}}

## System map
<!-- The lay of the land: services/apps/repos, ports, and one-line roles. -->
| Component | Port | Role |
|---|---|---|
| {{app}} | {{port}} | {{role}} |

## Change size — pick the workflow FIRST (do not skip)
A four-doc set for a typo makes people bypass the whole system, so it dies. Size
the change first, then follow the matching workflow:

**Big change** — any ONE of: a new source file, ≥100 lines of code changed, a new
API/endpoint, infra change, a new dependency, or a rule change. → full flow below.

**Small change** — none of the above (typo, copy tweak, tiny bugfix). → skip
spec/scope/deferred: just make the change, bump the deploy trigger if code
changed, add **one `CHANGELOG` line** and tick `backlog.md`. Done.

### Big-change work order
1. **Check the backlog first** — read `docs/requirements/backlog.md` before starting new planning; mark handled items ✅ + version.
2. Write **`docs/spec/plan-vX.Y.Z.md`** (spec) — clone the latest, edit as a diff. Every new feature spec states 3 lines: **placement / credential storage / existing pattern it follows**.
3. Write **`docs/scope/scope-vX.Y.Z.md`** — MVP scope at file/function granularity.
4. Update **`docs/deferred/backlog-vX.Y.Z.md`** — move non-MVP items here.
5. Implement.
6. **Bump the deploy trigger file (`{{VERSION_FILE}}`) in every affected area** — the agent does this WITHOUT being told; CI won't fire otherwise.
7. Write **`docs/done/done-vX.Y.Z-{timestamp}.md`** + one CHANGELOG line + mark the backlog item ✅.

## Delegated responsibilities (agent does these unprompted)
<!-- The steps humans forget. Name them so the agent owns them. -->
- Bump `{{VERSION_FILE}}` whenever you touch deploy-affecting code.
- `{{VERSION_FILE}}` is exactly one non-empty line — no blank second line (`printf '%s' "<ver>" > {{VERSION_FILE}}`).

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
<!-- praxis:shared:end -->

## Routing a new rule (which layer?)
When a retro yields a new convention, place it in the RIGHT layer — the more
mechanical and the more often it must fire, the harder the layer:
- **checkable at commit** → git gate in `scripts/check-conventions.sh`
- **must fire during the agent's tool use** (block/modify/react) → a Claude Code
  hook in `.claude/settings.json` (PreToolUse/PostToolUse)
- **a bounded sub-task another agent should own in isolation** → a sub-agent in
  `.claude/agents/` (multi-session module — see below)
- **repeatable multi-step procedure** → a skill in `.claude/skills/`
- **durable fact to recall when relevant** → `.claude/memory/`
- **always-on judgment rule** → a "Do NOT"/work-order line in this file
Don't put a narrow rule in an always-loaded layer — it taxes every unrelated session.

<!-- OPTIONAL — keep this section ONLY if this repo is run with several parallel
     sessions (a hub coordinating multiple sub-units). Delete it otherwise — an
     inapplicable rule taxes every session; /praxis-init asks and prunes it.
     Installed by: install.sh --multi-session (adds .claude/agents/worker.md +
     .claude/settings.json). Section ends at the /multi-session marker. -->
## Multi-session rule (hub + parallel sessions)
Independent CLI sessions share ONE working tree, so two of them editing the hub
(`docs/`, this file, `CHANGELOG`, shared config) end in a **silent last-write-wins**
overwrite — git never sees a conflict. Therefore:
- Prefer **one main session + sub-agents** over several independent sessions —
  a sub-agent's final message returns to the main session = a real handoff channel.
- A **sub-agent edits only its own sub-unit** (code + that unit's version file).
  **Only the main session writes the hub** (`docs/`, this file, `CHANGELOG`).
- **One sub-unit = one session.** Never `git add -A` / `git commit -a` on the hub.
- If you truly must edit in parallel, use `isolation: worktree` — **not lock files**
  (a lock only hides the symptom; the root cause is the shared tree, so isolate).
<!-- /multi-session module -->


## Memory
`.claude/memory/` is shared, cross-session memory (one fact per file, indexed in
`MEMORY.md`). Save durable facts there, not incidental conversation detail. Run
`bash scripts/setup-claude-memory.sh` once per clone to git-version it and load it
each session. Starter rules are marked `(STARTER RULE …)` — keep or prune them.
This system is meant to grow, but growth must stay signal: periodically run
`/praxis-review` (or `bash scripts/praxis-review.sh`) to prune stale rules
and dead gates.
