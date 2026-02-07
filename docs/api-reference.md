# API Reference

> Toron의 전체 API 엔드포인트 명세

## Base URL

- Local: `http://localhost:3000`
- Production: `https://<your-app>.vercel.app`

---

## POST /api/conversations

메시지를 전송합니다. 첫 메시지 시 대화를 생성하고, 이후 메시지는 기존 대화에 추가합니다.

### Request Body

```typescript
interface SendMessageRequest {
  conversationId: string | null;   // null이면 새 대화 생성
  content: string;                 // 메시지 내용
  debateMetadata?: {               // 첫 메시지에 포함 (토론 설정)
    topic: string;                 // 토론 주제
    userSide: string;              // 사용자 측 라벨
    agentSide: string;             // 에이전트 측 라벨
    debateMode?: "user-vs-ai" | "ai-vs-ai";
  };
  isVerdictRequest?: boolean;      // true면 판결 모드 활성화
}
```

### Response

```typescript
interface SendMessageResponse {
  conversationId: string;
  status: "running";
}
```

### 내부 동작

1. DB에 대화 생성/조회
2. Moru Volume 생성 (첫 턴)
3. `turnCount` 증가
4. 관중 댓글 수집 → 프롬프트에 주입
5. 투표 분석 → `interventionMode` 결정
6. Moru Sandbox 생성 → 에이전트 실행 (fire-and-forget)
7. AI vs AI: `currentSide` 기반으로 에이전트 역할 결정

---

## GET /api/conversations/[id]

대화의 현재 상태, 메시지, 증거를 조회합니다. 프론트엔드가 2초 간격으로 폴링합니다.

### Response

```typescript
interface ConversationResponse {
  id: string;
  status: "idle" | "running" | "completed" | "error";
  messages: SessionEntry[];        // 파싱된 세션 메시지
  evidence?: Evidence[];           // 도구 사용에서 추출된 증거 카드
  errorMessage?: string;
  debateTopic?: string;
  userSide?: string;
  agentSide?: string;
  turnCount?: number;
  maxTurns?: number;               // 기본값: 5
  votes?: { user: number; agent: number };
  comments?: AudienceComment[];
  debateMode?: "user-vs-ai" | "ai-vs-ai";
  currentSide?: string;            // "sideA" | "sideB"
  turns?: DebateTurnData[];        // AI vs AI 턴 기록
  userVerdict?: string;            // 유저 판결 (AI vs AI)
}
```

### 내부 동작

1. DB에서 대화 조회 (투표, 댓글, 턴 포함)
2. Volume에서 세션 JSONL 파일 읽기
3. JSONL 파싱 → `SessionEntry[]` 변환
4. 도구 사용 추출 → `Evidence[]` 변환
5. 토론 컨텍스트 정리 (내부 프롬프트 제거)

---

## POST /api/conversations/[id]/status

에이전트가 완료/에러 시 호출하는 콜백 엔드포인트. Moru Sandbox에서 직접 호출됩니다.

### Request Body

```typescript
interface StatusCallbackRequest {
  status: "completed" | "error";
  errorMessage?: string;
  sessionId?: string;
}
```

### 내부 동작 (AI vs AI 체이닝)

```
status === "completed" && debateMode === "ai-vs-ai"
  └── turnCount < maxTurns?
      ├── YES: 응답 추출 → DebateTurn 저장 → currentSide 전환 → 다음 에이전트 실행
      └── NO:  status = "completed", 최종 턴 저장
```

- User vs AI: 단순히 DB 상태 업데이트 + Sandbox kill
- AI vs AI: 자동 체이닝 (다음 에이전트 실행)

---

## POST /api/conversations/[id]/vote

투표를 제출합니다.

### Request Body

```json
{ "side": "user" }   // "user" | "agent"
```

### Response

```json
{ "votes": { "user": 12, "agent": 8 } }
```

---

## POST /api/conversations/[id]/comments

관중 댓글을 작성합니다.

### Request Body

```typescript
{
  nickname: string;      // 닉네임 (기본: "관중")
  content: string;       // 댓글 내용
  side?: string;         // "user" | "agent" | null (중립)
  isTagIn?: boolean;     // true면 "태그인" (대신 반론 참전)
}
```

### Response

```typescript
{
  comment: AudienceComment;   // 생성된 댓글 객체
}
```

---

## POST /api/conversations/[id]/verdict

AI vs AI 모드에서 사용자가 판결을 제출합니다.

### Request Body

```json
{ "verdict": "알파의 데이터 기반 논증이 더 설득력 있었습니다..." }
```

### Response

```json
{ "success": true }
```

---

## GET /api/debates

갤러리용 전체 토론 목록을 조회합니다.

### Response

```typescript
{
  debates: Array<{
    id: string;
    status: string;
    debateTopic: string;
    userSide: string;
    agentSide: string;
    turnCount: number;
    maxTurns: number;
    debateMode: string;
    votes: { user: number; agent: number };
    createdAt: string;
  }>;
}
```

---

## GET /api/conversations/[id]/files/[...path]

Volume의 파일을 조회합니다.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `tree` | `"true"` | 전체 디렉토리 트리 반환 |
| `path` | string | 파일/디렉토리 경로 |

### Response (tree=true)

```typescript
FileInfo[]   // 재귀적 파일 트리
```

### Response (파일 읽기)

```
파일 내용 (text/plain 또는 binary)
```

---

## Type Definitions

### SessionEntry

세션 JSONL에서 파싱된 메시지 (3가지 타입):

```typescript
// 사용자 메시지
interface UserMessage {
  type: "user";
  uuid: string;
  message: { role: "user"; content: string | ContentBlock[] };
}

// AI 응답 (텍스트 + 도구 사용)
interface AssistantMessage {
  type: "assistant";
  uuid: string;
  message: {
    role: "assistant";
    content: ContentBlock[];   // TextBlock | ToolUseBlock | ThinkingBlock ...
    stop_reason: "end_turn" | "tool_use" | null;
  };
}

// 시스템 메시지
interface SystemMessage {
  type: "system";
  subtype: "local_command" | "turn_duration" | "api_error" | ...;
}
```

### ContentBlock

AI 응답의 콘텐츠 블록:

```typescript
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string | mixed[]; is_error?: boolean }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };
```

### Evidence

도구 사용에서 추출된 증거:

```typescript
interface Evidence {
  id: string;
  type: "web-search" | "web-fetch" | "bash" | "code-write";
  title: string;
  content: string;
  links?: { title: string; url: string; snippet?: string }[];
  url?: string;
  query?: string;
  command?: string;
  filePath?: string;
  isError?: boolean;
  timestamp: string;
}
```
