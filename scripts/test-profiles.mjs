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

test('infrastructure stays pending and never executes development commands', t => {
  const f = fixture(t, ['--ci']);
  assert.equal(fs.existsSync(path.join(f.root, '.github/workflows/praxis-gate.yml')), true);
  f.cli(['profile', 'select', 'infrastructure']);
  const infra = path.join(f.root, 'harness/config/infrastructure.json');
  fs.writeFileSync(infra, JSON.stringify({ schemaVersion: 1, referenceProject: 'operations-reference', notes: '' }));
  fs.writeFileSync(path.join(f.root, 'harness/config/project.json'), JSON.stringify({ schemaVersion: 1, checks: [{ name: 'must not run', command: [process.execPath, '-e', "require('fs').writeFileSync('executed', 'bad')"], timeoutSeconds: 5 }] }));
  for (const action of ['init', 'check', 'validate', 'status']) {
    assert.match(f.cli(['task', action, 'sample'], 1), /pending implementation/);
  }
  assert.match(f.cli(['profile', 'status'], 1), /pending implementation/);
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
