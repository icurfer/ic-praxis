# Improvement retros

The root of this directory stays as a compact index. Improvement documents that
have been implemented move to [`applied/`](applied/) so completed work does not
look like an active backlog. This is praxis eating its own cooking: an incident
became a written record, which became an enforced change.

Don't delete applied records — the *why* behind a rule is worth more than the
rule. If you reopen one, write a new document at this directory's root and link
back to the applied record rather than silently rewriting history.

## Applied improvements

| Document | Status | Direction |
|---|---|---|
| [`applied/dual-agent-claude-codex.md`](applied/dual-agent-claude-codex.md) | Increments 1–2 shipped in **v0.4.0–v0.5.0** (2026-07-25); rest deferred | Agent-neutral rules with thin Claude Code / Codex entrypoints. Shipped: `AGENTS.md` + **Gate E**, capability matrix, and native Codex discovery adapters in `.agents/skills/` for init/review/verify. Deferred: `.praxis/` core extraction, `--agent` installer flag, and Codex hook/sub-agent adapters. |
| [`applied/codex-native-skills.md`](applied/codex-native-skills.md) | Shipped in **v0.5.0** (2026-07-25); **v0.5.1** follow-up same day | Codex-native `.agents/skills/` thin adapters for init/review/verify, with one canonical workflow body and verified installer/gate behavior. v0.5.1: `praxis-review.sh` counts the adapters and reports **dangling adapters** (canon under `.claude/` deleted → adapter routes to nothing); bootstrap prompt's adapter instruction moved to the skill axis and names all three. |

### Revision notes — dual-agent (2026-07-25, v0.4.0)

Implementation review corrected two points of the proposal (recorded here per
the "don't edit the source retro" rule):

- **No renderer.** Instead of generating both entrypoints from a new
  `.praxis/constitution.md`, the shared rules live in a marker-delimited block
  (`<!-- praxis:shared:begin/end -->`) carried verbatim by BOTH files, and
  Gate E in the existing gate engine enforces byte-identity. Same drift
  guarantee, no new build step, no new source-of-truth tree.
- **`/praxis-init` is not shellable.** The proposal's `scripts/praxis-init.sh`
  can't exist — init is agent judgment (inspect repo → confirm modules → fill
  placeholders), i.e. a prompt, not a script. Only structural checks
  (`praxis-review.sh`) belong in shell.
- **P7 revised (extended):** the installer's "constitution exists → skip docs
  scaffold" proxy now counts `CLAUDE.md` **or** `AGENTS.md` — either marks an
  agent-governed repo. The v0.2.0 rationale (don't drop a doc system on an
  existing one) is preserved, not replaced. Separating "praxis installed" from
  "agent file exists" via a managed marker stays deferred (increment 2).

## [`applied/from-vulcan-charts.md`](applied/from-vulcan-charts.md) — shared repo vs personal space (v0.6.0)

| # | Gap | Resolution in v0.6.0 |
|---|---|---|
| P0 | `setup-claude-memory.sh` (install step 2) moved a teammate's personal memory dir aside and symlinked the repo in | Script **removed**; memory is read-on-demand team knowledge. `unlink-claude-memory.sh` undoes an existing link + restores the backup; installer detects the leftover |
| P1 | No `templates/.gitignore`, so no personal/team boundary shipped | Ships one; `install.sh` **merges** it into a pre-existing `.gitignore`; `praxis-review.sh` stops counting personal files |
| P2 | No warning that a committed `.claude/` reaches every teammate (multi-session installs `settings.json`) | Stated in `.claude/README.md`, the module comment, both READMEs, and the `/praxis-init` question |
| P3 | Executables lived in `.claude/skills/*/helpers/` | `helpers/` no longer ships — procedure in `SKILL.md`, executables in `scripts/` |
| P4 | No removal path, including the symlink outside the repo | `docs/uninstall.md` (outside-the-repo step first); `praxis-review.sh` states its `.claude/` scope |
| side | `SECRET_KEY_RE` missed `jwtSecret`/`clientSecret`; no exception short of disabling the gate | Both keys added; `SECRET_ALLOWLIST` (`FILE_RE|LINE_RE`, value written in) — never applies to `FORBIDDEN_PATTERNS` |

Root cause behind all five: the scaffold's default shape assumed a **solo
developer's own repo**. v0.6.0 makes "shared repo" the first-class case, and adds
the rule that a shipped script never writes outside the target repo.

## [`applied/from-aipf-mgmt.md`](applied/from-aipf-mgmt.md) — monorepo / secret / k8s adoption (316-commit repo)

| # | Gap | Resolution in v0.2.0 |
|---|---|---|
| P0 | Secret gate missed YAML `key: value` | Gate C matches both `=` and `:`, + placeholder allowlist, min-len 8 |
| P1 | Gate C read the working tree, not the index | Reads the **staged blob** (`git show ":$f"`); working tree only under `--all` |
| P2 | Single `VERSION_FILE` broke on monorepos | Parallel `AREA_CODE_RE`/`AREA_VFILE` arrays — one area per deploy unit |
| P3 | `CODE_RE` anchoring inconsistent | Resolved by AREAS (each unit anchors its own `^path/`) |
| P4 | `install.sh` always seeded root `version` | `--no-version` + auto-skip when `*/version` exists |
| P5 | No small-change exception → doc system bypassed | CLAUDE.md **change-size rule** (big vs small); small changes skip spec/scope/deferred |
| P6 | No deploy-manifest sync gate | Gate D `DEPLOY_MANIFESTS` (opt-in): version ↔ image tag |
| P7 | `docs/` scaffold clashed with existing systems | install auto-skips docs when `CLAUDE.md` exists; `--no-docs` |
| P8 | Quoting / `--all` / chmod scope | `-e` + array globs, chmod only copied files, `--all` scope documented |

## [`applied/from-msa-fe.md`](applied/from-msa-fe.md) — multi-session hub operation (the "6th axis")

| # | Gap | Resolution in v0.2.0 |
|---|---|---|
| P0 | No multi-session coordination (silent hub overwrites) | **multi-session module**: `CLAUDE.md` multi-session rule + main-session-only hub writes |
| P1 | `.claude/settings.json` + `.claude/agents/` axes had no scaffold | `templates/optional/multi-session/` ships `worker.md` + `settings.json`; `praxis-review.sh` now counts skills/agents (locale-robust) |

## [`applied/from-self-review.md`](applied/from-self-review.md) — the gate engine audited against itself (v0.3.0)

Every gap **reproduced in a throwaway repo** before being fixed: bare (unquoted)
secrets never matched (S0), the placeholder allowlist judged the line instead of
the value (S1), Gates B/D read the working tree instead of the staged blob (S2 —
a HALF-APPLIED version of aipf-mgmt P1), deletions bypassed Gate A (S3), the
trailing-newline rule wasn't actually gated (S4), bash-4-isms broke stock macOS
bash 3.2 and Windows was unhandled (S5), plus template/doc drift (S6). See the
retro for the corollary rule: an engine fix must be re-verified across ALL gates.
A same-day **second pass** (adversarial multi-agent review of the fixes) then
caught regressions the fixes themselves introduced — version-file deletion
counting as a bump, last-assignment-only placeholder checks, non-ASCII filename
skips, and more (R0–R8 in the retro) — proving fixes need the same scrutiny as
bugs.

## The cross-cutting change (v0.2.0)

Both retros shared one root cause: ic-praxis imposed the **origin repo's shape** on
every project. v0.2.0's answer is **core (always) + opt-in modules (selective)** —
`monorepo`, `multi-session`, `deploy-manifest` — chosen via `install.sh` flags or
`/praxis-init` detect-and-ask. See the "Selective application — modules" section
in the README.
