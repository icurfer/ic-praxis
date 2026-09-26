# Retro: the gate was one local setting away from not running (v0.7.0)

Source: adopting the scaffold across several machines (2026-09-26). The gap was
**reproduced in a throwaway target repo** before the fix was accepted, per the
work order.

## The gap

The praxis gate lived entirely in `.githooks/pre-commit`, activated by

```
git config core.hooksPath .githooks
```

That is **per-clone local config**. It follows neither the repository nor the
contributor. Two ways the gate silently stops existing:

1. **A fresh clone has it OFF.** Nothing in the repo turns it on; someone must
   remember `scripts/install-hooks.sh`. A new machine, a CI runner, a teammate's
   first day — the gate is absent and every commit sails through.
2. **`--no-verify` leaves no trace.** It is a legitimate escape hatch (the README
   documents it), but nothing records that it was used, so nobody reviews it later.

This undercuts the project's own claim. The README argues *"Documents don't stop a
bad commit; they only describe what a good one looks like."* — yet **a gate that is
not installed describes rather than stops, exactly like a document.**

Observed concretely: a repo with a fully working gate was cloned to another
machine; the clone accepted commits the gate would have blocked, and nothing
anywhere reported that the gate had not run.

## The fix — run the same script server-side

`templates/.github/workflows/praxis-gate.yml`. Two deliberate choices:

**1. The engine is not modified.** `check-conventions.sh` judges the *staged
blob* (`git show ":$f"`) — that is the point of it: it checks what actually gets
committed, not the working tree. CI has nothing staged, so the workflow stages
the whole change set first:

```yaml
- run: git reset --soft "$BASE"      # PR base, or push 'before'
- run: bash scripts/check-conventions.sh
```

The alternative — teaching the script a CI mode that diffs two refs — would add a
second code path that only runs on the server, i.e. the path least likely to be
noticed when it rots. `git reset --soft` reuses the *identical* code path.

**2. Scope differs from the hook, intentionally.** The hook judges one commit;
this judges the whole PR. Splitting "code" and "version bump" across two commits
passes CI — correctly, because by merge time both are present. The hook stays
stricter per-commit; CI guarantees the merged result.

Base resolution handles the all-zero SHA of a first push by falling back to the
empty tree, so a new branch is checked as all-added rather than crashing.

## Verification (required by the work order)

In a throwaway target repo:

| Scenario | Expected | Result |
|---|---|---|
| `install.sh` into empty repo | workflow copied | ✅ `.github/workflows/praxis-gate.yml` present |
| code change, no `version` bump — hook | blocked | ✅ `deploy code changed but 'version' is not staged` |
| same change committed with `--no-verify`, then CI method | blocked | ✅ same message |
| code + `version` in two separate commits, CI method | pass | ✅ passed |

The third row is the one that matters: it is the bypass the hook cannot see.

`install.sh` needed no change — it copies every file under `templates/`
(`find -type f`), so the new directory ships automatically.

## What stayed out of scope

Nothing was added to the gate engine itself. Gates are per-project by design: a
project meets an incident, writes the rule, enforces it there. This retro is
about the *delivery* of the gate, not its contents.
