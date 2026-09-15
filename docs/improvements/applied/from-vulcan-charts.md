# from-vulcan-charts — a shared repo is not a solo repo

**Adoption context**: a single-repo Helm chart collection on a company GitLab —
team-owned, one deploy unit. Installed ic-praxis **v0.5.3** via `install.sh`,
operated it for six days, then wrote this retro.

**One line**: the five axes fit, but **ic-praxis assumed `.claude/` is a team
asset on a solo developer's machine**. On a shared repo that assumption collides
with each teammate's personal space — worst of all in
`scripts/setup-claude-memory.sh`, which took over a personal directory
destructively, as **step 2 of the default install flow**.

Shipped in **v0.6.0**.

| # | Gap | Resolution in v0.6.0 |
|---|---|---|
| P0 | `setup-claude-memory.sh` moved the personal memory dir aside and symlinked the repo in its place — advertised as step 2 of `install.sh` | **Script removed.** Repo memory is read-on-demand team knowledge (the constitution points at `MEMORY.md`), so no personal path is touched. `unlink-claude-memory.sh` undoes an existing link and restores the backup; `install.sh` detects the leftover script and says how to undo it |
| P1 | No `templates/.gitignore` at all, while `.claude/README.md` said "add them to `.gitignore`" | Ships `templates/.gitignore` with the personal patterns, and `install.sh` **merges** them into a pre-existing `.gitignore` (same additive merge as `.gitattributes`) — otherwise the copy loop skips the file and the guard never arrives |
| P2 | No warning that a committed `.claude/` reaches every teammate, while the multi-session module installs `.claude/settings.json` | Stated in `.claude/README.md`, the module's own comment, both READMEs, and the `/praxis-init` question |
| P3 | Executables lived in `.claude/skills/verify-app/helpers/`, splitting the `scripts/` convention | `helpers/` no longer ships; `SKILL.md` documents the procedure and points at `scripts/`. Rule stated in `.claude/README.md` and the bootstrap prompt |
| P4 | No removal path — including the symlink in the personal area | `docs/uninstall.md`, ordered so the outside-the-repo step comes first; `praxis-review.sh` now states it only applies to a `.claude/`-shaped repo |
| side | `SECRET_KEY_RE` missed `jwtSecret` (and `clientSecret`) | Both added to the key list; `SECRET_ALLOWLIST` added for policy-plaintext values |

## P0 — the destructive default (the core of it)

The old script did this:

```bash
TARGET="$HOME/.claude/projects/$ENCODED/memory"
if [ -d "$TARGET" ] && [ ! -L "$TARGET" ]; then
  mv "$TARGET" "$TARGET.bak.$(date +%Y%m%d%H%M%S)"   # personal memory moved
fi
ln -sfn "$SRC" "$TARGET"                             # replaced by the repo
```

Reasonable on a solo developer's own repo. On a shared one it breaks four ways,
and the reporting team hit all four:

1. **A teammate's personal memory is moved** to `memory.bak.<ts>`, with one line
   of output and no documented way back.
2. **Personal notes land in the repo's working tree.** Every memory the agent
   saves afterwards is a repo file in `git status` — one `git add -A` leaks it.
   (The same class of accident ic-praxis' own multi-session module forbids.)
3. **Team knowledge and personal notes share one folder**, so review can't tell
   them apart.
4. **It is non-deterministic.** The slug is derived from the ABSOLUTE path, so it
   differs per clone location — and even between two sessions of the same person
   (one opened at the parent directory, one at the repo).

### Why the fix is removal, not an opt-in

The first proposal was to keep the script behind a `--memory-symlink` flag. The
decision went further, on the reasoning that an opt-in still leaves a supported
way for a repo to reach into a per-person location — and the only thing it buys
is auto-loading, which the constitution can ask for directly:

> `.claude/memory/` is team knowledge, **read on demand**: when a task touches a
> topic, read `MEMORY.md` and open the matching files.

`AGENTS.md` had described memory exactly that way since v0.4.0 (*"Memory
(agent-neutral, read on demand)"*) while `CLAUDE.md` still assumed the symlink.
The two entrypoints had drifted **outside** the `praxis:shared` block, where
Gate E doesn't look — so the fix also converges them.

A new constitution rule now blocks the whole class:

> **Do not make a shipped script write outside the target repo** — no touching
> `~/.claude/` or any per-person path.

## P1 — the boundary that was documented but never shipped

`templates/.claude/README.md` told users to add local caches to `.gitignore`,
and no `.gitignore` shipped. Two details made the fix bigger than adding a file:

- The copy loop **skips existing files**, and every real project already has a
  `.gitignore` — so the guard would never reach exactly the repos that have one.
  It needed the additive merge already used for `.gitattributes`.
- Ignoring `user-*.md` / `*.local.md` means `praxis-review.sh` must stop counting
  them: a git-ignored personal file is not an "orphan memory file", it's not a
  team asset at all.

## P2 — precedence

Precise version of the claim: a repo-level `.claude/` outranks each person's
`~/.claude/` — committed `settings.json` keys win over their personal ones, and a
command or skill with the same name shadows theirs. Hooks are **additive**: ones
declared in the repo fire in a teammate's sessions *in addition to* their own,
rather than replacing them. Either way the conclusion holds: committing
`.claude/settings.json` changes everyone's environment, and the multi-session
module does exactly that.

The reporting repo never committed a `settings.json`, so nothing broke — this is
a gap found before it cost anything, which is the cheapest kind.

## P3 / P4 — lifetime and exit

`helpers/` inside a skill folder couples an executable's lifetime to a
documentation folder's. When the team decided to drop `.claude/` entirely they
had to **rescue the executables first** — the clearest evidence the two belong in
different places.

And the exit itself had no map. `docs/uninstall.md` now orders the steps so the
one that touches something *outside* the repo comes first: delete the repo files
and a dangling symlink stays in the home directory with the backup stranded next
to it.

## The side finding — the gate

`SECRET_KEY_RE` required "secret" to be followed by "key":

```bash
SECRET_KEY_RE='(password|passwd|secret_?key|secretkey|token|api_?key)'
```

so `jwtSecret: "<64-char key>"` in a values file passed silently. Verified in a
temp repo: the old pattern lets it through, the new one blocks it. `clientSecret`
had the same hole. Deliberately **not** widened to a bare `secret`: k8s manifests
are full of `secretName:`, and a gate that cries wolf gets switched off.

The team also needed a way to keep a policy-approved plaintext value (a demo
admin password) without turning the gate off. `SECRET_ALLOWLIST` takes
`'FILE_PATH_RE|LINE_RE'` entries and expects the **actual value** in the line
regex, so rotating the value re-triggers the gate and forces a re-approval. It
never applies to `FORBIDDEN_PATTERNS` — a literal AWS key or private key stays
unexemptable (verified).

## What the reporting team chose (not adopted upstream)

They removed `.claude/` and `.agents/` wholesale and moved the content into
repo-native shapes: rules into `CLAUDE.md`, facts into `docs/`, procedures into
`docs/verify-app.md`, executables into `scripts/`. They kept the constitution
pair with its shared block and Gate E, the commit gate, the four-stage docs, and
`install-hooks.sh`.

That is a legitimate end state and `docs/uninstall.md` now documents it as one —
but it is not the upstream default. The upstream answer to their report is
narrower and, we think, sufficient: **treat "shared repo" as the first-class
case**, keep the agent layer, and make sure nothing in it reaches into a personal
location.
