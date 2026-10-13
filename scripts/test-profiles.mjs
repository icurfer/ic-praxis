import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t, flags = []) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-profiles-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'target repo');
  function run(command, args, expected = 0, cwd = root) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, expected, result.stdout + result.stderr);
    return result.stdout + result.stderr;
  }
  const install = (...extra) => run('bash', [path.join(source, 'install.sh'), ...extra, root], 0, source);
  install(...flags);
  const cli = (args, code = 0) => run(process.execPath, ['harness/bin/praxis.mjs', ...args], code);
  const config = path.join(root, 'harness/config/profile.json');
  return { root, temp, run, install, cli, config };
}

test('fresh install requires selection and never creates CI or task state implicitly', t => {
  const f = fixture(t);
  assert.equal(JSON.parse(fs.readFileSync(f.config)).profile, null);
  assert.match(f.cli(['profile', 'status'], 1), /Select a harness profile/);
  f.cli(['task', 'init', 'sample', '--title', 'Sample'], 1);
  assert.equal(fs.existsSync(path.join(f.root, 'harness/.state')), false);
  assert.equal(fs.existsSync(path.join(f.root, '.github/workflows')), false);
  f.cli(['profile', 'select', 'unknown'], 1);
  assert.equal(JSON.parse(fs.readFileSync(f.config)).profile, null);
});

test('development runs existing tasks; reinstall preserves choice, checks and records', t => {
  const f = fixture(t);
  f.cli(['profile', 'select', 'development']);
  f.run('git', ['init', '-q']);
  f.cli(['task', 'init', 'sample', '--title', 'Sample', '--size', 'small']);
  const task = path.join(f.root, 'harness/.state/sample.json');
  const before = fs.readFileSync(task);
  const checks = path.join(f.root, 'harness/config/project.json');
  fs.writeFileSync(checks, JSON.stringify({ schemaVersion: 1, checks: [], custom: 'preserve' }));
  f.install();
  assert.equal(JSON.parse(fs.readFileSync(f.config)).profile, 'development');
  assert.deepEqual(fs.readFileSync(task), before);
  assert.equal(JSON.parse(fs.readFileSync(checks)).custom, 'preserve');
  f.cli(['profile', 'select', 'infrastructure'], 1);
  f.cli(['profile', 'select', 'development']);
  assert.deepEqual(fs.readFileSync(task), before);
});

test('unconfigured infrastructure stays pending and never executes development commands', t => {
  const f = fixture(t, ['--ci']);
  assert.equal(fs.existsSync(path.join(f.root, '.github/workflows/praxis-gate.yml')), true);
  f.cli(['profile', 'select', 'infrastructure']);
  const infra = path.join(f.root, 'harness/config/infrastructure.json');
  fs.writeFileSync(infra, JSON.stringify({ schemaVersion: 1, referenceProject: 'operations-reference', notes: '' }));
  fs.writeFileSync(path.join(f.root, 'harness/config/project.json'), JSON.stringify({ schemaVersion: 1, checks: [{ name: 'must not run', command: [process.execPath, '-e', "require('fs').writeFileSync('executed', 'bad')"], timeoutSeconds: 5 }] }));
  for (const action of ['init', 'check', 'validate', 'status']) {
    assert.match(f.cli(['task', action, 'sample'], 1), /Infrastructure setup pending/);
  }
  assert.match(f.cli(['profile', 'status'], 1), /Infrastructure setup pending/);
  assert.equal(fs.existsSync(path.join(f.root, 'executed')), false);
  assert.equal(fs.existsSync(path.join(f.root, 'harness/.state')), false);
  f.install();
  assert.equal(JSON.parse(fs.readFileSync(f.config)).profile, 'infrastructure');
  assert.equal(JSON.parse(fs.readFileSync(infra)).referenceProject, 'operations-reference');
});

test('malformed selection, concurrent lock and symlink fail without overwriting', t => {
  const f = fixture(t);
  fs.writeFileSync(`${f.config}.lock`, 'another selector');
  f.cli(['profile', 'select', 'development'], 1);
  assert.equal(fs.readFileSync(`${f.config}.lock`, 'utf8'), 'another selector');
  fs.unlinkSync(`${f.config}.lock`);
  fs.writeFileSync(f.config, '{'); f.cli(['task', 'status', 'sample'], 1);
  f.cli(['profile', 'select', 'development'], 1);
  assert.equal(fs.readFileSync(f.config, 'utf8'), '{');
  fs.unlinkSync(f.config);
  const outside = path.join(f.temp, 'outside.json');
  const data = JSON.stringify({ schemaVersion: 1, profile: null }); fs.writeFileSync(outside, data);
  fs.symlinkSync(outside, f.config);
  f.cli(['profile', 'select', 'development'], 1);
  assert.equal(fs.readFileSync(outside, 'utf8'), data);
});

test('installed operations lifecycle preserves records on reinstall and enforces publication boundaries', t => {
  const f = fixture(t);
  f.run('git', ['init', '-q']);
  f.run('git', ['config', 'user.name', 'Test']);
  f.run('git', ['config', 'user.email', 'test@example.invalid']);
  f.run('bash', ['scripts/configure-sharing.sh', 'personal']);
  f.run('git', ['add', '.']);
  f.run('git', ['-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture']);
  f.run('bash', ['scripts/install-hooks.sh']);
  f.cli(['profile', 'select', 'infrastructure']);
  const write = (file, data) => {
    fs.mkdirSync(path.dirname(path.join(f.root, file)), { recursive: true });
    fs.writeFileSync(path.join(f.root, file), typeof data === 'string' ? data : JSON.stringify(data));
  };
  const registry = { name: 'Fixture tracker', scope: 'managed-operations' };
  const settings = 'harness/config/infrastructure.json';
  write(settings, { schemaVersion: 1, taskRegistry: { ...registry, workflow: 'harness/operations/workflow.md', snapshot: 'harness/.state/registry.json', maxAgeHours: 24 } });
  write('harness/operations/workflow.md', 'Read complete scope using the chosen connector; review authorization before writes.');
  const snapshot = { schemaVersion: 1, registry, observedAt: new Date().toISOString(), complete: true, tasks: [{ id: '1', title: 'Inspect example service', status: 'todo', assignee: null }] };
  write('harness/.state/registry.json', snapshot);
  f.cli(['task', 'init', 'service', '--registry-id', '1', '--kind', 'investigation']);
  const file = 'harness/operations/tasks/service.json';
  const task = JSON.parse(fs.readFileSync(path.join(f.root, file)));
  task.scope = { request: 'Inspect service', targets: ['example-service'], allowed: ['read status'], excluded: ['apply'] };
  task.status = 'done'; task.completion.summary = 'Requested inspection finished';
  task.evidence = [{ kind: 'observation', path: 'harness/operations/result.md', observedAt: snapshot.observedAt, summary: 'Fixture result' }];
  write('harness/operations/result.md', 'Simulated inspection result for this installer test.');
  write(file, task); f.cli(['task', 'index']);
  f.cli(['task', 'reconcile'], 1);
  snapshot.tasks[0].status = 'done'; write('harness/.state/registry.json', snapshot);
  f.cli(['task', 'validate', 'service']); f.cli(['task', 'reconcile']);
  const preserved = [settings, file, 'harness/operations/INDEX.md', 'harness/operations/result.md', 'harness/.state/registry.json'].map(p => [p, fs.readFileSync(path.join(f.root, p))]);
  f.install();
  for (const [p, content] of preserved) assert.deepEqual(fs.readFileSync(path.join(f.root, p)), content);
  f.cli(['task', 'reconcile']);
  assert.equal(fs.existsSync(path.join(f.root, '.github/workflows')), false);
  f.run('git', ['check-ignore', file]);
  f.run('git', ['add', '-f', file]);
  assert.match(f.run('git', ['commit', '-qm', 'must block private record'], 1), /Personal scaffold file staged/);
  f.run('git', ['reset', '-q', 'HEAD', '--', file]);
  f.run('bash', ['scripts/configure-sharing.sh', 'shared']);
  f.run('git', ['add', 'harness/config/sharing', 'harness/operations']);
  f.run('git', ['commit', '-qm', 'reviewed fixture records']);
  f.run('git', ['add', '-f', 'harness/.state/registry.json']);
  assert.match(f.run('git', ['commit', '-qm', 'must block runtime snapshot'], 1), /Local runtime record/);
});
