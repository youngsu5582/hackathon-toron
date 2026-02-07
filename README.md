# Toron - AI Debate Arena

> AI 에이전트끼리 또는 사용자와 AI가 실시간으로 기술 토론을 벌이는 플랫폼

Toron은 한국 개발자 커뮤니티 문화를 반영한 AI 토론 아레나입니다. Claude Agent SDK와 Moru 클라우드 샌드박스를 활용하여, 격리된 환경에서 AI 에이전트가 실시간 검색, 코드 실행, 벤치마크 차트 생성까지 수행하며 토론합니다.

## Highlights

- **User vs AI**: 사용자가 직접 AI 토론 챔피언과 5라운드 토론
- **AI vs AI**: 두 AI 페르소나(알파 vs 오메가)가 자동으로 배틀
- **실시간 증거 수집**: WebSearch, 코드 실행, matplotlib 차트 생성
- **관중 참여**: 투표, 댓글, 태그인(대신 반론) 시스템
- **AI 판결**: 토론 종료 후 "법정장 김판결" 페르소나가 채점 및 판결

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Neon/Supabase) |
| Agent Runtime | Claude Agent SDK 2.1.1, Moru Sandboxes |
| Deployment | Vercel (Web), Moru (Agent) |

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url> && cd hackathon
pnpm install

# 2. Set up environment
cp .env.example .env
# Fill in: DATABASE_URL, MORU_API_KEY, ANTHROPIC_API_KEY, BASE_URL

# 3. Push database schema
pnpm db:push

# 4. Build agent template (remote Docker build on Moru)
pnpm build:template

# 5. Run locally
pnpm dev
```

Production 배포는 [docs/deployment.md](docs/deployment.md) 참조.

## Documentation

체계적인 기술 문서는 [`docs/`](docs/) 디렉토리에 있습니다:

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | 시스템 아키텍처, 데이터 플로우, Fire-and-Forget 패턴 |
| [Agent System](docs/agent-system.md) | 에이전트 프로토콜, 페르소나, 라운드 시스템, 도구 활용 |
| [API Reference](docs/api-reference.md) | 전체 API 엔드포인트 명세 |
| [Database Schema](docs/database-schema.md) | Prisma 모델, 관계, 필드 설명 |
| [Frontend Guide](docs/frontend-guide.md) | 컴포넌트 구조, UI 상태 머신, 스타일 시스템 |
| [Deployment](docs/deployment.md) | Vercel/Moru 배포, 환경변수, 트러블슈팅 |

## Project Structure

```
hackathon/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 메인 토론 아레나 (상태 머신 기반)
│   ├── gallery/page.tsx          # 토론 갤러리 (전체 목록)
│   ├── debate/[id]/              # 개별 토론 공유 페이지
│   └── api/
│       ├── conversations/        # 대화 CRUD + 메시지 전송
│       │   └── [id]/
│       │       ├── route.ts      # GET: 대화 조회 (메시지+증거)
│       │       ├── status/       # POST: 에이전트 콜백
│       │       ├── vote/         # POST: 투표
│       │       ├── comments/     # POST: 관중 댓글
│       │       ├── verdict/      # POST: 유저 판결 (AI vs AI)
│       │       └── files/        # GET: 볼륨 파일 조회
│       └── debates/              # GET: 전체 토론 목록
│
├── components/
│   ├── debate/                   # 토론 UI (토픽카드, VS화면, 배틀뷰 등)
│   ├── chat/                     # 메시지 렌더링 (세션 파싱)
│   └── workspace/                # 증거실 + 파일 탐색기
│
├── lib/
│   ├── types.ts                  # TypeScript 타입 정의
│   ├── moru.ts                   # Moru SDK 래퍼 (샌드박스/볼륨)
│   ├── debate-topics.ts          # 빌트인 토론 주제 5개
│   ├── evidence-parser.ts        # 도구 사용 → 증거 카드 변환
│   └── session-parser.ts         # JSONL 세션 파싱
│
├── agent/
│   ├── src/agent.ts              # 에이전트 엔트리포인트
│   ├── template.ts               # Moru 템플릿 빌드 설정
│   ├── Dockerfile                # 샌드박스 이미지
│   └── .claude/CLAUDE.md         # 에이전트 인스트럭션 (페르소나)
│
└── prisma/schema.prisma          # DB 스키마 (4 모델)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL 연결 문자열 |
| `MORU_API_KEY` | Yes | Moru API 키 ([dashboard](https://moru.io/dashboard?tab=keys)) |
| `ANTHROPIC_API_KEY` | Yes | Claude API 키 |
| `BASE_URL` | Yes | 배포 URL (trailing slash 금지!) |
| `GEMINI_API_KEY` | No | 이미지 생성용 |

## Scripts

```bash
pnpm dev              # 로컬 개발 서버 (Turbopack)
pnpm build            # 프로덕션 빌드
pnpm db:push          # DB 스키마 적용
pnpm db:studio        # Prisma Studio (DB GUI)
pnpm build:template   # Moru 에이전트 템플릿 빌드
```

## License

MIT
