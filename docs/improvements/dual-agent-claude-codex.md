# Claude Code + Codex 동시 사용을 위한 agent-neutral praxis 설계

- 상태: **증분 1 구현됨 (v0.4.0, 2026-07-25)** — `AGENTS.md` + 공유 블록 drift 게이트(Gate E) + capability matrix. `.praxis/` 코어 추출, `--agent` 플래그, native adapter는 미구현. 구현 시 개정된 사항은 [`README.md`](README.md)의 Revision notes 참조.
- 작성일: 2026-07-25
- 배경: 한 프로젝트에서 Claude Code와 Codex를 함께 사용하는 운영 방식

## 문제

ic-praxis의 핵심 개념은 특정 에이전트에 종속되지 않는다. 사고와 회고에서
얻은 판단을 규칙으로 남기고, 기계가 검사할 수 있는 규칙을 pre-commit gate로
강제하는 것이 본질이다.

그러나 현재 배포 구조는 Claude Code의 파일과 기능을 기본값으로 삼는다.

| Praxis 역할 | 현재 구현 |
|---|---|
| 항상 읽는 프로젝트 헌법 | `CLAUDE.md` |
| 공유 메모리 | `.claude/memory/` |
| 반복 절차 | `.claude/skills/` |
| tool-use lifecycle | `.claude/settings.json` |
| sub-agent 정의 | `.claude/agents/` |
| 대화형 진입점 | `/praxis-init`, `/praxis-review` |

Codex는 저장소의 지속 지침을 `AGENTS.md`에서 읽는다. 루트에서 현재 작업
디렉터리까지의 `AGENTS.md`를 계층적으로 합치므로, `CLAUDE.md`만 설치된
프로젝트에서는 Codex가 praxis 헌법을 자동으로 적용한다고 보장할 수 없다.

그 결과 두 에이전트를 함께 쓰면 다음 문제가 생긴다.

1. Claude Code와 Codex가 서로 다른 규칙을 읽거나 한쪽만 규칙을 읽는다.
2. 같은 규칙을 `CLAUDE.md`와 `AGENTS.md`에 수동 복사하면 시간이 지나며
   내용이 달라진다.
3. `.claude/`에 저장된 memory, skill, hook, sub-agent 정책을 Codex가 같은
   의미로 사용하지 못한다.
4. slash command가 제품의 유일한 진입점이면 다른 에이전트와 CI에서 동일한
   절차를 실행하기 어렵다.
5. README의 “AI coding agents”라는 범용 설명과 실제 설치 결과 사이에 차이가
   생긴다.

## 설계 목표

핵심 원칙은 다음 한 문장이다.

> **Praxis owns the rules; agents only provide adapters.**

구체적인 목표는 다음과 같다.

- 규칙, 기억, 절차의 source of truth를 에이전트 중립 위치에 둔다.
- Claude Code와 Codex가 각자 자동으로 발견하는 native entrypoint를 제공한다.
- 두 entrypoint가 독립적으로 편집되어 drift하지 않게 한다.
- Git hook과 CI처럼 이미 에이전트 중립인 강제 계층은 그대로 공용으로 쓴다.
- 특정 에이전트만 제공하는 기능을 범용 기능처럼 과장하지 않는다.
- 이후 다른 코딩 에이전트도 adapter 추가만으로 지원할 수 있게 한다.
- 기존 Claude Code 사용자의 설치를 깨지 않는 단계적 migration을 제공한다.

## 제안 구조

```text
.praxis/
├── constitution.md       # 공통 판단 규칙의 원본
├── memory/               # 에이전트 중립 공유 기억
├── skills/               # 반복 가능한 절차의 원본
├── agents/               # 역할과 위임 정책의 원본
├── hooks/                # 공통 hook 실행 스크립트
└── praxis.toml           # 설치 schema, agent, feature 설정

CLAUDE.md                 # Claude Code adapter (generated)
AGENTS.md                 # Codex adapter (generated)
.claude/                  # Claude Code native integration
.codex/                   # Codex native integration
scripts/                  # 사람, agent, CI가 함께 호출하는 실행 계층
.githooks/                # agent와 무관한 commit-time enforcement
```

`.praxis/`는 의미와 정책을 소유하고, `CLAUDE.md`, `AGENTS.md`, `.claude/`,
`.codex/`는 각 제품이 그 의미를 발견하고 실행할 수 있게 연결한다.

## Constitution: 한 원본에서 두 entrypoint 생성

가장 단순한 방법은 두 파일에서 `.praxis/constitution.md`를 읽으라고 지시하는
것이다.

```markdown
# Project instructions

Read and follow `.praxis/constitution.md` before making changes.
```

하지만 이 방식은 에이전트가 작업 전에 추가 파일을 읽어야 한다. 항상 필요한
규칙은 각 제품의 native entrypoint에 직접 들어 있는 편이 더 확실하다.

따라서 `.praxis/constitution.md`를 source of truth로 두고 `CLAUDE.md`와
`AGENTS.md`를 생성하는 방식을 권장한다.

```text
.praxis/constitution.md
          │
          └── scripts/render-agent-guidance.sh
                   ├── CLAUDE.md
                   └── AGENTS.md
```

생성 파일에는 직접 편집하지 말라는 표식을 넣는다.

```markdown
<!-- Generated from .praxis/constitution.md. Do not edit directly. -->
```

pre-commit gate 또는 CI는 다음 검사를 실행해 drift를 막는다.

```bash
bash scripts/render-agent-guidance.sh --check
```

공통 본문은 같게 유지하되, 필요한 경우 renderer가 작은 agent-specific
섹션만 덧붙일 수 있다. 제품별 tool 이름이나 설정 경로를 공통 헌법 안에
섞지 않는 것이 중요하다.

## Portable core와 native enhancement

모든 기능을 두 제품에 억지로 1:1 대응시키지 않는다. 기능을 두 층으로
구분한다.

### Portable core

어떤 코딩 에이전트를 사용해도 같은 결과를 내야 한다.

- constitution과 rule-routing 원칙
- `docs/`의 spec, scope, deferred, changelog 규율
- `scripts/check-conventions.sh`
- `.githooks/pre-commit`
- 검증과 review용 shell command
- memory의 저장 형식과 index
- retro에서 rule과 gate를 만드는 과정

### Native enhancement

의미는 공통이지만 실행 표면은 제품마다 다르다.

- Claude Code `PreToolUse`/`PostToolUse`
- Codex hooks
- Claude Code와 Codex의 skill discovery
- Claude Code와 Codex의 sub-agent 정의
- slash command와 대화형 UX
- 제품 자체의 memory integration

기능 표에는 다음 상태를 사용한다.

| 상태 | 의미 |
|---|---|
| `portable` | 모든 지원 에이전트에서 같은 공통 구현을 사용 |
| `adapted` | 제품별 구현은 다르지만 같은 의미를 제공 |
| `native-only` | 특정 제품에서만 제공 |
| `unsupported` | 해당 adapter가 아직 없음 |

이 구분을 README와 release note에 공개해야 “Codex 지원”의 실제 범위가
명확해진다.

## 역할별 mapping

| Praxis 의미 | 공통 source | Claude Code | Codex |
|---|---|---|---|
| 상시 판단 규칙 | `.praxis/constitution.md` | `CLAUDE.md` | `AGENTS.md` |
| commit-time 강제 | `scripts/`, `.githooks/` | 공통 | 공통 |
| 반복 절차 | `.praxis/skills/` | Claude skill adapter | Codex skill adapter |
| lifecycle 반응 | `.praxis/hooks/` | `.claude/settings.json` | Codex hook adapter |
| 지속 사실 | `.praxis/memory/` | Claude memory loader | Codex guidance/memory adapter |
| 작업 위임 정책 | `.praxis/agents/` | `.claude/agents/` | Codex sub-agent adapter |
| 공식 실행 명령 | `scripts/praxis-*.sh` | slash command wrapper | skill/prompt wrapper |

adapter는 공통 source를 복제해 소유하지 않는다. 가능한 경우 공통 script를
호출하고, 복제가 필요한 경우 generator와 drift gate로 일치 여부를 보장한다.
Windows에서 symbolic link 동작이 일관되지 않았던 기존 경험 때문에,
symlink를 정식 동기화 방식으로 의존하지 않는다.

## Memory

현재 `.claude/memory/`를 `.praxis/memory/`로 이동하고 파일마다 최소
metadata를 둔다.

```yaml
---
id: feedback.verify-before-done
type: feedback
scope: project
status: active
applies_to: [all]
---
```

필요한 경우 적용 대상을 제한할 수 있다.

```yaml
applies_to: [claude, codex]
```

모든 memory를 항상 헌법에 삽입하지 않는다. `CLAUDE.md`와 `AGENTS.md`에는
memory index와 “관련 작업일 때 선택적으로 읽는다”는 routing 규칙만 둔다.
그렇지 않으면 교훈이 늘어날수록 모든 세션의 context 비용도 함께 증가한다.

## Agent-neutral command

slash command를 공식 실행 계층으로 삼지 않고 shell command를 기준으로 삼는다.

```bash
bash scripts/praxis-init.sh
bash scripts/praxis-review.sh
bash scripts/praxis-retro.sh
bash scripts/praxis-sync.sh
```

각 제품의 command나 skill은 이 script를 호출하는 편의 adapter다.

| 사용자 | 실행 방식 |
|---|---|
| 사람 | `bash scripts/praxis-init.sh` |
| Claude Code | `/praxis-init` wrapper |
| Codex | praxis init skill 또는 script 실행 |
| CI | `bash scripts/praxis-review.sh --check` |

이 구조에서는 제품별 UI가 바뀌어도 praxis의 실제 동작과 테스트 인터페이스는
유지된다.

## Installer

다음 인터페이스를 제안한다.

```bash
./install.sh --agent auto
./install.sh --agent claude
./install.sh --agent codex
./install.sh --agent claude,codex
```

`auto`의 탐지 후보는 다음과 같다.

- `CLAUDE.md` 또는 `.claude/`가 있으면 Claude Code
- `AGENTS.md` 또는 `.codex/`가 있으면 Codex
- 양쪽 흔적이 있으면 dual-agent
- 어느 쪽도 없으면 portable core를 설치하고 native adapter 선택을 안내

탐지 결과와 사용자가 지정한 값은 `.praxis/praxis.toml`에 기록한다.

```toml
schema = 1
agents = ["claude", "codex"]

[features]
memory = true
skills = true
hooks = true
multi_agent = false
```

현재 installer의 “`CLAUDE.md`가 있으면 docs scaffold를 생략”하는 판단은
변경해야 한다. 앞으로는 특정 agent 파일의 존재와 praxis 설치 여부를
분리하고, `.praxis/praxis.toml` 또는 명확한 managed marker로 재설치와
migration을 판정한다.

## Rule-routing 개정

현재 routing은 `.claude/settings.json`처럼 제품 파일을 목적지로 직접
지목한다. 앞으로는 먼저 의미 계층을 선택하고 그다음 adapter가 제품별
파일로 변환해야 한다.

```text
새 교훈
  │
  ├─ commit 시 기계적으로 검사 가능한가?
  │      └─ yes → Git/CI gate
  │
  ├─ agent의 특정 행동 시점에 반응해야 하는가?
  │      └─ yes → lifecycle policy
  │                  ├─ Claude hook adapter
  │                  └─ Codex hook adapter
  │
  ├─ 반복 가능한 절차인가?
  │      └─ yes → portable skill
  │                  ├─ Claude skill adapter
  │                  └─ Codex skill adapter
  │
  ├─ 관련 상황에서 불러올 지속 사실인가?
  │      └─ yes → praxis memory
  │
  └─ 항상 필요한 판단인가?
         └─ constitution → CLAUDE.md + AGENTS.md
```

## 단계적 migration

### Phase 1 — Codex 최소 지원

1. `templates/AGENTS.md`를 추가한다.
2. installer에 `--agent auto|claude|codex|claude,codex`를 추가한다.
3. README에 지원 agent와 capability matrix를 명시한다.
4. Codex 설치 및 사용 예시를 추가한다.
5. 공통 원본에서 `CLAUDE.md`와 `AGENTS.md`를 생성하고 drift를 검사한다.

이 단계에서는 기존 `.claude/` memory, skill, hook을 유지해 기존 사용자를
깨지 않는다.

### Phase 2 — agent-neutral core 추출

1. `.praxis/constitution.md`와 `.praxis/praxis.toml`을 도입한다.
2. `.claude/memory/`를 `.praxis/memory/`로 migration한다.
3. 공식 실행 인터페이스를 `scripts/praxis-*.sh`로 옮긴다.
4. `praxis-review.sh`의 통계와 검사를 `.praxis/` 중심으로 바꾼다.
5. 기존 설치를 감지하고 보존하는 migration command를 제공한다.

### Phase 3 — native adapter 완성

1. Claude Code와 Codex의 hook adapter를 제공한다.
2. 양쪽 skill adapter를 제공한다.
3. 양쪽 sub-agent adapter를 제공한다.
4. agent별 fixture repo에서 install, update, gate, skill discovery를 검증한다.
5. capability matrix를 자동 검사하거나 release checklist에 포함한다.

## 첫 dual-agent release의 권장 범위

첫 릴리스에서 모든 Claude 기능을 Codex에 1:1 구현하지 않는다. 다음 범위면
규칙 분열 문제를 먼저 해결하면서 migration 위험을 제한할 수 있다.

1. `AGENTS.md` 정식 지원
2. `CLAUDE.md`와 `AGENTS.md`의 단일 source 및 생성 검사
3. `.praxis/memory/` 도입
4. installer의 agent 선택 및 자동 탐지
5. README와 rule-routing의 agent-neutral화
6. 기존 `.claude/` integration의 하위 호환 유지
7. Codex native hook, skill, sub-agent는 후속 단계로 명시

## 검증 기준

구현 완료는 파일이 존재하는지가 아니라 다음 행동으로 판정한다.

- Claude Code만 쓰는 기존 fixture가 이전과 동일하게 설치되고 gate가 동작한다.
- Codex fixture에서 `AGENTS.md`가 생성되고 공통 헌법과 일치한다.
- dual-agent fixture에서 두 entrypoint가 같은 공통 규칙을 담는다.
- 한쪽 generated 파일을 수정하면 drift gate가 commit을 차단한다.
- `--agent auto`가 Claude-only, Codex-only, dual, unknown fixture를 구분한다.
- 기존 `.claude/memory/`가 손실 없이 `.praxis/memory/`로 이동된다.
- Windows, macOS bash 3.2, Linux에서 installer와 generator가 동작한다.
- native-only 기능이 portable로 잘못 표시되지 않는다.

## 공식 Codex 근거

Codex 공식 문서는 `AGENTS.md`를 저장소와 함께 이동하는 지속적인 프로젝트
지침으로 설명하며, root에서 현재 디렉터리까지 계층적으로 발견한다. 또한
project guidance, memory, skill, hook, sub-agent를 서로 보완하는 별도
customization 계층으로 구분한다.

- [Codex customization overview](https://learn.chatgpt.com/docs/customization/overview)
- [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Build skills](https://learn.chatgpt.com/docs/build-skills)
- [Hooks](https://learn.chatgpt.com/docs/hooks)

## 결정이 필요한 항목

구현 전 다음 항목은 별도 결정을 남겨야 한다.

1. `.praxis/constitution.md`의 포맷을 단순 Markdown으로 둘지, 공통/제품별
   fragment를 갖는 renderer 입력으로 만들지
2. 기존 사용자의 `CLAUDE.md` 수동 수정 내용을 migration할 방법
3. generated `CLAUDE.md`와 `AGENTS.md`에서 허용할 사용자 편집 구역
4. Codex skill과 hook의 최소 지원 버전 및 호환성 정책
5. `--agent both` 별칭을 허용할지 `claude,codex`만 정식 문법으로 둘지
6. `.praxis/memory/`를 각 제품의 native memory에 연결할지, repository
   guidance로만 routing할지

이 결정들이 끝난 뒤 Phase 1을 별도 구현 변경으로 진행한다.
