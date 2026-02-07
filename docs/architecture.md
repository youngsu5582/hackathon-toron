# Architecture

> Toron의 시스템 아키텍처, 데이터 플로우, 핵심 설계 결정

## System Overview

Toron은 3-tier 아키텍처로 구성됩니다:

```
┌─────────────────────────────────────────────────────────┐
│                    Web Tier (Vercel)                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Next.js  │  │  API Routes  │  │  Prisma + Postgres│  │
│  │   UI     │──│  (Serverless)│──│    (Neon/Supa)    │  │
│  └──────────┘  └──────┬───────┘  └───────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP (fire-and-forget)
┌─────────────────────────┼───────────────────────────────┐
│                  Agent Tier (Moru)                       │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │              Sandbox (Firecracker microVM)         │  │
│  │  ┌────────────┐  ┌───────────┐  ┌─────────────┐  │  │
│  │  │ Claude SDK │  │  Python   │  │  Web Tools  │  │  │
│  │  │  query()   │  │ matplotlib│  │ Search/Fetch│  │  │
│  │  └────────────┘  └───────────┘  └─────────────┘  │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                               │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │           Volume (JuiceFS 영구 스토리지)            │  │
│  │  /workspace/data/                                  │  │
│  │  ├── .claude/          # 세션 파일 (JSONL)         │  │
│  │  ├── evidence/         # 벤치마크, 차트 PNG         │  │
│  │  └── verdict.md        # 판결문                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Web Tier (Next.js on Vercel)

- **UI 렌더링**: React 19 + Tailwind CSS, 다크 모드 전용
- **API Routes**: Serverless functions로 대화 관리, 투표, 댓글 처리
- **Database**: Prisma ORM으로 PostgreSQL 접근
- **Polling**: 프론트엔드가 2초 간격으로 `GET /api/conversations/{id}` 폴링

### 2. Agent Tier (Moru Sandboxes)

- **격리 실행**: 각 대화 턴마다 독립 Firecracker microVM 생성
- **Claude Agent SDK**: `query()` 함수로 Claude와 도구 사용
- **도구**: WebSearch, WebFetch, Bash(Python/matplotlib), Read, Write, Edit, Grep, Glob
- **콜백**: 완료 시 `POST /api/conversations/{id}/status`로 상태 보고

### 3. Storage Tier

- **PostgreSQL**: 대화 상태, 투표, 댓글, 턴 기록
- **Moru Volume**: 에이전트 작업 파일 영구 저장 (JuiceFS 기반)
  - 세션 JSONL 파일 (`.claude/` 디렉토리)
  - 증거 파일 (`evidence/` 디렉토리)
  - 판결문 (`verdict.md`)

## Data Flow

### User vs AI: 메시지 전송 플로우

```
사용자 입력
    │
    ▼
[1] POST /api/conversations
    │  → DB에 대화 생성/조회
    │  → Moru Volume 생성 (첫 턴)
    │  → Moru Sandbox 생성 + 에이전트 실행
    │  → 즉시 { conversationId, status: "running" } 반환
    │
    ▼
[2] 프론트엔드: 2초 간격 폴링 시작
    │  GET /api/conversations/{id}
    │  → Volume에서 세션 JSONL 읽기
    │  → 메시지 + 증거 카드 반환
    │
    ▼                              ┌──── Sandbox 내부 ────┐
[3] 에이전트 실행 (비동기)           │                      │
    │                              │  stdin → agent.ts     │
    │                              │  → query() 호출       │
    │                              │  → 도구 사용 (검색 등) │
    │                              │  → JSONL에 기록       │
    │                              │  → sync (볼륨 플러시) │
    │                              └──────────┬───────────┘
    │                                         │
    ▼                                         ▼
[4] POST /api/conversations/{id}/status   (콜백)
    │  → DB 상태 → "completed"
    │  → Sandbox kill
    │
    ▼
[5] 프론트엔드 폴링에서 "completed" 감지 → 최종 메시지 표시
```

### AI vs AI: 자동 체이닝 플로우

```
사용자: "AI 배틀 시작"
    │
    ▼
[1] POST /api/conversations (sideA 에이전트 실행)
    │  → agent-a (알파) 실행
    │
    ▼
[2] 알파 완료 → POST /status (콜백)
    │  콜백 핸들러 내부:
    │  ├── 알파의 응답 추출 → DebateTurn에 저장
    │  ├── maxTurns 미도달이면:
    │  │   └── currentSide 전환 (sideA → sideB)
    │  │   └── agent-b (오메가) 자동 실행
    │  └── maxTurns 도달이면:
    │      └── status = "completed"
    │
    ▼
[3] 오메가 완료 → POST /status (콜백)
    │  └── 같은 로직 반복 (sideB → sideA)
    │
    ▼
[4] 5턴 완료 → 프론트엔드에서 유저 판결 폼 표시
```

## Key Design Decisions

### Fire-and-Forget 패턴

**문제**: Vercel Serverless 함수는 30초 타임아웃. Claude Agent SDK `query()`는 수 분 소요.

**해결**: 에이전트를 완전히 분리하여 실행.

```
❌ 잘못된 방식 (gRPC 스트리밍):
  Vercel Function → gRPC stream → Sandbox
  → 함수 타임아웃 시 gRPC 연결 끊김 → 에이전트 죽음

✅ 올바른 방식 (Fire-and-Forget):
  Vercel Function → 파일 쓰기 → nohup으로 에이전트 실행 → 즉시 반환
  → 에이전트는 독립적으로 실행 → 완료 시 HTTP 콜백
```

구현 (`lib/moru.ts`):
1. `sandbox.commands.run()`으로 입력 파일 생성 (foreground, 즉시 완료)
2. `nohup bash -c '...' &>/dev/null &`로 에이전트 실행 (background, 연결 불필요)
3. 에이전트가 `CALLBACK_URL`로 완료 보고

### 세션 영속성 (Multi-turn)

각 턴마다 새 Sandbox가 생성되지만 **Volume은 유지**됩니다:

```
Turn 1: Sandbox A → Volume (세션 JSONL 저장) → Sandbox A 종료
Turn 2: Sandbox B → Volume (세션 JSONL 로드) → 이전 컨텍스트 유지
```

- `~/.claude` → `/workspace/data/.claude` 심링크로 세션 파일 영속
- `RESUME_SESSION_ID` 환경변수로 이전 세션 이어받기
- User vs AI: 세션 resume (이전 대화 컨텍스트 유지)
- AI vs AI: 매 턴 fresh context (상대 AI 응답만 프롬프트로 전달)

### 증거 자동 추출

에이전트의 도구 사용을 세션 JSONL에서 파싱하여 구조화된 증거 카드로 변환:

```
JSONL 메시지 (tool_use + tool_result)
    │
    ▼  evidence-parser.ts
Evidence[] 배열
    │
    ▼
┌──────────────┬────────────────┬──────────────┬───────────────┐
│  web-search  │   web-fetch    │    bash       │  code-write   │
│  검색 쿼리   │   URL + 내용   │  명령어+결과  │  파일 경로    │
│  + 링크 목록 │   + 인용 미리  │  + 출력       │  + 내용       │
└──────────────┴────────────────┴──────────────┴───────────────┘
```

## Template (Sandbox Image)

`agent/template.ts`로 정의된 Docker 이미지:

```
Base: Node.js 20 (Debian)
├── Python 3 + pip
│   └── matplotlib (차트 생성)
├── Korean Fonts (NanumGothic)
├── Claude Code CLI 2.1.1
├── Claude Agent SDK
├── Git, gh CLI, build-essential
└── .credentials.json (Claude API 인증)
```

빌드: `pnpm build:template` (Moru에서 원격 빌드, 로컬 Docker 불필요)

## Volume Mount Structure

```
/workspace/data/               # Volume mount point
├── .claude/                   # Claude Code 세션 디렉토리
│   ├── projects/              # 프로젝트별 세션 파일
│   │   └── .../*.jsonl        # 세션 메시지 기록
│   └── .credentials.json      # API 인증 정보
├── evidence/                  # 에이전트가 생성한 증거
│   ├── benchmark.py           # 벤치마크 스크립트
│   ├── benchmark_chart.png    # matplotlib 차트
│   └── ...
└── verdict.md                 # 판결문 (판결 모드)
```

- `/home/user/`에 쓴 파일은 턴 간 유지되지 않음 (Sandbox 종료 시 삭제)
- `/workspace/data/`에 쓴 파일만 Volume을 통해 영구 보존
