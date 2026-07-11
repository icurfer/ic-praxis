# docs/ — the four-stage document system

Change is frozen into documents *before* it becomes code. Every unit of work
flows through these stages so decisions are captured, not lost.

| Folder | Role |
|---|---|
| `requirements/backlog.md` | User-input backlog. Check before planning; mark handled items ✅ + version. |
| `spec/plan-vX.Y.Z.md` | The spec — a single integrated feature unit. The **root** of all work. Clone the latest, edit as a diff. |
| `scope/scope-vX.Y.Z.md` | MVP scope at file/function granularity. |
| `deferred/backlog-vX.Y.Z.md` | Non-MVP items pushed out of scope. |
| `done/done-vX.Y.Z-{timestamp}.md` | Completion report. An "affected repos" table captures dependencies. |
| `../CHANGELOG.md` | One-line summary index. |

**Big changes take the full flow; small changes don't.** A typo or tiny fix
skips `spec/scope/deferred` — just make the change, bump the deploy trigger if
code changed, add one `CHANGELOG` line and tick `backlog.md`. Requiring the full
set for every trivial edit is how a doc system gets bypassed and dies; see the
change-size rule in `CLAUDE.md`. (A change is "big" if it adds a source file,
changes ≥100 lines, adds an API/dependency/infra, or changes a rule.)

## Version policy
`vX.Y.Z` on the spec is the master. `0.1.0` to start, **`1.0.0` = release**.
Each source repo carries its own one-line deploy-trigger file, patch-bumped only
when that repo's code changed.

## The point
This is not documentation theater. The heart of the system is the **retro loop**:
when something breaks, write down *why* as a rule here — and if it's mechanically
checkable, harden it into a gate in `scripts/check-conventions.sh` so it can
never slip back. Rules that rely on human memory eventually break again.
