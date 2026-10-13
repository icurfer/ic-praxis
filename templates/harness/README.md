# Praxis task harness / 작업 하네스

This folder is installed by default. CI stays off. Requires Node.js 18+ and Git;
local commit hooks remain usable without Node. No npm install is required.

에이전트에게 **“이 작업 시작해줘”**, **“검증해줘”**, **“현재 상태 알려줘”**라고
요청하세요. Codex는 `$praxis-task`, Claude Code는 `/praxis-task`로도 호출할 수
있습니다. 처음에는 에이전트가 프로젝트에 맞는 검사 명령을 설정합니다.
검사가 미설정된 상태는 통과로 처리하지 않습니다. CI는 켜지지 않습니다.

## Publication scope / 개인용과 공통용

At adoption, the agent asks whether this is **personal** or **project-shared**.
When you say “적절히 적용해줘” / “use your judgment”, it defaults to personal and
states that choice. This choice is independent of development/infrastructure.
Normal installs default to personal immediately, even before the conversation.

- **personal:** `harness/` and `docs/requirements/`, `docs/spec/`, `docs/scope/`,
  `docs/deferred/`, `docs/done/` remain local. Public guides and changelogs can ship.
- **shared:** those tools and documents can be committed after review; runtime
  state and personal settings stay excluded. Shared is not permission to push.

```bash
bash scripts/configure-sharing.sh personal
# Only after explicit user selection and review:
bash scripts/configure-sharing.sh shared
```

Selection is stored in `harness/config/sharing`. Ordinary installs preserve it;
installer flags `--personal` / `--shared` explicitly set it. The managed local
exclude block goes in `.git/info/exclude`. For non-Git targets or linked worktrees
with external metadata, a managed `.gitignore` block is used instead; no outside
metadata is written. Run the helper again after `git init` to migrate that block.
Other Git settings and ignore rules are preserved. Unrelated rules may still
exclude a file after shared selection; inspect them instead of force-adding.

The installed commit gate blocks staged private paths (including force-added or
already tracked files), and always blocks runtime records. When sharing protected
paths, stage the reviewed `harness/config/sharing` declaration with them. A generic
“push” request never changes the scope. Existing tracked files and remote history
are not automatically removed. The hook is a local safeguard, not a human-approval
verifier or an unbypassable server control. Existing adopted gates must incorporate
`scripts/check-sharing.sh`; the installer does not overwrite them by default.

This scope covers the paths listed above, not every scaffold file: agent rules,
shared memories and scripts retain their existing policies. Do not put personal
material in those versioned files. Export a reviewed summary into public docs when
only selected results should be published. Keep the full private record local.

## Choose the type first / 종류 선택

Fresh installs have `profile: null` in `config/profile.json`. When you ask the
agent to apply this harness, `praxis-init` asks you to choose:

- **개발용 / development**: existing code tasks and test/build validation.
- **인프라용 / infrastructure**: registry-linked operations records, scope and
  evidence checks, reconciliation and handoff. No server execution.

```bash
node harness/bin/praxis.mjs profile select development
# Or: node harness/bin/praxis.mjs profile select infrastructure
node harness/bin/praxis.mjs profile status
```

No task runs until a type is selected. The agent honors a choice you already
made. Ordinary reinstalls preserve it. Switching an existing type is deliberately
not a selection operation: review configuration and local task migration first.
`--force` remains destructive template replacement and must not be used to switch.
An upgrade from pre-profile releases asks for the type once; existing development
checks and records stay in place. Both types keep CI off by default.

```text
harness/
├── config/
│   ├── profile.json          # selected type (null initially)
│   ├── project.json          # development checks, existing format preserved
│   └── infrastructure.json   # chosen registry, workflow and snapshot settings
├── profiles/
│   ├── development/README.md
│   └── infrastructure/README.md
├── operations/               # created on demand: durable tasks and generated index
└── src/
    ├── main.mjs              # shared selection and routing
    ├── development.mjs       # development task implementation
    ├── infrastructure.mjs    # operations record checks; no server commands
    └── run.mjs               # shared bounded command runner
```

Infrastructure selection succeeds; `profile status` stays pending until a registry
and workflow are configured. See [the operations guide](profiles/infrastructure/README.md)
for `task list/init/check/validate/status/reconcile/index`, snapshot freshness,
completion evidence and durable records outside `.state/`. A successful operations
check does not prove live system health or grant permission to apply changes.
Read only the selected guide under `profiles/`. The remaining command/check/record
sections describe **development**; they do not define an infrastructure workflow.

## Commands

Run from the installed repository (subdirectories also work):

```bash
node harness/bin/praxis.mjs --help
node harness/bin/praxis.mjs profile select development
node harness/bin/praxis.mjs task init login-fix --title "Fix login" --size small
node harness/bin/praxis.mjs task check login-fix
node harness/bin/praxis.mjs task validate login-fix
node harness/bin/praxis.mjs task status login-fix
```

`--size` defaults to `big`. Big changes need at least one nonempty plan file;
use `--plan docs/spec/plan.md --plan docs/scope/scope.md`. Existing records cannot
be overwritten. Plan existence is checked; content still requires review.

## Project checks

Edit `config/project.json` to use your project's actual commands. For a project
that provides an npm test script, an example is:

```json
{
  "schemaVersion": 1,
  "checks": [
    { "name": "tests", "command": ["npm", "test"], "timeoutSeconds": 300 }
  ]
}
```

Every check needs a unique name, nonempty executable/argument array and a timeout
of 1–3600 seconds. Commands run sequentially from the repo root with no shell
expansion; if a shell is genuinely needed, configure `bash` and a reviewed script.
Use foreground checks. On POSIX, timeout/interruption stops the started process
group; Windows stops the direct process. This is not a sandbox. Review commands as executable repository code. On Windows use Git Bash
and an executable accessible to Node (e.g. a Bash script wrapping npm).

Validation first runs the existing `scripts/check-conventions.sh` staged gate,
then the configured checks, stopping on failure. Nothing is staged, committed,
pushed or deployed by the harness itself. Commands print output to the terminal;
records store command/exit metadata, not output logs. Do not put credentials in
command arguments. Empty configuration, invalid JSON and missing plans fail closed.

## Records and freshness

`harness/.state/<id>.json` is a local, ignored record (format version 1): task ID,
title, size, plan paths, creation time and latest validation metadata. Validation
contains results, timestamp, fingerprint and pass/fail. `project.json` also uses
format version 1; fields are validated at runtime. There is no external service.

A passed record becomes stale when HEAD, the index, or tracked/nonignored files
change. Local harness code is fingerprinted even in personal mode. Config, gate and referenced plans are included even if ignored. Ignored
build outputs and external state/dependencies are not fingerprinted: rerun checks
when those change. Submodules are currently unsupported and cause validation to
fail. Validation that changes fingerprinted files requires a rerun. A lock prevents
concurrent harness writers; after a crash, remove `.state/lock` only after checking
that no harness process remains. Local records are not tamper-proof evidence.

The staged gate only examines staged changes; the real pre-commit hook remains
necessary. This harness does not enforce every possible development path.

## Test the harness

```bash
node --test harness/test/*.test.mjs
```

Tests create disposable Git repositories and do not change the current index.

`task status` exits 0 only for current passing evidence, otherwise 1. The
`src/run.mjs` executor manages check completion, timeout and interruption.
Semver version files must increase relative to HEAD when staged; other existing
version schemes retain their format checks. CI handles first pushes via an empty
synthetic baseline commit in its disposable checkout.
