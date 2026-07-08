# .claude

This folder holds the project's **shared, git-versioned Claude Code assets** —
memory (durable rules/facts), skills, and slash commands. Committing it means the
whole team, and every fresh clone, gets the same rules and hard-won lessons.

## Layout

- `memory/` — cross-session memory, one fact per file
  - `MEMORY.md` — the index, loaded every session (one line per memory)
  - `feedback_*.md` — working rules / conventions (each with *why* + *how to apply*)
  - `project_*.md` — durable project facts
  - `reference_*.md` — pointers to external/internal resources
- `commands/` — custom slash commands (e.g. `/ratchet-init`)
- `skills/` — reusable skills (e.g. `verify-app`)

## Make memory persist across sessions and teammates

Claude Code reads memory from `~/.claude/projects/<encoded-repo-path>/memory/`.
This script symlinks *this repo's* `.claude/memory/` there, so every edit is a git
change and travels via PR/commit:

```bash
bash scripts/setup-claude-memory.sh
```

Run it once per clone. After that your rules load automatically each session and
stay under version control.

## What to commit

- ✅ `.claude/memory/**`, `.claude/README.md`, `.claude/commands/**`, `.claude/skills/**`
- ❌ `.claude/settings.local.json` and other local caches (add them to `.gitignore`)
