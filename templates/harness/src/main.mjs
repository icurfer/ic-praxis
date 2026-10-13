import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const choices = ['development', 'infrastructure'];
const selectionHelp = `하네스 종류를 선택하세요 / Select a harness profile:
  development     개발용: 코드 작업과 테스트·빌드 검증
  infrastructure  운영용: 외부 태스크 대조·범위·근거·인계 검사 (서버 실행 없음)

node harness/bin/praxis.mjs profile select development
node harness/bin/praxis.mjs profile select infrastructure
node harness/bin/praxis.mjs profile status

에이전트에게 “하네스 적용해줘”라고 요청하면 먼저 종류를 선택합니다.
CI는 두 종류 모두 기본으로 꺼져 있습니다. / CI remains opt-in.`;

function profileFile() {
  let current = root;
  for (const segment of ['harness', 'config', 'profile.json']) {
    current = path.join(current, segment);
    // lstat also catches dangling links; absent selection files must fail closed.
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlink is not allowed for profile selection.');
  }
  return current;
}
function readProfile() {
  const value = JSON.parse(fs.readFileSync(profileFile(), 'utf8'));
  if (!value || value.schemaVersion !== 1 || !(value.profile === null || choices.includes(value.profile))) {
    throw new Error('Invalid harness/config/profile.json; choose development or infrastructure.');
  }
  return value;
}
async function report(profile) {
  if (profile === null) { console.log(selectionHelp); return 1; }
  if (profile === 'infrastructure') {
    const infrastructure = await import('./infrastructure.mjs');
    return infrastructure.profileStatus();
  }
  console.log('개발용 선택됨 / development selected.\n작업별 검증은 별도입니다. / Task validation is separate.\nNext: node harness/bin/praxis.mjs task --help');
  return 0;
}
function select(profile) {
  if (!choices.includes(profile)) throw new Error(selectionHelp);
  const filename = profileFile();
  const lock = `${filename}.lock`;
  const fd = fs.openSync(lock, 'wx', 0o600);
  fs.closeSync(fd);
  try {
    const previous = readProfile();
    if (previous.profile !== null && previous.profile !== profile) {
      throw new Error('이미 종류가 선택되어 있습니다. / Profile already selected; changing types requires a reviewed migration. Existing records were preserved.');
    }
    if (previous.profile === null) {
      fs.writeFileSync(lock, JSON.stringify({ ...previous, profile }, null, 2) + '\n');
      fs.renameSync(lock, filename);
    }
  } finally { if (fs.existsSync(lock)) fs.unlinkSync(lock); }
  console.log(`Selected ${profile}. Configuration and task readiness are checked separately with profile status.`);
  return 0;
}

export async function main(args) {
  if (args[0] === 'adr') return (await import('./adr.mjs')).main(args);
  if (args[0] === 'profile') {
    if (args[1] === 'select' && args.length === 3) return select(args[2]);
    if (args[1] === 'status' && args.length === 2) return report(readProfile().profile);
    throw new Error(selectionHelp);
  }
  if (!args.length || ['--help', 'help'].includes(args[0])) {
    console.log(selectionHelp);
    console.log('Common decisions: adr propose/check/accept/list (adr --help).');
    console.log('\nDevelopment: task init/check/validate/status. Infrastructure also provides task list/reconcile/index. After selection, use task --help.');
    return 0;
  }
  const profile = readProfile().profile;
  if (profile === null) return report(profile);
  if (profile === 'infrastructure') {
    const infrastructure = await import('./infrastructure.mjs');
    return infrastructure.main(args);
  }
  // Load only the selected implementation. Development retains its own workflow.
  const development = await import('./development.mjs');
  if (args.length === 2 && args[0] === 'task' && args[1] === '--help') return development.main(['--help']);
  return development.main(args);
}
