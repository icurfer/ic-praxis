# User-approved architectural decisions

Implemented in v0.11.0. Both harness profiles need a way to explain durable
design choices to a non-specialist and record their explicit decision.

The common ADR CLI creates proposed Markdown and metadata records, checks four
required sections, and accepts only with a reviewed content hash and separate
approval evidence. Later body/evidence changes fail checks. The agent procedure
presents alternatives and consequences and waits for actual user acceptance.
No machine check authenticates human consent; metadata alone must not be treated
as permission. Accepted history is preserved with linked new decisions.

Personal publication scope includes docs/adr and its evidence. Architecture
approval is separate from operational and publication authorization. No task
service integration or server execution was added; CI stays off.

Validation uses installed temporary Git repositories: proposal completeness,
missing and stale approval, accepted-content/evidence changes, unsafe paths,
both profiles, personal hook rejection and explicitly shared commit success.
