# Toron Documentation

> 이 문서는 다른 LLM/AI가 프로젝트를 이해하고 참조할 수 있도록 작성되었습니다.

## For LLMs: Quick Context

**Toron**은 AI 토론 아레나입니다. 핵심 구조를 빠르게 파악하려면:

1. **무엇을 하는 앱인가?** → 이 파일의 아래 "TL;DR" 섹션
2. **어떻게 동작하는가?** → [architecture.md](architecture.md)
3. **에이전트는 어떻게 토론하는가?** → [agent-system.md](agent-system.md)
4. **API 스펙이 필요한가?** → [api-reference.md](api-reference.md)
5. **DB 구조가 필요한가?** → [database-schema.md](database-schema.md)
6. **프론트엔드를 수정해야 하는가?** → [frontend-guide.md](frontend-guide.md)
7. **배포하거나 디버깅해야 하는가?** → [deployment.md](deployment.md)

## TL;DR

```
[사용자] ──(주제 선택)──→ [Next.js UI] ──(POST)──→ [API Route]
                                                       │
                                                       ▼
                                              [Moru Sandbox 생성]
                                              [Claude Agent SDK]
                                              [도구: 검색/코드실행]
                                                       │
                                                       ▼ (HTTP 콜백)
[프론트엔드 폴링] ←── [API Route] ←── [에이전트 완료 보고]
```

- **모드 2가지**: User vs AI (사용자가 직접 토론) / AI vs AI (알파 vs 오메가 자동 배틀)
- **5라운드 시스템**: 라운드별로 에이전트 톤/전략이 진화
- **3가지 페르소나**: 토론 챔피언 (user-vs-ai), 알파+오메가 (ai-vs-ai), 법정장 김판결 (판결)
- **증거 시스템**: WebSearch, WebFetch, Bash(벤치마크+차트) 결과를 자동 추출
- **관중 참여**: 투표, 댓글, 태그인(대신 반론)이 에이전트 프롬프트에 주입됨
- **Fire-and-Forget**: Vercel 함수 타임아웃 우회를 위해 에이전트를 완전 분리 실행

## Document Index

| Document | Lines | What it covers |
|----------|-------|---------------|
| [architecture.md](architecture.md) | ~180 | 3-tier 시스템, 데이터 플로우, Fire-and-Forget 패턴, 세션 영속성, 증거 추출, Volume 구조 |
| [agent-system.md](agent-system.md) | ~250 | 에이전트 프로토콜(stdin/stdout), 환경변수, SDK 설정, 페르소나 3종, 라운드 시스템, 중재자 개입, 도구 활용, 관중 인터랙션 |
| [api-reference.md](api-reference.md) | ~230 | 9개 API 엔드포인트 명세 (Request/Response/내부동작), TypeScript 타입 정의 |
| [database-schema.md](database-schema.md) | ~130 | Prisma 4 모델 (Conversation, DebateTurn, Vote, Comment), 필드 설명, 상태 전이, 쿼리 예시 |
| [frontend-guide.md](frontend-guide.md) | ~180 | UI 상태 머신 (8 phase), 컴포넌트 트리, 주요 컴포넌트 Props, 폴링 구현, 스타일 시스템 |
| [deployment.md](deployment.md) | ~180 | Vercel/Moru 배포 7단계, 환경변수 설정, 로컬 개발(ngrok), 트러블슈팅 표 |

## Key Files to Read

프로젝트를 이해하기 위해 우선적으로 읽어야 할 파일들:

| Priority | File | Why |
|----------|------|-----|
| 1 | `lib/types.ts` | 전체 TypeScript 타입 정의 (모든 인터페이스) |
| 2 | `agent/src/agent.ts` | 에이전트 동작 로직 (프로토콜, 프롬프트 구성) |
| 3 | `lib/moru.ts` | Moru SDK 래퍼 (샌드박스 생성, 볼륨 관리) |
| 4 | `app/page.tsx` | 메인 UI (상태 머신, 전체 플로우) |
| 5 | `app/api/conversations/route.ts` | 메시지 전송 API (에이전트 실행 트리거) |
| 6 | `app/api/conversations/[id]/status/route.ts` | 콜백 핸들러 (AI vs AI 체이닝) |
| 7 | `prisma/schema.prisma` | DB 스키마 (4 모델) |
| 8 | `agent/.claude/CLAUDE.md` | 에이전트 페르소나 인스트럭션 |
| 9 | `lib/evidence-parser.ts` | 증거 추출 로직 |
| 10 | `lib/debate-topics.ts` | 토론 주제 정의 |
