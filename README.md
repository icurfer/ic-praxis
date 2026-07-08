# ic-ratchet

> **English** · [한국어](README.ko.md)

**A quality ratchet for AI coding agents.** Retros become pre-commit gates — so the same mistake can't ship twice, and your project's discipline never slips back.

Most "AI rules" setups are a `CLAUDE.md` full of good intentions that go stale in a month. `ic-ratchet` is the missing half: the rules you *write down* get *mechanically enforced* at commit time. When something breaks, you add a gate — and it stays fixed.

> The name: a ratchet turns one way and won't slip back. That's what this does to a project's conventions.

---

## What you get

A five-axis scaffold, dropped into any repo:

| Axis | File(s) | What it does |
|---|---|---|
| **1. Constitution** | `CLAUDE.md` | Rules the agent reads every session: work order, delegated responsibilities, hard "Do NOT"s (each with its *why*). |
| **2. Four-stage docs** | `docs/` | Change freezes into a spec → scope → backlog → done trail before it becomes code. |
| **3. The ratchet gate** ⭐ | `scripts/check-conventions.sh` + `.githooks/pre-commit` | Blocks commits that violate mechanically-checkable rules: deploy-trigger not bumped, malformed version file, secret/taboo patterns. |
| **4. Shared memory** | `.claude/memory/` | Cross-session facts, one per file, indexed — so lessons survive context resets. |
| **5. Verify skill** | `.claude/skills/verify-app/` | Reusable end-to-end checks instead of throwaway scripts. |

The heart is axis 3 feeding axis 1: **a retro that produces a checkable rule becomes a gate that can't be forgotten.**

---

## Install — three ways

**A. One phrase in Claude Code (easiest)**

Point your agent at this repo and say:

> "Scaffold ic-ratchet into this project — clone https://github.com/icurfer/ic-ratchet, run its install.sh here, then run /ratchet-init."

**B. One-liner**

```bash
curl -fsSL https://raw.githubusercontent.com/icurfer/ic-ratchet/main/install.sh | bash
```

**C. Clone and run**

```bash
git clone https://github.com/icurfer/ic-ratchet
ic-ratchet/install.sh .        # scaffold into the current repo (won't overwrite existing files)
bash scripts/install-hooks.sh      # activate the gate
```

Then, inside Claude Code:

```
/ratchet-init  <one line describing your project>
```

`/ratchet-init` inspects your repo, fills every `{{placeholder}}` in `CLAUDE.md` and the gate, tunes the gate to your real deploy paths — and **proves it works by making a deliberately-bad commit and showing it blocked.**

---

## The retro loop (why this is different)

```
   incident  ─►  write the rule in CLAUDE.md / docs   ─►  is it checkable?
                                                            │
                                       yes ────────────────►│  add a gate in
                                                            │  check-conventions.sh
                                        no                  │
                                        └► stays a written rule (agent-enforced)
```

Rules that depend on human memory break again. This moves as many as possible into the gate, one incident at a time.

---

## Customizing the gate

Open `scripts/check-conventions.sh` — the config block at the top:

- `CODE_RE` — paths whose change *must* be deployed (→ requires a version bump)
- `VERSION_FILE` — the file your CI triggers on
- `FORBIDDEN_PATTERNS` — secrets, debug leftovers, banned APIs

Add a new gate whenever a retro gives you a checkable rule. That's the whole discipline.

## License

Apache-2.0
