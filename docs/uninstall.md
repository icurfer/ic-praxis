# Removing ic-praxis from a project

Installing is one line, so removing should be one page. Nothing here is
automated except the one step that touches a location outside the repo — your
personal agent directory — because that is the only step you can't see in
`git status`.

## 0. The only step that reaches outside the repo

Versions **≤ v0.5.3** shipped `scripts/setup-claude-memory.sh`, which moved
`~/.claude/projects/<encoded-repo-path>/memory` aside and symlinked the repo's
`.claude/memory/` in its place. If you ever ran it, deleting the repo files
leaves a **dangling symlink in your home directory** and your backup stranded.
Undo it first, from the repo root:

```bash
bash scripts/unlink-claude-memory.sh     # shows the plan, asks, then acts
```

It removes the link (never a real directory), restores the newest
`memory.bak.*` next to it, and leaves the repo's `.claude/memory/` untouched. If
that script isn't in your checkout (you're on an older scaffold), grab it from
this repo: `templates/scripts/unlink-claude-memory.sh`.

v0.6.0 and later never touch anything under `~/.claude/`, so on a fresh install
this step is a no-op — run it anyway to be sure; it reports and exits when there
is nothing to undo.

## 1. Decide what you're actually removing

Most "remove ic-praxis" cases are really "keep the discipline, drop the
`.claude/` layout" — the constitution, the commit gate and the four-stage
`docs/` flow are repo-native and cost nothing to keep. Removing the agent
directories is a separate decision from removing the gate.

| Keep | Remove | What you lose |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md`, `docs/`, `scripts/check-conventions.sh`, `.githooks/`, `scripts/install-hooks.sh` | `.claude/`, `.agents/`, `scripts/praxis-review.sh` | Slash commands, skills, memory index, Codex adapters |
| `.claude/`, `.agents/` | the gate + `docs/` | Commit-time enforcement — the part that makes retros stick |

## 2. Remove the agent layer (`.claude/` + `.agents/`)

```bash
git rm -r --cached .claude .agents && rm -rf .claude .agents
git rm scripts/praxis-review.sh          # it only inspects .claude/ + .agents/
```

Then clean up what still points at them:

- `CLAUDE.md` — the **Memory** section and the `.claude/...` entries in the
  routing list. If you keep `AGENTS.md`, fix its Memory section too.
- Anything inside the `<!-- praxis:shared:begin/end -->` block must be edited in
  **both** files, byte-identical — Gate E blocks the commit otherwise.
- `.gitignore` — the `.claude/...` personal patterns become dead lines.
- Procedures you want to keep: move a `SKILL.md` to `docs/<name>.md` and its
  runnable helpers to `scripts/` before deleting the folder. (From v0.6.0 the
  helpers already live in `scripts/`, so only the documents move.)

## 3. Remove the gate

```bash
git config --unset core.hooksPath          # stop using .githooks/
git rm -r .githooks scripts/check-conventions.sh scripts/install-hooks.sh
```

Drop the "Automated gate" section from `CLAUDE.md` / `AGENTS.md` (shared block →
edit both). Keep `version` if your CI triggers on it — that file is yours, not
ic-praxis'.

## 4. Remove the docs flow

```bash
git rm -r docs/spec docs/scope docs/deferred docs/done docs/requirements
```

Keep `docs/CHANGELOG.md` unless you have another changelog. Remove the
**work order** section from the constitution, or it describes folders that no
longer exist.

## 5. Leftovers to check

```bash
grep -rn "praxis\|\.claude/\|\.agents/" --exclude-dir=.git .
git status          # nothing outside the repo should appear — by design
ls -l ~/.claude/projects/*/memory 2>/dev/null | grep -- '->'   # no link into this repo
```
