---
name: verify-app
description: Standard end-to-end verification for this project — reusable login/smoke scripts + per-feature scenarios. Use this instead of writing a throwaway verification script each time.
---

# verify-app

When a change needs to be verified against the running app, use these assets
instead of hand-writing a one-off script.

- **Runnable helpers live in `scripts/`**, not in this folder — e.g.
  `scripts/verify/login.sh`, `scripts/verify/smoke.sh`. Call them; don't
  reinvent them. List what exists here as you add it:
  <!-- - `scripts/verify/login.sh` — obtains a session token -->
- `scenarios/` — one file per feature flow (documentation, not executables).
  Copy the closest scenario as a starting point.

## Rules
- If you find yourself writing the same verification by hand twice, promote it:
  the runnable part to `scripts/`, the flow description to `scenarios/`. That is
  how this skill grows.
- **Don't put executables under `.claude/skills/`.** A skill is documentation
  packaging and gets renamed, split or dropped; the scripts outlive it, and the
  repo already has one place for runnable files with one set of conventions for
  permissions, paths and review.

<!-- Fill scripts/verify/ and scenarios/ with your project's real driver
     (Playwright, curl+jq, an HTTP client, a CLI harness — whatever fits). -->
