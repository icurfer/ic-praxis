# Infrastructure harness: task lifecycle draft

Status: implementation scope for v0.10.1; review in the next project session
before adoption into a real operations repository.

## Problem and boundaries

An operations reference exposed three gaps: completed work can stay open in a
task service, follow-up requests can be documented without a task, and a planning
task can be mistaken for permission to apply changes. Adopt the reusable workflow,
not the reference's hostnames, service accounts, provider, space IDs or paths.

Placement: `templates/harness/src/infrastructure.mjs` and its selected-profile
guide. Development keeps its existing runner, records and tests.
Credentials: never stored by this feature; users retain their own task-service
connector/skill and credential store.
Existing pattern: the common profile router selects exactly one implementation;
local, bounded checks fail closed and never stage, publish or deploy.

## MVP

- Keep `development` / `infrastructure` selection and independent personal/shared
  publication scope. No silent profile switch; no automatic CI.
- Configure one authoritative task registry by a generic name, scope and a
  repository-local workflow document. No built-in provider or API writes.
- The chosen connector/agent exports a complete, sanitized, time-stamped registry
  snapshot to ignored runtime storage. Match registry identity and reject stale,
  partial, future-dated, malformed or duplicate-ID snapshots.
- `task init` links an already registered task to a durable JSON operations
  record. It cannot register a remote task or silently create a local-only TODO.
- `task list/status/check/validate/reconcile/index` inspect records and the registry
  snapshot. Reconciliation flags missing records, duplicate links, title/owner/
  status drift, invalid completion claims and stale/missing generated indexes.
- Records separate request, targets, allowed/excluded scope, authorization,
  rollback, dated evidence, completion limitations, follow-up references and the
  next action. A plan/investigation can complete without applying a server change.
- A completed change needs apply authorization and verification or an explicitly
  attributed user confirmation. Open work cannot be marked done. A user-confirmed
  result is not relabeled as an agent-run test. Evidence paths must exist.
- Task JSON and the generated index live outside ignored runtime state; they can
  be shared after explicit publication-scope selection. Index updates preserve
  handwritten files by refusing to overwrite them.

## Workflow

1. Read repository rules, current task service list/details, operations index and
   relevant runbook. Reuse task IDs. Never infer absence from a partial query.
2. For a new bounded request, register through the configured workflow in the
   chosen scope, then refresh the snapshot and link the record. Follow-up work on
   an existing request reuses the record; completed history is not reopened just
   because a new request concerns the same service.
3. Record the request and permission separately. Check ownership before starting;
   another agent's active task requires a handoff. The CLI is not a distributed lock.
4. Perform only authorized work through existing operational tools. The harness
   does not execute a command or treat a JSON field as actual user permission.
5. Reconcile evidence, task-service state, local record and generated index before
   handoff. Report gaps instead of automatically closing tasks. Existing Git and
   publication rules still apply; a commit alone does not prove deployment.

## Acceptance and verification

Disposable installed targets must demonstrate: unset configuration blocks;
development still runs unchanged; infrastructure never executes development
checks; fresh task linkage; duplicate/missing links; completion versus partial
work; plan-only completion; apply evidence and rollback; user confirmation;
stale/partial/wrong-scope snapshots; handwritten index preservation; symlink/path
rejection; lock safety; reinstall preservation; and personal publication guards.

## Deferred for the next project session

Provider adapters and authenticated readback, automatic task registration/status
sync, approval identity verification, task-service paging contracts, live state
collectors, deployment execution, automatic rollback and distributed ownership
leases are not part of this draft. JSON assertions and evidence files are not
tamper-proof attestations. Semantic duplicate requests still require human/agent
review. No deployment into the originating operations repository in this stage.
