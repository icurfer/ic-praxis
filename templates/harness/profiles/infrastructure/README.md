# Infrastructure harness / 운영 작업 관리

This profile checks task records against a task-registry snapshot. It does not
run server commands, query a service, register tasks or synchronize remote status.
Agents use the repository's chosen connector and operational procedures for those
actions. A passing check is record consistency, not live health or permission.

운영용은 **기존 태스크 확인 → 범위·승인 기록 → 작업 → 근거·상태 대조 → 인계**를
돕습니다. 개발용의 변경 크기·버전·빌드 절차를 적용하지 않습니다. 계획 완료와
실제 적용 완료, 사용자가 확인한 결과와 에이전트가 검증한 결과를 구분합니다.

## Configure once

Select `infrastructure` explicitly. Preserve existing repository rules and task
history. Choose the authoritative registry and managed scope with the user;
there is no default vendor. The scope should contain the operations tracked by
this harness, not unrelated work. Put its connector, account-selection rules,
pagination, state mapping, ownership/handoff, write authorization and readback
procedure in a repository-local document. Credentials remain in the connector's
own credential store. Record an optional public reference in `referenceProject`.

Example `harness/config/infrastructure.json` (replace the registry and scope):

```json
{
  "schemaVersion": 1,
  "referenceProject": null,
  "notes": "",
  "taskRegistry": {
    "name": "Example tracker",
    "scope": "operations",
    "workflow": "harness/operations/registry-workflow.md",
    "snapshot": "harness/.state/registry.json",
    "maxAgeHours": 24
  }
}
```

Create the workflow document with the actual agreed procedure, then run
`node harness/bin/praxis.mjs profile status`. Missing settings fail pending.
Status success means the configuration is present; snapshot and task health are
checked separately. Normal reinstalls preserve existing scaffold files as well as
configuration. Upgrading from the placeholder requires a reviewed merge of the
router, new implementation, guides and agent procedures, plus new registry config
fields. Reinstall alone does not activate the new workflow. Back up customizations
and records; do not use `--force` as an upgrade shortcut. CI remains off.
Preserve existing hooks. If adopting the local publication guard, integrate
`scripts/check-sharing.sh` into the existing gate and verify it in a disposable
checkout; do not enable the generic development version gate for operations.

## Refresh the registry snapshot

Use the configured connector to read the complete selected scope, including all
pages and task details/comments needed for ownership and completion. Export only
these fields to the ignored snapshot path:

```json
{
  "schemaVersion": 1,
  "registry": { "name": "Example tracker", "scope": "operations" },
  "observedAt": "2026-01-01T00:00:00Z",
  "complete": true,
  "tasks": [
    { "id": "ops-1", "title": "Inspect service", "status": "todo", "assignee": null }
  ]
}
```

Replace the example timestamp with the actual observation time. Do not label a
partial/failed query complete or manufacture a successful observation. Match
registry name/scope exactly; task IDs are strings. States are `todo`,
`in_progress`, `review`, `done`, `paused`. Normalize vendor states in the chosen
workflow. If the service represents a pause as `todo` plus a comment, map it to
`paused` only when that comment confirms the user requested the pause.

The CLI rejects partial, stale, future-dated, malformed, wrong-scope and duplicate
ID snapshots. `maxAgeHours` accepts 1–168. Refresh before starting, after registry
writes and before handoff even within that window. This manual snapshot is not
authenticated proof; the agent must report failed/uncertain readback accurately.

## Work on a request

1. Read repository rules, this guide, the configured workflow, existing registry
   details and local index. Reuse matching work; do not reopen closed history just
   because a new request concerns the same service. Do not take another agent's
   active task without an agreed handoff. The local lock is not a remote lease.
2. If a multistep request lacks a task, register it through the chosen workflow
   within the user's scope, then refresh the snapshot. Do not create a local-only
   substitute or bulk-register unrelated backlog. Follow existing approval rules.
3. Link its existing ID and select the actual scope: `investigation`, `plan` or
   `change`. Fill the generated JSON before work; creation is not validation.

   ```bash
   node harness/bin/praxis.mjs task list
   node harness/bin/praxis.mjs task init inspect-service --registry-id ops-1 --kind investigation
   node harness/bin/praxis.mjs task index
   node harness/bin/praxis.mjs task check inspect-service
   ```

4. Use existing tools for authorized work. A JSON `apply` field or old plan cannot
   grant permission. Record actual results and limitations as they become known.
5. Review evidence before updating registry status through the configured workflow.
   Refresh/read back the registry; align the record and regenerate the index.
   Run `task validate <id>` and `task reconcile` before handoff. Report unresolved
   discrepancies and the next action; never automatically close all open tasks.

`task check`, `validate` and `status` run the same current record checks. They do
not run development checks or cache a passing result. Exit 0 means consistency
with the supplied snapshot, including for an unfinished task; read the printed
status. `task reconcile` checks every local record and flags open registry tasks
without records. Historical closed tasks do not require backfilling. Semantic
duplicate requests and requests absent from both records still need agent review.

## Durable record and evidence

`task init` creates `harness/operations/tasks/<id>.json`. Edit it directly:

| Fields | Meaning |
|---|---|
| `registryId`, `title`, `status`, `assignee` | Must match the refreshed registry. |
| `kind`, `scope` | Request, targets, allowed actions and exclusions. |
| `authorization` | `read-only` or `apply`; apply requires a document recording actual permission. |
| `rollback` | Repository-relative recovery document required for apply scope. |
| `evidence` | Dated observation, plan, verification or attributed user confirmation. |
| `completion` | Summary, remaining in-scope work, limitations and follow-up references. |
| `nextAction`, `updatedAt` | Concrete next step for unfinished work; actual update time. |

Evidence entries contain `kind`, `path`, `observedAt` and `summary`; a
`user-confirmation` also needs `confirmedBy`. Files must be nonempty, relative to
this repo, and cannot traverse symlinks. Link existing runbooks/results rather
than copying secrets or raw logs. For example:

```json
{
  "kind": "user-confirmation",
  "path": "harness/operations/evidence/service-result.md",
  "observedAt": "2026-01-01T00:00:00Z",
  "summary": "User reported the requested verification succeeded.",
  "confirmedBy": "User statement recorded in the linked evidence"
}
```

`done` requires a summary, no remaining in-scope work and evidence appropriate to
the task kind. A completed change also needs apply authorization and recovery
documentation. Plan/investigation records cannot authorize apply. `review` means
input/review is still needed; `paused` records the user's pause and resumption
condition in `nextAction`. Put distinct authorized follow-ups in registry tasks
and link their IDs; deferred ideas can stay explicitly deferred. Do not hide
unfinished scope under limitations or follow-ups to force a pass.

The checker validates structure and references, not the truth, completeness or
authorization semantics of prose. It does not verify live systems or prove that
an external task write succeeded. User confirmation must not be described as an
agent-executed test.

## Index, publication and recovery

`task index` regenerates only `harness/operations/INDEX.md` from all durable
records. A handwritten index is preserved by refusing the write. Existing
repository indexes can link this generated index; do not overwrite them.
`task init` refuses duplicate IDs and registry bindings.

Personal mode keeps the entire harness local. Shared mode permits reviewed task
records, workflow and evidence, while `harness/.state/` remains local in both
modes. Store durable handoff evidence outside `.state/`. Keep private information
out of unrelated public docs. Shared selection alone does not authorize a push.
Normal reinstall preserves records, config and index. Back up personal records
before uninstalling. Never remove remote tasks merely to remove this harness.

Writers use `harness/.state/infrastructure.lock`; inspect active processes before
removing a leftover lock after a crash. Local edits and multiple machines require
the repository's usual coordination; this scaffold does not resolve concurrent
registry ownership or Git conflicts automatically.
