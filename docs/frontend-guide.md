# Frontend Guide

> 컴포넌트 구조, UI 상태 머신, 스타일 시스템, 실시간 업데이트

## UI State Machine

메인 페이지(`app/page.tsx`)는 상태 머신으로 구현됩니다. `phase` 변수가 현재 화면을 결정합니다:

```
topic-select  →  side-select  →  vs-intro  →  briefing  →  debating     →  verdict
(주제 선택)      (사이드 선택)    (VS 애니)    (브리핑)      (토론 진행)      (판결)
                                                           ↓
                                              ai-battle  →  user-verdict
                                              (AI 배틀)      (유저 판결)
```

### Phase별 화면

| Phase | 설명 | 모드 |
|-------|------|------|
| `topic-select` | 토론 주제 5개 + 커스텀 주제 생성 | 공통 |
| `side-select` | 찬성/반대 사이드 선택 모달 | user-vs-ai |
| `vs-intro` | VS 화면 + 3-2-1 카운트다운 애니메이션 | 공통 |
| `briefing` | 중재자 브리핑 오버레이 (주제 배경 설명) | 공통 (briefing 있을 때) |
| `debating` | 채팅 기반 토론 UI + 증거실 | user-vs-ai |
| `ai-battle` | 턴 기반 배틀 뷰 (알파 vs 오메가) | ai-vs-ai |
| `verdict` | AI 판결문 표시 | user-vs-ai |
| `user-verdict` | 유저 채점 폼 | ai-vs-ai |

## Component Tree

```
app/page.tsx (메인 아레나)
├── components/debate/
│   ├── topic-card.tsx              # 토론 주제 선택 카드
│   ├── custom-topic-modal.tsx      # 커스텀 주제 생성 모달
│   ├── side-selector.tsx           # 사이드 선택 모달
│   ├── vs-screen.tsx               # VS 인트로 애니메이션
│   ├── moderator-briefing.tsx      # 중재자 브리핑 오버레이
│   ├── debate-header.tsx           # 점수판 + 라운드 표시 + 투표 버튼
│   ├── ai-battle-view.tsx          # AI vs AI 턴별 디스플레이
│   ├── user-verdict-form.tsx       # AI vs AI 유저 채점 폼
│   ├── verdict-display.tsx         # 판결문 표시
│   ├── audience-panel.tsx          # 관중 댓글 + 태그인
│   └── moderator-intervention.tsx  # 동적 중재자 힌트
│
├── components/chat/
│   ├── cc-messages.tsx             # 세션 메시지 렌더러 (중복 제거)
│   ├── cc-user-message.tsx         # 사용자 메시지 버블
│   ├── cc-assistant-message.tsx    # AI 응답 (텍스트 + 도구 사용 표시)
│   ├── cc-system-message.tsx       # 시스템 알림
│   └── prompt-form.tsx             # 메시지 입력 폼
│
└── components/workspace/
    ├── workspace-panel.tsx         # 탭 패널 (증거실 | 파일)
    ├── evidence-cards.tsx          # 증거 카드 리스트
    ├── file-explorer.tsx           # 재귀 파일 트리
    └── file-viewer.tsx             # 구문 강조 코드 뷰어 (Shiki)
```

## Key Components

### TopicCard (`components/debate/topic-card.tsx`)

토론 주제 선택 카드. 5개 빌트인 주제를 그리드로 표시.

```typescript
interface Props {
  topic: DebateTopic;     // { id, title, description, sideA, sideB, briefing? }
  onSelect: (topic: DebateTopic) => void;
  debateMode: "user-vs-ai" | "ai-vs-ai";
}
```

### VsScreen (`components/debate/vs-screen.tsx`)

VS 인트로 애니메이션. 3초 카운트다운 후 자동 전환.

```typescript
interface Props {
  userSide: string;       // 사용자 측 라벨
  agentSide: string;      // 에이전트 측 라벨
  userEmoji: string;
  agentEmoji: string;
  onComplete: () => void; // 카운트다운 완료 콜백
}
```

### AiBattleView (`components/debate/ai-battle-view.tsx`)

AI vs AI 모드의 턴별 디스플레이. 알파(좌측, 파랑)와 오메가(우측, 빨강)의 응답을 교대로 표시.

```typescript
interface Props {
  turns: DebateTurnData[];   // 턴 기록 배열
  isRunning: boolean;        // 현재 실행 중 여부
  currentSide?: string;      // 현재 차례
}
```

### EvidenceCards (`components/workspace/evidence-cards.tsx`)

에이전트의 도구 사용을 구조화된 카드로 표시:

| Evidence Type | 표시 내용 |
|--------------|----------|
| `web-search` | 검색 쿼리 + 결과 링크 목록 |
| `web-fetch` | URL + 내용 미리보기 |
| `bash` | 명령어 + 실행 결과 |
| `code-write` | 파일 경로 + 코드 미리보기 |

## Pages

### Gallery (`app/gallery/page.tsx`)

전체 토론 갤러리. 실시간/완료된 토론 목록.

- `GET /api/debates`로 목록 조회
- 10초 간격 폴링으로 실시간 업데이트
- 투표 비율 바 + 라운드 진행률 표시
- "LIVE" 뱃지 (status === "running")

### Debate Detail (`app/debate/[id]/page.tsx`)

개별 토론 상세 페이지. 갤러리에서 클릭하거나 공유 URL로 접근.

## Real-time Updates

프론트엔드는 폴링 기반으로 실시간 업데이트를 구현합니다:

```typescript
// 토론 진행 중 2초 간격 폴링
useEffect(() => {
  if (status !== "running") return;
  const interval = setInterval(async () => {
    const res = await fetch(`/api/conversations/${conversationId}`);
    const data = await res.json();
    setMessages(data.messages);
    setEvidence(data.evidence);
    if (data.status === "completed") {
      setStatus("completed");
      clearInterval(interval);
    }
  }, 2000);
  return () => clearInterval(interval);
}, [status, conversationId]);
```

## Style System

### Theme

다크 모드 전용. CSS 커스텀 변수 기반:

```css
/* app/globals.css */
--debate-gold: #F59E0B;       /* 골드 액센트 */
--side-blue: #3B82F6;          /* 사용자/sideA 측 */
--side-red: #EF4444;           /* 에이전트/sideB 측 */
```

### Design Tokens

| Token | Usage |
|-------|-------|
| Blue (`#3B82F6`) | 사용자 측, sideA, 알파 |
| Red (`#EF4444`) | 에이전트 측, sideB, 오메가 |
| Gold (`#F59E0B`) | 강조, 판결, 특별 UI |
| Glassmorphism | `backdrop-blur` + 반투명 배경 |

### Animations

```css
/* 페이드인 업 */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 플로팅 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
```

### Font

모노스페이스 기반 (`font-family: monospace`). 기술적 느낌을 강조합니다.

## Resizable Panels

토론 화면에서 채팅 영역과 워크스페이스(증거실/파일) 영역은 `react-resizable-panels`로 크기 조절 가능:

```
┌──────────────────────────┬──────────────────┐
│                          │                  │
│   Chat / Battle View     │  Workspace Panel │
│   (토론 메시지)           │  ├── 증거실 탭   │
│                          │  └── 파일 탭     │
│                          │                  │
└──────────────────────────┴──────────────────┘
          ← drag handle →
```
