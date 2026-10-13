import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-operations-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'target');
  fs.mkdirSync(root);
  fs.cpSync(path.join(source, 'harness'), path.join(root, 'harness'), { recursive: true, filter: p => !p.includes(`${path.sep}.state`) });
  function save(relative, data) {
    const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
  }
  function cli(args, expected = 0) {
    const result = spawnSync(process.execPath, ['harness/bin/praxis.mjs', ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, expected, result.stdout + result.stderr); return result.stdout + result.stderr;
  }
  save('harness/config/profile.json', { schemaVersion: 1, profile: null });
  cli(['profile', 'select', 'infrastructure']);
  const registry = { name: 'Example tracker', scope: 'operations' };
  save('docs/registry.md', 'Use the configured connector. Read complete lists and details before any writes.');
  save('harness/config/infrastructure.json', { schemaVersion: 1, referenceProject: null, notes: '', taskRegistry: { ...registry, workflow: 'docs/registry.md', snapshot: 'harness/.state/registry.json', maxAgeHours: 24 } });
  save('harness/config/project.json', { schemaVersion: 1, checks: [{ name: 'never execute', command: [process.execPath, '-e', "require('fs').writeFileSync('development-ran','bad')"], timeoutSeconds: 1 }] });
  const snapshot = { schemaVersion: 1, registry, observedAt: new Date().toISOString(), complete: true, tasks: [{ id: 'ops-1', title: 'Inspect service', status: 'todo', assignee: 'agent-a' }] };
  const refresh = () => save('harness/.state/registry.json', snapshot);
  refresh();
  const init = (id = 'service', ref = 'ops-1', kind = 'investigation') => cli(['task', 'init', id, '--registry-id', ref, '--kind', kind]);
  const record = () => JSON.parse(fs.readFileSync(path.join(root, 'harness/operations/tasks/service.json')));
  const update = task => { save('harness/operations/tasks/service.json', task); cli(['task', 'index']); };
  const ready = () => {
    const task = record(); task.scope = { request: 'Inspect service state', targets: ['example-service'], allowed: ['read status'], excluded: ['deployment'] };
    update(task); return task;
  };
  const evidence = (kind = 'observation') => {
    save('docs/evidence.md', 'Dated inspection result with limitations.');
    return { kind, path: 'docs/evidence.md', observedAt: new Date().toISOString(), summary: 'Expected result observed.' };
  };
  return { temp, root, save, cli, snapshot, refresh, init, record, update, ready, evidence };
}

test('registry-first linkage, index and reconciliation; infrastructure never runs development checks', t => {
  const f = fixture(t);
  f.cli(['profile', 'status']);
  assert.match(f.cli(['task', 'list']), /UNLINKED/);
  assert.match(f.cli(['task', 'reconcile'], 1), /missing local record/);
  f.cli(['task', 'init', 'service', '--registry-id', 'missing', '--kind', 'plan'], 1);
  assert.equal(fs.existsSync(path.join(f.root, 'harness/operations')), false);
  f.init(); f.cli(['task', 'check', 'service'], 1); f.ready();
  f.cli(['task', 'check', 'service']); f.cli(['task', 'validate', 'service']); f.cli(['task', 'reconcile']);
  assert.equal(fs.existsSync(path.join(f.root, 'development-ran')), false);
  assert.equal(fs.existsSync(path.join(f.root, 'harness/.state/service.json')), false);
  f.cli(['task', 'init', 'duplicate', '--registry-id', 'ops-1', '--kind', 'plan'], 1);
  assert.equal(fs.existsSync(path.join(f.root, 'harness/operations/tasks/duplicate.json')), false);
});

test('completed work is checked against evidence and registry instead of blindly copying todo', t => {
  const f = fixture(t); f.init(); const task = f.ready();
  task.status = 'done'; task.completion.summary = 'Investigation complete'; task.evidence = [f.evidence()];
  f.update(task);
  assert.match(f.cli(['task', 'reconcile'], 1), /status drift/);
  assert.equal(f.snapshot.tasks[0].status, 'todo');
  f.snapshot.tasks[0].status = 'done'; f.refresh(); f.cli(['task', 'reconcile']);
  task.completion.remaining = ['Still inspect the requested second service']; f.update(task);
  assert.match(f.cli(['task', 'validate', 'service'], 1), /no remaining in-scope work/);
  task.completion.remaining = []; task.evidence = []; f.update(task);
  f.cli(['task', 'validate', 'service'], 1);
});

test('plan completion is distinct from applied changes, rollback and attributed user confirmation', t => {
  const f = fixture(t); f.init('service', 'ops-1', 'plan'); const task = f.ready();
  task.status = 'done'; task.completion.summary = 'Plan delivered'; task.evidence = [f.evidence('plan')];
  f.snapshot.tasks[0].status = 'done'; f.refresh(); f.update(task); f.cli(['task', 'validate', 'service']);
  task.kind = 'change'; f.update(task);
  assert.match(f.cli(['task', 'validate', 'service'], 1), /apply authorization/);
  task.authorization = { mode: 'apply', evidence: 'docs/approval.md' }; task.rollback = 'docs/recovery.md';
  task.evidence = [f.evidence('user-confirmation')]; f.update(task); f.cli(['task', 'validate', 'service'], 1);
  f.save('docs/approval.md', 'User authorized this exact scope.'); f.save('docs/recovery.md', 'Restore the scoped configuration backup and verify.');
  assert.match(f.cli(['task', 'validate', 'service'], 1), /identify its source/);
  task.evidence[0].confirmedBy = 'User confirmation in the current session'; f.update(task);
  f.cli(['task', 'validate', 'service']);
  task.evidence[0].path = 'harness/.state/registry.json'; f.update(task);
  assert.match(f.cli(['task', 'validate', 'service'], 1), /must be outside/);
  task.evidence[0].path = 'docs/evidence.md'; f.update(task);
  fs.unlinkSync(path.join(f.root, 'docs/evidence.md')); f.cli(['task', 'status', 'service'], 1);
});

test('partial, stale, future, wrong-scope, malformed and duplicate snapshots fail closed', t => {
  const f = fixture(t);
  const original = structuredClone(f.snapshot);
  for (const mutate of [
    s => { s.complete = false; }, s => { s.observedAt = new Date(Date.now() - 25 * 3600000).toISOString(); },
    s => { s.observedAt = new Date(Date.now() + 3600000).toISOString(); },
    s => { s.registry.scope = 'different-scope'; }, s => { s.tasks.push({ ...s.tasks[0] }); },
    s => { s.tasks[0].status = 'unknown'; }, s => { s.tasks = null; },
  ]) {
    const value = structuredClone(original); mutate(value); f.save('harness/.state/registry.json', value);
    f.cli(['task', 'list'], 1); f.cli(['task', 'init', 'service', '--registry-id', 'ops-1', '--kind', 'plan'], 1);
    assert.equal(fs.existsSync(path.join(f.root, 'harness/operations')), false);
  }
});

test('follow-ups, ownership/status/title drift, duplicate links and index drift are visible', t => {
  const f = fixture(t); f.init(); const task = f.ready();
  f.snapshot.tasks[0] = { ...f.snapshot.tasks[0], title: 'Inspect two services', status: 'in_progress', assignee: 'agent-b' };
  f.snapshot.tasks.push({ id: 'ops-2', title: 'New follow-up', status: 'todo', assignee: null }); f.refresh();
  const output = f.cli(['task', 'reconcile'], 1);
  for (const pattern of [/title drift/, /status drift/, /assignee drift/, /missing local record/]) assert.match(output, pattern);
  f.save('harness/operations/tasks/other.json', { ...task, id: 'other' });
  assert.match(f.cli(['task', 'check', 'service'], 1), /duplicate local registry link/);
  fs.unlinkSync(path.join(f.root, 'harness/operations/tasks/other.json'));
  task.nextAction = 'Review updated scope'; f.save('harness/operations/tasks/service.json', task);
  assert.match(f.cli(['task', 'reconcile'], 1), /index missing or stale/);
  f.save('harness/operations/INDEX.md', '# Human-owned index\n');
  f.cli(['task', 'index'], 1); f.cli(['task', 'init', 'second', '--registry-id', 'ops-2', '--kind', 'plan'], 1);
  assert.equal(fs.readFileSync(path.join(f.root, 'harness/operations/INDEX.md'), 'utf8'), '# Human-owned index\n');
  assert.equal(fs.existsSync(path.join(f.root, 'harness/operations/tasks/second.json')), false);
});

test('paused work stays open; historical closed tasks do not force backfill', t => {
  const f = fixture(t); f.init(); const task = f.ready();
  task.status = 'paused'; task.nextAction = 'Resume only when the user asks'; f.update(task);
  f.snapshot.tasks[0].status = 'paused'; f.snapshot.tasks.push({ id: 'old', title: 'Historical completion', status: 'done', assignee: null });
  f.refresh(); f.cli(['task', 'reconcile']);
  task.nextAction = ''; f.update(task); f.cli(['task', 'validate', 'service'], 1);
});

test('paths, symlinks and writer locks preserve outside files and existing records', t => {
  const f = fixture(t); f.init(); const task = f.ready();
  task.authorization = { mode: 'apply', evidence: '../outside' }; task.kind = 'change'; f.update(task);
  assert.match(f.cli(['task', 'validate', 'service'], 1), /repository-relative path/);
  const outside = path.join(f.temp, 'outside'); fs.mkdirSync(outside);
  fs.mkdirSync(path.join(f.root, 'harness/.state/infrastructure.lock'));
  f.cli(['task', 'index'], 1); fs.rmdirSync(path.join(f.root, 'harness/.state/infrastructure.lock'));
  fs.renameSync(path.join(f.root, 'harness/operations'), path.join(f.root, 'saved-operations'));
  fs.symlinkSync(outside, path.join(f.root, 'harness/operations'), 'dir');
  f.cli(['task', 'index'], 1); f.cli(['task', 'check', 'service'], 1);
  assert.deepEqual(fs.readdirSync(outside), []);
});
