---
name: praxis-init
description: Adopt and customize the ic-praxis scaffold for the current repository. Use after installation or when the user asks to initialize, tune, or prove praxis.
---

# praxis-init

Read `../../../.claude/commands/praxis-init.md` completely and follow it as the
canonical adoption procedure.

- Treat the user's current project description as `$ARGUMENTS`.
- In Codex, “parallel sessions” means parallel Codex sessions or sub-agents;
  do not assume the user runs Claude Code.
- Keep `CLAUDE.md` and `AGENTS.md`'s `praxis:shared` blocks byte-identical when
  both entrypoints are present.
- Do not merely copy defaults: inspect this repository and tune the scaffold to
  its actual build, deploy, documentation, and verification paths.
