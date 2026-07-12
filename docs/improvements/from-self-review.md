# Retro: deep self-review of the gate engine (v0.3.0)

Source: a full review of this repo (2026-07-12), with every suspected gap
**reproduced in a throwaway target repo** before being accepted as real. Unlike
the two adoption retros, these gaps were found by auditing the shipped engine
itself — the gate's own claims vs. what it actually blocked.

## Reproduced gaps → resolutions (v0.3.0)

| # | Gap (reproduced) | Resolution |
|---|---|---|
| S0 | Bare (unquoted) secrets passed — `password: <bare-value>` in YAML/.env was never matched; the quoted-only regex meant the aipf-mgmt P0 fix only covered half the real-world forms | Gate C matches bare values in config-style files (`BARE_VALUE_FILES_RE`); code files stay quoted-only (a bare RHS in code is a variable reference, not a literal) |
| S1 | Placeholder allowlist judged the whole LINE — a trailing `<...>` comment or an "example" substring (`myexample-...`) exempted a real secret earlier on the line | Placeholder check runs on the **extracted value** only; wordy patterns (`example`, `dummy`, …) are boundary-anchored |
| S2 | Gate B (version format) and Gate D (manifest sync) read the WORKING TREE — a malformed staged blob with a fixed working tree committed cleanly. The aipf-mgmt P1 lesson ("judge the index") had been applied to Gate C only | Every gate now reads through `content()` (staged blob / `--all` working tree) |
| S3 | Deleting deploy code bypassed Gate A — `--diff-filter=ACMR` excluded deletions, but removing a source file needs a deploy too | Gate A judges `ACMRD`; content scans (Gate C) keep reading only files that will exist |
| S4 | Gate B allowed a trailing newline while CLAUDE.md said "no trailing newline" — the documented rule was stricter than its own gate | Resolved by aligning the DOC to the gate: the rule is "one non-empty line, no blank second line" (a single trailing newline is fine — the second pass showed hard-blocking `1.2.3\n` would break every editor-touched adopter repo on all commits) |
| S5 | Broke on stock macOS bash 3.2 and was untested for Windows: `declare -A` (gate), `mapfile` (praxis-review), empty-array expansion under `set -u` (install re-run), CRLF checkouts killing hooks, MSYS `ln -s` silently copying instead of linking | bash-3.2-safe engine (string dedup, read-loops, guarded expansions); shipped `.gitattributes` pins `*.sh`/hooks/`version` to LF; `setup-claude-memory.sh` falls back to an NTFS junction on Windows |
| S6 | Template/doc drift: one starter memory lacked its `(STARTER RULE …)` marker; `AREA_VFILE` was matched as a regex not a literal. (The first pass also claimed the multi-session section lacked its keep-only-if comment — WRONG, the comment existed; the "fix" added a duplicate that the second pass removed) | Marker added; `grep -Fxq`; the multi-session comment stays single, now with an explicit end-marker note |

## Second pass — adversarial review of the fixes themselves (same day)

The v0.3.0 fixes were then put through a multi-agent adversarial review (every
finding independently reproduced before acceptance). It found the fixes had
introduced NEW holes — proof that "fixed" needs the same scrutiny as "broken":

| # | Regression / gap in the first-pass fix | Resolution |
|---|---|---|
| R0 | The S3 fix (ACMRD) made a staged DELETION of the version file itself count as the "bump", and Gate B silently skipped the missing blob | The bump must be in the ACMR (still-exists) list; a staged deletion of a version file is its own hard error |
| R1 | The S1 fix extracted only the LAST assignment on a line (greedy `.*`), so `password: "…real…" # token: "CHANGE_ME"` was exempted by the trailing comment | Placeholder check now runs per assignment (`grep -o`), and a line is exempt only if ALL its values are placeholders |
| R2 | Non-ASCII filenames (`설정.yaml`) were silently skipped by every gate — git shell-quotes them by default, breaking both the regexes and `git show` | All name lists run with `-c core.quotepath=false` |
| R3 | Applying `FORBIDDEN_GLOBS` to staged mode meant a narrowed glob silently exempted staged secrets; pathspec `.` was also cwd-relative | Staged mode always scans every staged file; globs scope only the `--all` sweep; the script `cd`s to the repo root |
| R4 | The tightened quoted regex required a closing quote — an unterminated pasted secret (`password: "CHANGE_ME_…` with no closing quote, imagine a real value there) stopped being caught | Third alternation restores opening-quote-without-close matching. (Writing this very row tripped the fixed gate until the example became a placeholder — the gate works) |
| R5 | The strict no-trailing-newline Gate B hard-blocked every existing adopter whose version file was `1.2.3\n` — on every commit, unrelated or not | Gate relaxed to "one non-empty line"; docs aligned (see S4) |
| R6 | `report_hit` under `set -e` killed the scan at the SECOND hit (pre-existing, surfaced by the review): only one finding printed, no summary, remaining files unscanned | `if`-form instead of a bare `&&` list |
| R7 | Windows fallback set only `MSYS=` (Cygwin reads `CYGWIN=`), and `rm -rf $TARGET` could recurse through an existing junction into the memory SOURCE | Both env vars set + `[ -L ]` post-check; junction removed with non-recursing `rmdir`, never `rm -rf` (not verified on real Windows — needs a smoke test there) |
| R8 | A target repo with a pre-existing `.gitattributes` never received the LF pins (skip-if-exists), silently re-opening the CRLF breakage | `install.sh` idempotently appends the missing attribute lines |

## The lesson (why this retro exists)

Two of the worst gaps (S1, S2) were **half-applied versions of lessons this repo
had already learned** — P0/P1 in `from-aipf-mgmt.md`. Writing a rule down and
fixing one instance of it is not praxis; the fix has to cover every place the
rule applies. Corollary rule, now in force: **when an incident fix touches the
gate engine, re-verify every gate (A–D) against the incident's class of input,
not just the gate that failed** — and prove each fix by reproducing the
violation in a throwaway repo first.
