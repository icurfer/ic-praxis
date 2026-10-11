# Personal publication scope (v0.10.0)

## Problem

Installing development tooling should not implicitly publish local task records
or make a personal harness part of a shared project. Harness type and publication
scope are separate decisions.

## Implemented policy

- Adoption asks personal or project-shared. Delegating setup judgment defaults
  to personal; an existing explicit choice is preserved.
- Personal scope excludes `harness/` and the requirements, spec, scope, deferred
  and done directories under `docs/`. Public guides and changelogs remain eligible
  for commit. Other scaffold files retain their existing policies.
- Local exclusions use `.git/info/exclude`; non-Git targets and external worktree
  metadata use a managed `.gitignore` fallback without writing outside the target.
- Shared scope requires explicit selection and review. The commit gate requires
  its declaration in the index with protected files; runtime records stay local.
- Already tracked files are reported without automatic untracking or history
  changes. A normal push request does not authorize publishing private records.
- Validation fingerprints local harness inputs even when Git ignores them.
- Both development and infrastructure profiles keep CI opt-in. Infrastructure
  remains a pending reference-project integration, not an operational runner.

## Verification

The existing 15 harness/profile/portability tests and seven publication-scope
tests passed. Disposable repositories exercised real installs, commit blocking
and passing, shared declarations, repeated installs, existing tracked files,
non-Git migration, linked-worktree boundaries and ignored-code freshness.
The distribution gate, shared constitution equality, skill metadata validation
and version formatting checks passed. These are local tests, not remote CI or
production infrastructure verification.

## Boundaries and follow-up

Local hooks are bypassable and do not prove human approval. Existing customized
gates must incorporate `scripts/check-sharing.sh`. Review a reference operations
project before implementing the infrastructure profile; no operational commands
were added in this release.
