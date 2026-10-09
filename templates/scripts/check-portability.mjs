#!/usr/bin/env node
// Audit distributable text. Consumer-specific literals belong in an external policy.
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2);
if (!args[0] || args.length > 2) { console.error('Usage: node scripts/check-portability.mjs <directory> [external-policy.json]'); process.exit(2); }
const root=fs.realpathSync(args[0]);
const policy=args[1] ? JSON.parse(fs.readFileSync(args[1],'utf8')) : {deny:[]};
if (!Array.isArray(policy.deny) || !policy.deny.every(v=>typeof v==='string' && v.length)) throw Error('Invalid deny policy');
const rules=[
 ['absolute-machine-path', /(?:\/home\/|\/Users\/|\/data\/|[A-Za-z]:\\Users\\)[A-Za-z0-9_.-]+/],
 ['private-network-address', /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/],
];
let failed=false;
function walk(dir) {
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
  const file=path.join(dir,entry.name),rel=path.relative(root,file);
  if(entry.isSymbolicLink()) { console.error(`FAIL symlink: ${rel}`); failed=true; continue; }
  if(entry.isDirectory()) {walk(file);continue;}
  const text=fs.readFileSync(file,'utf8');
  for(const [name,re] of rules) if(re.test(text)){console.error(`FAIL ${name}: ${rel}`);failed=true;}
  if(policy.deny.some(value=>text.toLowerCase().includes(value.toLowerCase()))) {console.error(`FAIL consumer-specific-content: ${rel}`);failed=true;}
 }
}
walk(root);
if(failed)process.exitCode=1;else console.log('PASS portable distribution checks');
