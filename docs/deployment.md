# Deployment

> Vercel/Moru 배포 가이드, 환경변수 설정, 트러블슈팅

## Prerequisites

| 서비스 | 용도 | 가입 |
|--------|------|------|
| [Vercel](https://vercel.com) | 웹 앱 호스팅 | 무료 플랜 충분 |
| [Moru](https://moru.io) | 에이전트 샌드박스 | 무료 |
| [Neon](https://neon.tech) 또는 [Supabase](https://supabase.com) | PostgreSQL | 무료 플랜 충분 |
| Anthropic | Claude API | [platform.claude.com](https://platform.claude.com) |

## Step-by-Step Deployment

### 1. Environment Setup

```bash
cp .env.example .env
```

`.env` 파일 설정:

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
MORU_API_KEY="moru_..."
ANTHROPIC_API_KEY="sk-ant-..."
BASE_URL="https://your-app.vercel.app"
```

**주의**: `BASE_URL`에 trailing slash(`/`) 또는 줄바꿈(`\n`) 포함 금지!

### 2. Template Alias 변경

템플릿 alias는 Moru 계정 내에서 전역 고유해야 합니다. 두 파일 모두 변경:

- `agent/template.ts` — `templateAlias` 변수
- `lib/moru.ts` — `TEMPLATE_NAME` 상수

```typescript
// 예: "moru-hackathon-agent" → "team-xyz-agent"
```

### 3. Database Setup

```bash
pnpm db:push
```

성공 시: "Your database is now in sync with your Prisma schema"

### 4. Agent Template Build

```bash
pnpm build:template
```

Moru에서 원격으로 Docker 이미지를 빌드합니다. 로컬 Docker 불필요.

### 5. Vercel Deployment

```bash
npm i -g vercel
vercel login
vercel --prod -y
```

### 6. Vercel Environment Variables

```bash
# printf 사용 (echo는 trailing newline 추가되므로 금지!)
printf 'postgresql://...' | npx vercel env add DATABASE_URL production
printf 'moru_...' | npx vercel env add MORU_API_KEY production
printf 'sk-ant-...' | npx vercel env add ANTHROPIC_API_KEY production
printf 'https://your-app.vercel.app' | npx vercel env add BASE_URL production
```

환경변수 변경 후 반드시 재배포:
```bash
vercel --prod -y
```

### 7. Deployment Protection 비활성화

Vercel의 Deployment Protection(SSO)이 에이전트 콜백을 차단할 수 있습니다:

```bash
# Vercel 토큰 확인
cat ~/Library/Application\ Support/com.vercel.cli/auth.json  # macOS

# 프로젝트 ID 확인
cat .vercel/project.json

# SSO 보호 비활성화
curl -s -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>" \
  -H "Authorization: Bearer <VERCEL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}'

# 재배포
vercel --prod -y
```

## Local Development

### ngrok 필요 (에이전트 콜백 수신용)

```bash
# 1. ngrok 실행
ngrok http 3000

# 2. ngrok URL을 .env의 BASE_URL에 설정
# BASE_URL="https://abc123.ngrok-free.app"

# 3. 개발 서버 실행
pnpm dev
```

## Template Rebuild

에이전트 코드(`agent/`) 변경 시:

```bash
# 1. 템플릿 재빌드
pnpm build:template

# 2. Vercel 재배포
vercel --prod -y
```

## Troubleshooting

### Moru Sandbox 디버깅

```bash
# Moru CLI 설치 (아직 안 했다면)
curl -fsSL https://moru.io/cli/install.sh | bash
moru auth login

# 샌드박스 목록 확인
moru sandbox list

# 로그 확인
moru sandbox logs <sandboxId>

# 실행 중 샌드박스에 명령 실행
moru sandbox exec <sandboxId> "cat /tmp/agent_stderr.log"

# 콜백 URL 확인
moru sandbox logs <sandboxId> | grep CALLBACK
```

### 일반적인 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| 에이전트 응답 없음 | Sandbox가 시작은 되지만 에러 | `moru sandbox logs <id>` 확인 |
| 콜백 401 에러 | Vercel Deployment Protection | SSO 보호 비활성화 (위 참조) |
| "killed" end reason | 정상 동작 (완료 후 kill) | DB에서 status 확인 |
| 파일을 찾을 수 없음 | `/home/user/`에 저장함 | `/workspace/data/`에 저장해야 함 |
| 템플릿 빌드 실패 | alias 중복 | 고유한 alias로 변경 |
| DB 연결 실패 | `DATABASE_URL` 오류 | `?sslmode=require` 포함 확인 |
| 대화가 "running"에 멈춤 | 콜백 실패 | Prisma Studio에서 수동 업데이트 |
| `BASE_URL` 관련 에러 | trailing newline/slash | `printf` 사용, 슬래시 제거 |

### Vercel 로그 확인

```bash
# 최근 배포 목록
npx vercel ls

# 특정 배포 로그
npx vercel inspect <deployment-url> --logs

# 환경변수 확인
npx vercel env ls
```

### 데이터베이스 직접 조회

```bash
# Prisma Studio (GUI)
pnpm db:studio

# 프로덕션 DB에 스키마 적용
DATABASE_URL="prod_url" npx prisma db push
```

## Useful Commands

```bash
# 개발
pnpm dev                          # 로컬 서버 (Turbopack)
pnpm build                        # 프로덕션 빌드
pnpm db:push                      # DB 스키마 적용
pnpm db:studio                    # DB GUI
pnpm build:template               # 에이전트 템플릿 빌드

# Moru
moru sandbox list                 # 샌드박스 목록
moru sandbox logs <id>            # 로그 확인
moru sandbox exec <id> <cmd>      # 명령 실행
moru sandbox kill <id>            # 샌드박스 종료

# Vercel
vercel --prod -y                  # 프로덕션 배포
npx vercel ls                     # 배포 목록
npx vercel env ls                 # 환경변수 목록
npx vercel inspect <url> --logs   # 로그 확인
```
