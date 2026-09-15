# .claude

This folder holds the project's **shared, git-versioned Claude Code assets** —
memory (durable rules/facts), skills, and slash commands. Committing it means the
whole team, and every fresh clone, gets the same rules and hard-won lessons.

## Layout

- `memory/` — cross-session memory, one fact per file
  - `MEMORY.md` — the index: when a task touches a topic, read this first
  - `feedback_*.md` — working rules / conventions (each with *why* + *how to apply*)
  - `project_*.md` — durable project facts
  - `reference_*.md` — pointers to external/internal resources
- `commands/` — custom slash commands (e.g. `/praxis-init`)
- `skills/` — reusable skills (e.g. `verify-app`). Procedures live here; the
  **executables they call live in `scripts/`** — see "Skills point at scripts/".

## Team knowledge vs personal notes

This is a **shared repo**: everything committed here reaches every teammate. Keep
the two kinds of material apart by filename, so a stray `git add -A` can't leak a
private note into the team's history.

| | Where | Committed? |
|---|---|---|
| Team knowledge (rules, project facts, references) | `.claude/memory/<type>_<slug>.md`, indexed in `MEMORY.md` | ✅ yes — reviewed like code |
| Your personal notes for this repo | `.claude/memory/user-*.md` or `*.local.md` | ❌ no — git-ignored by the shipped `.gitignore` |
| Your personal settings | `.claude/settings.local.json` | ❌ no — git-ignored |
| Anything under `~/.claude/` | your own machine | ❌ never touched by this repo |

The repo's memory is **read on demand**, not auto-loaded: `CLAUDE.md` tells the
agent to open `MEMORY.md` when a task touches a topic. That is deliberate — the
alternative (linking this directory into your personal agent path) hijacks a
per-person location and makes every saved memory a repo file. ic-praxis ≤ v0.5.3
shipped such a script; if you ran it, undo it with
`bash scripts/unlink-claude-memory.sh`.

## Committed `.claude/` reaches the whole team

A repo-level `.claude/` takes precedence over each person's `~/.claude/`:
`settings.json` keys committed here win over their personal ones, hooks defined
here **also fire in their sessions** (they add to, not replace, personal hooks),
and a command or skill with the same name shadows theirs. So on a shared repo,
committing `.claude/settings.json` is a change to *everyone's* environment —
decide it as a team, not as a convenience. (The optional multi-session module
installs exactly such a file; that is why `/praxis-init` asks before enabling it.)

## Skills point at `scripts/`

Keep runnable files in `scripts/` and let a `SKILL.md` reference them by path. A
skill folder is documentation packaging; its lifetime is shorter than the
scripts' (skills get renamed, split, or dropped), and executables buried in
`.claude/skills/<name>/helpers/` end up outside the repo's normal script
conventions — two places for permissions, paths, and review.

## What to commit

- ✅ `.claude/memory/**` (team files), `.claude/README.md`, `.claude/commands/**`, `.claude/skills/**`
- ❌ `.claude/settings.local.json`, `.claude/memory/user-*.md`, `.claude/memory/*.local.md`
  — the shipped `.gitignore` already covers these
- ⚠️ `.claude/settings.json` — only by team decision (see above)
