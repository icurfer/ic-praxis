// Local decision records. Evidence is an assertion, not authenticated user identity.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const headings = ['Context', 'Decision', 'Alternatives', 'Consequences'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
function local(relative) {
  if (!text(relative) || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(p => !p || ['.', '..', '.git'].includes(p))) fail('Invalid ADR path.');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail('ADR paths cannot traverse symlinks.'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return current;
}
function paths(id) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id || '')) fail('Invalid ADR ID. Use lowercase letters, numbers and hyphens.');
  return { body: `docs/adr/${id}.md`, record: `docs/adr/${id}.json` };
}
function load(id) {
  const p = paths(id), record = JSON.parse(fs.readFileSync(local(p.record), 'utf8'));
  if (record.schemaVersion !== 1 || record.id !== id || !text(record.title) || !['proposed', 'accepted'].includes(record.status)) fail('Invalid ADR record.');
  return { ...p, record, content: fs.readFileSync(local(p.body), 'utf8') };
}
function issuesFor(adr) {
  const issues = [], sections = adr.content.split(/^## /m).slice(1);
  for (const heading of headings) {
    const matches = sections.filter(s => s.split('\n')[0].trim() === heading);
    if (matches.length !== 1 || !matches[0].split('\n').slice(1).join('\n').replace(/<!--[\s\S]*?-->/g, '').trim()) issues.push(`Fill exactly one ${heading} section.`);
  }
  if (adr.record.status === 'accepted') {
    const a = adr.record.approval;
    if (!a || !text(a.by) || !text(a.evidence) || !text(a.at) || !Number.isFinite(Date.parse(a.at)) || Date.parse(a.at) > Date.now() || a.contentHash !== hash(adr.content)) issues.push('Accepted decision changed or approval metadata is invalid; obtain a new decision review.');
    if (a && text(a.evidence)) {
      try {
        const evidence = fs.readFileSync(local(a.evidence), 'utf8');
        if (!evidence.trim() || hash(evidence) !== a.evidenceHash) issues.push('Approval evidence changed or is empty.');
      } catch { issues.push('Approval evidence is missing or unsafe.'); }
    }
  }
  return issues;
}
function withLock(action) {
  const lock = local('harness/.state/adr.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  try { fs.mkdirSync(lock); } catch { fail('ADR writer locked; inspect active processes before removing a stale lock.'); }
  try { return action(); } finally { fs.rmdirSync(lock); }
}
function save(relative, record) {
  const dest = local(relative), temp = `${dest}.${crypto.randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); fs.renameSync(temp, dest); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
const help = `ADR workflow (both harness types):
  adr propose <id> --title "Decision title"
  adr check <id>
  adr accept <id> --by "User" --evidence docs/adr/evidence/<id>.md --reviewed-hash <sha256>
  adr list

Edit docs/adr/<id>.md, present the proposal and alternatives to the user, then
record explicit approval. No response or a request for edits is not acceptance.
ADR approval is not deployment or publication approval.`;
export async function main(args) {
  if (args.length === 2 && args[1] === '--help') { console.log(help); return 0; }
  const [, command, id, ...rest] = args;
  if (command === 'list' && args.length === 2) {
    const dir = local('docs/adr');
    if (!fs.existsSync(dir)) { console.log('No ADRs.'); return 0; }
    let invalid = false;
    for (const file of fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
      const adr = load(file.slice(0, -5)), issues = issuesFor(adr);
      invalid ||= issues.length > 0;
      console.log(`${adr.record.id}\t${adr.record.status}\t${issues.length ? 'needs review' : 'record checks passed'}\t${adr.record.title}`);
    }
    return invalid ? 1 : 0;
  }
  if (!['propose', 'check', 'accept'].includes(command)) fail(help);
  const p = paths(id), options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i], v = rest[i + 1];
    const allowed = command === 'propose' ? ['--title'] : command === 'accept' ? ['--by', '--evidence', '--reviewed-hash'] : [];
    if (!allowed.includes(k) || !text(v) || v.startsWith('--') || k in options) fail('Invalid ADR options.');
    options[k] = v;
  }
  if (command === 'check') {
    const adr = load(id), issues = issuesFor(adr);
    console.log(`ADR ${id}: ${adr.record.status}\nContent SHA256: ${hash(adr.content)}`);
    issues.forEach(issue => console.error(issue));
    if (!issues.length) console.log(adr.record.status === 'proposed' ? 'Proposal ready for user review; not approved.' : 'Recorded approval matches the content; not authenticated permission.');
    return issues.length ? 1 : 0;
  }
  return withLock(() => {
    if (command === 'propose') {
      const title = options['--title'];
      if (!text(title) || /[\r\n]/.test(title)) fail('Specify a single-line --title.');
      if (fs.existsSync(local(p.body)) || fs.existsSync(local(p.record))) fail('ADR already exists; no files overwritten.');
      fs.mkdirSync(path.dirname(local(p.body)), { recursive: true });
      fs.writeFileSync(local(p.body), `# ${title}\n\n` + headings.map(h => `## ${h}\n\n`).join(''), { flag: 'wx', mode: 0o600 });
      save(p.record, { schemaVersion: 1, id, title, status: 'proposed', createdAt: new Date().toISOString(), approval: null });
      console.log(`Proposed ${p.body}. Fill it and ask the user before acceptance.`); return 0;
    }
    const adr = load(id), issues = issuesFor(adr);
    if (adr.record.status !== 'proposed') fail('Accepted records cannot be reaccepted. Create a new ADR referencing the old one.');
    if (issues.length) fail(issues.join('\n'));
    const by = options['--by'], evidencePath = options['--evidence'];
    if (!text(by) || !text(evidencePath) || !/^[a-f0-9]{64}$/.test(options['--reviewed-hash'] || '')) fail('Explicit approver, evidence and reviewed hash are required.');
    if (options['--reviewed-hash'] !== hash(adr.content)) fail('Proposal changed since review; present the updated proposal to the user.');
    if (evidencePath.startsWith('harness/.state/') || evidencePath === p.body || evidencePath === p.record) fail('Use separate durable, sanitized approval evidence.');
    const evidence = fs.readFileSync(local(evidencePath), 'utf8');
    if (!evidence.trim()) fail('Approval evidence is empty.');
    adr.record.status = 'accepted';
    adr.record.approval = { by, evidence: evidencePath, at: new Date().toISOString(), contentHash: hash(adr.content), evidenceHash: hash(evidence) };
    save(p.record, adr.record);
    console.log(`ADR ${id} accepted with recorded user approval. No implementation, deployment or publication performed.`); return 0;
  });
}
