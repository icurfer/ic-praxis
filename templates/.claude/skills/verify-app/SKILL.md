---
name: verify-app
description: Standard end-to-end verification for this project — reusable login/smoke helpers + per-feature scenarios. Use this instead of writing a throwaway verification script each time.
---

# verify-app

When a change needs to be verified against the running app, use these assets
instead of hand-writing a one-off script.

- `helpers/` — shared utilities (auth/login, route smoke test). Import, don't
  reinvent.
- `scenarios/` — one file per feature flow. Copy the closest scenario as a
  starting point.

## Rule
If you find yourself writing the same verification by hand twice, promote it to
a helper or a scenario here. That is how this skill grows.

<!-- Fill helpers/ and scenarios/ with your project's real driver
     (Playwright, curl+jq, an HTTP client, a CLI harness — whatever fits). -->
