---
description: Fill in the ratchet scaffold for THIS project (constitution, docs, gate, memory)
---

You are finishing a `ic-ratchet` scaffold that was just copied into this
repository. The skeleton files exist but contain `{{PLACEHOLDER}}` markers and
generic defaults. Adapt them to THIS project.

Project description from the user (may be empty — infer from the repo if so):
$ARGUMENTS

Do this:
1. **Inspect the repo** — language, framework, how it builds/deploys, how many
   packages/services, and what the CI actually triggers on (look for
   `.github/workflows`, `Dockerfile`, `package.json`, etc.).
2. **`CLAUDE.md`** — replace every `{{...}}`: project name, system map table,
   the real deploy-trigger file name, and 2-3 genuine "Do NOT" rules inferred
   from the stack (each with a plausible "why").
3. **`scripts/check-conventions.sh`** — set `CODE_RE`, `VERSION_FILE`, and
   `FORBIDDEN_PATTERNS` to match this project's real deploy paths and taboos.
4. **`docs/`** — keep the four-stage structure; adjust folder names only if the
   user works in a different language. Leave `spec/scope/deferred/done` empty.
5. **`.claude/memory/`** — leave the example memory; do not invent project facts.
6. **Enable and PROVE the gate**: run `bash scripts/install-hooks.sh`, then make
   a deliberately-violating staged change (deploy code without a version bump)
   and show that the commit is BLOCKED. Then revert the dummy change.
7. Summarize what you customized and what the user should review.

Principle to preserve: the gate exists so retros become enforcement. Don't
water it down — tune it to fire on THIS project's real mistakes.
