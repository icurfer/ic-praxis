<!--
  AGENTS.md — ic-praxis' own constitution for AGENTS.md-reading agents (Codex).
  The marker block below is a VERBATIM mirror of CLAUDE.md's; Gate E in
  scripts/check-conventions.sh blocks the commit if the two drift. Edit shared
  rules in either file, then copy the block into the other and stage both.
-->

<!-- praxis:shared:begin -->
# ic-praxis — project constitution

ic-praxis packages a "praxis" discipline system (retros → machine-enforced
pre-commit gates) that other repos install. This file is that same system applied
to **this repo itself** (dogfooding). The scaffold that ships lives in
`templates/`; the root is the meta-project + a self-applied gate.

## System map
| Path | Role |
|---|---|
| `templates/` | The scaffold that ships to user projects — the actual product. |
| `install.sh` | Copies `templates/` into a target repo; supports opt-in module flags. |
| `bootstrap-prompt.md` | Copy-paste prompt that rebuilds the scaffold from scratch. |
| `scripts/`, `.githooks/` | This repo's OWN praxis gate (self-applied). |
| `README.md` / `README.ko.md` | Landing docs — English is canonical, Korean is a translation. |
| `docs/improvements/` | Resolved adoption-retro history (why rules exist). |
| `version` | ic-praxis' scaffold release version (one line, no trailing newline). |

## Work order
This repo is a scaffold, not a CI-deployed app — so the flow is lighter than the
one `templates/CLAUDE.md` prescribes for products.
1. Make the change to `templates/`, `install.sh`, `scripts/`, or the docs.
2. **Verify it in a throwaway target repo** — actually run `install.sh` into a
   temp dir, wire the hook, and prove the gate blocks/passes as intended. Never
   ship a scaffold change unverified; users install exactly what you commit.
3. If anything under `templates/`, `scripts/`, `install.sh`, or
   `bootstrap-prompt.md` changed, **bump `version`** (that is the release signal).
4. Keep `README.md` (canonical) and `README.ko.md` in sync for material changes.
5. If you reopen or revise a past retro, note it in `docs/improvements/README.md`
   rather than editing the source retro.

## Delegated responsibilities (do these unprompted)
- Bump `version` whenever a shipped path (`templates/`, `scripts/`, `install.sh`,
  `bootstrap-prompt.md`) changes. `version` stays exactly one line, no trailing newline.
- When you change a rule in `templates/`, mirror it into `bootstrap-prompt.md` and
  the README so the three descriptions of the scaffold don't drift.

## Do NOT
- **Do not put a real secret in a `templates/` example** — it ships to every user;
  a shipped example secret becomes everyone's leak. Use `CHANGE_ME`/`{{...}}`.
- **Do not let `README.ko.md` silently drift** from `README.md` — English is
  canonical, but material changes must be translated. (why: bilingual drift misleads users.)
- **Do not change the gate engine in `templates/scripts/` without re-verifying in a
  temp target repo** — a broken gate ships silently and every installer inherits it.
- **Do not bump `version` to more than one line or leave a trailing blank line.**
  (why: user projects' Gate B checks exactly this; ours must model it.)

## Automated gate
The checkable rules above are enforced at commit time by `.githooks/pre-commit` →
`scripts/check-conventions.sh` (Gate A: shipped change ⇒ `version` bump; Gate B:
`version` format; Gate C: secrets, with a placeholder allowlist so `templates/`
examples pass). Enable once per clone: `bash scripts/install-hooks.sh`. Bypass
(emergency): `git commit --no-verify`. When a retro yields a new checkable rule,
add a gate there.

## Routing a new rule (which layer?)
More mechanical / more frequent ⇒ harder layer:
- checkable at commit → `scripts/check-conventions.sh`
- fire during tool use (block/modify/react) → `.claude/settings.json` hook
- repeatable procedure → `.claude/skills/`
- durable fact to recall → `.claude/memory/`
- always-on judgment → a line in this file
Don't put a narrow rule in an always-loaded layer — it taxes every unrelated session.
<!-- praxis:shared:end -->
