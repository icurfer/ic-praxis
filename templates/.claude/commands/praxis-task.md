---
description: Route task requests by the selected harness type; run development checks or reconcile operations records
---

Use this procedure when the user asks to start a task, check progress or verify
work. Explain the result in the user's language; users need not learn commands.
The executable lives in `harness/`, shared by Claude Code and Codex.

Read `harness/config/sharing` first (missing means personal). Respect the
publication scope: personal harness and task records remain local, including
when asked to commit or push normal product changes. Do not force-add them.
Sharing requires explicit user choice after reviewing what will be published;
follow the publication step in `praxis-init`. Do not treat development completion
as a reason to switch scope. Public guides/curated summaries can be committed.

For a significant unresolved architectural choice, follow `praxis-adr` to
present options and obtain explicit acceptance. Routine edits need no ADR.
Continue independent authorized work while a decision is pending.

Then read `harness/config/profile.json`. If the type is unset, follow the type
selection step in `.claude/commands/praxis-init.md` before creating any task.
If it is `infrastructure`, follow the operations branch below. Only `development`
uses the development branch. Never substitute development checks for operations.

## Operations branch

1. Read `harness/profiles/infrastructure/README.md`, registry configuration and its
   referenced workflow. If missing, complete that setup through `praxis-init`.
2. Use the configured connector to inspect existing tasks, details/comments and
   ownership in the chosen scope. Read the local index and linked runbooks.
   Refresh a complete sanitized snapshot. Reuse matching tasks; do not reopen
   completed history or take another agent's active task without a handoff.
3. If the requested multistep work is absent, register it through that workflow
   within existing user authorization, then read back and refresh the snapshot.
   No local-only substitute or unrelated bulk registration. Link its ID with
   `task init <id> --registry-id <existing-id> --kind investigation|plan|change`.
4. Fill the generated durable record: request, scope, permission, recovery for
   apply work, evidence and next action. Regenerate `task index`, then run `task
   check <id>`. A recorded permission field is not itself permission. Execute only
   the authorized work through existing project tools; this CLI runs no commands.
5. Record observations and limitations. Preserve attributed user confirmation as
   user confirmation. Check actual in-scope completion before updating the registry
   through the configured workflow. Use review for outstanding review/input and
   paused for a user pause. Link authorized follow-ups; do not hide remaining work.
6. Read back registry changes, refresh the snapshot, align the local record and
   run `task index`, `task validate <id>` and `task reconcile`. Report discrepancies
   with the next action. Never auto-close tasks just to pass. A passing status is
   record consistency, including for open tasks, not a live test or completion.
   Preserve durable handoff evidence outside `.state/`; follow publication rules.

Stop here for infrastructure. CI, registry writes and server actions are not
performed by the CLI. Existing project approval and ownership rules still apply.

## Development branch

1. Read `harness/README.md` and `harness/config/project.json`. Check Node.js 18+
   is available. If missing, explain the prerequisite; local Git gates still work.
2. For a new task, select a short unique ID, infer a concrete title and classify
   the change using the constitution. Default to `big` when uncertain. Reuse
   existing plans; for a big change, write the required spec/scope documents and
   reference them with repeated `--plan` options. Do not fabricate user approval.
3. Run `node harness/bin/praxis.mjs task init <id> --title <title> --size <size>`
   with any plan references. Existing IDs are never overwritten. Records live in
   ignored `harness/.state/`; preserve them and do not commit personal records.
4. If checks are not configured, inspect the project's actual documented test and
   build commands, then configure `harness/config/project.json`. Use executable
   argument arrays, not shell strings. Never substitute a no-op merely to pass.
   Commands are trusted repository code: inspect changes before running them.
   Use foreground, bounded checks; no servers, deployment, publishing or messages.
5. Run `task check <id>` before implementation. A pass checks required files and
   configuration, not the semantic quality of the plan. Review that separately.
6. Run `task validate <id>` after implementation. It calls the existing staged
   Git gate plus configured project checks. It does not stage or commit files.
   Unstaged changes are included in the freshness fingerprint, but the gate's
   commit rules still inspect the index; the real commit hook remains necessary.
7. Run `task status <id>` to report progress. Explain blockers and the next step.
   After file/index/HEAD changes, rerun validation. Do not call unit checks E2E.

Do not enable CI, create branches, commit, push or deploy just to run this
procedure. CI remains off unless explicitly requested. The harness is a local
workflow aid, not a security boundary or a replacement for code review.
