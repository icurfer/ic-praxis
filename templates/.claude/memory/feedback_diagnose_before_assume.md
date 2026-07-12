---
name: feedback_diagnose_before_assume
description: When a symptom is reported, reproduce it with a real probe before guessing the cause
metadata:
  type: feedback
---

(STARTER RULE — keep it or delete it.) When something "doesn't work" or "doesn't show up", reproduce it with a concrete probe (a request trace, a DB count, a failing test) before proposing a cause. The user's hypothesis is also a claim to verify, not a given.

**Why:** guessing leads to fixes that mask the symptom instead of removing it.
**How to apply:** first observe, then diagnose, then change. See [[feedback_no_quick_fix]].
