# docs/ — the four-stage document system

Change is frozen into documents *before* it becomes code. Every unit of work
flows through these stages so decisions are captured, not lost.

| Folder | Role |
|---|---|
| `요구사항/backlog.md` | User-input backlog. Check before planning; mark handled items ✅ + version. |
| `기획/plan-vX.Y.Z.md` | The spec — a single integrated feature unit. The **root** of all work. Clone the latest, edit as a diff. |
| `계획/scope-vX.Y.Z.md` | MVP scope at file/function granularity. |
| `고도화/backlog-vX.Y.Z.md` | Non-MVP items pushed out of scope. |
| `작업내역/done-vX.Y.Z-{timestamp}.md` | Completion report. An "affected repos" table captures dependencies. |
| `../CHANGELOG.md` | One-line summary index. |

## Version policy
`vX.Y.Z` on the spec is the master. `0.1.0` to start, **`1.0.0` = release**.
Each source repo carries its own one-line deploy-trigger file, patch-bumped only
when that repo's code changed.

## The point
This is not documentation theater. The heart of the system is the **retro loop**:
when something breaks, write down *why* as a rule here — and if it's mechanically
checkable, harden it into a gate in `scripts/check-conventions.sh` so it can
never slip back. Rules that rely on human memory eventually break again.
