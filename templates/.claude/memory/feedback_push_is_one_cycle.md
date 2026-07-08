---
name: feedback_push_is_one_cycle
description: Code + its docs/worklog ship together as one cycle; batch related deploys into one version bump
metadata:
  type: feedback
---

(STARTER RULE — keep it or delete it.) A unit of work is one cycle: change → verify → document → commit/push, together. Don't split the code from its worklog/changelog into separate, drifting commits. Batch related changes into a single version bump rather than spamming micro-bumps.

**Why:** half-shipped changes and doc drift are where "it was supposed to be done" bugs live; micro-bump spam churns deploys.
**How to apply:** when the change works, commit code + docs in one go and bump the version once for the batch.
