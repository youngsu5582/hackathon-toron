# Database Schema

> Prisma 모델 정의, 관계, 필드 설명

## Overview

PostgreSQL + Prisma ORM. 4개의 모델로 구성:

```
Conversation (토론)
  ├── 1:N → Vote (투표)
  ├── 1:N → Comment (관중 댓글)
  └── 1:N → DebateTurn (AI vs AI 턴 기록)
```

## Models

### Conversation

토론의 메인 엔티티. 상태 관리, 메타데이터, Moru 리소스 추적.

```prisma
model Conversation {
  id           String    @id @default(cuid())
  status       String    @default("idle")
  volumeId     String?
  sandboxId    String?
  sessionId    String?
  errorMessage String?
  debateTopic  String?
  userSide     String?
  agentSide    String?
  turnCount    Int       @default(0)
  maxTurns     Int       @default(5)
  debateMode   String    @default("user-vs-ai")
  currentSide  String?
  userVerdict  String?   @db.Text
  votes        Vote[]
  comments     Comment[]
  turns        DebateTurn[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `String` (cuid) | 고유 식별자 |
| `status` | `String` | `"idle"` → `"running"` → `"completed"` / `"error"` |
| `volumeId` | `String?` | Moru Volume ID (파일 영구 저장소) |
| `sandboxId` | `String?` | 현재 실행 중인 Moru Sandbox ID (종료 시 null) |
| `sessionId` | `String?` | Claude Code 세션 ID (multi-turn resume용) |
| `errorMessage` | `String?` | 에러 메시지 (status="error" 시) |
| `debateTopic` | `String?` | 토론 주제 (예: "정규화 vs 역정규화") |
| `userSide` | `String?` | 사용자 측 라벨 (예: "정규화 찬성") |
| `agentSide` | `String?` | 에이전트 측 라벨 (예: "역정규화 찬성") |
| `turnCount` | `Int` | 현재 라운드 번호 (0부터 시작, 메시지 전송 시 +1) |
| `maxTurns` | `Int` | 최대 라운드 수 (기본 5, 판결 가능 시점) |
| `debateMode` | `String` | `"user-vs-ai"` 또는 `"ai-vs-ai"` |
| `currentSide` | `String?` | AI vs AI에서 현재 차례 (`"sideA"` / `"sideB"`) |
| `userVerdict` | `String?` | AI vs AI 모드의 유저 판결 텍스트 |

**Status 상태 전이:**
```
idle → running (메시지 전송 시)
running → completed (에이전트 콜백 성공)
running → error (에이전트 콜백 에러)
```

### DebateTurn

AI vs AI 모드에서 각 에이전트의 턴별 응답 기록.

```prisma
model DebateTurn {
  id             String       @id @default(cuid())
  conversationId String
  turnNumber     Int
  side           String
  sideLabel      String
  persona        String
  content        String       @db.Text
  conversation   Conversation @relation(...)
  createdAt      DateTime     @default(now())
}
```

| Field | Type | Description |
|-------|------|-------------|
| `turnNumber` | `Int` | 라운드 번호 (1-5) |
| `side` | `String` | `"sideA"` 또는 `"sideB"` |
| `sideLabel` | `String` | 사이드 라벨 (예: "정규화 찬성") |
| `persona` | `String` | 페르소나 이름 (`"알파"` / `"오메가"`) |
| `content` | `String` (Text) | 에이전트의 응답 전체 텍스트 |

### Vote

투표 기록. 한 토론에 여러 투표 가능 (중복 투표 허용).

```prisma
model Vote {
  id             String       @id @default(cuid())
  conversationId String
  side           String
  conversation   Conversation @relation(...)
  createdAt      DateTime     @default(now())
}
```

| Field | Type | Description |
|-------|------|-------------|
| `side` | `String` | `"user"` 또는 `"agent"` |

### Comment

관중 댓글. 일반 코멘트 또는 "태그인" (대신 반론 참전).

```prisma
model Comment {
  id             String       @id @default(cuid())
  conversationId String
  nickname       String       @default("관중")
  content        String
  side           String?
  isTagIn        Boolean      @default(false)
  conversation   Conversation @relation(...)
  createdAt      DateTime     @default(now())
}
```

| Field | Type | Description |
|-------|------|-------------|
| `nickname` | `String` | 닉네임 (기본: "관중") |
| `content` | `String` | 댓글 내용 |
| `side` | `String?` | `"user"` / `"agent"` / `null` (중립) |
| `isTagIn` | `Boolean` | `true`면 "태그인" (관중이 토론에 직접 참전) |

## Common Queries

```typescript
// 대화 + 관계 전체 조회
const conversation = await prisma.conversation.findUnique({
  where: { id },
  include: { votes: true, comments: true, turns: true },
});

// 투표 집계
const votes = {
  user: conversation.votes.filter(v => v.side === "user").length,
  agent: conversation.votes.filter(v => v.side === "agent").length,
};

// 갤러리용 토론 목록
const debates = await prisma.conversation.findMany({
  where: { debateTopic: { not: null } },
  include: { votes: true },
  orderBy: { createdAt: "desc" },
});
```

## CLI Commands

```bash
pnpm db:push       # 스키마를 DB에 적용
pnpm db:generate   # Prisma 클라이언트 생성
pnpm db:studio     # Prisma Studio GUI (http://localhost:5555)
```
