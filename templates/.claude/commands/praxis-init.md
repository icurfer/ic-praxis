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

   - **multi-session?** Ask the user: *"Will this repo be run with several
     parallel Claude sessions (a hub coordinating multiple sub-units)?"* This
     can't be auto-detected.
     - **Yes** → keep the "Multi-session rule" section in `CLAUDE.md`, and create
       `.claude/agents/worker.md` (a sub-agent that edits only ONE sub-unit, never
       the hub, and returns a handoff summary) + a non-blocking `.claude/settings.json`
       pre-push reminder. (Or tell the user to re-run `install.sh --multi-session`.)
     - **No** → DELETE the "Multi-session rule" section from `CLAUDE.md` (it ships
       wrapped in a "keep only if…" comment). Don't tax single-session projects.

3. **`CLAUDE.md`** — replace every `{{...}}`: project name, system map table, the
   real deploy-trigger file name(s), and 2-3 genuine "Do NOT" rules inferred from
   the stack (each with a plausible "why"). Keep the **change-size** block (big vs
   small change) — it's what keeps the doc flow from being bypassed.

4. **`scripts/check-conventions.sh`** — set `AREA_CODE_RE`/`AREA_VFILE`,
   `FORBIDDEN_PATTERNS`, and (if enabled) `DEPLOY_MANIFESTS` to this project's real
   deploy paths and taboos. The secret gate covers quoted values everywhere and
   bare `key: value` / `KEY=value` in config-style files (`BARE_VALUE_FILES_RE`) —
   widen that pattern if this project keeps config in unusual extensions.

5. **`docs/`** — keep the four-stage structure; adjust folder names only if the
   user works in a different language. Leave `spec/scope/deferred/done` empty.

6. **`.claude/memory/`** — the `feedback_*` files are universal STARTER rules.
   Keep the ones that fit this project, delete the rest, and update `MEMORY.md`
   to match. Do not invent project-specific facts.

7. **Enable and PROVE the gate**: run `bash scripts/install-hooks.sh`, then make
   a deliberately-violating staged change (deploy code without a version bump)
   and show the commit is BLOCKED. Then revert the dummy change.

8. **Persist memory**: run `bash scripts/setup-claude-memory.sh` so the memory is
   git-versioned and loaded each session.

9. **Route the project's existing conventions** into the right layer as you fill
   CLAUDE.md (harder layer for more mechanical / more frequent rules):
   - checkable at commit → gate in `check-conventions.sh`
   - fire during tool use (block/modify/react) → `.claude/settings.json` hook
   - bounded sub-task owned in isolation → `.claude/agents/` (multi-session only)
   - repeatable procedure → `.claude/skills/`
   - durable fact → `.claude/memory/`
   - always-on judgment → a CLAUDE.md line
   Don't pile everything into CLAUDE.md — a narrow rule there taxes every session.

10. Summarize what you customized, **which modules you turned on/off and why**,
    and what the user should review.

Principle to preserve: the gate exists so retros become enforcement. Don't water
it down — tune it to fire on THIS project's real mistakes.
