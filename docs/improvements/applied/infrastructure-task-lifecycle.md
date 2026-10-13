# Infrastructure task lifecycle draft — v0.10.1

The reference operations workflow exposed missing follow-up tasks, stale open
statuses after work completed, and uncertainty between a completed plan and an
applied change. This draft brings that workflow into the infrastructure profile
without embedding the reference project's registry, servers or accounts.

## Implemented

- A separate infrastructure implementation and canonical agent procedure; the
  development runner and task storage retain their existing behavior.
- Configurable registry identity/scope/workflow and a complete, dated snapshot
  in ignored runtime storage. No built-in provider or credential handling.
- Existing-ID linkage, durable operations records, generated index, discrepancy
  checks and evidence requirements for investigation, plan and change tasks.
- Completion requires no remaining in-scope work. User confirmation retains its
  source. Handwritten indexes, existing records and reinstall settings survive.
- Personal publication protection covers the operations records; runtime
  snapshots remain excluded even when the durable records are shared.

The CLI checks records only. External queries/writes and actual operational work
continue through the user's chosen tools and authorization workflow. A pass is
not authenticated readback, live-system validation or proof of permission.

## Verification

Run from the product repository:

```bash
node --test templates/harness/test/*.test.mjs scripts/test-*.mjs
node scripts/check-portability.mjs templates
git diff --check
```

The 30-test suite includes disposable installs, real local commit-hook blocking
and passing cases, personal/shared transitions, runtime publication rejection,
reinstall preservation, development regressions and operations failure cases.
Skill frontmatter and shell syntax were also checked. Fixture registry snapshots
are synthetic: no real provider integration or production deployment was tested.

## Handoff: next ic-praxis session

First read [the design](../../architecture/infrastructure-harness.md), the
[installed guide](../../../templates/harness/profiles/infrastructure/README.md)
and `templates/harness/src/infrastructure.mjs` with its tests.

1. Review the workflow with realistic missing-task, already-completed,
   user-confirmed, paused and concurrent-owner cases. The current checker detects
   structural discrepancies; the agent still discovers requests absent from both
   registry and local records. It does not infer semantic duplicate requests.
2. Decide the smallest connector contract for complete/paginated reads, status
   mapping, attributed writes and authenticated readback. Keep provider policy and
   credentials in consumer configuration; do not bake in a particular registry.
3. Review importing existing Markdown records and user-completed historical
   changes. Do not invent retroactive application approval to satisfy a schema;
   an investigation record can capture confirmation without claiming the harness
   performed the change. Consider an explicit imported-result model if needed.
4. Review evidence freshness and ownership coordination before any execution
   capability. JSON assertions and file existence cannot establish semantic truth.
5. Plan the reviewed code/procedure/config merge for existing installations;
   ordinary reinstall skips existing files and cannot upgrade the old router.
   Repeat disposable installation and migration tests, including personal/shared
   boundaries, before adopting into the originating operations repository.

**Adoption order:** finish and improve this product in the ic-praxis session,
then apply it to the operations project in a separate step. This increment does
not self-install a root harness, modify an operations project's live workflow,
enable CI, register real tasks, or deploy infrastructure.
