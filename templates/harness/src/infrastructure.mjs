// Operations record checks only. No network, shell, deployment or registry writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = 'harness/operations/tasks';
const indexPath = 'harness/operations/INDEX.md';
const marker = '<!-- praxis:operations-index:generated -->';
const states = ['todo', 'in_progress', 'review', 'done', 'paused'];
const kinds = ['investigation', 'plan', 'change'];
const evidenceKinds = ['observation', 'plan', 'verification', 'user-confirmation'];
const text = value => typeof value === 'string' && value.trim().length > 0;
const fail = message => { throw new Error(message); };
const idOK = id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id);
const dateOK = value => text(value) && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const strings = value => Array.isArray(value) && value.every(text);

function local(relative) {
  if (!text(relative) || path.isAbsolute(relative) || relative.includes('\\') ||
      relative.split('/').some(p => !p || ['.', '..', '.git'].includes(p))) fail('Invalid repository-relative path.');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try { if (fs.lstatSync(current).isSymbolicLink()) fail(`Symlink is not allowed: ${relative}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return current;
}
function read(relative) {
  try { return JSON.parse(fs.readFileSync(local(relative), 'utf8')); }
  catch (error) { fail(`Cannot read ${relative}: ${error.message}`); }
}
function nonemptyFile(relative) {
  const file = local(relative);
  if (relative === 'harness/.state' || relative.startsWith('harness/.state/')) fail('Durable workflow and evidence must be outside harness/.state/.');
  return fs.existsSync(file) && fs.statSync(file).isFile() && fs.readFileSync(file, 'utf8').trim().length > 0;
}
function write(relative, content) {
  const file = local(relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function recordPath(id) {
  if (!idOK(id)) fail('Invalid task ID; use lowercase letters, numbers and hyphens.');
  return `${directory}/${id}.json`;
}
function config() {
  const config = read('harness/config/infrastructure.json');
  const registry = config?.taskRegistry;
  if (config.schemaVersion !== 1 || !registry || !text(registry.name) || !text(registry.scope) ||
      !text(registry.workflow) || !text(registry.snapshot) || !Number.isInteger(registry.maxAgeHours) ||
      registry.maxAgeHours < 1 || registry.maxAgeHours > 168) {
    fail('Infrastructure setup pending: configure taskRegistry name, scope, workflow, snapshot and maxAgeHours (1–168).');
  }
  if (!nonemptyFile(registry.workflow)) fail('Missing registry workflow document.');
  local(registry.snapshot);
  if (!registry.snapshot.startsWith('harness/.state/')) fail('Registry snapshots must stay in ignored harness/.state/.');
  return registry;
}
function snapshot(registry) {
  const data = read(registry.snapshot);
  if (data?.schemaVersion !== 1 || data.registry?.name !== registry.name || data.registry?.scope !== registry.scope ||
      data.complete !== true || !dateOK(data.observedAt) || !Array.isArray(data.tasks)) fail('Invalid, partial or wrong-scope registry snapshot.');
  const age = Date.now() - Date.parse(data.observedAt);
  if (age < 0 || age > registry.maxAgeHours * 3600000) fail('Registry snapshot is stale or future-dated; refresh through the configured workflow.');
  const ids = new Set();
  for (const task of data.tasks) {
    if (!task || !text(task.id) || ids.has(task.id) || !text(task.title) || !states.includes(task.status) ||
        !(task.assignee === null || text(task.assignee))) fail('Invalid registry task or duplicate registry ID.');
    ids.add(task.id);
  }
  return data;
}
function tasks() {
  const dir = local(directory);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => {
    const id = name.slice(0, -5), task = read(recordPath(id));
    if (task?.schemaVersion !== 1 || task.id !== id || !text(task.registryId) || !text(task.title) ||
        !states.includes(task.status) || !kinds.includes(task.kind) ||
        !(task.assignee === null || text(task.assignee))) fail(`Invalid operations task record: ${name}`);
    return task;
  });
}
function evidenceIssues(task) {
  const issues = [], prefix = `${task.id}: `;
  const add = message => issues.push(prefix + message);
  if (!dateOK(task.updatedAt) || Date.parse(task.updatedAt) > Date.now()) add('invalid updatedAt');
  if (!task.scope || !text(task.scope.request) || !strings(task.scope.targets) || !task.scope.targets.length ||
      !strings(task.scope.allowed) || !task.scope.allowed.length || !strings(task.scope.excluded)) add('record request, targets and allowed/excluded scope');
  if (!task.authorization || !['read-only', 'apply'].includes(task.authorization.mode)) add('record authorization mode');
  if (task.kind !== 'change' && task.authorization?.mode === 'apply') add('plan/investigation cannot authorize application');
  if (task.authorization?.mode === 'apply') {
    if (!text(task.authorization.evidence) || !nonemptyFile(task.authorization.evidence)) add('apply authorization needs an evidence document');
    if (!text(task.rollback) || !nonemptyFile(task.rollback)) add('apply scope needs a rollback/recovery document');
  }
  if (!Array.isArray(task.evidence)) add('evidence must be an array');
  else for (const item of task.evidence) {
    if (!item || !evidenceKinds.includes(item.kind) || !dateOK(item.observedAt) || Date.parse(item.observedAt) > Date.now() ||
        !text(item.summary) || !text(item.path) || !nonemptyFile(item.path)) add('invalid or missing dated evidence');
    if (item?.kind === 'user-confirmation' && !text(item.confirmedBy)) add('user confirmation must identify its source');
  }
  if (!task.completion || !strings(task.completion.remaining) || !strings(task.completion.limitations) ||
      !strings(task.completion.followUps)) add('record completion remaining/limitations/followUps arrays');
  if (task.status !== 'done' && !text(task.nextAction)) add('unfinished work needs a next action');
  if (task.status === 'done') {
    if (!text(task.completion?.summary) || !Array.isArray(task.completion?.remaining) || task.completion.remaining.length) add('done requires a completion summary and no remaining in-scope work');
    const evidence = Array.isArray(task.evidence) ? task.evidence : [];
    const accepted = task.kind === 'plan' ? ['plan', 'user-confirmation'] : task.kind === 'investigation' ? ['observation', 'user-confirmation'] : ['verification', 'user-confirmation'];
    if (!evidence.some(item => item && accepted.includes(item.kind))) add(`done needs ${accepted.join(' or ')} evidence`);
    if (task.kind === 'change' && task.authorization?.mode !== 'apply') add('completed change needs apply authorization');
  }
  return issues;
}
function comparison(records, registry, all = true) {
  const issues = [], seen = new Set();
  for (const task of records) {
    if (seen.has(task.registryId)) issues.push(`${task.id}: duplicate local link to registry task ${task.registryId}`);
    seen.add(task.registryId);
    const remote = registry.tasks.find(item => item.id === task.registryId);
    if (!remote) { issues.push(`${task.id}: registry task missing; do not invent a replacement`); continue; }
    for (const field of ['title', 'status', 'assignee']) {
      if (task[field] !== remote[field]) issues.push(`${task.id}: ${field} drift (local ${JSON.stringify(task[field])}; registry ${JSON.stringify(remote[field])})`);
    }
    issues.push(...evidenceIssues(task));
  }
  if (all) for (const remote of registry.tasks) {
    // Closed historical tasks may predate adoption; every open task needs a record.
    if (remote.status !== 'done' && !seen.has(remote.id)) issues.push(`Registry ${remote.id}: missing local record (${remote.title})`);
  }
  return issues;
}
const cell = value => String(value ?? '').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function renderIndex(records) {
  return `${marker}\n# Operations task index\n\nGenerated from durable task records. Registry state must be reconciled separately.\n\n| Task | Registry ID | Kind | Status | Assignee | Next action |\n|---|---|---|---|---|---|\n` + records.map(task => `| [${cell(task.title).replaceAll('[', '\\[').replaceAll(']', '\\]')}](tasks/${task.id}.json) | ${cell(task.registryId)} | ${task.kind} | ${task.status} | ${cell(task.assignee)} | ${cell(task.nextAction)} |\n`).join('');
}
function canWriteIndex() {
  const file = local(indexPath);
  if (fs.existsSync(file) && !fs.readFileSync(file, 'utf8').startsWith(marker + '\n')) fail('Refusing to overwrite a handwritten operations index.');
}
function indexIssues(records) {
  const file = local(indexPath);
  return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== renderIndex(records) ? ['Operations index missing or stale; run task index.'] : [];
}
function withLock(action) {
  const lock = local('harness/.state/infrastructure.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  try { fs.mkdirSync(lock); } catch { fail('Infrastructure record writer locked; inspect the active process before removing the lock.'); }
  try { return action(); } finally { fs.rmdirSync(lock); }
}
export function profileStatus() {
  const registry = config();
  console.log(`Infrastructure record checks configured (${registry.name} / ${registry.scope}).\nThis is not deployment readiness. Refresh the registry snapshot, then run task reconcile.`);
  return 0;
}
const help = `Infrastructure record workflow (no server or registry mutations):
  task list
  task init <id> --registry-id <existing-id> --kind investigation|plan|change
  task check|validate|status <id>
  task reconcile
  task index
Configure harness/config/infrastructure.json and read harness/profiles/infrastructure/README.md.
Edit durable records under harness/operations/tasks/. Registry updates use your own workflow.`;

export async function main(args) {
  if (args.length === 2 && args[0] === 'task' && args[1] === '--help') { console.log(help); return 0; }
  const [group, command, id, ...options] = args;
  if (group !== 'task' || !['list', 'init', 'check', 'validate', 'status', 'reconcile', 'index'].includes(command)) fail(help);
  if (['list', 'reconcile', 'index'].includes(command) ? args.length !== 2 : !idOK(id)) fail(help);
  if (['check', 'validate', 'status'].includes(command) && options.length) fail('Unexpected options.');
  const registry = config();
  if (command === 'index') return withLock(() => { const records = tasks(); canWriteIndex(); write(indexPath, renderIndex(records)); console.log('Local operations index updated; registry was not changed.'); return 0; });
  const observed = snapshot(registry);
  if (command === 'init') return withLock(() => {
    const flags = {};
    for (let i = 0; i < options.length; i += 2) {
      const key = options[i], value = options[i + 1];
      if (!['--registry-id', '--kind'].includes(key) || !text(value) || value.startsWith('--') || key in flags) fail('Invalid init options.');
      flags[key] = value;
    }
    if (!kinds.includes(flags['--kind'])) fail('Choose --kind investigation, plan or change.');
    const remote = observed.tasks.find(item => item.id === flags['--registry-id']);
    if (!remote) fail('Register or locate the task through the configured workflow, then refresh the snapshot.');
    const records = tasks();
    if (fs.existsSync(local(recordPath(id))) || records.some(task => task.registryId === remote.id)) fail('Task already linked; reuse the existing record.');
    canWriteIndex();
    const task = {
      schemaVersion: 1, id, registryId: remote.id, title: remote.title, kind: flags['--kind'],
      status: remote.status, assignee: remote.assignee, updatedAt: new Date().toISOString(),
      scope: { request: '', targets: [], allowed: [], excluded: [] },
      authorization: { mode: 'read-only', evidence: null }, rollback: null, evidence: [],
      completion: { summary: '', remaining: [], limitations: [], followUps: [] }, nextAction: 'Record scope and evidence before claiming completion.',
    };
    write(recordPath(id), JSON.stringify(task, null, 2) + '\n');
    write(indexPath, renderIndex([...records, task].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
    console.log(`Linked local record ${id} to existing registry task ${remote.id}. No remote task was created.`);
    return 0;
  });
  const records = tasks();
  if (command === 'list') {
    for (const task of observed.tasks) console.log(`${task.id}\t${task.status}\t${task.assignee ?? '-'}\t${task.title}\t${records.find(item => item.registryId === task.id)?.id ?? 'UNLINKED'}`);
    console.log(`Snapshot observed: ${observed.observedAt}. Not a live registry query.`);
    return 0;
  }
  const task = command === 'reconcile' ? null : records.find(item => item.id === id);
  if (command !== 'reconcile' && !task) fail('Local task not found; inspect task list before creating a record.');
  // Always audit all links for duplicates even during a single-task check.
  const duplicates = records.filter((item, i) => records.findIndex(other => other.registryId === item.registryId) !== i);
  const issues = [...comparison(task ? [task] : records, observed, !task), ...indexIssues(records), ...duplicates.map(item => `${item.id}: duplicate local registry link`)];
  if (task) console.log(`${task.id}: ${task.title}\nRecorded status: ${task.status}; kind: ${task.kind}`);
  issues.forEach(issue => console.error(`- ${issue}`));
  console.log(issues.length ? 'Record reconciliation incomplete. No task statuses were changed.' : 'Record checks passed. This does not prove live system health or execution authorization.');
  return issues.length ? 1 : 0;
}
