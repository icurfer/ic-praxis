# Codex-native praxis skill adapters

- 상태: **구현됨 (v0.5.0, 2026-07-25)**
- 범위: `praxis-init`, `praxis-review`, `verify-app`의 Codex 네이티브 발견

## 문제

v0.4.0은 `AGENTS.md`와 Gate E를 추가해 Claude Code와 Codex가 같은 헌법을
읽도록 만들었다. 그러나 반복 절차는 `.claude/commands/`와
`.claude/skills/`에만 있어 Codex가 자동 발견하지 못했다. README는 Codex
사용자에게 정본 prompt 파일을 직접 읽으라고 안내했으므로, 헌법은
dual-agent였지만 실제 도입과 검증 workflow는 Claude 중심으로 남아 있었다.

## 프로젝트에 맞춘 판단

Codex는 repo-local skill을 `.agents/skills/`에서 발견한다. 그렇다고 기존
절차를 그대로 복사하면 Claude와 Codex용 workflow 본문이 따로 진화해 새로운
drift 지점이 된다.

따라서 `.agents/skills/`에는 발견과 agent별 해석만 담당하는 thin adapter를
두고, 절차의 정본은 기존 위치에 유지한다:

| Codex entrypoint | Canonical procedure |
|---|---|
| `.agents/skills/praxis-init/SKILL.md` | `.claude/commands/praxis-init.md` |
| `.agents/skills/praxis-review/SKILL.md` | `.claude/commands/praxis-review.md` |
| `.agents/skills/verify-app/SKILL.md` | `.claude/skills/verify-app/SKILL.md` |

이 구조는 Codex에서 `$praxis-init`, `$praxis-review`, `$verify-app`으로
네이티브 호출할 수 있게 하면서 workflow 본문은 하나만 유지한다.

## 의도적으로 제외한 범위

- Codex hook adapter: core praxis의 강제 계층은 이미 agent-neutral git
  pre-commit hook이다. lifecycle hook을 core에 추가할 실제 사건이 아직 없다.
- Codex sub-agent adapter: multi-session은 opt-in 모듈이다. core 설치에
  항상 포함하면 단일 세션 프로젝트에 불필요한 정책이 된다.
- `.praxis/` source tree와 renderer: thin adapter만으로 현재 drift 문제를
  해결하므로 새 생성 단계는 추가하지 않았다.

## 함께 변경한 것

- installer가 `.agents/`를 core scaffold로 복사하고 Codex용 다음 단계로
  `$praxis-init`을 출력한다.
- `README.md`와 `README.ko.md`의 capability matrix, 설치 예시, rule routing
  설명을 실제 지원 범위와 동기화했다.
- `bootstrap-prompt.md`가 재구축 시 같은 thin-adapter 구조를 만들도록 했다.
- self-dogfooding `AGENTS.md`가 Codex adapter와 memory의 실제 위치를
  명시한다.
- shipped path 변경에 따라 release version을 `0.5.0`으로 올렸다.

## 검증

throwaway git repository에 `install.sh`를 실행해 세 skill이 모두 설치되고
각 `SKILL.md`가 필수 `name`/`description` frontmatter를 갖는지 확인했다.

설치된 gate도 실제 staged 상태로 검증했다:

1. `app/main.js`만 stage하고 `version`을 올리지 않음 → Gate A 차단.
2. `AGENTS.md`의 `praxis:shared` 블록만 변경 → Gate E drift 차단.
3. 이 저장소에서 `bash scripts/check-conventions.sh --all` → 통과.
4. `version`은 개행 없는 정확한 `0.5.0` 한 줄임을 byte 단위로 확인.

## 후속 조건

Codex hook이나 sub-agent adapter는 “Codex가 지원한다”는 이유만으로 추가하지
않는다. 실제 프로젝트 incident나 반복되는 운영 요구가 생겼을 때 opt-in
module로 설계하고, throwaway target에서 해당 lifecycle/격리 동작까지
검증한 뒤 제공한다.
