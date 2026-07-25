# Improvement retros — resolved history

These are real retros kept as **history**, not open work: two adoption retros
(resolved in **v0.2.0**, 2026-07-12) and one deep self-review of the gate engine
(resolved in **v0.3.0**, 2026-07-12). This is praxis eating its own cooking: an
incident became a written record, which became an enforced change.

Don't delete these — the *why* behind a rule is worth more than the rule. If you
reopen or revise one, note it here rather than editing the source retro.

## Design proposals — not yet implemented

| Document | Status | Direction |
|---|---|---|
| [`dual-agent-claude-codex.md`](dual-agent-claude-codex.md) | Proposed, 2026-07-25 | Extract an agent-neutral `.praxis/` core and generate thin Claude Code / Codex adapters without splitting the rules |

## `from-aipf-mgmt.md` — monorepo / secret / k8s adoption (316-commit repo)

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

## `from-msa-fe.md` — multi-session hub operation (the "6th axis")

| # | Gap | Resolution in v0.2.0 |
|---|---|---|
| P0 | No multi-session coordination (silent hub overwrites) | **multi-session module**: `CLAUDE.md` multi-session rule + main-session-only hub writes |
| P1 | `.claude/settings.json` + `.claude/agents/` axes had no scaffold | `templates/optional/multi-session/` ships `worker.md` + `settings.json`; `praxis-review.sh` now counts skills/agents (locale-robust) |

## `from-self-review.md` — the gate engine audited against itself (v0.3.0)

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
