<!--
  AGENTS.md — the same praxis constitution, for agents that read AGENTS.md
  (Codex, etc.). The block between the praxis:shared markers is a VERBATIM
  mirror of the one in CLAUDE.md — the pre-commit gate (Gate E) blocks the
  commit if the two drift. Edit the shared rules in either file, then copy the
  block into the other and stage both.
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

## Memory (agent-neutral, read on demand)
Durable cross-session facts live in `.claude/memory/` — one fact per file,
indexed in `.claude/memory/MEMORY.md`. The directory is plain markdown, not
Claude-specific: when a task touches a topic, read the index and open the
matching files. Save new durable facts there (and index them) instead of
re-learning them every session.

## What auto-loads here and what doesn't
The commit gate (`.githooks/pre-commit` → `scripts/check-conventions.sh`) is a
git hook — it fires no matter which agent (or human) makes the commit.
Claude-native surfaces (`.claude/skills/`, `.claude/settings.json` hooks,
`.claude/agents/`) do NOT auto-load for AGENTS.md readers; they are still plain
markdown/JSON — `.claude/skills/*/SKILL.md` are repeatable procedures you can
read and follow when the task matches.
