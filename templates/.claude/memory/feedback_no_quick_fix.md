---
name: feedback_no_quick_fix
description: Change code via diagnose → plan → implement; don't offer a "quick fix" that skips diagnosis
metadata:
  type: feedback
---

(STARTER RULE — keep it or delete it.) Don't reach for a "quick fix" that bypasses understanding the cause. Code changes go: diagnose → decide the smallest correct change → implement. Don't present a fast-but-shaky shortcut as an option.

**Why:** shortcuts that skip diagnosis mask the symptom and cost more when it resurfaces.
**How to apply:** when tempted to patch fast, first confirm the cause (see [[feedback_diagnose_before_assume]]), then make the real change.
