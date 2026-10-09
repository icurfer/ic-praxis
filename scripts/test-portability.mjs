import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const scanner=new URL('./check-portability.mjs',import.meta.url).pathname;
test('portable examples pass; local paths, private addresses, external deny values and symlinks fail',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'distribution-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const tree=path.join(root,'templates');fs.mkdirSync(tree);const file=path.join(tree,'example.txt');
 const check=(policy=[])=>{fs.writeFileSync(path.join(root,'policy.json'),JSON.stringify({deny:policy}));return spawnSync(process.execPath,[scanner,tree,path.join(root,'policy.json')],{encoding:'utf8'});};
 fs.writeFileSync(file,'https://example.invalid CHECK_ME');assert.equal(check().status,0);
 fs.writeFileSync(file,'/'+['home','someone','project'].join('/'));assert.equal(check().status,1);
 fs.writeFileSync(file,[192,168,1,2].join('.'));assert.equal(check().status,1);
 fs.writeFileSync(file,'customer-private-project');const r=check(['customer-private-project']);assert.equal(r.status,1);assert.equal(r.stderr.includes('customer-private-project'),false);
 fs.writeFileSync(file,'generic');fs.symlinkSync(file,path.join(tree,'link'));assert.equal(check().status,1);
});
