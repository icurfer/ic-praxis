import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t, { git = true, shared = false } = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-sharing-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'target'); fs.mkdirSync(root);
  const run = (cmd, args, expected = 0, cwd = root) => {
    const p = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
    assert.equal(p.status, expected, p.stdout + p.stderr); return p.stdout + p.stderr;
  };
  if (git) run('git', ['init', '-q']);
  const install = (...flags) => run('bash', [path.join(source, 'install.sh'), ...flags, root], 0, source);
  install(...(shared ? ['--shared'] : []));
  const scope = mode => run('bash', ['scripts/configure-sharing.sh', mode]);
  const cli = (args, code = 0) => run(process.execPath, ['harness/bin/praxis.mjs', ...args], code);
  const baseline = () => {
    run('git', ['config', 'user.name', 'Test']); run('git', ['config', 'user.email', 'test@example.invalid']);
    run('git', ['add', '.']); run('git', ['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture']);
    run('bash', ['scripts/install-hooks.sh']);
  };
  return { root, temp, run, install, scope, cli, baseline };
}

test('personal default excludes private paths locally, preserves guides, blocks force-add and permits ordinary commits', t => {
  const f = fixture(t); f.baseline();
  for (const file of ['harness/src/main.mjs', 'docs/spec/private.md', 'docs/requirements/backlog.md']) {
    f.run('git', ['check-ignore', file]);
  }
  f.run('git', ['check-ignore', 'docs/README.md'], 1);
  const ignore = fs.readFileSync(path.join(f.root, '.gitignore'));
  const exclude = fs.readFileSync(path.join(f.root, '.git/info/exclude'));
  f.scope('personal'); f.scope('personal');
  assert.deepEqual(fs.readFileSync(path.join(f.root, '.gitignore')), ignore);
  assert.deepEqual(fs.readFileSync(path.join(f.root, '.git/info/exclude')), exclude);
  f.run('git', ['add', '-f', 'harness/config/profile.json']);
  assert.match(f.run('git', ['commit', '-qm', 'must block'], 1), /Personal scaffold file staged/);
  f.run('git', ['reset', '-q', 'HEAD', '--', 'harness/config/profile.json']);
  fs.appendFileSync(path.join(f.root, 'docs/README.md'), '\nPublic usage guide.\n');
  f.run('git', ['add', 'docs/README.md']); f.run('git', ['commit', '-qm', 'public guide']);
});

test('shared opt-in removes only managed rules, persists on reinstall, and protects runtime records', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.root, '.git/info/exclude'), '\n/custom-local/\n');
  f.scope('shared'); f.install();
  f.run('git', ['check-ignore', 'harness/src/main.mjs'], 1);
  f.run('git', ['check-ignore', 'custom-local/keep.txt']);
  assert.equal(fs.readFileSync(path.join(f.root, 'harness/config/sharing'), 'utf8').trim(), 'shared');
  f.baseline();
  fs.mkdirSync(path.join(f.root, 'harness/.state')); fs.writeFileSync(path.join(f.root, 'harness/.state/private.json'), '{}');
  f.run('git', ['add', '-f', 'harness/.state/private.json']);
  assert.match(f.run('git', ['commit', '-qm', 'must block'], 1), /Local runtime record/);
});

test('already tracked paths are reported and preserved, and personal modifications cannot slip through', t => {
  const f = fixture(t, { shared: true }); f.baseline();
  const head = f.run('git', ['rev-parse', 'HEAD']);
  assert.match(f.scope('personal'), /Already tracked/);
  assert.equal(f.run('git', ['rev-parse', 'HEAD']), head);
  assert.match(f.run('git', ['ls-files', 'harness/src/main.mjs']), /main.mjs/);
  fs.appendFileSync(path.join(f.root, 'harness/src/main.mjs'), '\n// private edit\n');
  f.run('git', ['add', '-u', '--', 'harness/src/main.mjs']);
  f.run('git', ['commit', '-qm', 'must block'], 1);
});

test('non-Git fallback migrates to local exclude after Git init', t => {
  const f = fixture(t, { git: false });
  assert.match(fs.readFileSync(path.join(f.root, '.gitignore'), 'utf8'), /praxis:personal:begin/);
  f.run('git', ['init', '-q']); f.scope('auto');
  assert.doesNotMatch(fs.readFileSync(path.join(f.root, '.gitignore'), 'utf8'), /praxis:personal:begin/);
  f.run('git', ['check-ignore', 'harness/src/main.mjs']);
});

test('ignored harness code changes invalidate successful development evidence', t => {
  const f = fixture(t); f.baseline(); f.cli(['profile', 'select', 'development']);
  fs.writeFileSync(path.join(f.root, 'harness/config/project.json'), JSON.stringify({ schemaVersion: 1, checks: [{ name: 'fixture', command: [process.execPath, '-e', 'process.exit(0)'], timeoutSeconds: 5 }] }));
  f.cli(['task', 'init', 'sample', '--title', 'Sample', '--size', 'small']);
  f.cli(['task', 'validate', 'sample']); f.cli(['task', 'status', 'sample']);
  fs.appendFileSync(path.join(f.root, 'harness/src/run.mjs'), '\n// local runner change\n');
  assert.match(f.cli(['task', 'status', 'sample'], 1), /stale/);
});

test('external linked-worktree metadata stays untouched', t => {
  const f = fixture(t, { shared: true }); f.baseline();
  const exclude = fs.readFileSync(path.join(f.root, '.git/info/exclude'));
  const other = path.join(f.temp, 'worktree');
  f.run('git', ['worktree', 'add', '-qb', 'fixture-worktree', other]);
  f.run('bash', [path.join(source, 'install.sh'), '--personal', other], 0, source);
  assert.deepEqual(fs.readFileSync(path.join(f.root, '.git/info/exclude')), exclude);
  assert.match(fs.readFileSync(path.join(other, '.gitignore'), 'utf8'), /praxis:personal:begin/);
});

test('shared publication requires the reviewed declaration in the index, without auto-staging', t => {
  const f = fixture(t); f.baseline();
  f.scope('shared');
  assert.equal(f.run('git', ['diff', '--cached', '--name-only']).trim(), '');
  fs.writeFileSync(path.join(f.root, 'docs/spec/public.md'), 'Reviewed design');
  f.run('git', ['add', 'docs/spec/public.md']);
  assert.match(f.run('git', ['commit', '-qm', 'missing declaration'], 1), /shared scope declaration/);
  f.run('git', ['add', 'harness/config/sharing']);
  f.run('git', ['commit', '-qm', 'reviewed shared design']);
});
