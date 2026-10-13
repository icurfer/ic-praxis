---
description: Fill in the praxis scaffold for THIS project (constitution, docs, gate, memory, modules)
---

You are finishing an `ic-praxis` scaffold that was just copied into this
repository. The skeleton files exist but contain `{{PLACEHOLDER}}` markers and
generic defaults. Adapt them to THIS project — and turn on only the optional
modules its shape actually needs. This is the recommended adoption path: decide
WITH the user, don't just accept defaults.

Project description from the user (may be empty — infer from the repo if so):
$ARGUMENTS

Do this:

**Choose publication scope before customization.** This is separate from harness
type. Ask: "개인용으로 로컬에서만 사용할까요, 프로젝트 공통 도구로 공유할까요?"
Explain that personal excludes `harness/` and `docs/requirements`, `spec`, `scope`,
`deferred`, `done`; user guides and public changelogs may be committed.
If the user says "적절히 적용해줘" / "use your judgment" or delegates AI setup
without specifying publication, use **personal** and state that choice instead
of blocking on a question. An explicit previous choice takes precedence; preserve
an existing scope on routine re-adoption. With no answer and no delegation, keep
the safe personal default and leave a shared transition pending.

Run `bash scripts/configure-sharing.sh personal` or, only after explicit shared
selection, `bash scripts/configure-sharing.sh shared`. The setting is
`harness/config/sharing`. Normal installs already establish personal protection;
`--shared` is explicit opt-in. Ordinary Git clones use `.git/info/exclude` for
personal paths. Non-Git targets or external worktree metadata use a managed
`.gitignore` fallback; never write outside the target. Re-running the helper after
`git init` moves only its managed block to the local exclude file.
Existing tracked files are reported, not automatically untracked or removed from
history. Show the actual paths/content before requesting publication; a generic
"push" does not approve publishing personal records. Do not use `git add -f` or
`--no-verify` to bypass this policy. For selected public results, export a reviewed
summary to public docs instead of publishing the private record tree. Shared scope
makes the whole protected set eligible for version control; explain that before
switching. It neither stages files nor authorizes a push. State and logs stay local.

**Then select the harness type.** Read `harness/config/profile.json` and
`harness/README.md`. If no type is selected, ask: "개발용(코드·테스트·빌드)과
인프라용(운영 태스크·범위·근거·인계 관리) 중 어떤 하네스를 적용할까요?"
Honor an explicit choice already made by the user; do not infer it from files or
silently default to development. Without an answer, leave the selection unset.
Check Node.js 18+ is available and run
`node harness/bin/praxis.mjs profile select development` or `... select infrastructure`.
Preserve an existing selection; a request to change it needs a migration plan
that preserves configuration and task records, not a forced reinstall.

- **Infrastructure:** read `harness/profiles/infrastructure/README.md` and the
  existing operations rules. Configure the user's authoritative task registry,
  managed scope and repository-local workflow in `config/infrastructure.json`;
  preserve an optional supplied reference project. No default vendor, accounts or
  commands. Reuse an existing connector and credential store; write only a
  sanitized complete snapshot to ignored `.state/` after a real query. If registry
  information is missing, leave setup pending instead of inventing it. Preserve
  existing records; review/merge updated code, procedures and config on upgrade
  (ordinary reinstall skips existing files). Run `profile
  status`, then `task list`/`reconcile` and report gaps, not automatic bulk changes.
  Readiness is record checking, not deployment authorization. Follow the guide
  for publication guard integration; preserve existing hooks. Stop before the
  development sizing/doc/version flow below; do not configure development checks
  or enable CI. Introduce natural-language requests via `praxis-task`.
- **Development:** read `harness/profiles/development/README.md`, configure real
  test/build commands in `harness/config/project.json`, then follow the adoption
  steps below. Keep checks empty and explain the blocker if no meaningful checks
  exist. Introduce natural-language requests via `praxis-task`.

Keep praxis CI off by default: do not create or enable a CI workflow unless
the user explicitly requests it. Local commit checks work without CI. Explain
CI as checks run on the hosting service after a push or pull request, if needed.
To opt in later, re-run the installer with `--ci` (without `--force`). Preserve
existing workflows; if praxis CI already exists, explain that it remains active.

1. **Inspect the repo** — language, framework, how it builds/deploys, how many
   deployable units, and what CI actually triggers on (`.github/workflows`,
   `Dockerfile`, `package.json`, `helm/`, `k8s/`, `docker-compose*.yml`, etc.).

2. **Detect project shape and CONFIRM each module with the user** (this is the
   selective-application step — a project takes only what fits):

   - **monorepo?** If you find >1 deployable unit (e.g. `backend/` + `frontend/`,
     or multiple services each with their own version/deploy trigger), switch the
     gate to per-area arrays. Otherwise leave the single-area default.
     ```bash
     AREA_CODE_RE=( '^backend/'      '^frontend/(src/|public/)' )
     AREA_VFILE=(   'backend/version' 'frontend/version'         )
     ```
     Remove the seeded root `version` if the repo uses per-area version files.

   - **k8s / Helm / compose?** If a version bump must stay in sync with a deploy
     manifest's image tag, enable `DEPLOY_MANIFESTS` in the gate. Verify the
     `TAG_REGEX` extracts the tag from the REAL file first:
     `sed -nE 's/.*<TAG_REGEX>.*/\1/p' <manifest>`.

   - **AI commit attribution?** Ask the user: *"Should AI-agent commits be
     marked as such on GitHub (a `Co-Authored-By` trailer)?"* This is team
     policy and can't be auto-detected.
     - **Yes** → keep the "Commit attribution" section in `AGENTS.md` (Claude
       Code adds its own trailer automatically; the section makes Codex do the
       same).
     - **No** → DELETE that section from `AGENTS.md`, and tell the user that
       Claude Code appends its trailer by itself — removing it needs their
       Claude Code setting, not a repo file.

   - **multi-session?** Ask the user: *"Will this repo be run with several
     parallel Claude sessions (a hub coordinating multiple sub-units)?"* This
     can't be auto-detected. If the repo is **shared with a team**, say so in the
     question: the module commits `.claude/settings.json`, which applies to every
     teammate's sessions (its keys outrank their personal `~/.claude/settings.json`
     and its hooks fire for them too). That is a team decision, not a convenience.
     - **Yes** → keep the "Multi-session rule" section in `CLAUDE.md`, and create
       `.claude/agents/worker.md` (a sub-agent that edits only ONE sub-unit, never
       the hub, and returns a handoff summary) + a non-blocking `.claude/settings.json`
       pre-push reminder. (Or tell the user to re-run `install.sh --multi-session`.)
     - **No** → DELETE the "Multi-session rule" section from `CLAUDE.md` (it ships
       wrapped in a "keep only if…" comment). Don't tax single-session projects.

3. **`CLAUDE.md` + `AGENTS.md`** — replace every `{{...}}`: project name, system
   map table, the real deploy-trigger file name(s), and 2-3 genuine "Do NOT"
   rules inferred from the stack (each with a plausible "why"). Keep the
   **change-size** block (big vs small change) — it's what keeps the doc flow
   from being bypassed. The two files share a `<!-- praxis:shared:begin/end -->`
   block that must stay byte-identical (Gate E blocks drift): edit it once in
   CLAUDE.md, then copy it VERBATIM into AGENTS.md. If the repo already had its
   OWN `CLAUDE.md` or `AGENTS.md` (the installer never overwrites), merge the
   shared block into that file instead — or, if the user only uses one agent,
   they may delete the unused entrypoint.

4. **`scripts/check-conventions.sh`** — set `AREA_CODE_RE`/`AREA_VFILE`,
   `FORBIDDEN_PATTERNS`, and (if enabled) `DEPLOY_MANIFESTS` to this project's real
   deploy paths and taboos. The secret gate covers quoted values everywhere and
   bare `key: value` / `KEY=value` in config-style files (`BARE_VALUE_FILES_RE`) —
   widen that pattern if this project keeps config in unusual extensions.

5. **`docs/`** — keep the four-stage structure; adjust folder names only if the
   user works in a different language. Leave `spec/scope/deferred/done` empty.

6. **`.claude/memory/`** — the `feedback_*` files are universal STARTER rules.
   Keep the ones that fit this project, delete the rest, and update `MEMORY.md`
   to match. Do not invent project-specific facts. This directory is **team
   knowledge read on demand** (via the `MEMORY.md` index) — never link, move or
   replace anything under the user's personal `~/.claude/`, and tell them
   personal notes go in `user-*.md` / `*.local.md` (git-ignored).

7. **Enable and PROVE the gate** (including `scripts/check-sharing.sh`; if an
   existing gate/hook was preserved by installation, integrate the sharing check
   without replacing its other checks): run `bash scripts/install-hooks.sh`, then make
   a deliberately-violating staged change (deploy code without a version bump)
   and show the commit is BLOCKED. Then revert the dummy change. If both
   constitution files are in use, also prove Gate E once: edit the shared block
   in one file only, show the block, then re-sync.

8. **Check the shared/personal boundary**: confirm the shipped `.gitignore` has
   the personal patterns (`.claude/settings.local.json`, `.claude/memory/user-*.md`,
   `.claude/memory/*.local.md`) — if the repo already had a `.gitignore`, the
   installer appends them, so verify they landed. If the user previously ran the
   old `scripts/setup-claude-memory.sh` (ic-praxis ≤ v0.5.3), have them undo it:
   `bash scripts/unlink-claude-memory.sh`.

9. **Route the project's existing conventions** into the right layer as you fill
   CLAUDE.md (harder layer for more mechanical / more frequent rules):
   - checkable at commit → gate in `check-conventions.sh`
   - fire during tool use (block/modify/react) → `.claude/settings.json` hook
   - bounded sub-task owned in isolation → `.claude/agents/` (multi-session only)
   - repeatable procedure → `.claude/skills/` (the SKILL.md documents it; any
     runnable helper it calls goes in `scripts/`)
   - durable fact → `.claude/memory/`
   - always-on judgment → a CLAUDE.md line
   Don't pile everything into CLAUDE.md — a narrow rule there taxes every session.

10. Summarize what you customized, **which modules you turned on/off and why**,
    and what the user should review.

Principle to preserve: the gate exists so retros become enforcement. Don't water
it down — tune it to fire on THIS project's real mistakes.
