---
name: feedback_verify_before_done
description: Verify a change actually works end-to-end before calling it done — drive the flow, don't just typecheck
metadata:
  type: feedback
---

(STARTER RULE — keep it or delete it.) Before reporting a nontrivial change as done, exercise it end-to-end and observe the behavior — not just tests/typecheck. Promote repeated checks into the `verify-app` skill instead of rewriting throwaway scripts.

**Why:** "it compiles" is not "it works"; unverified changes ship regressions.
**How to apply:** run the affected flow, confirm the observed result, then report — with the evidence.
