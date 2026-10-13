import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'praxis-adr-'));
 t.after(() => fs.rmSync(root, { recursive: true, force: true }));
 const run = (command, args, expected = 0) => {
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, expected, r.stdout + r.stderr); return r.stdout + r.stderr;
 };
 run('git', ['init', '-q']); run('bash', [path.join(source, 'install.sh'), root]);
 const cli = (args, code = 0) => run(process.execPath, ['harness/bin/praxis.mjs', ...args], code);
 const propose = () => cli(['adr', 'propose', 'sample', '--title', 'Choose storage']);
 const fill = () => fs.writeFileSync(path.join(root, 'docs/adr/sample.md'), '# Choose storage\n\n## Context\nNeed durable data.\n## Decision\nUse the existing database.\n## Alternatives\nA new database would add operations work.\n## Consequences\nReuse backups; retain existing scaling limits.\n');
 const digest = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'docs/adr/sample.md'))).digest('hex');
 const evidence = () => {fs.mkdirSync(path.join(root,'docs/adr/evidence'),{recursive:true});fs.writeFileSync(path.join(root,'docs/adr/evidence/sample.md'),'Synthetic fixture: user explicitly approved this proposal.\n');};
 const accept = (hash = digest(), code = 0) => cli(['adr','accept','sample','--by','Fixture user','--evidence','docs/adr/evidence/sample.md','--reviewed-hash',hash],code);
 return {root,run,cli,propose,fill,digest,evidence,accept};
}
test('ADR draft stays proposed until evidence and exact reviewed content are supplied', t=>{
 const f=fixture(t);f.propose();f.cli(['adr','check','sample'],1);f.fill();
 assert.match(f.cli(['adr','check','sample']),/not approved/);
 f.cli(['adr','accept','sample'],1);f.accept(f.digest(),1);
 assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'docs/adr/sample.json'))).status,'proposed');
 const old=f.digest();fs.appendFileSync(path.join(f.root,'docs/adr/sample.md'),'Changed consequence.');f.evidence();f.accept(old,1);
 f.accept();assert.match(f.cli(['adr','check','sample']),/accepted/);
 f.accept(f.digest(),1);
});
test('accepted body or approval evidence edits invalidate the recorded approval',t=>{
 const f=fixture(t);f.propose();f.fill();f.evidence();f.accept();
 const original=fs.readFileSync(path.join(f.root,'docs/adr/sample.md'));
 fs.appendFileSync(path.join(f.root,'docs/adr/sample.md'),'changed');f.cli(['adr','check','sample'],1);
 fs.writeFileSync(path.join(f.root,'docs/adr/sample.md'),original);
 fs.appendFileSync(path.join(f.root,'docs/adr/evidence/sample.md'),'changed');f.cli(['adr','check','sample'],1);f.cli(['adr','list'],1);
});
test('existing records, traversal, duplicate sections, and symlink evidence are rejected',t=>{
 const f=fixture(t);f.propose();f.cli(['adr','propose','sample','--title','Overwrite'],1);
 f.cli(['adr','propose','../escape','--title','Escape'],1);f.fill();
 fs.appendFileSync(path.join(f.root,'docs/adr/sample.md'),'\n## Context\nDuplicate.');f.cli(['adr','check','sample'],1);
 f.fill();f.evidence();fs.unlinkSync(path.join(f.root,'docs/adr/evidence/sample.md'));
 fs.symlinkSync('../sample.md',path.join(f.root,'docs/adr/evidence/sample.md'));f.accept(f.digest(),1);
});
test('personal ADR publication is blocked; reviewed shared scope permits records',t=>{
 const f=fixture(t);f.propose();f.fill();f.evidence();f.accept();
 f.run('git',['check-ignore','docs/adr/sample.md']);
 f.run('git',['config','user.name','Fixture']);f.run('git',['config','user.email','test@example.invalid']);
 f.run('bash',['scripts/install-hooks.sh']);
 f.run('git',['add','-f','docs/adr/sample.md']);f.run('git',['commit','-qm','blocked'],1);
 f.run('bash',['scripts/configure-sharing.sh','shared']);
 f.run('git',['add','docs/adr','harness/config/sharing']);f.run('git',['commit','-qm','shared decision']);
});
test('common ADR commands work with either selected profile without task-service setup',t=>{
 for(const profile of ['development','infrastructure']) {
  const f=fixture(t);f.cli(['profile','select',profile]);f.propose();f.fill();f.cli(['adr','check','sample']);
 }
});
