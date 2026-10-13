---
description: Propose an architectural decision, ask the user to review it, and record explicit acceptance
---

Use for durable architectural choices in either development or infrastructure,
when the user requests an ADR or a significant unresolved design choice arises.
Explain ADR as a short record of what was decided and why. Routine edits do not
need an ADR. Read existing `docs/adr/` records before proposing a new decision.
The common CLI works even before a harness profile is selected; Node.js 18+ is
required. No registry, CI or server action is performed.

1. Run `node harness/bin/praxis.mjs adr propose <id> --title "Decision title"`.
   Fill `docs/adr/<id>.md`: Context, Decision, Alternatives, Consequences. Explain
   the concrete problem, reasonable options, recommendation, costs and risks in
   the user's language. Keep the English section headings for the checker.
2. Run `node harness/bin/praxis.mjs adr check <id>`. Preserve the reported content
   SHA256 alongside the exact proposal presented for review. A passing proposed
   record means completeness only; it is not accepted.
3. Present that proposal and ask: "이 결정을 채택해서 ADR에 기록할까요?" (or the
   equivalent in the user's language). Offer revision or deferral. Wait for
   explicit acceptance of that content before running accept or treating the
   decision as adopted. Continue independent authorized work meanwhile. Silence,
   vague acknowledgment, requests to edit, or approval to build this workflow do
   not approve an individual decision. Honor an existing explicit approval of
   the exact proposal; do not ask redundantly. Changed content needs new review.
4. Only after approval, write minimal sanitized evidence to
   `docs/adr/evidence/<id>.md`: approval date, user/role, source of confirmation,
   and the approved decision with its reviewed hash. Do not invent approval,
   copy raw conversation logs or include credentials/private infrastructure data.
   Run `node harness/bin/praxis.mjs adr accept <id> --by "User or role" --evidence
   docs/adr/evidence/<id>.md --reviewed-hash <sha256>` as one command, then check
   again. The CLI binds the recorded approval to body and evidence hashes; it
   cannot authenticate who approved or judge whether the statement is true.
5. Report proposed/accepted accurately. `adr list` shows records and issues.
   Preserve accepted history; a revised decision gets a new ADR referencing the
   previous one. Do not edit accepted text or evidence to silently change it.

ADR acceptance does not itself authorize implementation, server operations,
deployment or publication. Respect the user's existing action authorization.
Read `harness/config/sharing` (missing means personal): `docs/adr/` including
approval evidence stays local by default. An ordinary push request is not consent
to publish it. Follow praxis-init for an explicitly reviewed shared transition.
