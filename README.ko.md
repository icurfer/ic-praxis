# ic-ratchet

> 🌐 **English ([README.md](README.md)) is the canonical, always-latest version.**
> 이 한글 문서는 편의를 위한 번역이며 영문판보다 뒤처질 수 있습니다. 내용이 다를 경우 **영문판이 정본**입니다.
> [English](README.md) · **한국어**

---

**AI 코딩 에이전트를 위한 품질 래칫(ratchet).** 회고(retro)를 pre-commit 게이트로 바꿔서 — 같은 실수가 두 번 배포되지 않고, 프로젝트의 규율이 뒤로 풀리지 않게 한다.

대부분의 "AI 규칙" 세팅은 좋은 의도로 가득한 `CLAUDE.md` 한 장이지만 한 달이면 낡아버린다(stale). `ic-ratchet`은 그 나머지 반쪽이다: *적어둔* 규칙이 커밋 시점에 *기계적으로 강제*된다. 무언가 깨지면 게이트를 하나 추가하고 — 그 규칙은 다시 풀리지 않는다.

> 이름의 뜻: 래칫(ratchet)은 한 방향으로만 돌고 뒤로 미끄러지지 않는다. 이 도구가 프로젝트의 규칙에 하는 일이 바로 그것이다.

---

## 무엇을 얻나

어떤 레포에든 넣을 수 있는 5축 스캐폴드:

| 축 | 파일 | 하는 일 |
|---|---|---|
| **1. 헌법(Constitution)** | `CLAUDE.md` | 에이전트가 매 세션 읽는 규칙: 작업 순서, 위임 책임, 강한 "하지 말 것"(각각 *왜*를 명시). |
| **2. 4단 문서 체계** | `docs/` | 변경이 코드가 되기 전에 spec → scope → backlog → done 흐름으로 문서화된다. |
| **3. 래칫 게이트** ⭐ | `scripts/check-conventions.sh` + `.githooks/pre-commit` | 기계로 검증 가능한 규칙 위반 커밋을 차단: 배포 트리거 미bump, 잘못된 version 파일 형식, 시크릿/금지 패턴. |
| **4. 공유 메모리** | `.claude/memory/` | 세션을 넘어 지속되는 사실을 파일 1개=사실 1개로 인덱싱 — 컨텍스트가 초기화돼도 교훈이 살아남는다. |
| **5. 검증 스킬** | `.claude/skills/verify-app/` | 일회성 스크립트 대신 재사용 가능한 end-to-end 검증. |

핵심은 축 3이 축 1로 이어지는 고리다: **검증 가능한 규칙을 낳은 회고는, 잊을 수 없는 게이트가 된다.**

---

## 설치

> 설치 스크립트는 **스캐폴드 파일만 당신의 레포에 복사**한다. 자신은 temp
> 디렉토리에 내려받고 끝나면 지운다 — ic-ratchet의 레포/`.git`/`templates/`는
> 당신의 프로젝트에 남지 않는다. 기존 파일은 절대 덮어쓰지 않는다(덮어쓰려면 `--force`).

**A. 원라이너 — 프로젝트 루트에서 실행 (권장)**

```bash
curl -fsSL https://raw.githubusercontent.com/icurfer/ic-ratchet/main/install.sh | bash
# curl 없으면 →  wget -qO- https://raw.githubusercontent.com/icurfer/ic-ratchet/main/install.sh | bash
```

그다음 게이트 활성화:

```bash
bash scripts/install-hooks.sh
```

**B. Claude Code에 한 문구**

에이전트에게 이 레포를 가리키며 이렇게 말한다:

> "https://github.com/icurfer/ic-ratchet 의 curl 원라이너로 이 프로젝트에 ic-ratchet
> 스캐폴드를 구성해줘 (레포를 프로젝트 안에 clone하지 말고), 그다음 /ratchet-init를 돌려."

> ⚠️ **ic-ratchet를 프로젝트 *안에* `git clone`해서 거기서 실행하지 말 것** — 프로젝트에
> `ic-ratchet/` 폴더(자체 `.git` 포함)가 남아 오염된다. 로컬 사본을 두고 싶으면 프로젝트
> **바깥**에 clone한 뒤 `/path/to/ic-ratchet/install.sh /path/to/your/project` 로 실행한다.

그다음 Claude Code 안에서:

```
/ratchet-init  <프로젝트를 한 줄로 설명>
```

`/ratchet-init`은 레포를 분석해 `CLAUDE.md`와 게이트의 모든 `{{placeholder}}`를 채우고, 게이트를 실제 배포 경로에 맞게 튜닝한 뒤 — **일부러 잘못된 커밋을 만들어 차단되는 것을 보여줌으로써 동작을 증명한다.**

---

## 회고 루프 (무엇이 다른가)

```
   사고(incident)  ─►  CLAUDE.md / docs 에 규칙으로 적기  ─►  기계로 검증 가능한가?
                                                                │
                                       가능 ────────────────────►│  check-conventions.sh 에
                                                                │  게이트 추가
                                       불가능                    │
                                        └► 적어둔 규칙으로 남음 (에이전트가 준수)
```

사람의 기억에 의존하는 규칙은 언젠가 다시 깨진다. 이 체계는 사고 하나마다 가능한 많은 규칙을 게이트로 옮긴다.

---

## 게이트 커스터마이징

`scripts/check-conventions.sh` 상단의 설정 블록을 연다:

- `CODE_RE` — 변경 시 *반드시* 배포돼야 하는 경로 (→ version bump 필요)
- `VERSION_FILE` — CI가 트리거로 감시하는 파일
- `FORBIDDEN_PATTERNS` — 시크릿, 디버그 흔적, 금지 API

회고에서 검증 가능한 규칙이 나올 때마다 게이트를 추가한다. 그게 규율의 전부다.

## 라이선스

Apache-2.0
