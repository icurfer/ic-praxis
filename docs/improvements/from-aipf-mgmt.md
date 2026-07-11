# ic-praxis 개선 제안 — aipf-mgmt 도입 사례

- 작성일: 2026-07-09
- 근거: `aipf-mgmt` 저장소 (316 commits, 2026-03-24 ~ 2026-07-09) 에 ic-praxis 를 실제로 도입하며 발견한 사항.
- 대상 버전: `main` (2026-07-09 시점 tarball)

도입 자체는 성공했고, 게이트는 우리 저장소의 실제 사고를 잡았다. 아래는 **그 과정에서
손대야 했던 부분**을 우선순위 순으로 정리한 것이다. 각 항목은 "왜 문제인가 → 근거 →
제안" 순서다.

---

## P0. Gate C 의 시크릿 패턴이 YAML 을 못 잡는다

### 문제

`templates/scripts/check-conventions.sh` 의 기본 패턴은 **등호 대입만** 본다.

```bash
'password\s*=\s*["'\''][^"'\'' ]{3,}'    # hardcoded password=...
```

Helm `values.yaml`, Kubernetes manifest, `docker-compose.yml`, GitHub Actions
등 인프라 파일은 전부 `key: value` (콜론) 형태다. 즉 **ic-praxis 가 가장 많이
설치될 리포의 가장 흔한 시크릿 유출 경로를 기본값이 못 잡는다.**

### 근거

aipf-mgmt 는 `helm/gpu-mgmt/values.yaml` 에 3 종의 시크릿을 평문 커밋했고
(Django `SECRET_KEY`, Fernet 키, Harbor 비밀번호), 결국 `git-filter-repo` 로
히스토리를 재작성해야 했다. 실제 유출 라인은 다음과 같다.

```yaml
password: "REDACTED"
secretKey: "REDACTED"
kubeconfigEncryptionKey: "REDACTED"
```

기본 패턴으로 검사하면 **3 건 중 0 건**이 걸린다.

### 제안

구분자를 `[:=]` 로 넓히고, 플레이스홀더 allowlist 를 함께 둔다. allowlist 가
없으면 `secretKey: "CHANGE_ME_DJANGO_SECRET_KEY"` 같은 스캐폴드 자기 자신이
오탐된다 (실제로 발생).

```bash
SECRET_KEY_RE='(password|passwd|secret_?key|secretKey|token|api_?key)'
PLACEHOLDER_RE='(CHANGE_ME|change-me|changeme|\$\{|\{\{)'
# grep -nEi "${SECRET_KEY_RE}[[:space:]]*[:=][[:space:]]*[\"'][^\"' ]{8,}"
# → 매치된 라인이 PLACEHOLDER_RE 이면 skip
```

최소 길이도 `{3,}` → `{8,}` 이 낫다. `{3,}` 은 `token: "abc"` 류 테스트 픽스처를
과하게 잡는다.

---

## P1. Gate C 가 staged 내용이 아니라 워킹트리를 읽는다

### 문제

`scan_targets` 는 **staged 파일 이름**을 뽑지만, 실제 검사는 워킹트리의 파일을
`grep` 한다.

```bash
staged() { git diff --cached --name-only --diff-filter=ACMR; }
...
if grep -nE "$pat" "$f" >/dev/null 2>&1; then
```

따라서 두 방향 모두로 틀린다.

- **거짓 음성**: 시크릿이 든 버전을 `git add` 한 뒤 워킹트리에서 그 줄을 지우면,
  게이트는 통과하지만 커밋되는 blob 에는 시크릿이 남는다. `git add -p` 로 일부만
  스테이징한 경우도 동일하다.
- **거짓 양성**: 워킹트리에만 있는 디버그용 시크릿 때문에, 정작 무관한 커밋이 막힌다.

pre-commit 훅의 검사 대상은 정의상 **staged blob** 이어야 한다.

### 제안

```bash
git show ":$f" | grep -nE "$pat"    # index 의 내용을 읽는다
```

`--all` 모드에서만 워킹트리/`git ls-files` 를 읽도록 분기한다.

---

## P2. 단일 `VERSION_FILE` 가정이 모노레포에서 깨진다

### 문제

`VERSION_FILE='version'` 하나만 존재한다고 가정한다. 그런데 `docs/README.md` 는
정작 이렇게 적고 있다.

> Each source repo carries its own one-line deploy-trigger file, patch-bumped
> only when that repo's code changed.

즉 **여러 배포 단위**를 전제하면서, 게이트는 하나만 검사한다. 한 저장소 안에
배포 단위가 둘 이상인 흔한 구조(backend + frontend)에서 곧바로 어긋난다.

### 근거

aipf-mgmt 는 `backend/version` 과 `frontend/version` 을 따로 둔다. 기본 게이트는
루트 `version` 만 보므로, 둘 중 어느 쪽이 빠져도 통과한다.

### 제안

영역 배열을 지원한다. 설정만 바꾸면 단일 저장소도 원소 1 개짜리 배열이 된다.

```bash
# "코드경로정규식|version파일"
AREAS=(
  '^backend/|backend/version'
  '^frontend/(src/|public/)|frontend/version'
)
```

---

## P3. `CODE_RE` 의 앵커링이 일관되지 않다

### 문제

```bash
CODE_RE='^(src/|lib/|app/|public/|package\.json$|...|Dockerfile|Cargo\.toml$)'
```

- 앞쪽 디렉터리 항목은 `^` 로 **루트에 고정**된다 → `backend/`, `frontend/src/`,
  `services/api/src/` 같은 하위 경로를 **하나도 못 잡는다.**
- 반면 `Dockerfile` 은 앵커가 없어 `any/path/Dockerfile` 에 **모두 걸린다.**

결과적으로 모노레포에서는 *정작 필요한 검사는 안 되고, 불필요한 차단만 생긴다.*
aipf-mgmt 에 원본 그대로 적용하면 `backend/Dockerfile` 수정 시 루트 `version`
스테이징을 요구하며 막히지만, `backend/**/*.py` 300 줄을 고쳐도 통과한다.

### 제안

`AREAS` 도입(P2)으로 자연히 해소된다. 단독으로 고친다면 최소한 주석에
"루트 기준 경로만 매칭됨. 모노레포는 반드시 수정할 것" 을 명시.

---

## P4. `install.sh` 가 루트 `version` 을 무조건 만든다

### 문제

```bash
if [ ! -e "$TARGET/version" ]; then printf '%s' "0.1.0" > "$TARGET/version"; fi
```

per-area version 을 쓰는 저장소에 **의미 없는 루트 `version`** 이 생긴다.
지우지 않으면 Gate B(형식 검사)가 계속 이 파일을 감시하고, 팀은 "이건 뭐지"
하는 파일을 하나 더 갖게 된다.

### 제안

- `--no-version` 플래그를 추가하거나,
- `*/version` 이 이미 존재하면 생성을 건너뛰고 안내만 출력한다.

```bash
if compgen -G "$TARGET/*/version" >/dev/null; then
  echo "  skip: per-area version 파일 감지됨 — 루트 version 생성 안 함"
fi
```

---

## P5. 작은 변경에 대한 예외가 없어서 체계가 붕괴한다

### 문제

`templates/CLAUDE.md` 의 work order 는 **모든 변경**에 spec → scope → deferred →
done 4 장을 요구한다. 오타 하나에도 4 장이면, 사람은 곧 규칙을 우회한다.

### 근거 (중요)

aipf-mgmt 는 6 단계 문서 체계를 운영했고, 정확히 이 이유로 무너졌다.

| 지표 | 값 |
|---|---|
| 6 장 세트 (`docs/기획` 등) 문서 수 | 폴더당 65~66 |
| 1 장 요약 (`docs/사이클/`) 문서 수 | **177** |
| 6 단계 폴더 마지막 갱신 | 2026-05-27 |
| 그 이후 실제로 갱신된 docs | `CHANGELOG.md` 뿐 |

무거운 형식은 2.7 : 1 로 가벼운 형식에 밀렸고, 결국 둘 다 멈췄다. **폴더를 6 개에서
4 개로 줄이는 것으로는 해결되지 않는다.** 분량 임계에 따른 공식 예외가 필요하다.

### 제안

work order 에 분류 규칙을 넣는다. aipf-mgmt 의 `.claude/rules/workflow.md` 가
쓰던 기준이 실무에서 잘 작동했다.

> 신규 소스 파일 ≥ 1, 코드 변경 ≥ 100 줄, 신규 API, 인프라 변경, 신규 의존성,
> 룰 변경 중 **하나라도 해당하면 큰 변경** (4 장 전부). 모두 아니면 **작은 변경** —
> `backlog.md` ✅ + `CHANGELOG` 한 줄로 종료.

---

## P6. 배포 매니페스트 동기 게이트가 없다

### 문제

version 을 올려도 그 값을 참조하는 배포 매니페스트(Helm `values.yaml`,
kustomize, compose)가 함께 갱신되지 않으면 **버전만 올라가고 배포는 옛 이미지**다.
ic-praxis 는 "version 이 staged 됐는가" 까지만 본다.

### 근거

aipf-mgmt 에서 version bump 는 했으나 `helm/gpu-mgmt/values.yaml` 의
`image.tag` 를 함께 고치지 않은 커밋이 **9 건**. 실제로 클러스터에 배포된 태그와
저장소의 `values.yaml` 이 어긋난 상태로 48 일간 운영됐다.

### 제안

선택적 게이트로 추가한다 (`DEPLOY_MANIFEST` 가 설정된 경우에만 동작).

```bash
# version 파일 값과 매니페스트의 태그가 일치하는지 비교
want="$(head -n1 "$vfile")"
have="$(awk ... "$DEPLOY_MANIFEST")"
[ "$want" = "$have" ] || err "version($want) != manifest tag($have)"
```

k8s 프로젝트에서 이 게이트 하나가 "조용한 미배포" 를 통째로 막는다.

---

## P7. `docs/` 스캐폴드가 기존 문서 체계와 충돌한다

### 문제

`install.sh` 는 기존 파일을 덮어쓰지 않지만, **폴더는 추가한다.** 이미 다른 문서
체계를 가진 저장소에는 `spec/`·`scope/`·`done/`·`deferred/` 가 빈 채로 생기고,
정작 그 사용법을 설명하는 `CLAUDE.md` 는 "이미 존재" 로 skip 된다. 결과는
**주인 없는 빈 폴더 4 개**.

### 제안

- `--no-docs` 플래그.
- 또는 `CLAUDE.md` 가 skip 되면 `docs/` 스캐폴드도 자동 skip + 경고 출력.
  헌법 없이 문서 폴더만 깔리는 상태를 기본값으로 두지 않는다.

---

## P8. 사소한 것들

- **`FORBIDDEN_GLOBS='.'` 가 인용 없이 전개된다** — `git ls-files -- $FORBIDDEN_GLOBS`.
  공백이 든 glob 을 넣으면 깨진다.
- **`--all` 이 Gate C 에만 전달된다** — Gate A/B 는 `--all` 여부와 무관하게 staged 만
  본다. 전체 스윕을 표방하면 일관돼야 한다.
- **`chmod +x` 가 skip 된 파일에도 적용된다** — 기존 `scripts/` 가 있으면 남의 파일
  권한을 바꿀 수 있다. 복사한 파일 목록에만 적용하는 편이 안전하다.
- **README 의 "4단계" 표현** — 실제로는 `requirements/backlog.md` 를 포함해 5 개
  산출물이 흐른다. 처음 읽는 사람에게 혼동을 준다.

---

## 부록: aipf-mgmt 도입 효과 실측

게이트를 켰다면 잡혔을 항목을 과거 커밋에서 직접 셌다.

| 항목 | 실측 | 비고 |
|---|---|---|
| `backend/` 변경 + `backend/version` 미동반 | 21 건 / 147 | 개별 분류 미실시 — 일부는 정당한 예외일 수 있음 |
| `frontend/src/` 변경 + `frontend/version` 미동반 | 18 건 / 188 | 〃 |
| version bump + `values.yaml` 미동기 | 9 건 | P6 근거 |
| 누락을 나중에 메운 "뒷수습" 커밋 | **12 건** (전체의 3.8%) | 커밋 26 건당 1 건 |
| 시크릿 유출 | 3 건 | 기본 패턴 검출 0 / 수정 후 3 |
| 게이트가 예방했을 **버그** | **0 건** | `fix:` 커밋 57 건 중 0 |

마지막 행이 중요하다. **ic-praxis 는 규율 누락을 막지 논리 오류를 막지 않는다.**
README 가 이 경계를 명시하면 도입자의 기대가 정확해진다. 실제 가치는
"월 3~4 건의 뒷수습 제거 + 조용한 미배포 차단" 이고, 이것만으로도 충분히 크다.

---

## 요약

| 우선순위 | 항목 | 성격 |
|---|---|---|
| P0 | 시크릿 패턴이 `key: value` 를 못 잡음 | 보안 — 기본값이 틀림 |
| P1 | Gate C 가 워킹트리를 읽음 | 정확성 — 거짓 음성 가능 |
| P2 | 단일 `VERSION_FILE` 가정 | 설계 — 모노레포 미지원 |
| P3 | `CODE_RE` 앵커링 불일치 | 설계 — P2 로 해소 |
| P4 | 루트 `version` 무조건 생성 | 설치 UX |
| P5 | 작은 변경 예외 부재 | 체계 지속성 |
| P6 | 배포 매니페스트 동기 게이트 없음 | 기능 제안 |
| P7 | `docs/` 스캐폴드 충돌 | 설치 UX |
| P8 | 인용·플래그·권한 등 | 사소 |

P0 과 P1 은 **보안 도구로서의 신뢰**에 직결되므로 먼저 고치는 것을 권한다.
나머지는 설정 확장(P2·P3·P6)과 설치 경험(P4·P7)의 문제다.
