# ic-guardrails

> **English** · [한국어](README.ko.md)

**Guardrails for AI coding agents.** Retros become pre-commit gates — so the same mistake can't ship twice, and your project's discipline stays on the rails.

Most "AI rules" setups are a `CLAUDE.md` full of good intentions that go stale in a month. `ic-guardrails` is the missing half: the rules you *write down* get *mechanically enforced* at commit time. When something breaks, you add a gate — and it stays fixed.

> The name: guardrails don't slow you down — they stop you from going off the road. That's what this does to a project's conventions.

---

## Why ic-guardrails exists

It was extracted from running a real platform: a single hub repo coordinating one web frontend and ~17 backend services, each with its own deploy pipeline. At that scale, the same class of mistake kept recurring:

- **Silent non-deploys.** A code change shipped, but the file CI watches to trigger a build wasn't bumped — so the pipeline never fired and the fix never reached production. Nobody noticed until it broke again.
- **Rules that evaporate.** A lesson learned the hard way ("always do X") lived in a `CLAUDE.md` or in someone's head, and was forgotten three weeks later — reproducing the exact same incident.

Writing rules down wasn't enough. **Documents don't stop a bad commit; they only describe what a good one looks like.** The fix was one move: take every rule a machine *can* check, and enforce it at commit time. Forget the version bump? The commit is blocked, with the reason printed. Paste a secret? Blocked.

That is the guardrail — each incident adds one more rail, and they stay up. This repo packages that discipline so any project can adopt it in one command.

---

## What you get

A five-axis scaffold, dropped into any repo:

| Axis | File(s) | What it does |
|---|---|---|
| **1. Constitution** | `CLAUDE.md` | Rules the agent reads every session: work order, delegated responsibilities, hard "Do NOT"s (each with its *why*). |
| **2. Four-stage docs** | `docs/` | Change freezes into a spec → scope → backlog → done trail before it becomes code. |
| **3. The guardrail gate** ⭐ | `scripts/check-conventions.sh` + `.githooks/pre-commit` | Blocks commits that violate mechanically-checkable rules: deploy-trigger not bumped, malformed version file, secret/taboo patterns. |
| **4. Shared memory** | `.claude/memory/` + `scripts/setup-claude-memory.sh` | Cross-session facts, one per file, indexed — **git-versioned** so lessons survive resets and are shared with the team. Ships a few universal starter rules. |
| **5. Verify skill** | `.claude/skills/verify-app/` | Reusable end-to-end checks instead of throwaway scripts. |

The heart is axis 3 feeding axis 1: **a retro that produces a checkable rule becomes a gate that can't be forgotten.**

---

## Architecture

The five axes split into three jobs — *write* rules, *enforce* them, *retain* the lessons — and feed each other in a loop:

```mermaid
flowchart TB
    subgraph WRITE["✍️ Write the rules"]
        A1["① CLAUDE.md<br/>constitution"]
        A2["② docs/<br/>four-stage flow"]
    end
    subgraph ENFORCE["🔒 Enforce at commit time"]
        A3["③ pre-commit gate<br/>check-conventions.sh"]
    end
    subgraph RETAIN["🧠 Retain the lessons"]
        A4["④ .claude/memory/"]
        A5["⑤ verify-app skill"]
    end

    A1 -- "checkable rules<br/>become gates" --> A3
    A2 -- "checkable rules<br/>become gates" --> A3
    A3 == "a blocked commit<br/>teaches a new rule" ==> A1
    A4 -. "informs future work" .-> A1
    A5 -. "proves changes<br/>actually work" .-> A3
```

The bold arrow is the point: enforcement flows **back** into the written rules. A commit that gets blocked isn't friction — it's the system teaching you the rule you were about to break.

### What happens at commit time

```mermaid
flowchart LR
    C["git commit"] --> H[".githooks/pre-commit"]
    H --> S["check-conventions.sh"]
    S --> G1{"deploy code changed<br/>but version not bumped?"}
    S --> G2{"version file<br/>malformed?"}
    S --> G3{"secret / taboo<br/>pattern present?"}
    G1 -- yes --> X["🚫 commit blocked<br/>+ reason printed"]
    G2 -- yes --> X
    G3 -- yes --> X
    G1 & G2 & G3 -- all clear --> OK["✅ commit proceeds"]
    X -. "fix, or --no-verify<br/>to bypass" .-> C
```

---

## Install

> The installer only **copies the scaffold files into your repo**. It downloads
> itself to a temp dir and cleans up — ic-guardrails' own repo/`.git`/`templates/`
> are never left in your project. Existing files are never overwritten (use
> `--force` to replace).

**A. One-liner — run at your project root (recommended)**

```bash
curl -fsSL https://raw.githubusercontent.com/icurfer/ic-guardrails/main/install.sh | bash
# no curl? →  wget -qO- https://raw.githubusercontent.com/icurfer/ic-guardrails/main/install.sh | bash
```

Then activate the gate and git-version the memory:

```bash
bash scripts/install-hooks.sh        # activate the commit gate
bash scripts/setup-claude-memory.sh  # git-version memory + load it each session
```

**B. One phrase in Claude Code**

Point your agent at this repo and say:

> "Scaffold ic-guardrails into this project using the curl one-liner from
> https://github.com/icurfer/ic-guardrails (do not clone it into the project), then run /guardrails-init."

> ⚠️ **Don't `git clone` ic-guardrails *inside* your project and run it there** — that
> leaves an `ic-guardrails/` folder (with its own `.git`) in your repo. If you want a
> local copy, clone it **outside** your project and run
> `/path/to/ic-guardrails/install.sh /path/to/your/project`.

Then, inside Claude Code:

```
/guardrails-init  <one line describing your project>
```

`/guardrails-init` inspects your repo, fills every `{{placeholder}}` in `CLAUDE.md` and the gate, tunes the gate to your real deploy paths — and **proves it works by making a deliberately-bad commit and showing it blocked.**

---

## The retro loop (why this is different)

```mermaid
flowchart LR
    I["💥 Incident<br/>something breaks"] --> W["Write the rule<br/>in CLAUDE.md / docs"]
    W --> Q{"Mechanically<br/>checkable?"}
    Q -- yes --> G["Add a gate in<br/>check-conventions.sh"]
    Q -- no --> R["Stays a written rule<br/>(agent-enforced)"]
    G --> P["🔒 Blocked at commit time<br/>— can't slip back"]
    P -. "next incident<br/>adds one more guardrail" .-> I
```

Rules that depend on human memory break again. This moves as many as possible into the gate, one incident at a time.

---

## Customizing the gate

Open `scripts/check-conventions.sh` — the config block at the top:

- `CODE_RE` — paths whose change *must* be deployed (→ requires a version bump)
- `VERSION_FILE` — the file your CI triggers on
- `FORBIDDEN_PATTERNS` — secrets, debug leftovers, banned APIs

Add a new gate whenever a retro gives you a checkable rule. That's the whole discipline.

## Starter rules — keep what fits, delete the rest

`.claude/memory/` ships a few **universal** working rules, each marked
`(STARTER RULE — keep it or delete it.)`:

- `feedback_diagnose_before_assume` — reproduce with a real probe before guessing
- `feedback_no_quick_fix` — diagnose → plan → implement; no shortcut that skips diagnosis
- `feedback_verify_before_done` — exercise the change end-to-end before calling it done
- `feedback_push_is_one_cycle` — code + docs/worklog ship together; batch deploys

They're **starters, not law.** Keep the ones that fit your team, delete the rest,
and prune the matching lines in `.claude/memory/MEMORY.md`. The real value comes
from the rules *your* incidents teach you — add those as you go. (`/guardrails-init`
will help you curate this on first setup.)

## Grows with you — and stays curated

This system is designed to **grow**: every incident adds a rule, a gate, a memory.
That compounding is the point — but growth without curation becomes noise (stale
rules, dead gates, an index that drifts). So it also ships the other half:

```bash
bash scripts/guardrails-review.sh   # structural sprawl: orphan/dangling memory, growth stats
```
```
/guardrails-review                  # + judgment: prune stale rules & dead gates (proposes, you confirm)
```

The result is a system that **starts tiny, grows only what your incidents earn, and
curates itself** — the opposite of shipping someone else's mega-framework on day one.

## License

Apache-2.0
