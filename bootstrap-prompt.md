# Bootstrap prompt (copy-paste)

If you'd rather not install anything, paste this into your coding agent at the
root of the target project. It builds the same scaffold from scratch.

---

First ask whether adoption is personal or project-shared. If the user delegates
with "apply appropriately" / "use your judgment", default to personal and state
the choice; honor existing explicit choices. This is independent of harness type.
Default installation protects `harness/` and `docs/requirements`, `spec`, `scope`,
`deferred`, `done`, `adr` locally, leaving public guides/changelogs eligible for commit.
Use a managed `.git/info/exclude` block, or a managed `.gitignore` fallback when
Git is absent or metadata is outside the target; never write outside the target.
Provide `scripts/configure-sharing.sh personal|shared` and persist the selection
in `harness/config/sharing`. Preserve unrelated exclusions and existing choices.
Add `scripts/check-sharing.sh` to the consumer commit gate: reject staged private
files, require a staged shared declaration for shared protected paths, and always
reject runtime state. Do not auto-untrack files or rewrite history. Explain that
local hooks are bypassable and cannot prove human approval. A generic push request
is not publication consent; review actual contents before opting into shared.
Fingerprint ignored harness code/config too, so local tools changing stale the
validation result. Other scaffold files retain their existing policies.

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
   Keep CI off by default: do not create or enable a CI workflow unless the user
   explicitly requests it. Local commit checks work without CI. Preserve any
   existing workflows and explain that they remain active. With the installer,
   `--ci` explicitly opts in to the praxis workflow later.

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

Also install **`harness/` by default** (not an opt-in module): a dependency-free
Node.js 18+ CLI, `harness/bin/praxis.mjs`. Ask the user to select development or
infrastructure FIRST (honor an existing explicit choice). Persist the choice in
`harness/config/profile.json`, initially null; unselected task execution fails.
Expose `profile select development|infrastructure` and `profile status`.
Keep a common router in `src/main.mjs`, development implementation in
`src/development.mjs`, and separate guides in `profiles/development/` and
`profiles/infrastructure/`. Infrastructure uses `src/infrastructure.mjs` for record
checks only: `task list/init/check/validate/status/reconcile/index`. Configure a
user-chosen registry name, managed scope, workflow document, ignored snapshot path
and freshness limit in `config/infrastructure.json`. Optional reference metadata
stays generic. Missing config fails pending; there is no vendor default, live query,
registry mutation or server execution. The configured connector supplies complete,
sanitized, dated snapshots; reject stale/future/partial/wrong-scope or duplicate IDs.
Link existing registry IDs before creating durable records under
`harness/operations/tasks/`; preserve handwritten indexes and generate only the
managed `operations/INDEX.md`. Reconcile missing records, duplicate links,
owner/title/status drift, evidence and index freshness. Separate investigation,
plan and change scopes. Done requires no remaining in-scope work, a summary and
appropriate dated evidence; applied changes need permission and recovery references.
Attributed user confirmation stays distinct from agent verification. Record checks
are not proof of permission or live health. Agents inspect existing tasks first,
use the chosen workflow for authorized registration/updates, refresh/read back,
and reconcile before handoff. Do not bulk-close tasks or reopen completed history.
Personal/shared scope covers durable operations records; snapshots stay local in
both. Keep existing operations rules and hooks; do not apply the development
sizing/version workflow. Both types keep CI off. Preserve selections/config/records
on normal reinstall; changing types needs a reviewed migration, not `--force`.
Existing development checks/records stay in place.
The requirements below describe development, not infrastructure operations.
Use a versioned JSON project config listing named executable argument arrays and
timeouts. Start with no checks until real project commands are configured; empty
or malformed settings must fail closed. Default tasks to big changes requiring
nonempty plan files; preserve existing task IDs. Reuse the staged Git gate before
running checks and retain the actual pre-commit hook. Store local task/validation
metadata in ignored `harness/.state/`, block concurrent writers and out-of-repo
paths, and invalidate old passes when HEAD, index or tracked/nonignored files
change. Do not claim plan quality or external state has been proven. Invalidate a
prior pass before commands run and reject checks that change fingerprinted files.
Add meaningful failure/freshness tests and the canonical `.claude/commands/praxis-task.md`
procedure plus a thin `.agents/skills/praxis-task/SKILL.md` adapter. Users can ask
in natural language to start, validate or inspect a task. No automatic CI,
branch creation, commit, push or deployment. Keep local Bash gates usable without Node.

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


### Harness hardening (0.8.1)

Validation status exits nonzero for stale, failed or missing evidence. Staged
semantic versions must increase relative to HEAD. First-push CI uses a valid
empty baseline commit. On POSIX, timeout and interruption stop the started
process group; Windows stops the direct process. CI remains opt-in.


### Distribution boundaries and execution inputs (0.8.2)

Audit shipped templates with `node scripts/check-portability.mjs templates`.
An optional external JSON policy (`{"deny":["private-literal"]}`) can add
consumer-specific exclusions without storing them in the scaffold. The root
commit gate audits the staged templates. Pattern checks support human review;
they do not prove that every domain-specific assumption has been removed.
Use `bash scripts/check-index-clean.sh <pathspec>...` before execution-based
commit checks. It rejects unstaged or untracked inputs without changing files.
Ignored dependencies are outside this check; install them from lockfiles.

## User-approved ADR workflow

Ship a common `adr propose/check/accept/list` CLI, independent of profile selection,
with `.claude/commands/praxis-adr.md` as the canonical procedure and a thin
`.agents/skills/praxis-adr/SKILL.md` adapter. Use `docs/adr/<id>.md` with Context,
Decision, Alternatives, Consequences and `<id>.json` for proposed/accepted state.
Ask the user about meaningful architectural choices, presenting alternatives and
consequences before acceptance. Require real explicit approval of the reviewed
content; silence is not consent. Preserve existing explicit approval without
asking again. Bind acceptance to a required reviewed SHA256 and separate sanitized
local evidence, approver and timestamp; reject stale hashes, incomplete sections,
unsafe paths, symlinks and overwrites. Lock writers; validate accepted body and
evidence hashes. State clearly that these are approval assertions, not identity
authentication. Preserve accepted history and link a new ADR for a new decision.
Keep all `docs/adr/` files personal by default, including evidence; include them in
the exclusion helper and staged publication gate. ADR adoption grants no new
implementation, deployment, server-action or publication permission. Keep CI off.
Verify the complete proposal/approval/change-detection flow and personal/shared
commit behavior in an installed disposable target.
