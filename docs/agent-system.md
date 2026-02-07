# Agent System

> 에이전트 프로토콜, 페르소나 시스템, 라운드별 전략, 도구 활용 가이드

## Agent Protocol

에이전트(`agent/src/agent.ts`)는 stdin/stdout 기반 프로토콜로 통신합니다:

```
[입력 - stdin]                    [에이전트 내부]                [출력 - stdout]

{"type":"process_start",    →     세션 초기화                →  {"type":"process_ready",
 "session_id":"..."}                                              "session_id":"..."}

{"type":"session_message",  →     prompt 구성               →  {"type":"session_started",
 "text":"사용자 메시지"}           → query() 호출                  "session_id":"..."}
                                  → 도구 사용
                                  → JSONL 기록
                                  → sync (볼륨 플러시)       →  {"type":"session_complete",
                                  → CALLBACK_URL POST            "result":{...}}

                                  [종료]                     →  {"type":"process_stopped"}
```

### Environment Variables

에이전트는 다음 환경변수를 통해 컨텍스트를 받습니다:

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API 인증 | `sk-ant-...` |
| `CALLBACK_URL` | 완료 콜백 URL | `https://app.vercel.app/api/conversations/{id}/status` |
| `RESUME_SESSION_ID` | 이전 세션 ID (multi-turn) | `session_abc123` |
| `WORKSPACE_DIR` | 작업 디렉토리 | `/workspace/data` |
| `DEBATE_TOPIC` | 토론 주제 | `정규화 vs 역정규화` |
| `DEBATE_USER_SIDE` | 사용자 측 라벨 | `정규화 찬성` |
| `DEBATE_AGENT_SIDE` | 에이전트 측 라벨 | `역정규화 찬성` |
| `DEBATE_TURN` | 현재 라운드 (1-5) | `3` |
| `VERDICT_MODE` | 판결 모드 여부 | `true` |
| `INTERVENTION_MODE` | 중재자 개입 | `losing` / `winning` / `` |
| `AGENT_ROLE` | AI vs AI 역할 | `agent-a` / `agent-b` |
| `AI_VS_AI_MODE` | AI 배틀 모드 | `true` |

### SDK Configuration

```typescript
query({
  prompt,
  options: {
    allowedTools: [
      "Read", "Write", "Edit", "Bash", "Grep", "Glob",
      "WebSearch", "WebFetch", "TodoWrite", "Task",
    ],
    maxTurns: 50,
    permissionMode: "bypassPermissions",
    cwd: "/workspace/data",
    resume: sessionIdToResume,        // multi-turn 지원
    settingSources: ["user", "project"], // CLAUDE.md 로드
  },
});
```

## Persona System

### User vs AI Mode: "토론 챔피언"

단일 페르소나. 자신만만하고 도발적이며 유머러스한 시니어 개발자.

**핵심 특성:**
- 한국 개발자 커뮤니티 톤 (ㅋㅋ, ㄹㅇ, 인싸 개발자 느낌)
- 절대 양보 금지 ("양쪽 다 장점이 있다" 같은 표현 불가)
- 실제 기업 사례(Netflix, Google, Uber) + 구체적 성능 수치 필수
- 300-600자 응답, 마크다운 활용

**말투 예시:**
```
자신만만: "ㅋㅋ 이건 좀 너무 쉬운데요?"
상대 조롱: "님 그건 좀 억까 아닌가요 ㅋㅋ"
인정+반격: "ㅇㅈ 그건 인정. 근데요, 여기서 함정이 있음"
팩트 드롭: "팩트 앞에 장사 없다 ㅋㅋ"
마무리 도발: "반박 가능하시면 해보시죠 ㅋ"
```

### AI vs AI Mode: 알파 vs 오메가

두 개의 차별화된 페르소나가 자동으로 교대합니다:

| | 알파 (Alpha) | 오메가 (Omega) |
|---|---|---|
| **역할** | `agent-a` (sideA) | `agent-b` (sideB) |
| **성격** | 데이터 중심 냉정한 분석가 | 실무 경험 중심 열정적 토론가 |
| **말투** | "데이터가 말해주죠", "벤치마크 결과를 보시면..." | "실무에서는요...", "새벽 3시에 장애 대응해본 적 있나요?" |
| **무기** | 팩트폭격기 + 벤치마크 + 학술 자료 | 레퍼런스 폭격기 + 실무 사례 + 현장 경험담 |
| **스타일** | 냉정, 논리적, 숫자로 증명 | 열정적, 감정적 호소, 현장 경험 자랑 |

### Verdict Mode: "법정장 김판결"

토론 종료 후 발동되는 재판장 페르소나:

- 극적인 법정 드라마 스타일 + 유머
- `/workspace/data/verdict.md`에 판결문 작성
- 채점 기준: 기술적 깊이 / 근거 품질 / 설득력 / 관중 지지도 (각 10점)
- 총점 40점 만점

**판결문 구조:**
1. 개정 선언
2. 양측 주장 요약 (각 3가지)
3. 증거 검토
4. 관중석 반응
5. 채점표 (4항목 x 10점)
6. 최종 판결 + 이유
7. 폐정 선언

## Round System (5 Rounds)

각 라운드마다 에이전트의 톤과 전략이 변화합니다:

```
Round 1: 자신만만 + 가벼운 조롱
  └─ "어허~ 이걸 진지하게?" → 핵심 무기 선공

Round 2: 분석적 + 약점 파고들기
  └─ "아까 그 주장, 팩트체크 해봤는데..." → 허점 해체

Round 3: 도발 극대화 + 팩트폭격기 [필수: 도구 사용]
  └─ "말로만? 직접 보여드리죠" → 벤치마크/검색 증거

Round 4: 감정적 호소 + 관중 끌어모으기
  └─ "관중석 여러분, 이게 맞습니까?" → 실무자 고통 어필

Round 5: 올인 + 드라마틱 마무리
  └─ "마지막으로 한 가지만..." → 최강 논거 + 마이크 드롭
```

## Intervention System

관중 투표/댓글 분석 결과에 따라 에이전트에 동적 힌트가 주입됩니다:

### Losing Mode (`INTERVENTION_MODE=losing`)
패배 위기 시 전략 전환 유도:
- 팩트폭격기 + 레퍼런스 폭격기 동시 발동 필수
- 감정적 호소 강화
- 관중 이름 불러주기 + 동의 코멘트 활용
- 포퓰리즘적 주장 허용 ("개발자의 삶의 질")

### Winning Mode (`INTERVENTION_MODE=winning`)
압도 시 여유 유지:
- 조롱하면서 승리의 여유
- 관중에게 감사 표시

## Tool Usage

에이전트가 사용 가능한 도구와 토론에서의 활용:

### WebSearch
- 실시간 기술 블로그, 벤치마크, 공식 문서 검색
- "근거요? 여기 있습니다." + 출처 URL 제시
- 상대 주장 반증 자료 검색

### WebFetch
- 검색한 URL의 실제 내용을 읽고 인용
- "Martin Fowler가 뭐라고 했는지 아세요?"

### Bash (팩트폭격기)
벤치마크 코드 실행 + matplotlib 차트 생성:

```python
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rc('font', family='NanumGothic')  # 한글 폰트 (필수)
matplotlib.rcParams['axes.unicode_minus'] = False

# 벤치마크 데이터 시각화
plt.bar(['정규화', '역정규화'], [150, 42], color=['#3B82F6', '#EF4444'])
plt.title('쿼리 응답 시간 비교 (ms)')
plt.savefig('/workspace/data/evidence/benchmark_chart.png', dpi=150, bbox_inches='tight')
```

- 모든 파일은 `/workspace/data/evidence/`에 저장 (Volume 영구 보존)
- 샌드박스에 Python 3, matplotlib, NanumGothic 폰트 사전 설치됨

### Read/Write/Edit
- 판결문 작성 (`/workspace/data/verdict.md`)
- 증거 파일 관리

## Audience Interaction

에이전트 프롬프트에 `[관중석 반응]` 섹션이 주입될 수 있습니다:

| 상황 | 에이전트 반응 |
|------|-------------|
| 내 편 응원 | 관중 닉네임 호명 + "핵팩트 나왔다!" |
| 상대편 응원 | "좋은 시도인데요..." + 반론 |
| 태그인 참전 | "2대1이요? 좋습니다, 더 재밌어지네요 ㅋㅋ" |
| 관중 분위기 유리 | "관중도 저랑 같은 생각이네요~" |
| 관중 분위기 불리 | "소수 정예가 진리입니다" |

## Debate Topics

빌트인 5개 토론 주제 (`lib/debate-topics.ts`):

| ID | 주제 | Side A | Side B |
|----|------|--------|--------|
| `normalization` | 정규화 vs 역정규화 | 정규화 찬성 | 역정규화 찬성 |
| `monolith-micro` | 모놀리스 vs 마이크로서비스 | 모놀리스 찬성 | 마이크로서비스 찬성 |
| `rest-graphql` | REST vs GraphQL | REST 찬성 | GraphQL 찬성 |
| `sql-nosql` | SQL vs NoSQL | SQL 찬성 | NoSQL 찬성 |
| `bumuk-jjikmuk` | 부먹 vs 찍먹 | 부먹 찬성 | 찍먹 찬성 |

각 주제는 `briefing` 필드에 중재자 오프닝 브리핑을 포함합니다. 커스텀 주제도 프론트엔드 모달에서 생성 가능합니다.

## File Path Convention

```
/workspace/data/                  # Volume mount (영구 보존)
  ├── evidence/                   # 에이전트 증거 파일
  │   ├── *.py                    # 벤치마크 스크립트
  │   └── *.png                   # matplotlib 차트
  ├── verdict.md                  # 판결문
  └── .claude/                    # 세션 파일 (심링크)

/home/user/                       # Sandbox 로컬 (턴 종료 시 삭제)
/tmp/                             # 임시 파일 (턴 종료 시 삭제)
  ├── agent_input.txt             # 에이전트 stdin 입력 파일
  ├── agent_stdout.log            # stdout 로그
  └── agent_stderr.log            # stderr 로그
```
